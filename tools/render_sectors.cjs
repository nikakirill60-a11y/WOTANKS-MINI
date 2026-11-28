// Photograph the actual playable layouts; the picker does not start ten WebGL scenes.
// . /path/to/chromium-env (or set CHROMIUM_PATH); npm ci --prefix tests; node tools/render_sectors.cjs
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('../tests/node_modules/playwright-core');
(async()=>{
  const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/sectors');fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {const p=await b.newPage({offline:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(/Shader Error|GL_INVALID_OPERATION/.test(m.text()))errors.push(m.text())});
    await p.goto(pathToFileURL(path.join(root,'index.html')).href);
    const ids=process.argv.length>2?process.argv.slice(2):await p.evaluate(()=>Object.keys(BattleMaps.specs));
    for(const id of ids){await p.reload();const data=await p.evaluate(id=>{
      const a=BattleMaps.create(id),s=a.spec,scene=new THREE.Scene(),w=768,h=320,m=BATTLE_UNITS_PER_METRE;
      const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(w,h);r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;
      WeatherEngine.currentWeather='clear';const world=buildBattleWorld(scene,{arena:a,walls:a.walls,terrainZones:a.zones});
      const mark=a.sights[0],hero=a.walls.find(l=>l.model===s.sights[0][0]),[dx,height,dz]=s.view;
      const cam=new THREE.PerspectiveCamera(38,w/h,.7,2*Math.hypot(a.bounds.x,a.bounds.y)+2800),x=mark.x+dx*m,z=mark.y+dz*m;
      cam.position.set(x,Math.max(hero.baseHeight,a.ground.at(x,z))+height*m,z);
      cam.lookAt(mark.x+.09*dx*m,hero.baseHeight+hero.height*.48,mark.y);world.time.value=8;r.render(scene,cam);
      const data=r.domElement.toDataURL('image/webp',.89).split(',')[1];r.dispose();r.forceContextLoss();return data;
    },id);fs.writeFileSync(path.join(out,id+'.webp'),Buffer.from(data,'base64'));console.log(id);}
    if(errors.length)throw Error(errors.join('\n'));
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
