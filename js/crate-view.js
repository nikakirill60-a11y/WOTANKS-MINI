// Presentation only: inventory, slots and rewards have already been committed by unpack().
const CrateView = (() => {
  const T = THREE, M = CrateMotion, el = id => document.getElementById(id);
  const dialog = el('container-opening'), host = el('anim-container');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const poster = (id,open) => `assets/crates/${id}${open ? '-open' : ''}.webp`;
  let job = null;

  function draw(j) { j.renderer.render(j.scene,j.camera); }
  function cameraTo(j,view) {
    j.camera.position.copy(view.position); j.controls.target.copy(view.target); j.controls.update();
  }
  function resize(j) {
    if (job !== j || !j.renderer) return;
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    if (w === j.w && h === j.h) return;
    j.w = w; j.h = h; M.frame(j.camera,w,h);
    j.renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.5)); j.renderer.setSize(w,h,false);
    j.views = [M.view(false,w),M.view(true,w)];
    if (!j.run) cameraTo(j,j.views[+j.open]);
    draw(j);
  }
  function stage(j) {
    const canvas = j.canvas = document.createElement('canvas'); canvas.id = 'crate-canvas';
    canvas.setAttribute('role','img'); canvas.setAttribute('aria-label','3D-модель: '+CONTAINERS[j.id].name); host.prepend(canvas);
    j.renderer = new T.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
    j.renderer.outputColorSpace = T.SRGBColorSpace; j.renderer.toneMapping = T.ACESFilmicToneMapping; j.renderer.toneMappingExposure = 1.02;
    j.scene = new T.Scene(); CrateModel.studio(j.scene);
    j.rig = CrateModel.build(j.id); j.rig.group.position.y = .02; j.scene.add(j.rig.group);
    j.camera = new T.PerspectiveCamera(32,1,.05,60); j.controls = new T.OrbitControls(j.camera,canvas);
    j.controls.minDistance = 2.4; j.controls.maxDistance = 14; j.controls.maxPolarAngle = Math.PI*.48; j.controls.enablePan = false;
    j.controls.addEventListener('change',() => { if (!j.run && j === job) draw(j); });
    j.loss = e => { e.preventDefault(); if (job === j) { fallback(j); finish(j); } };
    canvas.addEventListener('webglcontextlost',j.loss);
    j.observer = new ResizeObserver(() => resize(j)); j.observer.observe(host); resize(j);
  }
  function releaseGL(j) {
    j.observer?.disconnect(); j.controls?.dispose();
    if (j.scene) CrateModel.dispose(j.scene);
    if (j.loss) j.canvas.removeEventListener('webglcontextlost',j.loss);
    if (j.renderer) {
      const live = !j.renderer.getContext().isContextLost();
      j.renderer.dispose(); if (live) j.renderer.forceContextLoss();
    }
    j.canvas?.remove(); j.canvas = j.rig = j.renderer = j.scene = j.controls = j.loss = null;
  }
  function fallback(j) {
    releaseGL(j);
    j.image = new Image(); j.image.className = 'crate-poster'; j.image.alt = 'Модель: '+CONTAINERS[j.id].name;
    j.image.src = poster(j.id,false); host.prepend(j.image);
  }

  // Offline frames rendered with the same camera and motion code. Decode only on a device
  // that needs the film. A failed decode, dismissed dialog or skip can never change a reward.
  function loadFilm(j) {
    if (!j.sheet) {
      const sheet = new Image(); sheet.src = `assets/crates/${j.id}-motion.webp`;
      j.sheet = sheet.decode().then(() => sheet);
    }
    return j.sheet;
  }
  function drawFrame(j,index) {
    const f = M.film;
    if (!j.film) {
      j.film = document.createElement('canvas'); j.film.className = 'crate-film';
      j.film.width = f.w; j.film.height = f.h; j.film.setAttribute('role','img');
      j.film.setAttribute('aria-label','Запись анимации: '+CONTAINERS[j.id].name); host.prepend(j.film);
    }
    j.image.hidden = true; j.film.hidden = false;
    const tile = index + (j.open ? 0 : f.frames);
    j.film.getContext('2d').drawImage(j.atlas,(tile%f.columns)*f.w,Math.floor(tile/f.columns)*f.h,f.w,f.h,0,0,f.w,f.h);
  }
  function stopFrame(j) { cancelAnimationFrame(j.frame); j.frame = 0; }
  function next(j) {
    if (j !== job || document.hidden || j.frame || j.run?.loading) return;
    if (!j.run && !(j.rig?.bulbs.length && j.open && !motion.matches)) return;
    j.frame = requestAnimationFrame(now => tick(j,now));
  }
  function tick(j,now) {
    j.frame = 0; if (job !== j || document.hidden) return;
    const delta = Math.max(0,(now-j.last)/1000); j.last = now; j.seconds = (now-j.born)/1000;
    const r = j.run;
    if (!r) { M.lights(j.rig,j.seconds); draw(j); next(j); return; }
    r.ms += delta*1000;
    if (j.rig) {
      M.moveCamera(j.camera,j.controls.target,r.from,j.views[+j.open],r.ms); j.controls.update();
      M.step(j.rig,j.open,delta,j.seconds); draw(j);
      if (r.ms >= M.cameraMs && Math.abs(j.rig.hinge.rotation.x-(j.open ? M.angle : 0)) < .0025) { finish(j); return; }
    } else {
      const i = Math.min(M.film.frames-1, Math.floor(r.ms*M.film.fps/1000));
      if (r.index !== i) { drawFrame(j,i); r.index = i; }
      if (i === M.film.frames-1) { finish(j); return; }
    }
    next(j);
  }
  function finish(j) {
    if (job !== j) return;
    stopFrame(j); j.run = null;
    if (j.rig) {
      M.snap(j.rig,j.open,j.seconds); cameraTo(j,j.views[+j.open]); j.controls.enabled = true; draw(j);
    } else if (j.atlas) drawFrame(j,M.film.frames-1);
    else { j.image.hidden = false; j.image.src = poster(j.id,j.open); }
    el('unpack-skip').hidden = true; el('unpack-demo').disabled = false;
    el('unpack-demo').textContent = j.open ? 'Закрыть крышку' : 'Открыть крышку';
    el('unpack-replay').hidden = !j.open;
    const hint = j.rig ? 'Потяните, чтобы повернуть модель.' : 'Без WebGL 2 · запись той же модели.';
    el('unpack-hint').textContent = hint + (j.count ? '' : ' Осмотр бесплатный.');
    if (j.count) { el('reward-display').hidden = false; el('unpack-collect').focus({preventScroll:true}); }
    j.last = performance.now(); next(j);
  }
  async function play(j,open,explicit=false) {
    stopFrame(j); j.open = open;
    if (motion.matches && !explicit) { finish(j); return; }
    const r = j.run = {ms:0};
    el('unpack-replay').hidden = true; el('unpack-skip').hidden = false; el('reward-display').hidden = true;
    el('unpack-demo').textContent = open ? 'Закрыть крышку' : 'Открыть крышку';
    el('unpack-hint').textContent = open ? 'Крышка открывается…' : 'Крышка закрывается…';
    if (j.rig) {
      r.from = {position:j.camera.position.clone(),target:j.controls.target.clone()}; j.controls.enabled = false;
    } else {
      // Each recorded direction starts at its own authored endpoint.
      el('unpack-demo').disabled = true; r.loading = true;
      try {
        const atlas = await loadFilm(j); if (job !== j || j.run !== r) return;
        j.atlas = atlas; drawFrame(j,0); r.loading = false;
      } catch { if (job === j && j.run === r) finish(j); return; }
    }
    j.last = performance.now(); next(j);
  }
  function replay() {
    const j = job; if (!j || j.run) return;
    if (j.rig) { M.snap(j.rig,false,j.seconds); cameraTo(j,j.views[0]); draw(j); }
    play(j,true,true); // Explicit preview, including when reduced motion disabled automatic playback.
    el('unpack-skip').focus({preventScroll:true});
  }
  function show(id,count=0,rows=[]) {
    if (job || !Object.hasOwn(CONTAINERS,id)) return;
    const j = job = {id,count,frame:0,seconds:0,open:false};
    el('unpack-mode').textContent = count ? `ПРИЁМКА / КОНТЕЙНЕРОВ: ${count}` : 'КАТАЛОГ / БЕСПЛАТНЫЙ ОСМОТР';
    el('unpack-title').textContent = CONTAINERS[id].name;
    el('unpack-demo').hidden = !!count; el('unpack-back').hidden = !!count;
    el('unpack-skip').hidden = !count; el('unpack-replay').hidden = el('reward-display').hidden = true;
    el('reward-lines').replaceChildren(...rows.map(({title,detail,vehicle,tag}) => {
      const row = document.createElement('div'); row.className = 'unpack-row';
      const symbol = vehicle ? vehicleThumbnail(DB[vehicle]) : document.createElement('i');
      if (!vehicle) symbol.textContent = tag;
      const copy = document.createElement('span'), strong = document.createElement('strong'), small = document.createElement('small');
      strong.textContent = title; small.textContent = detail; copy.append(strong,small); row.append(symbol,copy); return row;
    }));
    dialog.showModal(); dialog.scrollTop = 0; el(count ? 'unpack-skip' : 'unpack-back').focus();
    try { stage(j); } catch { fallback(j); }
    j.born = performance.now();
    if (count) play(j,true); else finish(j);
  }
  function clear() {
    if (!job) return;
    const j = job; job = null; stopFrame(j); releaseGL(j); j.image?.remove(); j.film?.remove(); el('reward-lines').replaceChildren();
  }
  function close() {
    clear(); if (dialog.open) dialog.close();
    if (el('container-modal').open && !el('container-modal').contains(document.activeElement))
      el('container-modal').querySelector('.modal-tab.active')?.focus({preventScroll:true});
  }
  el('unpack-back').onclick = el('unpack-collect').onclick = close;
  el('unpack-demo').onclick = () => { if (job && !job.count) play(job,!job.open); };
  el('unpack-skip').onclick = () => { if (job) finish(job); };
  el('unpack-replay').onclick = replay;
  dialog.addEventListener('cancel',e => { e.preventDefault(); if (job?.count && job.run) finish(job); else close(); });
  dialog.addEventListener('close',() => { if (!dialog.open) clear(); });
  motion.addEventListener('change',() => { if (job && motion.matches) finish(job); else if (job) { job.last = performance.now(); next(job); } });
  document.addEventListener('visibilitychange',() => { if (job) { stopFrame(job); job.last = performance.now(); next(job); } });
  window.addEventListener('pagehide',() => { if (job) close(); });
  return {show,close,poster,get active(){return !!job;}};
})();
