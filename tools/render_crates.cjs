// Render shop thumbnails and no-WebGL stills from exactly the same hinged models as the opening.
const {chromium}=require('../tests/node_modules/playwright-core');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'assets/crates');
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ct-crate-studio-')),file=path.join(dir,'index.html');
  fs.writeFileSync(file,`<meta charset="utf-8"><base href="${pathToFileURL(root+'/')}"><script src="vendor/three-r180.min.js"></script><script src="js/crate-model.js"></script>`);
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    fs.mkdirSync(folder,{recursive:true});const page=await b.newPage({offline:true});await page.goto(pathToFileURL(file).href);
    await page.evaluate(()=>{
      const T=THREE,r=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true}),s=new T.Scene();
      r.setClearColor(0,0);r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.13;r.setSize(760,640,false);CrateModel.light(s);
      window.capture=(id,open)=>{
        const rig=CrateModel.build(id);s.add(rig.group);rig.pose(Number(open));
        const box=new T.Box3().setFromObject(rig.group),target=box.getCenter(new T.Vector3()),cam=new T.PerspectiveCamera(21,760/640,.05,60);
        const dir=(open?new T.Vector3(.83,1.94,1.13):new T.Vector3(1.25,.97,1.66)).normalize();
        cam.position.copy(target).addScaledVector(dir,box.getSize(new T.Vector3()).length()*.51/Math.sin(cam.fov*Math.PI/360));cam.lookAt(target);r.render(s,cam);
        const c=document.createElement('canvas');c.width=760;c.height=640;const g=c.getContext('2d');g.drawImage(r.domElement,0,0);
        const a=g.getImageData(0,0,760,640).data;let l=760,t=640,rr=-1,bb=-1;
        for(let y=0;y<640;y++)for(let x=0;x<760;x++)if(a[(y*760+x)*4+3]>12){l=Math.min(x,l);rr=Math.max(x,rr);t=Math.min(y,t);bb=Math.max(y,bb);}
        if(l<=0||t<=0||rr>=759||bb>=639||rr<=l||bb<=t)throw Error('Clipped or missing '+id);
        const out=document.createElement('canvas');out.width=512;out.height=352;
        const w=rr-l+1,h=bb-t+1,k=Math.min(496/w,338/h);const ctx=out.getContext('2d');ctx.imageSmoothingQuality='high';
        ctx.drawImage(c,l,t,w,h,(512-w*k)/2,(352-h*k)/2,w*k,h*k);
        s.remove(rig.group);CrateModel.dispose(rig.group);
        return out.toDataURL('image/webp',.94).split(',')[1];
      };
    });
    for(const id of ['basic','premium','supply','collection'])for(const open of [false,true]){
      const name=id+(open?'-open':'')+'.webp';const data=await page.evaluate(([id,open])=>capture(id,open),[id,open]);fs.writeFileSync(path.join(folder,name),Buffer.from(data,'base64'));console.log(name);
    }
  }finally{await b.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
