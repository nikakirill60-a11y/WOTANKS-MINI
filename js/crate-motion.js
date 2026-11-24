// Opening routine ported from the supplied novogodniy-konteiner-game.html:
// Bo.iso/open + L_/D_ for the camera, and the renderer loop for hinge, lamp and garland.
// The live rig and the offline film renderer both call this code (no second Three.js engine).
const CrateMotion = (() => {
  const T = THREE, angle = -2.55, cameraMs = 1050;
  function view(open, width) {
    const target = open ? new T.Vector3(0,.82,-.18) : new T.Vector3(0,1.02,0);
    const dir = open ? new T.Vector3(.92,1.72,1.22) : new T.Vector3(1.28,.78,1.62);
    const narrow = width < 700;
    if (narrow) target.y += .15;
    return {target, position:target.clone().addScaledVector(dir.normalize(), narrow ? 6.6 : open ? 5.05 : 5.45)};
  }
  // The game uses a short dialog instead of the full showcase viewport. Widen the crop,
  // not the camera path, so the apex of the swinging lid stays inside that panel.
  function frame(camera,w,h,viewWidth=w) {
    const narrow = viewWidth < 700;
    camera.zoom = Math.min(narrow ? .78 : .58, .92*(w/h)/(narrow ? 1.18 : 1.63));
    camera.setViewOffset(w,h,0,-.5*h*camera.zoom*(narrow ? .25 : .43),w,h);
  }
  function moveCamera(camera, look, from, to, ms) {
    const t = Math.min(1, ms / cameraMs), k = t*t*(3-2*t);
    camera.position.lerpVectors(from.position,to.position,k);
    look.lerpVectors(from.target,to.target,k);
  }
  function lights(rig, seconds) {
    const lit = Math.abs(rig.hinge.rotation.x / angle) > .45;
    rig.bulbs.forEach(({material,base},i) => {
      const wave = .8 + .35*Math.sin(seconds*2.4 + i*1.87);
      material.color.copy(base).multiplyScalar(lit ? wave : .34);
      material.emissiveIntensity = lit ? .55 + .45*wave : .12;
    });
  }
  function step(rig, open, delta, seconds) {
    // MathUtils.damp(..., 4.1, min(dt,.1)) in the original, independently of the camera clock.
    const a = 1 - Math.exp(-4.1 * Math.min(delta,.1));
    rig.hinge.rotation.x = (1-a)*rig.hinge.rotation.x + a*(open ? angle : 0);
    if (rig.glow) rig.glow.intensity = (1-a)*rig.glow.intensity + a*(open ? 26 : 0);
    lights(rig, seconds);
  }
  function snap(rig, open, seconds=0) {
    rig.hinge.rotation.x = open ? angle : 0;
    if (rig.glow) rig.glow.intensity = open ? 26 : 0;
    lights(rig,seconds);
  }
  // Two tracks because the author's damped closing is not the opening played backwards.
  const film = Object.freeze({frames:28, columns:7, fps:16, w:384, h:240});
  return {angle,cameraMs,view,frame,moveCamera,step,snap,lights,film};
})();
