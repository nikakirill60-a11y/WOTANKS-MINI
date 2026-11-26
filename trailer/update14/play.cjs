// Exercise the actual MP4 in an offline player: no game scripts or helper codecs.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{chromium}=require('../../tests/node_modules/playwright-core');
const master=path.resolve(process.argv[2]||path.join(__dirname,'../../CITY-TANKS-1.4-TRAILER.mp4'));
(async()=>{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ct14-play-'));let b;
  try{const html=path.join(tmp,'index.html');fs.writeFileSync(html,`<meta charset="utf-8"><meta name="viewport" content="width=device-width"><video style="width:100%;height:auto" controls playsinline src="${pathToFileURL(master).href}"></video>`);
    b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--autoplay-policy=no-user-gesture-required','--disable-webgl']});
    for(const phone of [false,true]){const c=await b.newContext({offline:true,hasTouch:phone,viewport:phone?{width:390,height:780}:{width:1280,height:720}});
      try{const p=await c.newPage();await p.goto(pathToFileURL(html).href);await p.waitForFunction(()=>document.querySelector('video').readyState>=2);
        const result=await p.evaluate(async()=>{const v=document.querySelector('video');
          const event=(name,act)=>new Promise((ok,no)=>{const timer=setTimeout(()=>no(Error(name+' timeout')),5000);v.addEventListener(name,()=>{clearTimeout(timer);ok();},{once:true});act();});
          for(const t of [.8,27,42,53,86,98,113,137,143.7])await event('seeked',()=>v.currentTime=t);
          await event('ended',()=>v.play());await event('seeked',()=>v.currentTime=.7);await v.play();await new Promise(ok=>setTimeout(ok,250));v.pause();
          return [v.duration,v.videoWidth,v.videoHeight,v.currentTime>.7,v.error===null];});
        assert.deepEqual(result,[144,1280,720,true,true]);console.log(phone?'Phone: OK':'Desktop: OK');
      }finally{await c.close();}}
  }finally{if(b)await b.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
