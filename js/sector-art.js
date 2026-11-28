// A single, seeded print of the sky drives the clouds, broad ground stains and water glints.
// No network textures, post-processing chain or per-frame scenery allocation.
const SectorArt = (() => {
  function paper(random) {
    const T=THREE, size=128,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(size,size),data=pixels.data;
    const grids=[4,8,16,32].map(n=>({n,v:Float32Array.from({length:n*n},random)}));
    const blend=t=>t*t*(3-2*t), lerp=(a,b,t)=>a+(b-a)*t;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      let sum=0, octave=0;
      for(const {n,v} of grids){const u=x*n/size,w=y*n/size,i=u|0,j=w|0,get=(dx,dy)=>v[(i+dx)%n+(j+dy)%n*n];
        sum+=lerp(lerp(get(0,0),get(1,0),blend(u-i)),lerp(get(0,1),get(1,1),blend(u-i)),blend(w-j))*.54**octave++;}
      const k=(x+y*size)*4;data[k]=data[k+1]=data[k+2]=Math.round(sum/(1+.54+.54**2+.54**3)*255);data[k+3]=255;
    }
    ctx.putImageData(pixels,0,0);const map=new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;return map;
  }
  function climate(scene,arena,weather,random) {
    const T=THREE,s=arena.spec,cold=arena.id==='frost',night=weather==='night',wet=weather==='rain'||weather==='snow',
      dust=weather==='sandstorm', chart=paper(random), time={value:0};
    const zenith=new T.Color(night?'#253456':s.sky[0]), horizon=new T.Color(night?'#adb0c0':s.sky[1]),
      key=new T.Color(night?'#c1d2f1':s.light);
    if(wet){zenith.lerp(new T.Color('#738393'),.72);horizon.lerp(new T.Color('#c6d2d3'),.70);}
    if(dust){zenith.lerp(new T.Color('#b59372'),.7);horizon.set('#dbba88');}
    const sunDir=new T.Vector3(Math.cos(s.bearing),night ? .55:wet ? .87:.42+Number(s.sector)%4*.12,Math.sin(s.bearing)).normalize();
    scene.background=horizon;scene.fog=new T.FogExp2(horizon,dust ? .00052:wet ? .00031:night ? .00027:.00019);
    const sky=new T.Mesh(new T.SphereGeometry(1,32,16),new T.ShaderMaterial({
      side:T.BackSide,depthWrite:false,uniforms:{zenith:{value:zenith},horizon:{value:horizon},sunDir:{value:sunDir},
        lamp:{value:key},grain:{value:chart},time,overcast:{value:wet ? .89:dust ? .55:.4},night:{value:night?1:0},polar:{value:cold?1:0}},
      vertexShader:`varying vec3 dir;void main(){dir=position;vec4 p=projectionMatrix*vec4(mat3(viewMatrix)*position,1.);gl_Position=p.xyww;}`,
      fragmentShader:`varying vec3 dir;uniform vec3 zenith,horizon,sunDir,lamp;uniform sampler2D grain;uniform float time,overcast,night,polar;
      void main(){vec3 d=normalize(dir);float h=max(d.y,0.);vec3 col=mix(horizon,zenith,smoothstep(-.04,.68,pow(h,.63)));
        float sun=max(dot(d,sunDir),0.);col+=lamp*(.26*pow(sun,17.)+.65*smoothstep(.9993,.9997,sun));
        vec2 uv=d.xz/(.19+h)*vec2(.53,.72)+vec2(time*.00072,0.);float f=texture2D(grain,uv*.83).r*.66+texture2D(grain,uv*2.53+.37).r*.34;
        float cloud=smoothstep(.67-overcast*.26,.76-overcast*.27,f)*smoothstep(.005,.14,h);
        vec3 cloudInk=mix(horizon*.79,lamp*.90,smoothstep(.37,.69,f));col=mix(col,cloudInk,cloud*(1.-night*.60));
        float ribbon=abs(h-(.13+.055*sin(d.x*6.+d.z*3.)+.035*cos(d.z*14.)));col+=vec3(.035,.115,.095)*polar*exp(-ribbon*31.)*smoothstep(.24,.70,f);
        col+=night*pow(texture2D(grain,d.xz*117.).r,17.)*4.*smoothstep(.03,.3,h);gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }` }));
    sky.name='atlas:sky';sky.frustumCulled=false;sky.renderOrder=-100;scene.add(sky);
    sky.material.addEventListener('dispose',()=>chart.dispose());
    scene.add(new T.HemisphereLight(night?'#d0dbf5':'#fff3de',cold?'#8594b8':'#7c7667',wet?1.3:1.05));
    const light=new T.DirectionalLight(key,wet?1.50:night?1.40:2.30),reach=Math.hypot(arena.bounds.x,arena.bounds.y);
    light.position.copy(sunDir).multiplyScalar(reach*1.6);light.castShadow=true;
    // Static atlas shadow; refresh only when a building or tree changes, not once per wheel per frame.
    Object.assign(light.shadow.camera,{left:-reach,right:reach,top:reach,bottom:-reach,near:1,far:reach*3});
    light.shadow.camera.updateProjectionMatrix();const pixels=innerWidth<=650?1024:2048;light.shadow.mapSize.set(pixels,pixels);light.shadow.normalBias=1.4;light.shadow.bias=-.00019;scene.add(light);
    ridges(scene,arena,horizon,random);
    return {chart,time};
  }
  function ridges(scene,a,horizon,random){
    const T=THREE,r=Math.hypot(a.bounds.x,a.bounds.y),alpine=['frost','burgstadt'].includes(a.id),sea=['port','cape'].includes(a.id),
      red=['desert','quarry'].includes(a.id),n=96,phase=random()*6;
    for(let row=0;row<2;row++){
      const pos=[],rgb=[],crest=[],foot=[],mid=[],far=row===0;
      for(let i=0;i<n;i++){
        const p=i*2*Math.PI/n,rad=r*(far?1.44:1.10)+190+random()*95;
        let h=(far?370:180)+(Math.sin(p*5+phase)*.5+.5)*(alpine?470:190)+random()*(red?105:145);
        if(sea)h*=Math.min(1,Math.max(0,(.25-Math.cos(p))*4));
        for(const [arr,k,y] of [[crest,1,h],[mid,.974,h*(alpine ? .68:.49)],[foot,.89,-24]])arr.push([Math.cos(p)*rad*k,y,Math.sin(p)*rad*k]);
      }
      for(let i=0;i<n;i++){const j=(i+1)%n;
        const paint=(shade,...pts)=>{const c=new T.Color(shade).lerp(horizon,far ? .65:.32).multiplyScalar(.92+.12*random());for(const p of pts){pos.push(...p);rgb.push(c.r,c.g,c.b)}};
        paint(red?'#a5745e':alpine?'#64758a':'#617c76',foot[i],mid[i],mid[j],foot[i],mid[j],foot[j]);
        paint(alpine?'#e4eaf1':red?'#d09f7c':'#92a99a',mid[i],crest[i],crest[j],mid[i],crest[j],mid[j]);
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(pos),3));g.setAttribute('color',new T.BufferAttribute(new Float32Array(rgb),3));
      const mesh=new T.Mesh(g,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}));mesh.name='atlas:ridgeline';scene.add(mesh);
    }
  }
  // Render road shoulders, compressed wheel beds and a usable centre line from the actual polyline.
  function road(c,p,stroke){
    const tint={asphalt:'#616b71',cobble:'#a29c8e',gravel:'#af9f88',trail:'#a59875',sand:'#cdab7a',ice:'#b4ced6',timber:'#a38a68'};
    const paint=(ink,width)=>{c.strokeStyle=ink;c.lineWidth=width;stroke(c,p)};
    paint(p.type==='ice'?'#dae6e3':'#827c6a',2*p.radius+6);paint(tint[p.type],2*p.radius);
    if(p.type==='asphalt'){c.setLineDash([37,60]);paint('#d6c7a2',2.8);c.setLineDash([]);}
    else if(['trail','sand','gravel','ice'].includes(p.type)) {
      for(const sign of [-1,1]){c.beginPath();p.points.forEach((q,i,ps)=>{const f=ps[Math.max(0,i-1)],t=ps[Math.min(ps.length-1,i+1)], d=Math.hypot(t.x-f.x,t.y-f.y)||1;
        c[i?'lineTo':'moveTo'](q.x-sign*(t.y-f.y)/d*14,q.y+sign*(t.x-f.x)/d*14);});c.lineWidth=5;c.strokeStyle=p.type==='ice'?'#e9f1ec66':'#71655442';c.stroke();}
    }
  }
  function water(at,ice){
    const T=THREE,m=new T.MeshPhongMaterial({color:ice?'#88b5c5':'#4a9099',specular:'#c2e2d7',shininess:56,transparent:true,opacity:.87,depthWrite:false});
    m.onBeforeCompile=s=>{s.uniforms.chart={value:at.chart};s.uniforms.tide=at.time;
      s.vertexShader='varying vec2 tideXY;\n'+s.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      vec4 waterPos=vec4(transformed,1.);
      #ifdef USE_INSTANCING
        waterPos=instanceMatrix*waterPos;
      #endif
      tideXY=(modelMatrix*waterPos).xz;`);
      s.fragmentShader='varying vec2 tideXY;uniform sampler2D chart;uniform float tide;\n'+s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float sw=texture2D(chart,tideXY*.0013+vec2(.004*tide,0.)).r;
        float glint=sin(tideXY.y*.115+sw*12.+tide*.88)*.5+.5;
        diffuseColor.rgb=diffuseColor.rgb*(.74+sw*.49)+vec3(.18,.22,.20)*smoothstep(.82,.98,glint)*smoothstep(.42,.76,sw);`);};return m;
  }
  // Low, grouped silhouettes. No decorative building or hedge blocks an unmodelled lane.
  function details(scene,a,random){
    const T=THREE,m=BATTLE_UNITS_PER_METRE,soil=a.ground,positions=[],colors=[],id=a.id,
      cold=id==='frost',dry=id==='desert'||id==='quarry',fall=id==='sawmill',urban=['city','port','burgstadt','airfield'].includes(id),
      stems=(cold?['#a18c72','#b8a489','#b5c5c2']:dry?['#b09560','#ad8868','#c4ac6c']:fall?['#a28d4d','#b58947','#968148']:['#70814d','#909853','#8b9a69']).map(s=>new T.Color(s));
    const face=(c,...pts)=>{positions.push(...pts.flat());for(let k=0;k<3;k++)colors.push(c.r,c.g,c.b);};
    const inRect=(x,y,r)=>x>r.x&&y>r.y&&x<r.x+r.w&&y<r.y+r.h;
    const keep=[...a.water,...a.walls,...a.zones.filter(z=>!['stubble','sand','mud'].includes(z.type))];
    const stalks=(x,z,count,tall,reed=false)=>{for(let j=0;j<count;j++){
      const X=x+(random()-.5)*8*m,Z=z+(random()-.5)*5*m,Y=soil.at(X,Z)-.03*m,
        c=stems[(random()*stems.length)|0],s=(.28+random()*.78)*m*tall,l=(reed ? .11:.23)*s;
      face(c,[X-l,Y,Z],[X+l,Y,Z],[X+s*.38,Y+s,Z-.5]);face(c,[X,Y,Z-l],[X,Y,Z+l],[X+s*.27,Y+s*.80,Z+l]);
    }};
    for(let i=0;i<(urban?530:1300);i++){
      const x=(random()*2-1)*(a.bounds.x-15*m),z=(random()*2-1)*(a.bounds.y-15*m);
      if(keep.some(r=>inRect(x,z,r))||a.paths.some(p=>BattleMaps.onPath(p,x,z,3*m)))continue;
      stalks(x,z,3+((random()*5)|0),cold ? .4:dry ? .48:urban ? .45:.86);
    }
    for(const r of a.water)for(let i=0;i<Math.min(64,(r.w+r.h)/(2*m));i++){
      const p=random(),edge=i%4,x=r.x+(edge===0?-.012:edge===1?1.012:p)*r.w,z=r.y+(edge===2?-.012:edge===3?1.012:p)*r.h;
      if(!urban&&!cold)stalks(x,z,3,1.45,true);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(positions),3));g.setAttribute('color',new T.BufferAttribute(new Float32Array(colors),3));
    const mesh=new T.Mesh(g,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}));mesh.name='atlas:verges';scene.add(mesh);
  }
  // One shared coloured canopy per biome, instanced on the very same knock-down trunks as the physics.
  function canopy(id){
    const T=THREE,pos=[],rgb=[],tau=2*Math.PI,cold=id==='frost',palm=id==='desert',autumn=id==='sawmill';
    const face=(t,a,b,c)=>{pos.push(...a,...b,...c);const col=new T.Color(t);for(let j=0;j<3;j++)rgb.push(col.r,col.g,col.b);};
    if(palm){for(let j=0;j<10;j++){
      const a=j*2.4,r=j%3 ? .52:.39,c=j%2?'#738253':'#84915a';
      const at=(d,h,l)=>[d*Math.cos(a)-l*Math.sin(a),h,d*Math.sin(a)+l*Math.cos(a)];
      const base=at(0,-.33,0),ridge=at(.25,.26,0),left=at(.22,.14,.095),right=at(.22,.14,-.095),tip=at(r,-.19,0);
      face(c,base,left,ridge);face(c,base,ridge,right);face('#8c985d',left,tip,ridge);face(c,ridge,tip,right);
    }}else if(cold){for(let j=0;j<3;j++){
      const r=.51-j*.10,h=-.44+j*.22;for(let k=0;k<7;k++){
        const a=k*tau/7+j*.3,b=(k+1)*tau/7+j*.3,base=t=>[r*Math.cos(t),h,r*Math.sin(t)],edge=t=>[r*.78*Math.cos(t),h+.08,r*.78*Math.sin(t)];
        face('#628074',base(a),base(b),edge(a));face('#73908a',base(b),edge(b),edge(a));face(j===2?'#dbe7e0':'#b6cfc8',edge(a),edge(b),[0,h+.47,0]);
      }}
    }else{const shades=autumn?['#efb556','#bf7545','#d69a4a']:['#94aa63','#829757','#6e8b5d'];
      for(let j=0;j<3;j++){const r=j===0 ? .37:.29,x=j===0?0:j===1?-.25:.22,z=j===1?-.07:.09,y=j===0 ? .04:-.14;
        for(let i=0;i<6;i++){const a=i*tau/6+j*.58,b=(i+1)*tau/6+j*.58,q=t=>[x+r*Math.cos(t),y+.06,z+r*Math.sin(t)],top=[x+.036,y+r*1.18,z+.04];
          face(shades[(j+i%2)%3],q(a),q(b),top);face(shades[(j+2)%3],q(b),q(a),[x,y-r*.89,z]);}
      }}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(pos),3));g.setAttribute('color',new T.BufferAttribute(new Float32Array(rgb),3));g.computeVertexNormals();return g;
  }
  // Stencil work and service aprons are baked once, in world coordinates below their owners.
  function yards(c,a){
    const m=BATTLE_UNITS_PER_METRE, industrial=['city','quarry','port','airfield','sawmill'].includes(a.id);
    for(const [i,w] of a.walls.entries()){
      if(!w.model||['logs','hay','plane','wagon','daymark','rampart','trawler'].includes(w.model))continue;
      c.save();c.translate(w.x+w.w/2,w.y+w.h/2);c.rotate(-(w.turn||0)*Math.PI/2);c.scale(m,m);
      const W=(w.turn%2?w.h:w.w)/m,D=(w.turn%2?w.w:w.h)/m;
      c.fillStyle=industrial?'#9b968384':a.id==='frost'?'#b7c6cd9e':'#ada17d75';c.fillRect(-W/2-2,-D/2-2,W+4,D+6);
      if(industrial){const z=D/2+1.8;c.fillStyle='#d5bd80bb';c.fillRect(-W/2,z,W,.28);
        for(let x=-W/2+1;x<W/2-1;x+=2){c.beginPath();c.moveTo(x,z);c.lineTo(x+.5,z);c.lineTo(x-.37,z+1.4);c.lineTo(x-.87,z+1.4);c.fill();}
        c.fillStyle='#e5dbb0b8';c.font='bold 3.4px monospace';c.textAlign='center';c.fillText(a.spec.sector+' / '+String(i+1).padStart(2,'0'),0,z+6);
      }c.restore();
    }
  }
  return {climate,road,water,yards,details,canopy};
})();
