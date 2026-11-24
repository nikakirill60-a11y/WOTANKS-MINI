// The world beyond the inspection doors. Generated locally; no panorama, sky texture or CDN.
const WinterLandscape = (() => {
  const T = THREE, tau = 2 * Math.PI;
  function seeded(seed) {
    return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  }
  function facets() {
    const pos = [], rgb = [], palette = new Map();
    return {
      face(a, b, c, paint) {
        if (!palette.has(paint)) palette.set(paint, new T.Color(paint));
        const {r,g,b:blue} = palette.get(paint);
        pos.push(...a,...b,...c); rgb.push(r,g,blue,r,g,blue,r,g,blue);
      },
      geometry() {
        const geo = new T.BufferGeometry();
        geo.setAttribute('position',new T.BufferAttribute(new Float32Array(pos),3));
        geo.setAttribute('color',new T.BufferAttribute(new Float32Array(rgb),3));
        geo.computeVertexNormals(); return geo;
      }
    };
  }
  const polar = (a,r,y) => [r*Math.sin(a), y, -r*Math.cos(a)];
  const between = (a,b,t,dy=0) => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t+dy,a[2]+(b[2]-a[2])*t];

  // Radial whorls of folded boughs. Their white upper faces follow the branch ridges,
  // so the snow and tree have real silhouettes from every side (including overhead).
  function spruce(detailed) {
    const s = facets(), rng = seeded(detailed ? 206 : 519), layers = detailed ? 9 : 6;
    for (let level=0; level<layers; level++) {
      const y = .105 + level * .81 / (layers-1), r = .36 * (1-y), top = Math.min(1,y+.066+(1-y)*.39);
      const count = detailed ? 10-Math.floor(level/2) : 6, turn = level*2.1;
      for (let j=0; j<count; j++) {
        const a = turn+j*tau/count, half = Math.PI/count;
        const tip = polar(a,r*(.94+.12*rng()),y-.025*rng());
        const left = polar(a-half,r*.77,y+.015), right = polar(a+half,r*.77,y+.015);
        const ridge = polar(a+.06,r*.43,y+(top-y)*.59), apex = [0,top,0];
        const shade = ['#173e39','#195047','#23564c'][Math.floor(rng()*3)];
        s.face(left,ridge,tip,shade); s.face(tip,ridge,right,'#276253');
        s.face(left,tip,[0,y+.035,0],'#14352e'); s.face(tip,right,[0,y+.035,0],'#1b3731');
        s.face(left,apex,ridge,'#264e45'); s.face(ridge,apex,right,shade);
        // A scallop of snow leaves dark needle tips exposed, not a second white cone.
        const snow = ['#92aab7','#b5cbd3','#a4bcc8'][Math.floor(rng()*3)];
        const r0 = between(ridge,apex,.08,.003), l = between(ridge,left,.65,.004);
        const rr = between(ridge,right,.73,.004), t = between(ridge,tip,.65+.18*rng(),.004);
        s.face(l,r0,t,snow); s.face(t,r0,rr,'#a4c8d1');
      }
    }
    return s.geometry();
  }

  function sky(room, time) {
    const sky = new T.Mesh(new T.SphereGeometry(1,40,18), new T.ShaderMaterial({
      uniforms:{uTime:time}, side:T.BackSide, depthTest:false, depthWrite:false, toneMapped:false,
      vertexShader:`varying vec3 ray;
        void main(){ ray=position;
          vec3 w=mat3(modelMatrix)*position;
          vec4 clip=projectionMatrix*vec4(mat3(viewMatrix)*w,1.0);
          gl_Position=clip.xyww;
        }`,
      fragmentShader:`varying vec3 ray; uniform float uTime;
        float hash(vec2 p){ vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
        void main(){
          vec3 d=normalize(ray); float a=atan(d.x,-d.z), h=d.y, t=uTime*.026;
          vec3 col=mix(vec3(.046,.104,.161),vec3(.002,.005,.024),smoothstep(-.025,.246,h));
          float hem=.096+.043*sin(4.0*a+.43+t*.26)+.022*sin(9.0*a-.4)+.010*cos(23.0*a+t);
          float v=h-hem, ribs=.48+.27*sin(93.0*a+4.0*sin(13.0*a)+t)+.13*sin(187.0*a-t);
          float curtain=smoothstep(-.009,.012,v)*exp(-max(v,0.0)*22.0)*ribs;
          col+=curtain*mix(vec3(.037,.66,.45),vec3(.093,.19,.44),smoothstep(.015,.11,v));
          float v2=h-hem*.63-.085-.017*sin(a*6.0-t*.3);
          col+=vec3(.063,.11,.20)*smoothstep(-.015,.016,v2)*exp(-max(v2,0.0)*19.0)*(.6+.3*sin(a*63.0));
          vec2 grid=vec2(a,h)*128.0, cell=floor(grid); float n=hash(cell);
          vec2 pt=fract(grid)-vec2(.19+.62*hash(cell+7.1),.19+.62*hash(cell-4.3));
          float star=(1.0-smoothstep(.05,.17,length(pt)))*step(.932,n)*smoothstep(.012,.118,h);
          col+=vec3(.64,.77,1.)*star;
          vec3 md=normalize(vec3(.30,.159,-1.)); float dist=length(d-md);
          float moon=1.-smoothstep(.0185,.020,dist);
          float dark=1.-smoothstep(.017,.019,length(d-normalize(md+vec3(-.012,.008,0.))));
          col+=vec3(.12,.17,.22)*exp(-dist*36.) + vec3(.86,.90,.80)*moon*(1.-.86*dark);
          gl_FragColor=vec4(col,1.0);
          #include <colorspace_fragment>
        }`
    }));
    sky.name='polar-sky'; sky.renderOrder=-100; sky.frustumCulled=false; room.add(sky);
  }

  function groundY(x,z) {
    const edge = Math.min(1,Math.max(0,(Math.hypot(x,z)-10)/13));
    return -.17+edge*(.62+.38*Math.sin(x*.24+z*.13)+.32*Math.cos(z*.39-x*.12));
  }
  function snowfield(room) {
    const geo = new T.PlaneGeometry(170,170,62,62); geo.rotateX(-Math.PI/2);
    const p=geo.attributes.position, rgb=new Float32Array(p.count*3);
    const blue=new T.Color('#667f95'), ice=new T.Color('#9cb2c0'), c=new T.Color();
    for (let i=0;i<p.count;i++) {
      const x=p.getX(i), z=p.getZ(i), h=groundY(x,z); p.setY(i,h);
      const shade=.35+.19*Math.sin(x*.46+z*.16)+.16*Math.cos(z*.34-x*.41);
      c.copy(blue).lerp(ice,shade).toArray(rgb,i*3);
    }
    geo.setAttribute('color',new T.BufferAttribute(rgb,3)); geo.computeVertexNormals();
    const floor=new T.Mesh(geo,new T.MeshLambertMaterial({vertexColors:true}));
    floor.name='snowfield'; floor.receiveShadow=true; room.add(floor);
  }
  function ridges(room,mat) {
    const s=facets(), rng=seeded(817);
    for (const [r,n,scale] of [[73,116,.96],[47,106,.45]]) {
      const rows=[];
      for (let i=0;i<n;i++) {
        const a=tau*(i+.35*rng())/n, h=scale*(3.4+3.9*Math.sin(3*a+.4)**2+4.3*Math.sin(6*a-.1)**6+1.7*rng());
        const d=r+4*rng();
        rows.push([polar(a,d-10-rng()*2,-.36),polar(a+.02,d-4.8,h*.46),polar(a,d,h),polar(a+.02,d+6,h*.28),polar(a,d+12,-.4)]);
      }
      for (let i=0;i<n;i++) {
        const l=rows[i], b=rows[(i+1)%n];
        for (let k=0;k<4;k++) {
          const cols=k===1||k===2 ? ['#7790a7','#57728c','#849aac','#4d637d'] : ['#2c4359','#3d5368','#4b6379'];
          s.face(l[k],b[k],l[k+1],cols[Math.floor(rng()*cols.length)]);
          s.face(b[k],b[k+1],l[k+1],cols[Math.floor(rng()*cols.length)]);
        }
      }
    }
    const peaks=new T.Mesh(s.geometry(),mat); peaks.name='alpine-ridges'; room.add(peaks);
  }
  function snowfall(room,time) {
    const mat=new T.ShaderMaterial({uniforms:{uTime:time}, toneMapped:false,
      vertexShader:`uniform float uTime; varying float light;
        void main(){ vec3 base=instanceMatrix[3].xyz; vec3 p=mat3(instanceMatrix)*position;
          p.y+=mod(base.y-uTime*(.48+.20*sin(base.z*2.6)),8.0);
          p.x+=base.x+.33*sin(uTime*.39+base.y)+.17*cos(p.y*.9+base.z);
          p.z+=base.z+.19*sin(base.x+p.y*.47);
          vec4 mv=modelViewMatrix*vec4(p,1.); light=.88-.58*smoothstep(2.,28.,-mv.z);
          gl_Position=projectionMatrix*mv;
        }`,
      fragmentShader:`varying float light; void main(){ gl_FragColor=vec4(vec3(.82,.94,1.)*light,1.);
        #include <colorspace_fragment>
      }`});
    const snow=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat,560), rng=seeded(42), o=new T.Object3D();
    for(let i=0;i<snow.count;i++) {
      const x=(rng()-.5)*28; let z=rng()*28-17;
      if (Math.abs(x)<5.65 && z>-2.8 && z<7.1) z=-3-rng()*12; // sheltered under the roof
      const size=.009+.017*rng(); o.position.set(x,rng()*8,z); o.scale.set(size,size*1.4,size);
      o.updateMatrix(); snow.setMatrixAt(i,o.matrix);
    }
    snow.name='falling-snow'; snow.frustumCulled=false; room.add(snow);
  }
  function build(room,time) {
    sky(room,time); snowfield(room); snowfall(room,time);
    const mat=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide,flatShading:true});
    ridges(room,mat);
    // Cull stands independently. Looking out one door on a phone shouldn't submit the entire forest.
    const rng=seeded(277), geo=spruce(false), o=new T.Object3D(), stands=Array.from({length:12},()=>[]);
    for(let i=0;i<202;i++) {
      const a=rng()*tau,d=18+23*rng(),x=d*Math.sin(a),z=-d*Math.cos(a),h=1.9+3.8*rng();
      o.position.set(x,groundY(x,z)-.24,z); o.rotation.y=rng()*tau; o.scale.setScalar(h); o.updateMatrix();
      stands[Math.floor(a/tau*stands.length)].push(o.matrix.clone());
    }
    for(const stand of stands) {
      const trees=new T.InstancedMesh(geo,mat,stand.length);
      stand.forEach((matrix,i)=>trees.setMatrixAt(i,matrix));trees.name='forest';room.add(trees);
    }
  }
  return {build,spruce,facets};
})();
