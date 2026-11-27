// The owned vehicle and the battlefield share the same local mesh data. The
// classic depot renders on demand; winter weather is animated only while the stand is visible.
const DepotView = (() => {
  const T = THREE, winter = document.body.dataset.hangar === 'winter';
  const directions = {
    iso: [1.08, winter ? 0.26 : 0.65, 1.45],
    front: [0, 0.2, 1],
    side: [1, 0.15, 0],
    top: [0.001, 1, 0.025]
  };
  let renderer, scene, camera, controls, room, environment, resizeObserver, model, modelId, lost;
  let weather, motion, intersection, inView = true, weatherTimer = 0, lastWeatherFrame = null;
  let preset = 'iso',
    frame = 0,
    focusHeight = 0.95,
    focusZ = -0.28;

  function draw() {
    if (frame || !renderer || !model || document.hidden || !inView) return;
    clearTimeout(weatherTimer);
    frame = requestAnimationFrame(now => {
      frame = 0;
      if (!model || document.hidden || !inView) return;
      const animate = weather && !motion.matches;
      if (weather) {
        if (animate && lastWeatherFrame !== null) weather.time.value += Math.min(.25,(now-lastWeatherFrame)/1000);
        lastWeatherFrame = animate ? now : null;
        weather.cutaway(camera);
      }
      renderer.render(scene, camera);
      // Camera input still redraws immediately. Ambient movement doesn't need a 60 Hz GPU loop.
      if (animate) weatherTimer = setTimeout(draw, 42);
    });
  }
  function wake() {
    clearTimeout(weatherTimer); cancelAnimationFrame(frame);
    frame = 0; lastWeatherFrame = null; draw();
  }
  function view(name) {
    if (!model || !directions[name]) return;
    preset = name;
    const aspect = camera.aspect;
    let distance =
      (aspect < 0.8 ? 12.2 : aspect < 1.15 ? 10.2 : aspect < 1.65 ? 8.8 : 7.65) *
      (name === 'front' ? 0.83 : name === 'top' ? 0.94 : 1);
    controls.target.set(0, focusHeight, focusZ);
    // The MS-1 camera presets are the starting point. Fit each supplied mesh,
    // including long barrels, inside the viewport and above the angle controls.
    const dir = new T.Vector3(...directions[name]).normalize();
    const right = new T.Vector3().crossVectors(camera.up, dir).normalize(),
      up = new T.Vector3().crossVectors(dir, right);
    const slope = Math.tan((camera.fov * Math.PI) / 360) / camera.zoom,
      p = new T.Vector3();
    model.updateMatrixWorld(true);
    model.traverse((part) => {
      if (!part.isMesh) return;
      const positions = part.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        p.fromBufferAttribute(positions, i).applyMatrix4(part.matrixWorld).sub(controls.target);
        const depth = p.dot(dir);
        distance = Math.max(
          distance,
          depth + Math.abs(p.dot(right)) / (slope * aspect * 0.87),
          depth + Math.abs(p.dot(up)) / (slope * 0.73)
        );
      }
    });
    if (winter && name === 'iso') distance *= aspect < 1.6 ? 1.24 : 1.15;
    camera.position.copy(controls.target).addScaledVector(dir, distance);
    controls.update();
    for (const button of document.querySelectorAll('#bay-angles button'))
      button.setAttribute('aria-pressed', String(button.dataset.view === name));
    draw();
  }
  function resize() {
    const host = renderer.domElement.parentElement;
    const width = Math.max(1, host.clientWidth),
      height = Math.max(1, host.clientHeight);
    const oldAspect = camera.aspect;
    camera.aspect = width / height;
    if (winter) camera.setViewOffset(width,height,0,-height*.085,width,height);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.65, Math.sqrt(1300000 / (width * height))));
    renderer.setSize(width, height, false);
    if (Math.abs(camera.aspect - oldAspect) > 0.12) view(preset);
    draw();
  }
  function open(host, onLoss) {
    const canvas = document.createElement('canvas');
    canvas.id = 'depot-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    host.prepend(canvas);
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    lost = (event) => {
      event.preventDefault();
      onLoss();
    };
    canvas.addEventListener('webglcontextlost', lost);
    scene = new T.Scene();
    scene.background = new T.Color(winter ? '#344a61' : '#1b211d');
    scene.fog = new T.FogExp2(scene.background, winter ? .0145 : .04);
    camera = new T.PerspectiveCamera(winter ? 42 : 34, 1, 0.05, winter ? 125 : 85);
    camera.zoom = winter ? 1.08 : 1.18;
    controls = new T.OrbitControls(camera, canvas);
    controls.enablePan = false;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.85;
    controls.minDistance = 3.2;
    controls.maxDistance = 21;
    controls.minPolarAngle = 0.02;
    controls.maxPolarAngle = Math.PI * 0.488;
    scene.add(new T.HemisphereLight(winter ? '#b6d2f7' : '#e7efdc', winter ? '#37495e' : '#202c22', winter ? 1.18 : 1.65));
    const key = new T.DirectionalLight(winter ? '#ffe5be' : '#fff0cf', winter ? 2.16 : 3.5);
    if (winter) key.position.set(-7, 10, 6);
    else key.position.set(-3.5, 6.5, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const reach = winter ? 11 : 4;
    Object.assign(key.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 0.1, far: winter ? 38 : 16 });
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.bias = -0.00025;
    key.shadow.normalBias = 0.018;
    key.target.position.set(0, 0.6, -0.3);
    const fill = new T.DirectionalLight(winter ? '#97b6da' : '#c3d5e3', winter ? 0.74 : 1.15),
      rim = new T.DirectionalLight(winter ? '#9fd6ff' : '#d8e6be', winter ? 1.7 : 2.2);
    fill.position.set(5, 3, -4);
    rim.position.set(-2, 4, -5);
    scene.add(key, key.target, fill, rim);
    const source = new T.RoomEnvironment(),
      pmrem = new T.PMREMGenerator(renderer);
    environment = pmrem.fromScene(source, 0.04, 0.1, 100, { size: 64 });
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.34;
    source.dispose();
    pmrem.dispose();
    if (winter) {
      weather = buildWinterBay(scene); room = weather.room;
      motion = matchMedia('(prefers-reduced-motion: reduce)');
      motion.addEventListener('change', wake);
      document.addEventListener('visibilitychange', wake);
      intersection = new IntersectionObserver(([entry]) => {
        if (entry.target !== renderer?.domElement.parentElement) return;
        inView = entry.isIntersecting; wake();
      });
      intersection.observe(host);
    } else {
      const floor = new T.Mesh(
        new T.PlaneGeometry(200, 200),
        new T.MeshStandardMaterial({ color: '#151c16', roughness: 0.94, metalness: 0.08 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0.044;
      floor.receiveShadow = true;
      const grid = new T.GridHelper(22, 44, '#626e56', '#3f4c3d');
      grid.position.y = 0.047;
      Object.assign(grid.material, { transparent: true, opacity: 0.12, depthWrite: false });
      scene.add(floor, grid);
      room = buildInspectionBay(scene, camera, controls);
    }
    controls.addEventListener('change', draw);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();
  }
  function release(root) {
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    root.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material) for (const m of [].concat(o.material)) materials.add(m);
      if (o.isInstancedMesh) o.dispose();
      o.shadow?.dispose();
    });
    for (const m of materials) {
      if (m.map) textures.add(m.map);
      m.dispose();
    }
    for (const t of textures) t.dispose();
    // Disposes the GPU upload only. BattleModels keeps the original CPU arrays.
    for (const g of geometries) g.dispose();
  }
  function mount(host, id, asset, onLoss) {
    if (GameState.selected !== id || !GameState.owned.includes(id)) throw new Error('Машина не выбрана в ангаре.');
    if (!renderer) open(host, onLoss);
    if (model) {
      scene.remove(model);
      release(model);
    }
    modelId = id;
    model = new T.Group();
    model.name = DB[id].n;
    const material = new T.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.24,
      roughness: 0.73,
      side: T.DoubleSide
    });
    const hull = new T.Mesh(asset.hull, material),
      turret = new T.Mesh(asset.turret, material),
      gun = new T.Mesh(asset.gun, material);
    turret.position.fromArray(asset.pivot);
    gun.position.fromArray(asset.gunPivot);
    turret.add(gun);
    model.add(hull, turret);
    for (const part of [hull, turret, gun]) {
      part.castShadow = true;
      part.receiveShadow = true;
    }
    // Centre the tracks (not the end of a long gun) on the old 6.12 m turntable.
    const hullBox = asset.hull.boundingBox,
      centre = hullBox.getCenter(new T.Vector3());
    const size = hullBox.getSize(new T.Vector3()),
      fullBox = new T.Box3().setFromObject(model),
      full = fullBox.getSize(new T.Vector3());
    const scale = Math.min(1.1, 4.65 / size.z, 2.65 / size.x, 6.4 / full.z);
    model.scale.setScalar(scale);
    model.position.set(-centre.x * scale, 0.089 + asset.groundY * scale, -0.31 - centre.z * scale);
    focusHeight = 0.12 + asset.height * scale * 0.46;
    focusZ = -0.31 + (fullBox.getCenter(new T.Vector3()).z - centre.z) * scale * 0.8;
    scene.add(model);
    renderer.shadowMap.needsUpdate = true;
    renderer.domElement.setAttribute(
      'aria-label',
      '3D-ангар: ' + DB[id].n + '. Перетащите для вращения; колесо или щипок — масштаб.'
    );
    view('iso');
    weather?.cutaway(camera);
    renderer.render(scene, camera);
  }
  function close() {
    clearTimeout(weatherTimer);
    motion?.removeEventListener('change', wake);
    document.removeEventListener('visibilitychange', wake);
    intersection?.disconnect();
    motion = intersection = weather = lastWeatherFrame = null; inView = true;
    cancelAnimationFrame(frame);
    frame = 0;
    resizeObserver?.disconnect();
    controls?.dispose();
    if (scene) release(scene);
    environment?.dispose();
    if (renderer) {
      const canvas = renderer.domElement;
      canvas.removeEventListener('webglcontextlost', lost);
      const live = !renderer.getContext().isContextLost();
      renderer.dispose();
      if (live) renderer.forceContextLoss();
      canvas.remove();
    }
    renderer =
      scene =
      camera =
      controls =
      room =
      environment =
      resizeObserver =
      model =
      modelId =
      lost =
        null;
  }
  function stats() {
    if (!model) return null;
    let triangles = 0;
    model.traverse((o) => {
      if (o.isMesh) triangles += o.geometry.attributes.position.count / 3;
    });
    return {
      id: modelId,
      room: room.name,
      triangles,
      camera: camera.position.toArray(),
      calls: renderer.info.render.calls
    };
  }
  function refreshTree() { if (weather?.dress(GameState.treeSlots2026)) draw(); }
  return { mount, view, close, stats, refreshTree };
})();
