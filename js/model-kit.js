// Batch rigid, coloured primitives into one mesh per moving part or finish.
// Geometry is baked in the local frame; no texture fetches or font dependencies.
function modelKit() {
  const T = THREE;
  const pos = [], norm = [], rgb = [], v = new T.Vector3(), p = new T.Object3D();
  function stamp(geo, paint) {
    p.updateMatrix(); geo.applyMatrix4(p.matrix);
    const a = geo.attributes.position, n = geo.attributes.normal, index = geo.index, col = new T.Color(paint);
    for (let i = 0; i < (index ? index.count : a.count); i++) {
      const j = index ? index.getX(i) : i;
      pos.push(a.getX(j), a.getY(j), a.getZ(j)); norm.push(n.getX(j), n.getY(j), n.getZ(j)); rgb.push(col.r,col.g,col.b);
    }
    geo.dispose();
  }
  function at(geo,c,x,y,z,w=1,h=1,d=1,rx=0,ry=0,rz=0) {
    p.position.set(x,y,z); p.scale.set(w,h,d); p.rotation.set(rx,ry,rz); stamp(geo,c);
  }
  function rod(c,a,b,r) {
    v.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]); const len=v.length();
    p.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2); p.scale.set(1,1,1);
    p.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()); stamp(new T.CylinderGeometry(r,r,len,7),c);
  }
  function shape(c,points,depth,x=0,y=0,z=0,rx=0,bevel=.009,ry=0,rz=0) {
    const s = new T.Shape(); points.forEach(([px,py],i)=>i?s.lineTo(px,py):s.moveTo(px,py)); s.closePath();
    at(new T.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelSegments:1,bevelSize:bevel,bevelThickness:bevel}),c,x,y,z,1,1,1,rx,ry,rz);
  }
  return {rod,shape,
    line(c,pts,r) { for(let i=1;i<pts.length;i++) rod(c,pts[i-1],pts[i],r); },
    ball:(c,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>at(new T.SphereGeometry(1,18,12),c,x,y,z,w,h,d,rx,ry,rz),
    box:(c,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>at(new T.BoxGeometry(1,1,1),c,x,y,z,w,h,d,rx,ry,rz),
    cyl:(c,x,y,z,r,h,rx=0)=>at(new T.CylinderGeometry(r,r,h,18),c,x,y,z,1,1,1,rx),
    finish(name, material = new T.MeshLambertMaterial({vertexColors:true})) {
      const g=new T.BufferGeometry();
      for(const [key,values] of [['position',pos],['normal',norm],['color',rgb]]) g.setAttribute(key,new T.BufferAttribute(new Float32Array(values),3));
      const m=new T.Mesh(g,material); m.name=name; return m;
    }
  };
}
