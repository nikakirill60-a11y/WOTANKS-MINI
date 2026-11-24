// Visuals only. Inventory and rewards have already been committed before an opening starts.
const CrateView = (() => {
  const T=THREE, el=id=>document.getElementById(id), dialog=el('container-opening'), host=el('anim-container');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let job=null;
  const poster=(id,open)=>`assets/crates/${id}${open?'-open':''}.webp`;
  // Fit the actual posed vertices, including the swept-back lid and display base. Cache both
  // ends on resize rather than traversing the geometry on each animation frame.
  function framing(j,open){
    j.rig.pose(open);j.scene.updateMatrixWorld(true);
    const target=new T.Box3().setFromObject(j.scene).getCenter(new T.Vector3());
    const dir=(open?new T.Vector3(.83,1.94,1.13):new T.Vector3(1.25,.97,1.66)).normalize();
    const right=new T.Vector3().crossVectors(j.camera.up,dir).normalize(),up=new T.Vector3().crossVectors(dir,right),v=new T.Vector3();
    const slope=Math.tan(j.camera.fov*Math.PI/360)*.88;let d=0;
    j.scene.traverse(o=>{
      if(!o.isMesh)return;const xyz=o.geometry.attributes.position;
      for(let i=0;i<xyz.count;i++){
        v.fromBufferAttribute(xyz,i).applyMatrix4(o.matrixWorld).sub(target);
        d=Math.max(d,v.dot(dir)+Math.max(Math.abs(v.dot(up)),Math.abs(v.dot(right))/j.camera.aspect)/slope);
      }
    });
    return {target,position:dir.multiplyScalar(d).add(target)};
  }
  function paint(){if(job?.renderer)job.renderer.render(job.scene,job.camera);}
  function resize(j){
    if(job!==j||!j.renderer)return;
    const w=Math.max(1,host.clientWidth), h=Math.max(1,host.clientHeight);
    if(j.width===w && j.height===h)return;j.width=w;j.height=h;
    j.camera.aspect=w/h;j.camera.updateProjectionMatrix();j.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6,Math.sqrt(800000/(w*h))));
    j.renderer.setSize(w,h,false);j.views=[framing(j,0),framing(j,1)];j.rig.pose(j.fraction);
    if(!j.tween){const view=j.views[j.fraction>=1?1:0];j.camera.position.copy(view.position);j.controls.target.copy(view.target);j.controls.update();}
    paint();
  }
  function stage(j){
    const canvas=document.createElement('canvas');canvas.id='crate-canvas';canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label','3D-модель: '+CONTAINERS[j.id].name);host.prepend(canvas);
    j.canvas=canvas; j.renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    j.renderer.setClearColor(0,0);j.renderer.toneMapping=T.ACESFilmicToneMapping;j.renderer.toneMappingExposure=1.08;
    j.scene=new T.Scene();CrateModel.light(j.scene);j.rig=CrateModel.build(j.id);j.rig.group.position.y=.02;j.scene.add(j.rig.group);
    const plinth=new T.Mesh(new T.CylinderGeometry(1.84,1.90,.11,64),new T.MeshStandardMaterial({color:'#394d57',metalness:.28,roughness:.8}));
    plinth.position.y=-.055;j.scene.add(plinth);
    for(const [r,w,col] of [[1.67,.014,'#81949a'],[1.79,.022,'#bb9b65']]){
      const ring=new T.Mesh(new T.RingGeometry(r,r+w,64),new T.MeshBasicMaterial({color:col}));ring.rotation.x=-Math.PI/2;ring.position.y=.002;j.scene.add(ring);
    }
    const shade=new T.Mesh(new T.CircleGeometry(1,48),new T.MeshBasicMaterial({color:'#27383c',transparent:true,opacity:.6,depthWrite:false}));
    shade.rotation.x=-Math.PI/2;shade.scale.set(1.41,.94,1);shade.position.y=.004;j.scene.add(shade);
    j.camera=new T.PerspectiveCamera(37,1,.05,45);j.controls=new T.OrbitControls(j.camera,canvas);
    j.controls.enablePan=false;j.controls.minDistance=2.9;j.controls.maxDistance=10;j.controls.maxPolarAngle=Math.PI*.48;
    j.controls.addEventListener('change',()=>{if(!j.tween)paint();});
    j.loss=e=>{e.preventDefault();if(j===job)fallback(j);};canvas.addEventListener('webglcontextlost',j.loss);
    j.observer=new ResizeObserver(()=>resize(j));j.observer.observe(host);resize(j);
  }
  function release(j){
    cancelAnimationFrame(j.frame);j.frame=0;j.tween=null;j.observer?.disconnect();j.controls?.dispose();
    if(j.scene)CrateModel.dispose(j.scene);
    if(j.canvas&&j.loss)j.canvas.removeEventListener('webglcontextlost',j.loss);
    if(j.renderer){const live=!j.renderer.getContext().isContextLost();j.renderer.dispose();if(live)j.renderer.forceContextLoss();}
    j.canvas?.remove();j.canvas=j.renderer=j.scene=j.rig=j.controls=j.observer=null;
  }
  function finish(j){
    if(job!==j)return;
    cancelAnimationFrame(j.frame);j.frame=0;j.tween=null;j.fraction=j.target;
    if(j.rig){
      j.rig.pose(j.target);const p=j.views[j.target];j.camera.position.copy(p.position);j.controls.target.copy(p.target);
      j.controls.enabled=true;j.controls.update();paint();
    }else if(j.image)j.image.src=poster(j.id,j.target);
    el('unpack-skip').hidden=true;
    el('unpack-demo').textContent=j.target?'Закрыть крышку':'Посмотреть внутри';
    const hint=j.image?'Статичный вид модели · WebGL 2 недоступен.':'Потяните, чтобы повернуть модель.';
    el('unpack-hint').textContent=j.count?hint:hint+' Осмотр бесплатный.';
    if(j.count){
      el('reward-display').hidden=false;el('unpack-collect').focus({preventScroll:true});
    }
  }
  function fallback(j){
    release(j);
    if(!j.image){j.image=new Image();j.image.className='crate-poster';j.image.alt='Изображение модели: '+CONTAINERS[j.id].name;host.prepend(j.image);}
    finish(j);
  }
  function animate(j,target){
    cancelAnimationFrame(j.frame);j.target=target;
    if(!j.renderer||motion.matches){finish(j);return;}
    const from=j.fraction, position=j.camera.position.clone(),look=j.controls.target.clone();
    let start=null;
    j.controls.enabled=false;j.tween=true;
    el('unpack-hint').textContent=target?'Крышка открывается…':'Крышка закрывается…';
    el('unpack-demo').textContent=target?'Закрыть крышку':'Посмотреть внутри';
    function tick(now){
      if(job!==j||!j.tween)return;
      start??=now;
      const u=Math.min(1,(now-start)/1450),e=u*u*(3-2*u),p=j.views[target];
      j.fraction=from+(target-from)*e;j.rig.pose(j.fraction);
      j.camera.position.lerpVectors(position,p.position,e);j.controls.target.lerpVectors(look,p.target,e);j.controls.update();paint();
      if(u===1)finish(j);else j.frame=requestAnimationFrame(tick);
    }
    j.frame=requestAnimationFrame(tick);
  }
  function show(id,count=0,rows=[]){
    if(job||!Object.hasOwn(CONTAINERS,id))return;
    const j=job={id,count,frame:0,target:count?1:0,fraction:0};
    el('unpack-mode').textContent=count?`ПРИЁМКА / КОНТЕЙНЕРОВ: ${count}`:'КАТАЛОГ / БЕСПЛАТНЫЙ ОСМОТР';
    el('unpack-title').textContent=CONTAINERS[id].name;
    el('unpack-demo').hidden=!!count;el('unpack-skip').hidden=!count;el('unpack-back').hidden=!!count;
    el('reward-display').hidden=true;
    el('reward-lines').replaceChildren(...rows.map(({title,detail,image,tag})=>{
      const row=document.createElement('div');row.className='unpack-row';
      const symbol=image?new Image():document.createElement('i');
      if(image){symbol.src=image;symbol.alt='';}else symbol.textContent=tag;
      const copy=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');
      strong.textContent=title;small.textContent=detail;copy.append(strong,small);row.append(symbol,copy);return row;
    }));
    dialog.showModal();dialog.scrollTop=0;
    if(count)el('unpack-skip').focus();else el('unpack-back').focus();
    try{stage(j);}catch{fallback(j);return;}
    if(count)animate(j,1);else finish(j);
  }
  function clear(){
    if(!job)return;const j=job;job=null;release(j);j.image?.remove();el('reward-lines').replaceChildren();
  }
  function close(){
    clear();if(dialog.open)dialog.close();
    if(el('container-modal').open && !el('container-modal').contains(document.activeElement))
      el('container-modal').querySelector('.modal-tab.active')?.focus({preventScroll:true});
  }
  el('unpack-back').onclick=el('unpack-collect').onclick=close;
  el('unpack-demo').onclick=()=>{if(job&&!job.count)animate(job,1-job.target);};
  el('unpack-skip').onclick=()=>{if(job)finish(job);};
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(job?.count && job.tween)finish(job);else close();});
  dialog.addEventListener('close',()=>{if(!dialog.open)clear();});
  motion.addEventListener('change',()=>{if(motion.matches && job?.tween)finish(job);});
  window.addEventListener('pagehide',()=>{if(job)close();});
  return {show,close,poster,get active(){return !!job;}};
})();
