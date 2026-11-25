// One walk-around scene, in metres. The inspection floor opens onto the winter yard.
// All architecture, scenery and decorations occupy world space, just like the selected tank.
function buildWinterBay(scene) {
  const T = THREE, pi = Math.PI, tau = 2*pi;
  const room = new T.Group(); room.name = 'Северное депо · Полярная ночь';
  room.position.z = -.31; room.rotation.y = .47; scene.add(room);
  const time = {value:0};
  WinterLandscape.build(room,time);
  function group(parent,name,x=0,y=0,z=0) {
    const g = new T.Group(); g.name=name; g.position.set(x,y,z); parent.add(g); return g;
  }
  const solid = new T.MeshStandardMaterial({roughness:.81,metalness:.14});
  const lit = new T.MeshBasicMaterial({toneMapped:false});
  const cube = new T.BoxGeometry(), pipe = new T.CylinderGeometry(1,1,1,16),
    ball = new T.SphereGeometry(1,16,12), cone = new T.ConeGeometry(1,1,16);
  const axis = new T.Vector3(0,1,0), v = new T.Vector3(), scratch = new T.Object3D();
  // Batch repeated bolts, battens, window frames, lamps, etc. by primitive and finish.
  function parts(parent,shadows=false) {
    const buckets = new Map();
    function stamp(shape,paint,light) {
      const mat = light ? lit : solid;
      if (!buckets.has(shape)) buckets.set(shape,new Map());
      const batches = buckets.get(shape);
      if (!batches.has(mat)) batches.set(mat,[]);
      scratch.updateMatrix(); batches.get(mat).push([scratch.matrix.clone(),paint]);
    }
    function place(shape,col,x,y,z,w,h,d,rx=0,ry=0,rz=0,light=false) {
      scratch.position.set(x,y,z); scratch.rotation.set(rx,ry,rz); scratch.scale.set(w,h,d); stamp(shape,col,light);
    }
    return {
      box:(...args)=>place(cube,...args), cyl:(...args)=>place(pipe,...args), sphere:(...args)=>place(ball,...args),
      cone:(...args)=>place(cone,...args), lamp:(x,y,z,w,h,d,col)=>place(cube,col,x,y,z,w,h,d,0,0,0,true),
      strut(col,a,b,width,depth=width,shape=cube) {
        v.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
        scratch.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);
        scratch.scale.set(width,v.length(),depth); scratch.quaternion.setFromUnitVectors(axis,v.normalize()); stamp(shape,col,false);
      },
      finish(){
        for (const [geo,batches] of buckets) for (const [mat,items] of batches) {
          const mesh = new T.InstancedMesh(geo,mat,items.length), colour=new T.Color();
          items.forEach(([matrix,paint],i)=>{mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,colour.set(paint));});
          mesh.castShadow=shadows && mat===solid; mesh.receiveShadow=mat===solid; parent.add(mesh);
        }
      }
    };
  }
  // Just the soft lens glows face the camera. Their emitters are solid bulbs in the branches and lamps.
  const haloMat=new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,
    vertexShader:`varying vec2 uv0; varying vec3 tint;
      void main(){ uv0=uv-.5;tint=instanceColor;
        vec4 p=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
        p.xy+=position.xy*length(instanceMatrix[0].xyz);gl_Position=projectionMatrix*p; }`,
    fragmentShader:`varying vec2 uv0; varying vec3 tint;
      void main(){ float r=4.*dot(uv0,uv0);
        gl_FragColor=vec4(tint,.41*exp(-3.2*r)*(1.-smoothstep(.65,1.,r)));
        #include <colorspace_fragment>
      }`});
  const glowShape=new T.PlaneGeometry();
  function halos(parent,lights){
    const bloom=new T.InstancedMesh(glowShape,haloMat,lights.length),colour=new T.Color();
    lights.forEach(([x,y,z,size,paint],i)=>{
      scratch.rotation.set(0,0,0); scratch.position.set(x,y,z);scratch.scale.setScalar(size);scratch.updateMatrix();
      bloom.setMatrixAt(i,scratch.matrix);bloom.setColorAt(i,colour.set(paint));
    });
    bloom.renderOrder=2;parent.add(bloom);
  }
  // Typography is painted onto actual signboards; it is not a picture of the building.
  function enamel(parent,text,x,y,z,width,height,angle=0) {
    const canvas=document.createElement('canvas'); canvas.width=768; canvas.height=Math.round(768*height/width);
    const g=canvas.getContext('2d'), w=canvas.width,h=canvas.height;
    g.fillStyle='#203947';g.fillRect(0,0,w,h);g.strokeStyle='#c29c5b';g.lineWidth=2;g.strokeRect(5,5,w-10,h-10);
    g.fillStyle='#e8b766';g.fillRect(h*.21,h*.23,h*.075,h*.54);
    g.textAlign='center';g.textBaseline='middle';g.fillStyle='#efe3ca';g.font=`bold ${Math.round(h*.61)}px Arial, sans-serif`;
    g.fillText(text,w*.51,h*.53,w-h*.8);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
    const sign=new T.Mesh(new T.BoxGeometry(width,height,.035),new T.MeshLambertMaterial({map}));
    sign.position.set(x,y,z);sign.rotation.y=angle;parent.add(sign);
  }
  const steel='#354850',rib='#506771',dark='#202e36',ochre='#ac8048',frost='#b6ced8',wood='#714d37';
  const depot=group(room,'inspection-hangar');
  const apron=group(depot,'inspection-floor'), f=parts(apron);
  f.box('#3b4a52',0,-.17,2.15,11.65,.29,10.58);
  f.box('#64757a',0,-.12,-3.04,11.55,.15,.40);
  for(let x=-5.45;x<=5.5;x+=1.82) f.box('#293b44',x,-.022,2.1,.012,.006,10.4);
  for(let z=-2.62;z<7.45;z+=1.54) f.box('#293b44',0,-.021,z,11.5,.006,.014);
  for (const x of [-3.28,3.28]) {
    f.box('#c4a672',x,-.018,2.13,.044,.009,10.28);
    f.box(dark,x*1.21,-.015,1.5,.26,.014,8.6);
    for(let z=-2.7;z<5.8;z+=.16) f.box('#707f82',x*1.21,-.003,z,.25,.012,.034);
  }
  function disc(r,h,y,col){
    const m=new T.Mesh(new T.CylinderGeometry(r,r+.018,h,96),new T.MeshStandardMaterial({color:col,roughness:.8,metalness:.41}));
    m.position.y=y; m.receiveShadow=true; apron.add(m);
  }
  disc(3.05,.15,-.035,'#283841'); disc(3.01,.035,.067,'#495c65');
  for(const [r,w,col] of [[2.23,.008,'#51656d'],[2.72,.012,'#293c44'],[2.86,.026,'#9b895e'],[2.98,.016,'#81979a']]) {
    const line=new T.Mesh(new T.RingGeometry(r,r+w,96),new T.MeshBasicMaterial({color:col}));
    line.rotation.x=-pi/2;line.position.y=.085;apron.add(line);
  }
  for(let i=0;i<60;i++) {
    const a=tau*i/60,major=i%5===0;
    f.box(major?'#d3b475':'#718690',Math.sin(a)*2.81,.087,Math.cos(a)*2.81,major ? .038 : .017,.007,major ? .15 : .075,0,a);
    if(major) f.cyl(dark,Math.sin(a)*2.94,.087,Math.cos(a)*2.94,.027,.012,.027);
  }
  f.finish();
  // Steel side bays: corrugated cladding, amber clerestory windows, plate girders and diagonals.
  // Each wall is its own cutaway; orbiting from outside must never put a near wall across the tank.
  // Tall eaves leave the northern lights visible from the inspection floor.
  const eaves = 1.34;
  const sides=[];
  for(const side of [-1,1]) {
    const wall=group(depot,'side-wall',side*5.76,0,2.16); wall.rotation.y=-side*pi/2; sides.push(wall);
    const p=parts(wall);
    p.box(steel,0,1.22,0,10.25,2.55,.18);p.box(dark,0,3.72,0,10.25,.95,.2);
    for(let x=-5;x<5.12;x+=.25) p.box('#415660',x,1.23,.108,.042,2.4,.055);
    p.box('#293a44',0,.33,.14,10.27,.71,.065);p.box(ochre,0,.7,.182,10.27,.045,.015);
    p.box(rib,0,2.51,0,10.26,.13,.36);p.box(rib,0,3.32,0,10.26,.14,.35);
    for(let i=0;i<12;i++) {
      const x=(i-5.5)*.836;
      p.lamp(x,2.93,0,.78,.63,.085,i%4===0?'#b79669':'#9dacae');
      p.box(dark,x,2.95,.058,.78,.035,.036);
    }
    for(const x of [-5.05,-2.54,0,2.54,5.05]) {
      p.box(dark,x,2.09,.15,.24,4.25,.31); p.box(rib,x,2.09,.34,.30,4.25,.07);
      p.box(ochre,x,.90,.38,.30,.24,.015);
      p.box(dark,x,2.13,.46,.58,.15,.23);p.lamp(x,2.1,.586,.48,.052,.016,'#ffe3af');
    }
    p.strut(rib,[-4.98,.82,.21],[-2.57,2.45,.21],.08);p.strut(rib,[.04,.82,.21],[2.49,2.45,.21],.08);
    p.box(steel,0,4.19+eaves/2,0,10.25,eaves,.20);
    for(const x of [-5.05,-2.54,0,2.54,5.05])p.box(rib,x,4.19+eaves/2,.16,.22,eaves,.27);
    // A wheeled drawer chest and a stowed coil, on the wall rather than a flat mural.
    if(side===-1){
      p.box('#526268',2.25,.51,.66,1.50,.73,.62);p.box(wood,2.25,.92,.66,1.59,.10,.72);
      for(let i=0;i<4;i++) {
        p.box('#34444a',2.25,.27+i*.155,.979,1.38,.136,.025);
        p.box('#9ea3a0',2.25,.30+i*.155,1.006,.58,.025,.036);
      }
      for(const x of [1.67,2.83])p.cyl(dark,x,.09,.82,.113,.10,.113,pi/2);
      p.cyl(ochre,3.65,1.34,.40,.32,.19,.32,pi/2);
      p.cyl(dark,3.65,1.34,.52,.24,.08,.24,pi/2);p.cyl(rib,3.65,1.34,.57,.10,.06,.10,pi/2);
    }else{
      for(const [x,yy,width] of [[-3.66,.25,1.14],[-2.50,.25,.94],[-3.73,.75,.95]]){
        p.box(wood,x,yy,.60,width,.49,.82);
        for(const dx of [-.32,.32]) p.box('#8e7957',x+dx,yy+.005,.61,.074,.50,.84);
      }
    }
    enamel(wall,side<0?'СЕКТОР   01':'ДЕПО   /   01',1.24,1.6,.27,1.73,.46);p.finish();
  }
  const rear=group(depot,'shutter-wall',0,0,7.28);rear.rotation.y=pi;
  const q=parts(rear);
  q.box(steel,0,2.05,0,11.66,4.16,.25);q.box(dark,0,1.76,.16,5.06,3.54,.16);
  for(let i=0;i<22;i++) q.box(i%2?'#4f6166':'#465a60',0,.06+i*.155,.251,4.78,.145,.04);
  for(const x of [-2.55,2.55,-5.55,5.55]) q.box(rib,x,2.06,.22,.18,4.2,.3);
  q.box(steel,0,4.13+eaves/2,0,11.66,eaves,.25);
  enamel(rear,'СЕВЕРНОЕ ДЕПО',0,3.79,.27,3.55,.49);q.finish();
  const portal=group(depot,'open-yard-doors',0,0,-2.97), d=parts(portal);
  for(const side of [-1,1]) {
    const x=side*5.22;
    d.box(dark,x,1.99,0,1.06,4.07,.31);
    for(let i=0;i<6;i++)d.box(i%2===0?steel:rib,x+(i-2.5)*.166,1.96,.17,.15,3.94,.08);
    d.box(rib,side*4.64,1.99,.13,.18,4.1,.48);
    for(let i=0;i<6;i++)d.box(i%2?dark:ochre,side*4.64,.18+i*.16,.377,.17,.15,.018);
    d.lamp(side*4.64,2.45,.379,.075,.32,.03,'#ffdd94');
  }
  for(const x of [-5.24,5.24]) d.box(steel,x,4.05+eaves/2,0,1.06,eaves,.32);
  d.box(steel,0,4.23+eaves,0,11.68,.54,.39);d.box(dark,0,3.96+eaves,0,11.68,.08,.55);
  d.lamp(0,3.91+eaves,.17,4.12,.03,.12,'#ffdea4');enamel(portal,'ПОЛЯРНАЯ СТАНЦИЯ   /   01',0,4.23+eaves,.224,4.42,.39);d.finish();
  const roof=group(depot,'trussed-roof',0,eaves,0), tr=parts(roof);
  for(const s of [-1,1]) {
    const pitch=-s*Math.atan2(1.36,5.98);
    tr.box('#354953',s*2.99,4.88,2.14,6.18,.16,10.76,0,0,pitch);
    tr.box(frost,s*2.99,4.99,2.14,6.18,.10,10.8,0,0,pitch);
  }
  for(const z of [-2.95,.44,3.84,7.23]) {
    tr.box(rib,0,4.10,z,11.67,.13,.18);
    for(const s of [-1,1]) {
      tr.strut(steel,[s*5.77,4.17,z],[0,5.52,z],.17,.16);
      for(let i=0;i<3;i++) {
        const x=s*i*1.87,h=5.45-i*.43;
        tr.strut(rib,[x,h,z],[x+s*1.83,4.16,z],.085);
        tr.box(steel,x, (h+4.16)/2,z,.085,h-4.16,.105);
      }
    }
  }
  tr.finish();

  // A low station across the yard. Windows are individual inset panes, under a snow-capped pitched roof.
  const lodge=group(room,'station-workshop',-5.45,-.16,-14.6);lodge.rotation.y=.18;
  const h=parts(lodge,true);
  h.box('#4d4e46',0,1.22,0,6.5,2.45,3.0);
  for(let i=0;i<16;i++)h.box(i%2?'#695744':'#705b47',0,.09+i*.144,1.52,6.47,.13,.08);
  for(const s of [-1,1]) {
    h.box('#53626a',0,2.72,s*.86,7.06,.19,1.89,s*.345,0,0);
    h.box(frost,0,2.84,s*.86,7.08,.13,1.94,s*.345,0,0);
  }
  h.box('#645e5a',-2.18,3.12,-.48,.48,1.0,.55);h.box(frost,-2.18,3.65,-.48,.63,.12,.70);
  for(const x of [-2.42,-1.33,.98,2.25]) {
    h.box(dark,x,1.28,1.59,.93,1.18,.15);h.lamp(x,1.29,1.676,.75,.97,.024,'#ffd58c');
    h.box(wood,x,1.29,1.70,.055,.98,.04);h.box(wood,x,1.32,1.70,.77,.055,.04);
    h.box(frost,x,.71,1.70,1.05,.09,.29);
  }
  h.box(dark,-.21,.81,1.6,.9,1.66,.12);enamel(lodge,'БЮРО   •   27',-.16,2.1,1.62,1.93,.33);h.finish();
  const yard=group(room,'lamp-walk'), y=parts(yard,true), lanterns=[];
  for(const [x,z] of [[-5.74,-8.02],[5.7,-9.75],[-1,-17.4],[8,-19.2]]) {
    y.cyl('#495b63',x,.08,z,.17,.44,.17);y.cyl(steel,x,1.26,z,.068,2.42,.068);
    y.box(dark,x,2.49,z,.36,.09,.36); y.lamp(x,2.70,z,.27,.36,.27,'#ffe1a0');
    for(const i of [-1,1])for(const j of [-1,1]) y.box(steel,x+.14*i,2.70,z+.14*j,.033,.4,.033);
    lanterns.push([x,2.70,z,1.38,'#ffdd99']);
    y.cone('#73888f',x,2.99,z,.31,.22,.31);y.sphere(frost,x,3.08,z,.16,.053,.16);
  }
  // A staggered trail in the snow connects the holiday figure to the station door.
  for(let i=0;i<27;i++) {
    const t=i/26,x=-4.31-1.69*t+.35*Math.sin(t*pi*1.6)+.085*(i%2?1:-1),z=-4.54-8.32*t;
    y.sphere('#647d92',x,-.165,z,.071,.007,.141,0,-.13);
  }
  for(const [x,z,w] of [[-6,-5.5,1.6],[5.1,-6.9,2.3],[7.4,-12,1.9],[-8.3,-10.5,2.4],[3.5,-14.4,1.7]])
    y.sphere('#9eb3c3',x,-.24,z,w,.24+w*.075,w*.53);
  y.finish();halos(yard,lanterns);

  const tree=group(room,'festive-spruce',2.43,-.17,-6.8), height=4.0, fir=parts(tree,true);
  const boughs=new T.Mesh(WinterLandscape.spruce(true),new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}));
  boughs.scale.setScalar(height);boughs.castShadow=boughs.receiveShadow=true;tree.add(boughs);
  fir.cyl('#604a39',0,.34,0,.16,.7,.16);fir.cone('#21433b',0,height*.50,0,height*.25,height*.81,height*.25);
  const lampColours=['#ffda76','#ff9568','#a1ead9','#ffc579','#e99391'];
  function onTree(t,a,pad){const r=(.348*(1-t)+pad)*height;return [r*Math.sin(a),height*t,r*Math.cos(a)];}
  const garland=[]; let prev=null;
  for(let i=0;i<=120;i++) {
    const t=.16+i/120*.78,a=i/120*tau*5,pt=onTree(t,a,.011);
    if(prev)fir.strut('#927447',prev,pt,.014,.014,pipe);
    if(i%2===0){
      const colour=lampColours[i/2%lampColours.length];fir.sphere(colour,...pt,.039,.048,.039,0,0,0,true);
      garland.push([...pt,.36,colour]);
    }
    prev=pt;
  }
  for(let i=0;i<34;i++) {
    const t=.17+(i%10)*.064,a=i*2.39996,pt=onTree(t,a,.001), r=.074+(i%3)*.01;
    fir.sphere(['#be493e','#dca357','#478f94'][i%3],...pt,r,r*1.06,r);
    fir.cyl('#ad9761',pt[0],pt[1]+r,pt[2],.029,.043,.029);
  }
  const star=WinterLandscape.facets(), crown=height+.14;
  for(let i=0;i<10;i++) {
    const point=j=>{const a=pi/2+tau*j/10,r=j%2===0 ? .285 : .124;return [r*Math.cos(a),crown+r*Math.sin(a),0];};
    const a=point(i),b=point(i+1);star.face(a,b,[0,crown,.083],i%2?'#ffcf76':'#fff0b3');
    star.face(b,a,[0,crown,-.083],i%2?'#ffda94':'#edaf53');
  }
  tree.add(new T.Mesh(star.geometry(),new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,toneMapped:false})));
  for(const [x,z,w,hh,depth,col] of [[-.75,.56,.53,.33,.44,'#8f4841'],[-.41,.91,.37,.45,.38,'#3e6865'],[.53,.78,.49,.31,.41,'#496779'],[.82,.36,.30,.38,.29,'#b47052']]) {
    fir.box(col,x,hh/2,z,w,hh,depth); fir.box('#d2aa67',x,hh/2+.006,z,w*.16,hh+.015,depth+.008);
    fir.box('#c39e62',x,hh+.012,z,w+.012,.016,depth*.20);
  }
  fir.finish();garland.push([0,crown,0,.94,'#ffdd88']);halos(tree,garland);
  const figure=group(room,'snowman',-4.26,-.17,-4.15);figure.rotation.y=.28;
  const man=parts(figure,true);
  man.sphere('#d2e2e5',0,.39,0,.47,.45,.44);man.sphere('#dfebeb',.015,.96,0,.355,.34,.343);
  man.sphere('#e5edef',-.012,1.40,.015,.273,.26,.255);
  man.cyl('#1c2d35',-.035,1.615,-.005,.34,.061,.34,0,0,.08);man.cyl('#283c45',-.055,1.77,-.005,.216,.29,.216,0,0,.08);
  man.cyl('#ae5349',-.043,1.677,-.005,.22,.068,.22,0,0,.08);
  man.cyl('#ad443e',.004,1.196,.002,.269,.135,.267,0,0,-.055);
  man.box('#b94b43',.186,1.03,.267,.122,.37,.058,0,0,.17);man.box('#dfbb7a',.206,.92,.301,.12,.035,.012,0,0,.17);
  for(const x of [-.101,.079])man.sphere(dark,x,1.452,.246,.034,.043,.025);
  man.cone('#d8833d',-.01,1.388,.329,.065,.199,.064,pi*.51);
  for(let i=-2;i<=2;i++)man.sphere(dark,i*.043-.012,1.315+Math.abs(i)*.012,.235,.015,.018,.016);
  for(const [yy,z] of [[1.078,.317],[.924,.343],[.72,.265]])man.sphere(dark,.011,yy,z,.038,.04,.032);
  for(const s of [-1,1]) {
    man.strut(wood,[s*.27,1.06,0],[s*.62,1.21,.026],.032,.032,pipe);
    man.strut(wood,[s*.60,1.207,.026],[s*.78,1.39,.08],.026,.026,pipe);
    man.strut(wood,[s*.62,1.21,.026],[s*.80,1.22,-.025],.022,.022,pipe);
  }
  man.finish();
  const eye=new T.Vector3();
  function cutaway(camera) {
    room.worldToLocal(eye.copy(camera.position));
    sides[0].visible=eye.x> -5.48; sides[1].visible=eye.x<5.48;
    portal.visible=eye.z> -2.64;rear.visible=eye.z<6.97;roof.visible=eye.y<4.01+eaves;
  }
  return {room,time,cutaway};
}
