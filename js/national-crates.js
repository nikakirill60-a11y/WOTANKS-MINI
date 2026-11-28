// Presentation data only. The game defines the earned-box rewards separately.
// Same rigid meshes for the inspection bench and offline art.
const NationalCrates = (() => {
  const pi=Math.PI, half=pi/2, cream='#f2e8ce', iron='#414647';
  const catalog=Object.freeze({
    'national-ussr':   {name:'Ящик СССР',country:'СССР',series:'01',mark:'CCCP',accent:'#b49a62',kind:'Армейская укладка',detail:'Сосновые планки, стальные стяжки и красная звезда.'},
    'national-germany':{name:'Ящик Германии',country:'Германия',series:'02',mark:'DE',accent:'#9ba9b3',kind:'Инструментальный кофр',detail:'Рёбра жёсткости, скошенные углы и утопленная ручка.'},
    'national-france': {name:'Ящик Франции',country:'Франция',series:'03',mark:'FR',accent:'#d1a565',kind:'Дорожный сундук',detail:'Сводчатая синяя крышка, латунные дуги и трёхцветная кокарда.'},
    'national-sweden': {name:'Ящик Швеции',country:'Швеция',series:'04',mark:'SE',accent:'#e4c26d',kind:'Северная укладка',detail:'Ясеневые полозья, синяя эмаль и жёлтый скандинавский крест.'},
    'national-usa':    {name:'Ящик США',country:'США',series:'05',mark:'USA',accent:'#cbb48a',kind:'Авиационный кофр',detail:'Песочные панели, алюминиевые уголки и белая звезда с полосами.'},
    'national-japan':  {name:'Ящик Японии',country:'Япония',series:'06',mark:'JP',accent:'#d68c79',kind:'Лаковый сундук',detail:'Тёмно-красный лак, верёвочные ручки и диск солнца на светлой вставке.'}
  });
  Object.values(catalog).forEach(Object.freeze);
  function outline(w,d,c) {
    return c ? [[-w+c,-d],[w-c,-d],[w,-d+c],[w,d-c],[w-c,d],[-w+c,d],[-w,d-c],[-w,-d+c]] : [[-w,-d],[w,-d],[w,d],[-w,d]];
  }
  // w,d are half extents. Slabs and rings are different: the body has an actual interior.
  function slab(k,col,w,d,y,h,c=0,z=0,bevel=.008) {
    k.shape(col,outline(w,d,c).map(([x,v])=>[x,-v]),h,0,y,z,-half,bevel);
  }
  function ring(k,col,w,d,y,h,c=0,th=.045,z=0) {
    const path=outline(w,d,c);
    path.forEach(([x,v],i)=>{const [X,V]=path[(i+1)%path.length];
      k.box(col,(x+X)/2,y,z+(v+V)/2,Math.hypot(x-X,v-V)+.012,h,th,0,-Math.atan2(V-v,X-x));
    });
  }
  function sides(k,col,w,d,y,h,th=.045){ring(k,col,w-th/2,d-th/2,y,h,0,th);}
  function star(k,col,x,y,z,r,depth=.012) {
    k.shape(col,Array.from({length:10},(_,i)=>{const a=half+pi*i/5,r1=i%2?r*.405:r;return [r1*Math.cos(a),r1*Math.sin(a)];}),depth,x,y,z,-half,.002);
  }
  function lineXY(k,col,x,y,z,X,Y,width,depth) {
    k.box(col,(x+X)/2,(y+Y)/2,z,Math.hypot(X-x,Y-y)+.002,width,depth,0,0,Math.atan2(Y-y,X-x));
  }
  // Raised sans lettering: geometry rather than an OS font or an external texture.
  const glyphs={
    C:['41 32 12 03 07 18 38 47'],P:['08 02 32 43 45 36 06'],D:['08 02 32 43 47 38 08'],
    E:['42 02 08 48','05 35'],F:['08 02 42','05 35'],R:['08 02 32 43 45 36 06','25 48'],
    S:['42 12 03 04 15 35 46 47 38 08'],U:['02 07 18 38 47 42'],A:['08 04 22 44 48','06 46'],
    J:['02 42','32 37 28 18 07']
  };
  function lettering(k,word,y,z,col,height) {
    const unit=height/6, left=-(word.length*5.7-1.7)*unit/2;
    [...word].forEach((ch,j)=>glyphs[ch].forEach(stroke=>{
      const pts=stroke.split(' ').map(p=>[left+(j*5.7+Number(p[0]))*unit,y+(5-Number(p[1]))*unit]);
      for(let i=1;i<pts.length;i++)lineXY(k,col,...pts[i-1],z,...pts[i],unit*.83,.005);
    }));
  }
  function tag(k,mark,y,z,edge,face,ink) {
    const w=mark.length*.135+.30;
    k.box(edge,0,y,z,w+.04,.258,.026); k.box(face,0,y,z+.016,w,.227,.012);
    lettering(k,mark,y,z+.028,ink,.148);
    for(const s of [-1,1])k.cyl(edge,s*(w/2-.034),y,z+.028,.013,.014,half);
  }
  function sideGrips(k,w,y,span,col,rubber=false) {
    for(const s of [-1,1]){
      const x=s*(w+.02), outer=s*(w+.114);
      for(const z of [-span,span]){k.box(col,x,y,z,.045,.16,.092);k.rod(col,[x,y+.016,z],[outer,y-.039,z],.024);}
      k.rod(col,[outer,y-.039,-span],[outer,y-.039,span],.030);
      if(rubber)k.rod('#333b3b',[outer,y-.039,-span*.76],[outer,y-.039,span*.76],.043);
    }
  }
  function clasps(b,l,w,d,h,xs,col) {
    for(const x of xs){
      b.box(col,x,h-.155,d+.018,.135,.165,.054); b.box('#343c3d',x,h-.14,d+.050,.068,.078,.018);
      // Mount on the lid edge; only the tongue overhangs the seam when the lid is raised.
      l.box(col,x,.038,2*d+.007,.131,.068,.072);
      l.box(col,x,-.036,2*d+.039,.092,.19,.042); l.box('#b8b5a3',x,-.090,2*d+.065,.108,.026,.026);
    }
    for(const x of [-w*.57,w*.57]){
      b.box(col,x,h-.080,-d-.012,.22,.14,.055); l.box(col,x,.064,-.014,.22,.108,.055);
      b.rod(col,[x-.14,h,-d],[x+.14,h,-d],.043);
    }
  }
  function feet(k,w,d,col) {for(const x of [-w,w])for(const z of [-d,d])k.box(col,x,.066,z,.30,.132,.23);}
  function floor(k,col,w,d,y,cut=0){slab(k,col,w,d,y,.066,cut);}
  function partitions(k,col,w,d,y,h,xs,zs) {
    for(const x of xs)k.box(col,x,y+h/2,0,.034,h,d*2);
    for(const z of zs)k.box(col,0,y+h/2,z,w*2,h,.034);
  }
  function plankCase({b,l,t,w,d,h},woods,skid,inside,rows) {
    const wood=woods[0];floor(b,skid,w,d,.145);const bottom=.205,step=(h-bottom)/rows;
    for(let i=0;i<rows;i++)sides(b,woods[i%woods.length],w,d,bottom+(i+.5)*step,step-.012,.057);
    floor(t,inside,w-.064,d-.064,.214);
    for(const x of [-w+.055,w-.055])for(const z of [-d+.055,d-.055])b.box(skid,x,(bottom+h)/2,z,.095,h-bottom,.095);
    // Tongue and groove lid; all boards stay on the rear hinge, including their fittings.
    slab(l,skid,w+.014,d+.013,0,.071,.025,d);
    for(let i=0;i<5;i++)l.box(woods[(i+1)%woods.length],0,.108,(i+.5)*2*d/5,w*2+.035,.072,2*d/5-.008);
    ring(l,wood,w-.07,d-.06,-.014,.034,.0,.045,d);
  }
  function soviet(r){
    const {b,l,m,n,t,w,d,h}=r, greens=['#59663e','#64734a','#535e3a','#657048'], pine='#988054', dark='#414c32';
    plankCase(r,greens,dark,pine,4);
    // Tapered grain marks and narrow growth rings cut into the paint on the front boards.
    for(const [x,y,len] of [[-.49,.39,.30],[.18,.32,.23],[.57,.57,.13],[-.61,.85,.25],[.23,1.09,.39],[-.26,1.16,.19]]){
      b.shape('#52603e',[[-len,0],[0,.008],[len,.002],[0,-.004]],.003,x,y,d,0,0);
    }
    for(const x of [-.81,.81]){
      b.box(dark,x,.076,0,.23,.152,2*d+.032);
      for(const s of [-1,1]){
        m.box(iron,x,.70,s*(d+.016),.083,.92,.034);
        for(const y of [.29,.56,.90,1.09])m.cyl('#aaa488',x,y,s*(d+.036),.021,.018,half);
      }
      n.box(iron,x,.166,d,.094,.052,2*d+.018);
    }
    for(const s of [-1,1]){ // timber diagonal braces near the ends, leaving the marking clear
      for(const face of [-1,1])lineXY(b,dark,s*.52,.32,face*(d+.027),s*.99,1.02,.103,.052);
    }
    n.cyl('#3a4630',0,.165,d,.335,.034);star(n,'#d1b580',0,.187,d,.291);star(n,'#ac4034',0,.202,d,.251);
    sideGrips(m,w,.76,.20,'#827251');clasps(m,n,w,d,h,[-.81,.81],iron);
    tag(m,r.mark,.708,d+.025,'#a6a381','#424c35',cream);
    partitions(t,'#736343',w-.076,d-.076,.28,.40,[-.36],[]);
    // Slatted removable tray at one end with a finger notch between the two rails.
    for(let i=0;i<5;i++)t.box('#ba9f69',-.75,.57,(i-2)*.195,.59,.035,.176);
  }
  function german(r){
    const {b,l,m,n,t,w,d,h}=r, blue='#52636a', steel='#a7b2ae', dark='#303e43',c=.16;
    feet(b,w-.24,d-.16,dark);floor(b,blue,w,d,.125,c);
    ring(b,blue,w-.036,d-.036,(.19+h)/2,h-.19,c,.075);ring(m,dark,w+.008,d+.008,.245,.102,c,.045);
    ring(m,steel,w+.008,d+.008,h-.065,.063,c,.042);floor(t,'#566260',w-.08,d-.08,.206,c);
    for(const side of [-1,1]){
      for(const x of [-.89,-.68,-.47,.47,.68,.89])b.box('#697b81',x,.64,side*d,.074,.55,.072);
      for(const z of [-.31,0,.31])b.box('#667980',side*w,.59,z,.064,.43,.087);
    }
    slab(l,dark,w+.026,d+.024,.0,.055,c,d);slab(l,'#79898b',w+.019,d+.018,.057,.12,c,d);
    slab(l,blue,w-.129,d-.099,.179,.062,c*.8,d);
    // Recessed folding grip, on a darker inset between two pressed skid ribs.
    for(const x of [-.73,.73])n.box(steel,x,.266,d,.064,.056,2*d-.37);
    // The underside has its own pressed liner; it is visible when looking into the case.
    slab(l,'#647579',w-.12,d-.12,-.025,.024,c*.72,d);
    for(const z of [-.25,0,.25])l.box('#43565a',0,-.032,d+z,1.29,.024,.058);
    n.box(dark,0,.247,d,.66,.018,.25);for(const x of [-.23,.23])n.box(steel,x,.275,d,.044,.06,.13);
    n.rod(steel,[-.25,.299,d+.045],[.25,.299,d+.045],.030);
    for(const [i,col] of ['#242b2c','#a94436','#d7ae4d'].entries())n.box(col,-.40,.251,d+.37+(i-1)*.046,.49,.012,.044);
    sideGrips(m,w,.71,.18,steel,true);clasps(m,n,w,d,h,[-.68,.68],steel);tag(m,r.mark,.65,d+.047,steel,dark,cream);
    partitions(t,'#8f9e98',w-.10,d-.10,.276,.38,[.28],[-.11]);
    for(const z of [-.29,.26])t.box('#343f40',-.35,.288,z,.89,.043,.18);
  }
  // Section in (z,y), extruded along local X: a curved trunk lid and actual curved bands.
  function arch(k,col,x,width,d,height,base,thick){
    const edge=Array.from({length:11},(_,i)=>{const a=pi*i/10;return [d*(1-Math.cos(a)),base+height*Math.sin(a)];});
    const section=[...edge,...edge.slice().reverse().map(([z,y])=>[z,thick == null ? .004 : y-thick])];
    k.shape(col,section.map(([z,y])=>[-z,y]),width,x,0,0,0,.004,half);
  }
  function french(r){
    const {b,l,m,n,t,w,d,h}=r,navy='#385263',leather='#995e38',gold='#ccaa62';
    feet(b,w-.21,d-.14,'#493a31');floor(b,navy,w,d,.115,.073);sides(b,navy,w,d,(.18+h)/2,h-.18,.078);
    for(const y of [.23,h-.047])ring(m,leather,w+.003,d+.003,y,.087,.052);
    floor(t,'#c2ae8b',w-.083,d-.084,.19);partitions(t,'#a89173',w-.09,d-.09,.255,.29,[.34],[]);
    arch(l,'#577889',-w,w*2,d,.238,.115,null);
    for(const x of [-.78,.78]){
      arch(n,gold,x-.060,.12,d+.004,.244,.126,.021);
      for(const s of [-1,1]){
        m.box(leather,x,(h+.22)/2,s*(d+.02),.121,h-.22,.045);
        for(const y of [.35,.58,.84])m.cyl(gold,x,y,s*(d+.046),.018,.012,half);
      }
    }
    // Enamel cockade on the flatter crown, not a texture pasted across the opening seam.
    for(const [i,[rad,col]] of [[.243,'#a64c41'],[.160,'#efe4cc'],[.084,'#3a6385']].entries())n.cyl(col,0,.352+i*.014,d,rad,.021);
    for(const s of [-1,1])for(const p of [-1,1])m.box(gold,s*(w-.082),.30,p*d,.16,.21,.048);
    sideGrips(m,w,.65,.225,leather);clasps(m,n,w,d,h,[-.78,.78],gold);tag(m,r.mark,.64,d+.035,gold,'#293f50',cream);
    l.box('#c5aa84',0,-.012,d,w*1.79,.023,d*1.73);
    // Map pocket, with a stitched flap and a single brass snap (all attached to the lid).
    l.box('#80543b',0,-.035,d+.045,1.24,.024,.49);
    l.shape('#a97750',[[-.62,0],[.62,0],[.62,.08],[.075,.255],[-.075,.255],[-.62,.08]],.018,0,-.048,d-.20,half,.006);
    n.cyl(gold,0,-.071,d+.005,.023,.012);
    for(const x of [-.58,.58])for(const dz of [.07,.14,.21])l.box('#c4a484',x,-.051,d+dz,.009,.006,.034);
  }
  function swedish(r){
    const {b,l,m,n,t,w,d,h}=r, blue='#346888',yellow='#e7b840',ash='#c09b65',steel='#748a91';
    plankCase(r,[blue,'#457895','#376a87'],'#2d5061','#c6b38e',3);
    // Two upturned runners support the box, not four feet painted to look like skis.
    for(const s of [-1,1]){
      const pts=[[-w-.16,.24],[-w-.06,.217],[-w+.03,.131],[w-.03,.131],[w+.06,.217],[w+.16,.24],[w+.11,.132],[w-.08,.025],[-w+.08,.025],[-w-.11,.132]];
      b.shape(ash,pts,.127,0,0,s*(d-.145)-.0635,0,.009);
      for(const x of [-.75,.75])b.box('#5d5d49',x,.155,s*(d-.145),.20,.077,.165);
      for(const x of [-.87,.87]){m.box(steel,x,(.22+h)/2,s*(d+.014),.083,h-.22,.04);}
    }
    // Continuous Nordic cross in the closed lid's plane, offset toward the hoist.
    l.box(yellow,-.354,.155,d,.223,.014,2*d+.034);l.box(yellow,0,.156,d,w*2+.043,.018,.201);
    for(const x of [-.66,.66])n.box(ash,x,-.031,d,.082,.055,2*d-.20);
    sideGrips(m,w,.60,.19,steel);clasps(m,n,w,d,h,[-.87,.87],steel);tag(m,r.mark,.61,d+.023,yellow,'#294f64',cream);
    partitions(t,'#919e96',w-.078,d-.078,.279,.32,[.02],[]);
  }
  function american(r){
    const {b,l,m,n,t,w,d,h}=r,sand='#af9369',silver='#b7b7a9',navy='#334e5d', c=.084;
    feet(b,w-.14,d-.14,'#414546');floor(b,sand,w,d,.118,c);ring(b,sand,w-.035,d-.035,(.18+h)/2,h-.18,c,.074);
    ring(m,silver,w+.009,d+.009,.226,.083,c,.044);ring(m,'#585f5c',w+.009,d+.009,h-.046,.063,c,.044);
    for(const x of [-w+.072,w-.072])for(const z of [-d+.076,d-.076]){
      m.box(silver,x,.316,z,.183,.26,.179);m.box('#626965',x,.175,z,.194,.067,.185);
    }
    slab(l,navy,w+.017,d+.015,0,.053,c,d);slab(l,'#c2a77b',w+.017,d+.015,.053,.104,c,d);
    for(const x of [-.84,.84]){
      n.box(navy,x,.167,d,.117,.020,2*d+.03);
      for(const side of [-1,1])m.box(navy,x,(h+.24)/2,side*(d+.013),.117,h-.24,.034);
    }
    // Aircraft-style star and bars in relief, with contrast under the inset star.
    n.box(navy,0,.174,d,1.30,.024,.232);n.box(cream,0,.188,d,1.21,.015,.132);
    n.cyl(navy,0,.201,d,.274,.033);star(n,cream,0,.221,d,.225);
    sideGrips(m,w,.56,.25,silver,true);clasps(m,n,w,d,h,[-.84,.84],silver);tag(m,r.mark,.56,d+.026,navy,'#e2cfaa','#344958');
    floor(t,'#54615b',w-.083,d-.083,.196,c);partitions(t,'#424c47',w-.10,d-.10,.26,.26,[-.50,.56],[]);
    for(const z of [-.32,-.10,.12,.34])t.box('#71786c',.02,.277,z,.90,.034,.094);
    l.box('#525c57',0,-.010,d,2*w-.20,.022,2*d-.21);
    for(const x of [-.78,-.52,-.26,0,.26,.52,.78])l.box('#626a60',x,-.031,d,.128,.026,2*d-.45);
  }
  function japanese(r){
    const {b,l,m,n,t,w,d,h}=r,red='#803b39',ebony='#383b37',cedar='#c79e6e',gold='#bd9860';
    for(const x of [-.64,.64])b.box(ebony,x,.062,0,.22,.124,d*1.84);
    floor(b,ebony,w+.02,d+.02,.119,.06);sides(b,red,w,d,(.18+h)/2,h-.18,.064);
    for(const y of [.246,.50,.78]){ring(b,'#53312e',w+.002,d+.002,y,.044,.025);ring(m,cedar,w+.003,d+.003,y+.025,.018,.025,.027);}
    for(const s of [-1,1])for(const z of [-1,1])m.box(ebony,s*(w-.070),.425,z*(d-.015),.134,.361,.070);
    slab(l,ebony,w+.046,d+.038,0,.081,.069,d);slab(l,'#944b43',w+.006,d+.002,.083,.097,.091,d);
    slab(l,cedar,w-.11,d-.096,.182,.026,.057,d);slab(l,'#e8d6af',w-.147,d-.134,.209,.025,.044,d);
    n.cyl('#b34538',0,.245,d,.245,.020);
    for(const s of [-1,1]){
      const X=s*(w+.018),Y=h*.61;
      for(const z of [-.206,.206])m.cyl(gold,X,Y,z,.049,.054,half);
      m.line('#b09567',[[X,Y,.206],[X+s*.07,Y-.045,.195],[X+s*.10,Y-.116,.115],[X+s*.11,Y-.139,0],[X+s*.10,Y-.116,-.115],[X+s*.07,Y-.045,-.195],[X,Y,-.206]],.032);
      for(const z of [.15,2*d-.15]){
        n.box(ebony,s*(w-.106),.185,z,.142,.032,.133);n.cyl(gold,s*(w-.105),.205,z,.025,.019);
      }
    }
    clasps(m,n,w,d,h,[-.67,.67],gold);tag(m,r.mark,.649,d+.036,gold,ebony,cream);
    floor(t,cedar,w-.072,d-.072,.202);partitions(t,'#a97e55',w-.079,d-.079,.264,.423,[-.32,.32],[0]);
    l.box('#ad865d',0,-.012,d,w*1.82,.025,d*1.78);
  }
  const patterns={
    'national-ussr':[1.18,.67,1.22,soviet], 'national-germany':[1.06,.63,1.15,german],
    'national-france':[1.075,.67,1.03,french], 'national-sweden':[1.17,.565,.984,swedish],
    'national-usa':[1.23,.705,.91,american], 'national-japan':[.995,.64,.903,japanese]
  };
  function build(id){
    if(!Object.hasOwn(patterns,id))throw Error('Unknown national crate: '+id);
    const {name,mark}=catalog[id], [w,d,h,pattern]=patterns[id];
    const group=new THREE.Group(),hinge=new THREE.Group(),cargo=new THREE.Group();
    group.name=name;hinge.name='LidHinge';hinge.position.set(0,h,-d);cargo.name='Tray';
    const b=modelKit(),l=modelKit(),m=modelKit(),n=modelKit(),t=modelKit();
    pattern({b,l,m,n,t,w,d,h,mark});
    const surface=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.04});
    const fittings=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.49,metalness:.32});
    group.add(b.finish('Case',surface),m.finish('Case fittings',fittings),cargo,hinge);
    cargo.add(t.finish('Interior',surface));hinge.add(l.finish('Lid',surface),n.finish('Lid fittings',fittings));
    return {group,hinge,cargo,bulbs:[],glow:null,exhibit:true};
  }
  return {catalog,build};
})();
