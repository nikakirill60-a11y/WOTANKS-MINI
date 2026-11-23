// One WebGL scene per match. Models, projectiles, cover, sights and the chase camera
// share world coordinates; Canvas2D is only used for small textures and the minimap.
const BattleView = (() => {
  const T = THREE,
    el = (id) => document.getElementById(id);
  const pointer = new T.Vector2(),
    picker = new T.Raycaster(),
    temp = new T.Vector3();
  const transform = new T.Object3D(),
    tint = new T.Color();
  let renderer, scene, camera, world, avatars, layers, noticeLoss, canvas;
  let weatherSeeds = [];
  let hasAim = false,
    zoom = 1,
    width = 0,
    height = 0,
    slowFrames = 0;

  function open(onContextLost) {
    canvas = el('game');
    width = height = slowFrames = 0;
    hasAim = false;
    zoom = 1;
    try {
      renderer = new T.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
    } catch {
      throw new Error(
        'Для 3D-боя нужен WebGL 2. Включите аппаратное ускорение или откройте игру в другом браузере.'
      );
    }
    noticeLoss = (event) => {
      event.preventDefault();
      onContextLost();
    };
    canvas.addEventListener('webglcontextlost', noticeLoss);
    // Cap the drawing buffer, not the CSS viewport; very high-DPI phones otherwise
    // pay for millions of fragments before the adaptive frame budget can react.
    renderer.setPixelRatio(
      Math.min(devicePixelRatio || 1, 1.4, Math.sqrt(1250000 / (innerWidth * innerHeight)))
    );
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(53, 1, 0.65, 6500);
    avatars = new Map();
    layers = {};
  }
  function layer(name, geometry, material, max) {
    const mesh = new T.InstancedMesh(geometry, material, max);
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = 0;
    scene.add(mesh);
    layers[name] = { mesh, max };
  }
  function build() {
    const { x, y } = GameState.arena.bounds;
    camera.far = 2 * Math.hypot(x, y) + 2700;
    camera.updateProjectionMatrix();
    world = buildBattleWorld(scene, GameState);
    const bodyMat = new T.MeshPhongMaterial({ vertexColors: true, specular: '#464338', shininess: 24 });
    const allyMat = bodyMat.clone(),
      enemyMat = bodyMat.clone(),
      ownMat = bodyMat.clone();
    allyMat.color.set('#d7efdf');
    enemyMat.color.set('#ffd6b4');
    const wreck = new T.MeshLambertMaterial({ color: '#3a3934' });
    const markerBG = new T.MeshBasicMaterial({ color: '#29342f' }),
      blue = new T.MeshBasicMaterial({ color: '#79daca' }),
      red = new T.MeshBasicMaterial({ color: '#ff8069' });
    const quad = new T.PlaneGeometry(1, 1);
    for (const u of GameState.units) {
      const root = new T.Group(),
        asset = u.modelAsset,
        mat = u === GameState.player ? ownMat : u.team === 'enemy' ? enemyMat : allyMat;
      const hull = new T.Mesh(asset.hull, mat),
        turret = new T.Mesh(asset.turret, mat),
        gun = new T.Mesh(asset.gun, mat);
      turret.position.fromArray(asset.pivot);
      gun.position.fromArray(asset.gunPivot);
      root.scale.setScalar(u.modelScale);
      root.add(hull, turret);
      turret.add(gun);
      scene.add(root);
      const shade = new T.Mesh(quad, world.shadowMat);
      shade.rotation.order = 'YXZ';
      shade.rotation.x = -Math.PI / 2;
      const box = asset.hull.boundingBox;
      shade.scale.set(
        u.modelScale * (box.max.x - box.min.x) * 1.35,
        u.modelScale * (box.max.z - box.min.z) * 1.18,
        1
      );
      scene.add(shade);
      const marker = new T.Group(),
        bg = new T.Mesh(quad, markerBG),
        hp = new T.Mesh(quad, u.team === 'enemy' ? red : blue);
      bg.scale.set(15, 1.8, 1);
      hp.position.z = 0.12;
      marker.add(bg, hp);
      const flag = new T.Mesh(quad, hp.material);
      flag.position.set(0, 3.7, 0);
      flag.scale.setScalar(2.9);
      flag.rotation.z = Math.PI / 4;
      marker.add(flag);
      scene.add(marker);
      avatars.set(u, { root, hull, turret, gun, shade, marker, hp, wreck });
    }
    bodyMat.dispose();
    const cube = new T.BoxGeometry(),
      basic = new T.MeshBasicMaterial({ color: 0xffffff });
    layer('shells', cube, basic, 100);
    layer('sparks', new T.IcosahedronGeometry(0.5, 0), basic, 600);
    layer('casings', cube, new T.MeshLambertMaterial({ color: '#bda665' }), 80);
    layer(
      'tracks',
      quad,
      new T.MeshBasicMaterial({ color: '#4c4b3e', transparent: true, opacity: 0.44, depthWrite: false }),
      1200
    );
    layer(
      'clouds',
      new T.IcosahedronGeometry(0.5, 1),
      new T.MeshLambertMaterial({ color: '#b3b1a6', transparent: true, opacity: 0.35, depthWrite: false }),
      120
    );
    layer(
      'strikes',
      new T.RingGeometry(0.96, 1, 48),
      new T.MeshBasicMaterial({ color: '#e3875f', side: T.DoubleSide }),
      32
    );
    const weather = WeatherEngine.currentWeather;
    weatherSeeds = [];
    if (['rain', 'snow', 'sandstorm'].includes(weather)) {
      const count = weather === 'rain' ? 66 : 48;
      for (let i = 0; i < count; i++)
        weatherSeeds.push([Math.random() * 330, Math.random() * 130, Math.random() * 330]);
      layer(
        'weather',
        cube,
        new T.MeshBasicMaterial({
          color: weather === 'rain' ? '#afc5ca' : weather === 'snow' ? '#f1f2e8' : '#d6b882',
          transparent: true,
          opacity: 0.55,
          depthWrite: false
        }),
        count
      );
    }
    canvas.hidden = false;
    syncCamera();
    aim();
    draw();
  }
  function focusDistance(delta) {
    zoom = Math.max(0.72, Math.min(1.85, zoom * Math.exp(delta * 0.001)));
  }
  function syncCamera() {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (w > 0 && h > 0 && (w !== width || h !== height)) {
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w < h ? 65 : 53;
      camera.updateProjectionMatrix();
    }
    // The first 3D chase rig is attached to the hull, never to the sight or barrel.
    const p = GameState.player,
      cs = Math.cos(p.angle),
      sn = Math.sin(p.angle);
    const arm = (width < height ? 87 : 85) * zoom,
      side = (width < height ? 9 : 19) * zoom,
      rise = 31 * zoom;
    const anchor = Math.max(13, p.gunHeight),
      length = Math.hypot(arm, side, rise);
    const dx = (-cs * arm - sn * side) / length,
      dy = (-sn * arm + cs * side) / length,
      dh = rise / length;
    const reach = Math.max(2, traceBattleRay(p.x, p.y, anchor, dx, dy, dh, length, p, true).distance - 1);
    camera.position.set(p.x + dx * reach, anchor + dh * reach, p.y + dy * reach);
    camera.lookAt(p.x + cs * 78, 5, p.y + sn * 78);
    camera.updateMatrixWorld();
  }
  // Back off fill rate on integrated/mobile GPUs; never change CSS/input coordinates.
  function budget(frameMs) {
    slowFrames = frameMs > 48 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames >= 5 && renderer.getPixelRatio() > 0.6) {
      renderer.setPixelRatio(Math.max(0.6, renderer.getPixelRatio() * 0.8));
      slowFrames = 0;
    }
  }
  function pointAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // Absolute canvas coordinates, independent of drawing-buffer resolution.
    pointer.set(
      bounded((2 * (clientX - rect.left)) / rect.width - 1, -1, 1),
      bounded(1 - (2 * (clientY - rect.top)) / rect.height, -1, 1)
    );
    hasAim = true;
  }
  function screenPoint(x, y, h) {
    temp.set(x, h, y).project(camera);
    return { x: (temp.x + 1) / 2, y: (1 - temp.y) / 2 };
  }
  function aim() {
    const g = GameState,
      p = g.player;
    if (!hasAim) {
      const target = g.training && g.units[1];
      if (target) temp.set(target.x, target.aimHeight, target.y).project(camera);
      // Before the first input, show the practice target if on screen, otherwise look ahead.
      if (!target || Math.abs(temp.x) > 1 || Math.abs(temp.y) > 1 || Math.abs(temp.z) > 1)
        temp.set(p.x + Math.cos(p.angle) * 320, p.aimHeight, p.y + Math.sin(p.angle) * 320).project(camera);
      pointer.set(temp.x, temp.y);
    }
    // Keep the selected SCREEN point when driving, turning the hull or zooming.
    // Re-picking cannot steer the camera because the boom only reads p.angle.
    picker.setFromCamera(pointer, camera);
    const { origin: o, direction: d } = picker.ray;
    const picked = (g.aim = traceBattleRay(o.x, o.z, o.y, d.x, d.z, d.y, BATTLE_RANGE, p));
    p.lookAtPoint(picked.x, picked.y, picked.h);
    p.slewSight(Math.PI, Math.PI); // direct aim, with the actual model pivots and mount stops
    const reticle = el('battle-reticle');
    reticle.style.left = (pointer.x + 1) * 50 + '%';
    reticle.style.top = (1 - pointer.y) * 50 + '%';
    reticle.classList.toggle('locked', picked.hit?.team === 'enemy');
    reticle.classList.toggle('loading', p.isReloading);
  }
  function stamp(layer, x, h, z, w, sy, depth, yaw = 0, pitch = 0, color = null) {
    const m = layer.mesh,
      i = m.count;
    if (i >= layer.max) return;
    transform.position.set(x, h, z);
    transform.scale.set(w, sy, depth);
    transform.rotation.set(pitch, yaw, 0, 'YXZ');
    transform.updateMatrix();
    m.setMatrixAt(i, transform.matrix);
    if (color) m.setColorAt(i, tint.set(color));
    m.count++;
  }
  function draw() {
    const g = GameState,
      now = Date.now();
    for (const [u, v] of avatars) {
      const distant =
        u !== g.player && u.modelAsset.far && Math.hypot(u.x - g.player.x, u.y - g.player.y) > 87 / zoom;
      const lod = distant ? u.modelAsset.far : u.modelAsset;
      v.hull.geometry = lod.hull;
      v.turret.geometry = lod.turret;
      v.gun.geometry = lod.gun;
      v.root.position.set(u.x, u.modelAsset.groundY * u.modelScale, u.y);
      v.root.rotation.y = Math.PI / 2 - u.angle;
      v.turret.rotation.y = u.angle - u.tAngle;
      v.gun.rotation.x = -u.aimPitch;
      const recoil = Math.max(0, 1 - (now - u.lastShot) / 140);
      v.gun.position.z = u.modelAsset.gunPivot[2] - 0.12 * recoil;
      v.shade.position.set(u.x - 1, 0.13, u.y + 1);
      v.shade.rotation.y = v.root.rotation.y;
      if (u.dead && v.hull.material !== v.wreck) {
        v.hull.material = v.turret.material = v.gun.material = v.wreck;
      }
      v.marker.visible = !u.dead && u !== g.player && (u.team !== 'enemy' || u.visible);
      if (v.marker.visible) {
        v.marker.position.set(u.x, u.modelScale * u.modelAsset.height + 3, u.y);
        v.marker.quaternion.copy(camera.quaternion);
        v.hp.scale.set(14 * Math.max(0, u.hp / u.maxHp), 1.05, 1);
        v.hp.position.x = (v.hp.scale.x - 14) / 2;
      }
    }
    for (const [w, obj] of world.wallViews) obj.visible = !w.destroyed;
    for (const { mesh } of Object.values(layers)) mesh.count = 0;
    for (const b of g.bullets)
      stamp(layers.shells, b.x, b.h, b.y, 1.1, 1.1, 8, Math.PI / 2 - b.a, -Math.asin(b.dh), b.color);
    for (const p of g.particles) {
      const age = 1 - p.life / p.ml,
        size = p.sz * (0.8 - age * 0.45);
      stamp(layers.sparks, p.x, (p.h ?? 3) + age * 9, p.y, size, size * 1.1, size, 0, 0, p.color);
    }
    for (const c of g.casings)
      stamp(layers.casings, c.x, 1 + Math.sin((c.life / c.ml) * Math.PI) * 8, c.y, 1, 1, 2.3, c.rot);
    if (g.settings.showTracks)
      for (const tr of g.tracks)
        for (const sign of [-1, 1]) {
          const d = sign * tr.s * 10.3;
          stamp(
            layers.tracks,
            tr.x - Math.sin(tr.a) * d,
            0.16,
            tr.y + Math.cos(tr.a) * d,
            3,
            4.3,
            1,
            Math.PI / 2 - tr.a,
            -Math.PI / 2
          );
        }
    for (const s of CombatMechanics.smokeClouds)
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4,
          age = 1 - s.duration / s.maxDuration,
          k = Math.min(1, s.duration / 2, 0.3 + age * 5);
        stamp(
          layers.clouds,
          s.x + Math.cos(a) * 18,
          7 + age * 15 + (i % 3) * 6,
          s.y + Math.sin(a) * 18,
          43 * k,
          33 * k,
          43 * k,
          a
        );
      }
    for (const a of CombatMechanics.artilleryStrikes)
      if (!a.exploded) stamp(layers.strikes, a.x, 0.4, a.y, a.radius, a.radius, 1, 0, -Math.PI / 2);
    if (layers.weather) {
      const weather = WeatherEngine.currentWeather,
        rain = weather === 'rain',
        dust = weather === 'sandstorm';
      const t = performance.now() * 0.001,
        plane = camera.position,
        mod = (v, n) => ((v % n) + n) % n;
      for (const [a, b, c] of weatherSeeds) {
        const x = plane.x + mod(a - plane.x + t * (dust ? 24 : rain ? -8 : 2), 330) - 165;
        const z = plane.z + mod(c - plane.z, 330) - 165,
          h = mod(b - t * (dust ? 3 : rain ? 100 : 12), 130);
        stamp(layers.weather, x, h, z, rain ? 0.19 : 0.65, rain ? 5 : 0.62, 0.45, 0, rain ? 0.14 : 0);
      }
    }
    for (const { mesh } of Object.values(layers))
      if (mesh.count) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    renderer.render(scene, camera);
  }
  function dispose() {
    if (canvas && noticeLoss) canvas.removeEventListener('webglcontextlost', noticeLoss);
    if (scene) {
      const geos = new Set(),
        mats = new Set(),
        textures = new Set();
      scene.traverse((o) => {
        if (o.geometry) geos.add(o.geometry);
        if (o.material) for (const m of [].concat(o.material)) mats.add(m);
        if (o.isInstancedMesh) o.dispose();
      });
      if (avatars) for (const v of avatars.values()) mats.add(v.wreck);
      if (avatars)
        for (const u of avatars.keys())
          for (const lod of [u.modelAsset, u.modelAsset.far])
            if (lod) for (const key of ['hull', 'turret', 'gun']) geos.add(lod[key]);
      for (const m of mats) {
        if (m.map) textures.add(m.map);
        m.dispose();
      }
      for (const t of textures) t.dispose();
      for (const g of geos) g.dispose();
    }
    if (renderer) {
      const lost = renderer.getContext().isContextLost();
      renderer.dispose();
      if (!lost) renderer.forceContextLoss();
    }
    if (canvas) {
      const fresh = canvas.cloneNode(false);
      fresh.hidden = true;
      canvas.replaceWith(fresh);
    }
    weatherSeeds = [];
    canvas = renderer = scene = camera = world = avatars = layers = noticeLoss = null;
  }
  // Also useful for checking a hardware/driver issue without exposing saved progress.
  function stats() {
    return renderer && avatars
      ? {
          units: avatars.size,
          triangles: renderer.info.render.triangles,
          calls: renderer.info.render.calls,
          camera: camera.position.toArray(),
          direction: camera.getWorldDirection(temp).toArray(),
          projection: camera.type,
          webgl: renderer.getContext().constructor.name
        }
      : null;
  }
  return {
    open,
    build,
    budget,
    syncCamera,
    pointAt,
    screenPoint,
    aim,
    draw,
    focusDistance,
    dispose,
    stats
  };
})();
