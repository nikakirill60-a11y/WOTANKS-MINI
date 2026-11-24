// A frosted inspection plinth. The scenic matte and composited snowfall live behind/over
// the transparent WebGL stand, so the stationary garage does not render 3D at 60 Hz.
function buildWinterBay(scene) {
  const T = THREE, room = new T.Group(); room.name = 'Северное депо · Полярная ночь';
  room.position.z = -.31;
  function disc(radius, height, y, colour, metalness) {
    const mesh = new T.Mesh(new T.CylinderGeometry(radius,radius+.025,height,96),
      new T.MeshStandardMaterial({color:colour,roughness:.84,metalness}));
    mesh.position.y=y; mesh.receiveShadow=true; room.add(mesh);
  }
  disc(3.03,.16,-.055,'#314857',.65);
  disc(3.02,.058,.055,'#587185',.19);
  for (const [r,w,colour] of [[2.79,.014,'#7694a1'],[2.88,.025,'#577885'],[2.99,.012,'#e5d2a9']]) {
    const ring=new T.Mesh(new T.RingGeometry(r,r+w,96),new T.MeshBasicMaterial({color:colour,side:T.DoubleSide}));
    ring.rotation.x=-Math.PI/2; ring.position.y=.085; room.add(ring);
  }
  const studs=new T.InstancedMesh(new T.BoxGeometry(.038,.012,.11),new T.MeshBasicMaterial({color:'#ffe6a7'}),24);
  const dummy=new T.Object3D();
  for (let i=0;i<24;i++) {
    const a=2*Math.PI*i/24; dummy.position.set(Math.sin(a)*2.87,.087,Math.cos(a)*2.87);
    dummy.rotation.y=a; dummy.updateMatrix(); studs.setMatrixAt(i,dummy.matrix);
  }
  room.add(studs); scene.add(room); return room;
}
