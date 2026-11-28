// Presentation only. One instanced draw per chassis; no wheel poses on the wire
// and no extra Tank/physics bodies. +X is left and +Z is forward on the models.
class RoadWheels {
  static matrix = new THREE.Matrix4();
  static get far() {
    if (!this.coarse) {
      const g=new THREE.CylinderGeometry(1,1,1,10).rotateZ(-Math.PI/2), colors=[];
      const p=g.attributes.position,n=g.attributes.normal;
      for (let i=0;i<p.count;i++) {
        const c=Math.abs(n.getX(i))<.5 ? .055 : (p.getY(i)>.3 && p.getZ(i)>0 ? .17 : .115);
        colors.push(c,c,c*.92);
      }
      g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(colors),3));this.coarse=g;
    }
    return this.coarse;
  }
  constructor(asset,mat) {
    this.axles=asset.axles; this.detail=asset.wheel;
    this.phase=new Float64Array(this.axles.length);
    this.mesh=new THREE.InstancedMesh(asset.wheel,mat,this.axles.length);
    this.mesh.name='Опорные катки'; this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.roll(0,0);
  }
  roll(metres,yaw) {
    this.axles.forEach(([x,y,z,r,width],i)=>{
      const a=this.phase[i]=(this.phase[i]+(metres+x*yaw)/r)%(2*Math.PI);
      const s=Math.sin(a),c=Math.cos(a),side=Math.sign(x);
      // A proper half-turn for the right-hand wheel, not a negative instance scale.
      const m=RoadWheels.matrix.set(side*width,0,0,x, 0,r*c,-r*s*side,y, 0,r*s,r*c*side,z, 0,0,0,1);
      this.mesh.setMatrixAt(i,m);
    });
    this.mesh.instanceMatrix.needsUpdate=true;
  }
  follow(u,distant) {
    this.mesh.geometry=distant ? RoadWheels.far : this.detail;
    if (this.x!==undefined && !u.dead && !u.airborne) {
      const dx=u.x-this.x,dy=u.y-this.y,da=wrapAngle(u.angle-this.angle),mid=this.angle+da/2;
      const travel=(dx*Math.cos(mid)+dy*Math.sin(mid))/u.modelScale;
      // A resync/teleport is not distance driven. At rest leave the instance buffer alone.
      if (Math.abs(travel)<8 && Math.abs(da)<1 && (Math.abs(travel)>1e-7 || Math.abs(da)>1e-7)) this.roll(travel,da);
    }
    this.x=u.x; this.y=u.y; this.angle=u.angle;
  }
}
