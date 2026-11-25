// Moving identification plates, lit from the shipped game meshes; no stock imagery.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{pathToFileURL}=require('node:url');
const {chromium}=require('../../tests/node_modules/playwright-core');
const root=path.resolve(__dirname,'../..'),[work,...ids]=process.argv.slice(2);
if(!work)throw Error('Pass a temporary work directory');
const cast=['GPZ','STB-1','TYPE-5-H','OBJ-705A','ST-II','OBJ-2684','OBJ-263-X','TET-100','LEOPARD-1','PZKPFW-VII','VK-7201-K','PZ-55','VPZ-57','KPZ-67','MS1','IS3','MAUSCHEN','MAUS','IS7'];
(async()=>{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ct-soundstage-'));let b;
try{const file=path.join(tmp,'index.html');fs.writeFileSync(file,`<meta charset="utf-8"><base href="${pathToFileURL(root+'/')}"><script src="models/catalog.js"></script><script src="vendor/three-r180.min.js"></script><script src="js/battle-models.js"></script>`);
 b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await b.newPage({offline:true});await p.goto(pathToFileURL(file).href);
 await p.evaluate(()=>{const T=THREE,W=820,H=424,renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setClearColor(0,0);renderer.setSize(W,H,false);
   renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
   const scene=new T.Scene(),cam=new T.PerspectiveCamera(22,W/H,.06,200),mat=new T.MeshPhongMaterial({vertexColors:true,side:T.DoubleSide,specular:0x787b73,shininess:30});
   scene.add(new T.HemisphereLight(0xeaf1fa,0x8d877b,1.65));const light=(c,p,i)=>{const l=new T.DirectionalLight(c,i);l.position.set(...p);scene.add(l);return l;};
   const sun=light(0xffdd9b,[5,7,4],3.6);light(0x94d6ff,[-4,3,-3],3.0);light(0xfcdfb5,[3,3,-5],1.3);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:26});sun.shadow.bias=-.0005;
   let model,center,distance,high,wide;
   window.loadPlate=async id=>{if(model)scene.remove(model);const a=await BattleModels.load(modelKey(id),new AbortController().signal);model=new T.Group();
     const h=new T.Mesh(a.hull,mat),t=new T.Mesh(a.turret,mat),g=new T.Mesh(a.gun,mat);t.position.fromArray(a.pivot);g.position.fromArray(a.gunPivot);t.add(g);model.add(h,t);scene.add(model);model.updateMatrixWorld(true);
     const box=new T.Box3().setFromObject(model);center=box.getCenter(new T.Vector3());high=box.max.y-box.min.y;wide=id==='ST-II'?.66:1.12;distance=0;
     const slope=Math.tan(cam.fov*Math.PI/360),vec=new T.Vector3();for(const angle of [wide-.46,wide-.23,wide,wide+.19]){
       const dir=new T.Vector3(Math.sin(angle),.32,Math.cos(angle)).normalize(),right=new T.Vector3().crossVectors(cam.up,dir).normalize(),up=new T.Vector3().crossVectors(dir,right);
       for(const part of [h,t,g]){part.castShadow=part.receiveShadow=true;const pos=part.geometry.attributes.position;
         for(let i=0;i<pos.count;i++){vec.fromBufferAttribute(pos,i).applyMatrix4(part.matrixWorld).sub(center);const z=vec.dot(dir);distance=Math.max(distance,z+Math.abs(vec.dot(right))/(slope*cam.aspect*.93),z+Math.abs(vec.dot(up))/(slope*.88));}}
     }renderer.shadowMap.needsUpdate=true;return DB[id].n;};
   window.plate=(u)=>{const a=wide+.16-.57*u,dir=new T.Vector3(Math.sin(a),.31+.055*u,Math.cos(a)).normalize();cam.position.copy(center).addScaledVector(dir,distance);cam.lookAt(center);renderer.render(scene,cam);return renderer.domElement.toDataURL('image/webp',.94).split(',')[1];};
 });
 for(const id of ids.length?ids:cast){const dir=path.resolve(work,'plates',id);fs.mkdirSync(dir,{recursive:true});const name=await p.evaluate(id=>loadPlate(id),id);for(let i=0;i<56;i++){const buff=await p.evaluate(u=>plate(u),i/55);fs.writeFileSync(path.join(dir,String(i).padStart(2,'0')+'.webp'),Buffer.from(buff,'base64'));}console.log(id,name,56);}
}finally{if(b)await b.close();fs.rmSync(tmp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
