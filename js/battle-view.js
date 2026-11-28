// One WebGL scene per match. Models, projectiles, cover, sights and the orbit camera
// share world coordinates; Canvas2D is only used for small textures and the minimap.
const BattleView = (() => {
  const T = THREE,
    el = (id) => document.getElementById(id);
  const sight = new T.Vector2(0, ArcadeLook.sightY),
    picker = new T.Raycaster(),
    temp = new T.Vector3(),
    viewDirection = new T.Vector3();
  const transform = new T.Object3D(),
    tint = new T.Color();
  let renderer, scene, camera, world, avatars, layers, noticeLoss, canvas;
  let weatherSeeds = [];
  let look, artillery,
    autoTarget,
    width = 0,
    height = 0,
    slowFrames = 0;

  function open(onContextLost) {
    canvas = el('game');
    width = height = slowFrames = 0;
    autoTarget = null;
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
      const hull = new T.Mesh(asset.body || asset.hull, mat),
        turret = new T.Mesh(asset.turret, mat),
        gun = new T.Mesh(asset.gun, mat);
      turret.position.fromArray(asset.pivot);
      gun.position.fromArray(asset.gunPivot);
      root.scale.setScalar(u.modelScale);
      let cradle = null,
        treads = null;
      if (asset.suspension) {
        // Around the authored suspension pivot, not the gun trunnion. Tracks stay on the ground.
        cradle = new T.Group();
        cradle.position.fromArray(asset.suspension);
        hull.position.copy(cradle.position).multiplyScalar(-1);
        turret.position.sub(cradle.position);
        cradle.add(hull, turret);
        treads = new T.Mesh(asset.treads, mat);
        root.add(treads, cradle);
      } else root.add(hull, turret);
      const wheels=new RoadWheels(asset,mat); root.add(wheels.mesh);
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
      let plate;
      if (u.callsign && u !== GameState.player) {
        // The callsign sits above numerical HP and the ordinary bar. Same billboard,
        // depth test and visibility as the bar; allocate one texture, not one per hit.
        const image = document.createElement('canvas'), ctx = image.getContext('2d');
        ctx.font = 'bold 40px sans-serif'; image.width = Math.min(600,Math.ceil(Math.max(168,ctx.measureText(u.callsign).width+20))); image.height=96;
        const map = new T.CanvasTexture(image); map.colorSpace = T.SRGBColorSpace;
        const label = new T.Mesh(quad,new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}));
        label.name='callsign:'+u.callsign; label.position.y=6; label.scale.set(9*image.width/96,9,1); marker.add(label);
        plate={hp:null,refresh(hp) {
          if (plate.hp===hp) return; plate.hp=hp;
          const w=image.width; ctx.clearRect(0,0,w,96); ctx.textAlign='center'; ctx.lineJoin='round';
          ctx.lineWidth=6; ctx.strokeStyle='#102320';
          for (const [text,y,font,color] of [[u.callsign,41,'bold 40px sans-serif','#c3fff0'],[hp+' / '+u.maxHp,80,'bold 30px sans-serif','#fff']]) {
            ctx.font=font; ctx.fillStyle=color; ctx.strokeText(text,w/2,y,w-8); ctx.fillText(text,w/2,y,w-8);
          }
          map.needsUpdate=true;
        }};
      } else marker.add(flag);
      scene.add(marker);
      avatars.set(u, { root, wheels, hull, cradle, treads, turret, gun, shade, marker, plate, hp, wreck });
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
    look = new ArcadeLook(GameState.player.angle);
    canvas.hidden = false;
    syncCamera();
    aim();
    draw();
  }
  function rotate(dx, dy) {
    const sensitivity = GameState.settings.lookSensitivity || 1;
    if (artillery) artillery.pan(dx, dy, height, sensitivity);
    else look?.rotate(dx, dy, sensitivity);
  }
  function toggleScope() {
    if (!look) return;
    if (!GameState.player.isSPG) { look.toggleScope(); return; }
    if (artillery) artillery = null;
    else {
      syncCamera();
      const p = GameState.player, q = pickSight();
      // Start at the existing sight if it found the board; never seek an unspotted enemy.
      const point = q.hit && Math.hypot(q.x - p.x, q.y - p.y) > 35 ? q :
        {x:p.x + 280 * Math.cos(look.yaw), y:p.y + 280 * Math.sin(look.yaw)};
      artillery = new ArtillerySight(GameState.arena.bounds, point);
      autoTarget = null;
    }
    document.body.classList.toggle('artillery-view', !!artillery);
    syncCamera(); aim();
  }
  function focusDistance(delta) {
    if (!look || !delta) return;
    if (artillery) artillery.level = bounded(artillery.level - Math.sign(delta), 0, 2);
    else if (GameState.player.isSPG && delta < 0 && look.targetDistance <= 6.01) toggleScope();
    else look.wheel(delta);
  }
  function syncCamera(dt = 0) {
    if (!look || !camera) return;
    const w = canvas.clientWidth,
      h = canvas.clientHeight,
      resized = w > 0 && h > 0 && (w !== width || h !== height);
    if (resized) {
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
    }
    const fov = artillery ? ArtillerySight.fov : look.fov;
    if (resized || camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    if (artillery) {
      const {x, y, h, altitude} = artillery;
      camera.up.set(0, 0, -1); // north up, the same axes as the minimap
      camera.position.set(x, h + altitude, y);
      camera.lookAt(x, h, y); camera.updateMatrixWorld();
      return;
    }
    camera.up.set(0, 1, 0);
    const p = GameState.player,
      m = BATTLE_UNITS_PER_METRE,
      dx = Math.cos(look.yaw) * Math.cos(look.pitch),
      dy = Math.sin(look.yaw) * Math.cos(look.pitch),
      dh = -Math.sin(look.pitch);
    look.distance += (look.targetDistance - look.distance) * Math.min(1, dt * 8);
    if (look.scoped) {
      const base = p.gunPivotWorld(),
        x = base.x + 1.2 * m * dx,
        y = base.y + 1.2 * m * dy;
      camera.position.set(x, Math.max(surfaceHeight(x, y) + 0.2 * m, base.h + m * (0.35 + 1.2 * dh)), y);
    } else {
      const anchor = p.rideHeight + p.modelAsset.height * p.modelScale + 0.9 * m;
      const wall = nearestBattleWall(p.x, p.y, anchor, -dx, -dy, -dh, look.distance * m);
      const hitMetres = wall.distance / m;
      const safe = wall.hit
        ? Math.max(0.1, Math.min(hitMetres - 0.05, Math.max(2.5, hitMetres - 0.6)))
        : look.distance;
      look.wallDistance =
        safe < look.wallDistance
          ? safe
          : look.wallDistance + (safe - look.wallDistance) * Math.min(1, dt * 3);
      const back = Math.min(look.wallDistance, look.distance) * m;
      const x = p.x - back * dx,
        y = p.y - back * dy;
      camera.position.set(x, Math.max(surfaceHeight(x, y) + 0.8 * m, anchor - back * dh), y);
    }
    camera.lookAt(temp.copy(camera.position).add(viewDirection.set(dx, dh, dy)));
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
  function screenPoint(x, y, h) {
    temp.set(x, h, y).project(camera);
    return { x: (temp.x + 1) / 2, y: (1 - temp.y) / 2 };
  }
  function pickSight() {
    if (artillery) {
      const {x, y, h} = artillery;
      return (GameState.aim = {x, y, h, hit:null});
    }
    picker.setFromCamera(sight, camera);
    const { origin: o, direction: d } = picker.ray,
      m = BATTLE_UNITS_PER_METRE,
      p = GameState.player;
    const near = look.scoped ? 0 : Math.max(0, Math.min(look.distance, look.wallDistance) - 2) * m;
    return (GameState.aim = traceBattleRay(
      o.x + near * d.x,
      o.z + near * d.z,
      o.y + near * d.y,
      d.x,
      d.z,
      d.y,
      720 * m - near,
      p,
      false,
      true,
      true
    ));
  }
  function lockable(u) {
    const p = GameState.player;
    return (
      u &&
      u.team === 'enemy' &&
      u.visible &&
      !u.dead &&
      Math.hypot(u.x - p.x, u.y - p.y) <= 520 * BATTLE_UNITS_PER_METRE &&
      clearBattleSight(p, u)
    );
  }
  function toggleAutoAim() {
    if (!look || !GameState.gameActive || artillery) return;
    if (autoTarget) {
      autoTarget = null;
      combatMessage('Автоприцел снят', '#ded2b6');
      return;
    }
    syncCamera();
    let best = 0.25;
    for (const u of GameState.units) {
      if (u.team !== 'enemy' || !u.visible || u.dead) continue;
      temp.set(u.x, u.aimHeight, u.y).project(camera);
      const d = Math.hypot(temp.x, temp.y - sight.y);
      if (temp.z >= -1 && temp.z <= 1 && d < best && lockable(u)) {
        best = d;
        autoTarget = u;
      }
    }
    combatMessage(
      autoTarget ? 'Автоприцел: ' + autoTarget.name : 'Нет видимой цели у прицела',
      autoTarget ? '#bce4d3' : '#ded2b6'
    );
  }
  // Advance the mount only on simulation ticks. A click or a slow/fast display
  // must never add an extra slew step or snap a shot to the camera ray.
  function stepPlayer(dt, mountYaw, aimOnly = false) {
    if (!look || !camera) return; // non-rendered battle simulation
    const g = GameState,
      p = g.player;
    if (!aimOnly) p.tAngle = wrapAngle(p.angle + mountYaw);
    p.constrainTraverse();
    syncCamera(dt);
    if (artillery) {
      if (!aimOnly) artillery.step(p, dt, g.holdTurret);
      return;
    }
    const q = pickSight();
    if (autoTarget && !lockable(autoTarget)) autoTarget = null;
    if (g.holdTurret) return;
    if (autoTarget) {
      const u = autoTarget,
        flight = Math.hypot(u.x - p.x, u.y - p.y) / p.shellStep(p.roundFor(g.curShell));
      p.lookAtPoint(u.x + u.vx * flight, u.y + u.vy * flight, u.aimHeight);
    } else p.lookAtPoint(q.x, q.y, q.h);
    if (!aimOnly) p.slewDriver(dt);
  }
  function aim() {
    const g = GameState,
      p = g.player,
      picked = pickSight(),
      reticle = el('battle-reticle');
    if (artillery) {
      const a = artillery, aligned = a.aligned(p);
      const state = a.close(p) ? 'Слишком близко' : g.holdTurret ? 'Обзор' :
        !p.canTraverseTo(a.bearing(p)) ? 'Доворот корпуса' : !aligned ? 'Наведение' :
        p.isMoving ? 'В движении' : p.isReloading ? 'Перезарядка' : a.focus < 1 ? 'Сведение' : 'Сведено';
      const overlay = el('arty-overlay');
      overlay.classList.toggle('ready', state === 'Сведено');
      overlay.classList.toggle('blocked', !aligned || g.holdTurret);
      el('arty-dispersion').style.setProperty('--diameter', (2 * a.radius * height / a.span).toFixed(1) + 'px');
      el('arty-fill').style.transform = `scaleX(${a.focus.toFixed(3)})`;
      if (el('arty-state').textContent !== state) el('arty-state').textContent = state;
      el('arty-zoom').textContent = el('zoom-btn').textContent = '×' + a.zoom;
      el('scope-btn').setAttribute('aria-pressed', 'true');
      el('autoaim-btn').setAttribute('aria-pressed', 'false');
      el('zoom-btn').hidden = false;
      return;
    }
    reticle.classList.toggle('locked', picked.hit?.team === 'enemy');
    reticle.classList.toggle('loading', p.isReloading || p.calibration?.until != null);
    const actual = p.sightHit(BATTLE_RANGE, false, true),
      marker = el('gun-marker');
    temp.set(actual.x, actual.h, actual.y).project(camera);
    marker.hidden = temp.z < -1 || temp.z > 1 || Math.abs(temp.x) > 1 || Math.abs(temp.y) > 1;
    if (!marker.hidden) {
      marker.style.left = (temp.x + 1) * 50 + '%';
      marker.style.top = (1 - temp.y) * 50 + '%';
    }
    marker.classList.toggle('on-target', actual.hit?.team === 'enemy' && actual.hit.visible);
    el('hud').classList.toggle('scoped', look.scoped);
    const info = el('sight-mode'),
      text = [look.scoped ? 'ОПТИКА ×' + look.zoom : p.isSPG && g.controlMode === 'pc' ? 'SHIFT · АРТ-ПРИЦЕЛ' : '', g.holdTurret ? 'ОБЗОР' : autoTarget ? 'АВТО' : '']
        .filter(Boolean)
        .join(' · ');
    if (info.textContent !== text) info.textContent = text;
    info.hidden = !text;
    el('scope-btn').setAttribute('aria-pressed', String(look.scoped));
    el('autoaim-btn').setAttribute('aria-pressed', String(!!autoTarget));
    el('zoom-btn').hidden = !look.scoped;
    el('zoom-btn').textContent = '×' + look.zoom;
  }
  function stamp(layer, x, h, z, w, sy, depth, yaw = 0, pitch = 0, color = null, trail = null) {
    const m = layer.mesh,
      i = m.count;
    if (i >= layer.max) return;
    transform.position.set(x, h, z);
    transform.scale.set(w, sy, depth);
    if (trail) {
      transform.rotation.set(-trail.pitch, yaw, trail.roll, 'YXZ');
      transform.rotateX(-Math.PI / 2);
    } else transform.rotation.set(pitch, yaw, 0, 'YXZ');
    transform.updateMatrix();
    m.setMatrixAt(i, transform.matrix);
    if (color) m.setColorAt(i, tint.set(color));
    m.count++;
  }
  function draw() {
    const g = GameState,
      now = BattleClock.date();
    const markerScale = artillery ? bounded(1.5 * artillery.span / Math.max(height, 1), .8, 4) : 1;
    for (const [u, v] of avatars) {
      const distant =
        u !== g.player && u.modelAsset.far && Math.hypot(u.x - g.player.x, u.y - g.player.y) > 87 * look.zoom;
      const lod = distant ? u.modelAsset.far : u.modelAsset;
      v.root.visible = v.shade.visible = !(u === g.player && look.scoped) &&
        !(artillery && u.team === 'enemy' && !u.visible);
      v.wheels.follow(u,u!==g.player && Math.hypot(u.x-g.player.x,u.y-g.player.y)>55*BATTLE_UNITS_PER_METRE*look.zoom);
      v.hull.geometry = lod.body || lod.hull;
      v.turret.geometry = lod.turret;
      v.gun.geometry = lod.gun;
      const base = bodyPoint(u, 0, u.modelAsset.groundY * u.modelScale, 0),
        frame = bodyAxes(u);
      v.root.position.set(base.x, base.h, base.y);
      v.root.rotation.set(-frame.p, Math.PI / 2 - u.angle, frame.r, 'YXZ');
      v.turret.rotation.y = u.angle - u.tAngle;
      const tilt = u.suspensionPitch;
      if (v.cradle) v.cradle.rotation.x = -tilt;
      v.gun.rotation.x = tilt - u.aimPitch;
      const recoil = Math.max(0, 1 - (now - u.lastShot) / 140);
      v.gun.position.z =
        u.modelAsset.gunPivot[2] - (u.modelAsset.suspension || u.modelAsset.upperBox ? 0 : 0.12 * recoil);
      v.shade.position.set(u.x, surfaceHeight(u.x, u.y) + 0.22, u.y);
      v.shade.rotation.set(-u.groundPitch, v.root.rotation.y, u.groundRoll, 'YXZ');
      v.shade.rotateX(-Math.PI / 2);
      if (u.dead && v.hull.material !== v.wreck) {
        v.wheels.mesh.material = v.hull.material = v.turret.material = v.gun.material = v.wreck;
        if (v.treads) v.treads.material = v.wreck;
      }
      v.marker.visible = !u.dead && u !== g.player && (u.team !== 'enemy' || u.visible);
      if (v.marker.visible) {
        v.plate?.refresh(Math.ceil(u.hp));
        v.marker.position.set(u.x, u.rideHeight + u.modelScale * u.modelAsset.height + 3, u.y);
        v.marker.scale.setScalar(markerScale);
        if (artillery) v.marker.position.z -= 20 + 2 * markerScale; // clear the silhouette in plan view
        v.marker.quaternion.copy(camera.quaternion);
        v.hp.scale.set(14 * Math.max(0, u.hp / u.maxHp), 1.05, 1);
        v.hp.position.x = (v.hp.scale.x - 14) / 2;
      }
    }
    world.syncBuildings();
    for (const { mesh } of Object.values(layers)) mesh.count = 0;
    for (const b of g.bullets)
      stamp(layers.shells, b.x, b.h, b.y, 1.1, 1.1, 8, Math.PI / 2 - b.a, -Math.asin(b.dh), b.color);
    for (const p of g.particles) {
      const age = 1 - p.life / p.ml,
        size = p.sz * (0.8 - age * 0.45);
      stamp(
        layers.sparks,
        p.x,
        (p.h ?? surfaceHeight(p.x, p.y) + 3) + age * 9,
        p.y,
        size,
        size * 1.1,
        size,
        0,
        0,
        p.color
      );
    }
    for (const c of g.casings)
      stamp(
        layers.casings,
        c.x,
        surfaceHeight(c.x, c.y) + 1 + Math.sin((c.life / c.ml) * Math.PI) * 8,
        c.y,
        1,
        1,
        2.3,
        c.rot
      );
    if (g.settings.showTracks)
      for (const tr of g.tracks) {
        if (artillery && tr.unspotted) continue; // no live trail to an unseen vehicle on the board
        for (const sign of [-1, 1]) {
          const d = sign * tr.s * 10.3;
          stamp(
            layers.tracks,
            tr.x - Math.sin(tr.a) * d,
            tr.h + 0.23 - Math.sin(tr.roll) * d,
            tr.y + Math.cos(tr.a) * d,
            3,
            4.3,
            1,
            Math.PI / 2 - tr.a,
            -Math.PI / 2,
            null,
            tr
          );
        }
      }
    for (const s of CombatMechanics.smokeClouds)
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4,
          age = 1 - s.duration / s.maxDuration,
          k = Math.min(1, s.duration / 2, 0.3 + age * 5);
        stamp(
          layers.clouds,
          s.x + Math.cos(a) * 18,
          surfaceHeight(s.x, s.y) + 7 + age * 15 + (i % 3) * 6,
          s.y + Math.sin(a) * 18,
          43 * k,
          33 * k,
          43 * k,
          a
        );
      }
    for (const a of CombatMechanics.artilleryStrikes)
      if (!a.exploded)
        stamp(
          layers.strikes,
          a.x,
          surfaceHeight(a.x, a.y) + 0.4,
          a.y,
          a.radius,
          a.radius,
          1,
          0,
          -Math.PI / 2
        );
    if (layers.weather) {
      const weather = WeatherEngine.currentWeather,
        rain = weather === 'rain',
        dust = weather === 'sandstorm';
      const t = BattleClock.now() * 0.001,
        plane = camera.position,
        mod = (v, n) => ((v % n) + n) % n;
      for (const [a, b, c] of weatherSeeds) {
        const x = plane.x + mod(a - plane.x + t * (dust ? 24 : rain ? -8 : 2), 330) - 165;
        const z = plane.z + mod(c - plane.z, 330) - 165,
          h = Math.max(0, g.player.rideHeight) + mod(b - t * (dust ? 3 : rain ? 100 : 12), 130);
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
    look = artillery = autoTarget = null;
    document.body.classList.remove('artillery-view');
    canvas = renderer = scene = camera = world = avatars = layers = noticeLoss = null;
  }
  // Also useful for checking a hardware/driver issue without exposing saved progress.
  function stats() {
    return renderer && avatars
      ? {
          mode: artillery ? 'artillery' : look?.mode,
          zoom: artillery?.zoom ?? look?.zoom,
          fov: camera.fov,
          yaw: look?.yaw,
          pitch: look?.pitch,
          distance: look?.distance,
          wallDistance: look?.wallDistance,
          autoTarget: autoTarget?.id || null,
          units: avatars.size,
          nameplates: [...avatars.values()].flatMap(v => v.marker.children.filter(c=>c.name.startsWith('callsign:')).map(c=>c.name.slice(9))),
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
    rotate,
    stepPlayer,
    toggleAutoAim,
    toggleScope,
    get artillery() { return artillery; },
    cycleZoom: () => { if (artillery) artillery.level = (artillery.level + 1) % 3; else look?.cycleZoom(); },
    screenPoint,
    aim,
    draw,
    focusDistance,
    dispose,
    stats
  };
})();
