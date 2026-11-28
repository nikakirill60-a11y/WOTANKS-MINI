// Render shop thumbnails, stills and offline opening/closing film tracks from exactly the same hinged models as the opening.
const {chromium}=require('../tests/node_modules/playwright-core');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'assets/crates');
(async()=>{
  const all=['basic','premium','collection','ornament'], ids=process.argv.length>2?process.argv.slice(2):all;
  if(ids.some(id=>!all.includes(id)))throw Error('Unknown crate');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ct-crate-studio-')),file=path.join(dir,'index.html');
  fs.writeFileSync(file,`<meta charset="utf-8"><base href="${pathToFileURL(root+'/')}"><script src="vendor/three-r180.min.js"></script><script src="js/crate-motion.js"></script><script src="js/ornament-models.js"></script><script src="js/crate-model.js"></script>`);
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    fs.mkdirSync(folder,{recursive:true});const page=await b.newPage({offline:true});await page.goto(pathToFileURL(file).href);
    await page.evaluate(()=>{
      const T=THREE,r=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true}),s=new T.Scene();
      r.setClearColor(0,0);r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.02;r.setSize(760,640,false);CrateModel.light(s);
      window.capture=(id,open,toy=false)=>{
        r.setSize(760,640,false);const rig=toy?{group:OrnamentModels.make(id)}:CrateModel.build(id);s.add(rig.group);if(!toy)CrateMotion.snap(rig,open);
        const box=new T.Box3().setFromObject(rig.group),target=box.getCenter(new T.Vector3()),cam=new T.PerspectiveCamera(21,760/640,.05,60);
        const dir=(toy?new T.Vector3(.17,.09,1):open?new T.Vector3(.83,1.94,1.13):new T.Vector3(1.25,.97,1.66)).normalize();
        cam.position.copy(target).addScaledVector(dir,box.getSize(new T.Vector3()).length()*.51/Math.sin(cam.fov*Math.PI/360));cam.lookAt(target);r.render(s,cam);
        const c=document.createElement('canvas');c.width=760;c.height=640;const g=c.getContext('2d');g.drawImage(r.domElement,0,0);
        const a=g.getImageData(0,0,760,640).data;let l=760,t=640,rr=-1,bb=-1;
        for(let y=0;y<640;y++)for(let x=0;x<760;x++)if(a[(y*760+x)*4+3]>12){l=Math.min(x,l);rr=Math.max(x,rr);t=Math.min(y,t);bb=Math.max(y,bb);}
        if(l<=0||t<=0||rr>=759||bb>=639||rr<=l||bb<=t)throw Error('Clipped or missing '+id);
        const out=document.createElement('canvas');out.width=toy?160:512;out.height=toy?160:352;
        const w=rr-l+1,h=bb-t+1,k=Math.min((out.width-(toy?12:16))/w,(out.height-(toy?12:14))/h);const ctx=out.getContext('2d');ctx.imageSmoothingQuality='high';
        ctx.drawImage(c,l,t,w,h,(out.width-w*k)/2,(out.height-h*k)/2,w*k,h*k);
        s.remove(rig.group);CrateModel.dispose(rig.group);
        return out.toDataURL('image/webp',.94).split(',')[1];
      };
      window.record=id=>{
        const M=CrateMotion,f=M.film,world=new T.Scene(),rig=CrateModel.build(id);
        CrateModel.studio(world);rig.group.position.y=.02;world.add(rig.group);
        const cam=new T.PerspectiveCamera(32,f.w/f.h,.05,60),look=new T.Vector3();M.frame(cam,f.w,f.h,800);r.setSize(f.w,f.h,false);
        const sheet=document.createElement('canvas');sheet.width=f.w*f.columns;sheet.height=f.h*Math.ceil(f.frames*2/f.columns);
        const g=sheet.getContext('2d');
        for(const open of [true,false]){
          const from=M.view(!open,800),to=M.view(open,800);M.snap(rig,!open);
          for(let i=0;i<f.frames;i++){
            const time=i/f.fps;M.moveCamera(cam,look,from,to,time*1000);cam.lookAt(look);
            if(i)M.step(rig,open,1/f.fps,time);if(i===f.frames-1)M.snap(rig,open,time);
            r.render(world,cam);
            const tile=(open?0:f.frames)+i;g.drawImage(r.domElement,(tile%f.columns)*f.w,Math.floor(tile/f.columns)*f.h);
          }
        }
        CrateModel.dispose(world);return sheet.toDataURL('image/webp',.88).split(',')[1];
      };
    });
    for(const id of ids){
      for(const open of [false,true]){
        const name=id+(open?'-open':'')+'.webp',data=await page.evaluate(([id,open])=>capture(id,open),[id,open]);
        fs.writeFileSync(path.join(folder,name),Buffer.from(data,'base64'));console.log(name);
      }
      const data=await page.evaluate(id=>record(id),id),name=id+'-motion.webp';
      fs.writeFileSync(path.join(folder,name),Buffer.from(data,'base64'));console.log(name);
    }
    if(ids.includes('ornament')) {
      const art=path.join(root,'assets/ornaments');fs.mkdirSync(art,{recursive:true});
      for(const id of ['gingerbread','deer','fir','bauble']) {
        const data=await page.evaluate(id=>capture(id,false,true),id);
        fs.writeFileSync(path.join(art,id+'.webp'),Buffer.from(data,'base64'));console.log(id+'.webp');
      }
    }
  }finally{await b.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
