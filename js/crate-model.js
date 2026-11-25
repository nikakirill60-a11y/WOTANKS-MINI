// Game adaptation of novogodniy-konteiner-game.html. Both procedural rigs keep
// the supplied dimensions, contents, swatches, decorations and rear lid pivot.
// No showcase page, second engine or network scripts are loaded by the game.
const CrateModel = (() => {
  const T = THREE, W = 2.3, D = 1.42, top = 1.5, base = .14, deck = .07, lidH = .2;
  const paints = {basic:'#46543c', premium:'#5d4a36', supply:'#3f4a52', collection:'#33502f'};
  const colours = ['#ff5a4e','#ffd35a','#5ad1ff','#7dff6e','#ff7de0','#c9a2ff'];

  function plaque(festive) {
    const c=document.createElement('canvas'); c.width=640; c.height=180;
    const g=c.getContext('2d'), ink=festive?'#f4d67a':'#cfd6c4';
    g.fillStyle=festive?'#8a2f28':'#39412c';g.fillRect(0,0,640,180);
    g.strokeStyle=g.fillStyle=ink;g.lineWidth=festive?12:10;
    const pad=festive?12:14;g.strokeRect(pad,pad,640-2*pad,180-2*pad);
    if(festive){
      g.lineWidth=3;g.strokeRect(30,30,580,120);
      for(const x of [46,594])for(const y of [46,134]){g.beginPath();g.arc(x,y,7,0,2*Math.PI);g.fill();}
      g.shadowColor='#3a0f0a';g.shadowOffsetY=4;g.shadowBlur=2;
    }else for(const x of [86,554]){
      g.fillRect(x-13,52,26,88);g.beginPath();g.moveTo(x,18);g.lineTo(x+22,44);g.lineTo(x,44);g.lineTo(x,146);g.lineTo(x,44);g.lineTo(x-22,44);g.closePath();g.fill();
    }
    g.font=festive?'bold 64px Georgia, serif':'bold 92px Arial Black, Arial, sans-serif';
    g.textAlign='center';g.textBaseline='middle';g.fillText(festive?'С НОВЫМ ГОДОМ!':'ГРУЗ',320,festive?92:84,festive?548:340);
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
    return new T.Mesh(new T.PlaneGeometry(festive?1.46:1.2,festive ? .41 : .34),new T.MeshLambertMaterial({map,side:T.DoubleSide}));
  }

  function build(id) {
    if (!Object.hasOwn(paints,id)) throw Error('Unknown crate');
    const festive=id==='collection', shell=paints[id], frame=festive?'#273d24':'#3c4630';
    const lining=festive?'#33201a':'#2a2620', metal=festive?'#d8b25a':'#6d7276';
    const group=new T.Group(), hinge=new T.Group(), cargo=new T.Group(), bulbs=[], palette=new Map();
    group.name=festive?'Новогодний контейнер':'Грузовой контейнер'; hinge.name='LidHinge';cargo.name='Cargo';
    group.add(hinge,cargo);
    function paint(col){
      if(!palette.has(col))palette.set(col,new T.MeshLambertMaterial({color:col,flatShading:true,side:T.DoubleSide}));
      return palette.get(col);
    }
    function mesh(parent,geom,mat,x,y,z){const m=new T.Mesh(geom,typeof mat==='string'?paint(mat):mat);m.position.set(x,y,z);parent.add(m);return m;}
    const box=(p,col,x,y,z,w,h,d)=>mesh(p,new T.BoxGeometry(w,h,d),col,x,y,z);
    const floor=base+deck, h=top-floor, mid=floor+h/2;
    for(const z of [-D/2+.3,D/2-.3])box(group,frame,0,base/2,z,W*.94,base,.26);
    box(group,shell,0,base+deck/2,0,W,deck,D);
    const gap=.056, liner=.012, skin=.055;
    box(group,lining,0,floor+liner/2,0,W-2*gap,liner,D-2*gap);
    for(const s of [-1,1]){
      box(group,lining,0,mid,s*(D/2-gap-liner/2),W-2*gap,h,liner);
      box(group,lining,s*(W/2-gap-liner/2),mid,0,liner,h,D-2*gap);
      box(group,shell,0,mid,s*(D/2-skin/2),W,h,skin);
      box(group,shell,s*(W/2-skin/2),mid,0,skin,h,D-2*skin);
      for(const z of [-1,1])box(group,frame,s*(W/2-.072),(top+base)/2,z*(D/2-.072),.155,top-base,.155);
      for(const y of [floor+.38,floor+.86]){
        box(group,shell,0,y,s*(D/2+.004),W*.98,.075,.028);
        box(group,shell,s*(W/2+.004),y,0,.028,.075,D*.98);
      }
      box(group,frame,0,top+.0375,s*(D/2+.005),W+.055,.075,.1);
      box(group,frame,s*(W/2+.005),top+.0375,0,.1,.075,D+.055);
    }
    function parcel(x,z,yaw,w,hh,d,col,ribbon){
      const g=new T.Group();g.position.set(x,floor+.014,z);g.rotation.y=yaw;cargo.add(g);
      box(g,col,0,hh/2,0,w,hh,d);
      if(!festive){
        box(g,ribbon,0,w*.56,0,w+.014,w*.16,d+.014);box(g,ribbon,0,hh/2,0,w*.16,hh+.014,d+.014);return;
      }
      box(g,ribbon,0,hh/2,0,w+.012,hh+.012,d*.16);box(g,ribbon,0,hh/2,0,w*.16,hh+.012,d+.012);
      const r=Math.min(w,d);mesh(g,new T.SphereGeometry(r*.09,6,5),ribbon,0,hh+r*.07,0);
      for(const s of [-1,1])box(g,ribbon,s*r*.12,hh+r*.05,0,r*.22,r*.08,r*.13).rotation.z=-s*.35;
    }
    if(festive){
      parcel(-.42,.06,.22,.62,.52,.55,'#a83a32','#e8c25c');parcel(.46,.3,.42,.44,.4,.44,'#caa14e','#a83a32');
      parcel(.13,-.4,-.55,.35,.3,.34,'#3f6b3a','#efe6da');
    }else{
      parcel(-.42,.1,-.18,.62,.62*.82,.62*.88,'#4c5a40','#2c261e');parcel(.48,.24,.48,.44,.44*.82,.44*.88,'#57503c','#2c261e');
    }
    hinge.position.set(0,top+.075,-D/2);
    box(hinge,festive?'#7c2f2a':'#3d4a34',0,lidH/2,D/2,W,lidH,D);
    for(const z of [D*.28,D*.7])box(hinge,frame,0,lidH+.0175,z,W*.94,.035,.13);
    mesh(hinge,new T.CylinderGeometry(.032,.032,.36,10),metal,0,lidH/2,D+.055).rotation.z=Math.PI/2;
    for(const s of [-1,1]){
      box(hinge,metal,s*.16,lidH/2,D+.015,.05,.05,.075);
      box(hinge,metal,s*.78,lidH/2,D+.012,.1,.17,.055);box(hinge,metal,s*.78,-.055,D+.006,.045,.07,.07);
    }
    let glow=null;
    if(festive){
      box(hinge,'#e8e4d8',0,lidH+.015,D/2,W+.014,.03,.3);box(hinge,'#e8e4d8',0,lidH+.028,D/2,.3,.03,D+.014);
      let seed=20261124;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
      for(let i=0;i<17;i++){
        const x=(random()-.5)*(W-.28),z=random()*(D-.24)+.12;if(Math.hypot(x,z-D/2)<.34)continue;
        const r=.05+random()*.062,m=mesh(hinge,new T.DodecahedronGeometry(r,0),'#eef1f2',x,lidH+r*.32,z);
        m.scale.y=.45;m.rotation.set(random()*3,random()*3,random()*3);
      }
      mesh(hinge,new T.CylinderGeometry(.17,.19,.035,12),'#caa14e',0,lidH+.045,D/2);
      const star=new T.Shape();for(let i=0;i<10;i++){
        const r=i%2 ? .098 : .235, a=Math.PI*i/5-Math.PI/2;
        if(i)star.lineTo(Math.cos(a)*r,Math.sin(a)*r);else star.moveTo(Math.cos(a)*r,Math.sin(a)*r);
      }
      star.closePath();mesh(hinge,new T.ExtrudeGeometry(star,{depth:.075,bevelEnabled:false}).rotateX(-Math.PI/2),
        new T.MeshLambertMaterial({color:'#ffd76a',emissive:'#6b4c00',flatShading:true}),0,lidH+.085,D/2);
      const x=W/2+.008, y=lidH+.028, pins=[[-x,D*.02],[x,D*.02],[x,D*.36],[x,D*.68],[x,D-.02],[W*.25,D+.008],[-W*.25,D+.008],[-x,D-.02],[-x,D*.68],[-x,D*.36]];
      const path=[], bulbShape=new T.SphereGeometry(.033,6,5);
      pins.forEach(([ax,az],i)=>{
        const [bx,bz]=pins[(i+1)%pins.length];
        for(let k=0;k<=6;k++){const t=k/6;path.push(new T.Vector3(ax+(bx-ax)*t,y-Math.sin(Math.PI*t)*.075,az+(bz-az)*t));}
        const color=colours[i%colours.length], mat=new T.MeshLambertMaterial({color,emissive:color,flatShading:true});
        mesh(hinge,bulbShape,mat,(ax+bx)/2,y-.103,(az+bz)/2);bulbs.push({material:mat,base:new T.Color(color)});
      });
      mesh(hinge,new T.TubeGeometry(new T.CatmullRomCurve3(path,true),110,.011,5,true),'#20351f',0,0,0);
      for(const x of [-.66,.66])for(const y of [.87,1.17])mesh(group,new T.CylinderGeometry(.018,.018,.02,6),metal,x,y,D/2+.038).rotation.x=Math.PI/2;
      glow=new T.PointLight('#ffc98a',0,5.2,1.9); glow.position.set(0,top+.62,.1);group.add(glow);
    }
    const sign=plaque(festive);sign.position.set(0,1.02,D/2+.026);group.add(sign);
    const rig={group,hinge,cargo,bulbs,glow};CrateMotion.snap(rig,false);return rig;
  }
  function light(scene){
    scene.add(new T.HemisphereLight('#eef4ef','#4c5a52',1.7));
    const sun=new T.DirectionalLight('#ffffff',2.15);sun.position.set(-4,7,5);scene.add(sun);
  }
  function studio(scene){
    light(scene);scene.background=new T.Color('#26353a');
    const floor=new T.Mesh(new T.PlaneGeometry(40,40),new T.MeshLambertMaterial({color:'#3b5146'}));
    floor.rotation.x=-Math.PI/2;scene.add(floor);
    const grid=new T.GridHelper(40,40,'#789180','#637a6b');grid.material.transparent=true;
    grid.material.opacity=.12;grid.material.depthWrite=false;grid.position.y=.003;scene.add(grid);
    const shade=new T.Mesh(new T.CircleGeometry(1,28),new T.MeshBasicMaterial({color:'#172422',transparent:true,opacity:.28,depthWrite:false}));
    shade.rotation.x=-Math.PI/2;shade.position.y=.008;shade.scale.set(1.9,1.45,1);scene.add(shade);
  }
  function dispose(root){
    const geometry=new Set(),materials=new Set(),maps=new Set();
    root.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)for(const m of [].concat(o.material))materials.add(m);});
    for(const m of materials){if(m.map)maps.add(m.map);m.dispose();} for(const m of maps)m.dispose();for(const g of geometry)g.dispose();
  }
  return {build,light,studio,dispose};
})();
