// Run against a distributed ZIP, not a dev server or the template. With no arguments, check both editions.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const {chromium}=require('../tests/node_modules/playwright-core');
const root=path.resolve(__dirname,'..');
const cases={
 full:{end:84,chapter:30.5,focus:63.4,cues:24,terms:['МС-1','Leichttraktor','Mäuschen','Maus','ИС-7','от первого уровня до десятого','в твоём браузере','На компьютере или телефоне','@blitz_legacy','https://t.me/blitz_legacy']},
 update:{end:106,chapter:46.25,focus:65.5,cues:23,terms:['Обновление 1.3','арт-прицелом','G.Pz. Mk. VI (e)','Второй уровень','ARTA','четыре боя','Боты стали умнее','зеркальных составов','случайно и независимо','STB-1','Type 5 Heavy','Объекту 705А','СТ-II','Объект 268 Вариант 4','Объект 263','ТЭТ-100','Leopard 1','Pz.Kpfw. VII','VK 72.01 (K)','Pz.Kpfw. 55','Versuchspanzer 57','Kampfpanzer 67']},
 winter:{end:40,chapter:20,focus:23.8,cues:0,terms:[]}
};
async function check(browser,url,kind,phone){
 const exp=cases[kind],context=await browser.newContext({offline:true,isMobile:phone,hasTouch:phone,viewport:phone?{width:390,height:844}:{width:1366,height:768}});
 try{
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);
  page.on('pageerror',e=>errors.push(e.message.slice(0,180)));page.on('console',e=>{if(e.type()==='error')errors.push(e.text().slice(0,180));});
  page.on('request',r=>{if(r.url()!==url&&!r.url().startsWith('data:'))errors.push('Unexpected request: '+r.url().slice(0,100));});
  await page.goto(url);const wait=(fn,arg)=>page.waitForFunction(fn,arg,{timeout:12000}),press=s=>phone?page.locator(s).tap():page.locator(s).click();
  await wait(()=>film.readyState>=1&&!watch.closest('[hidden]'));
  assert.deepEqual(await page.evaluate(async()=>{await document.fonts.ready;return [document.body.dataset.edition,film.paused,film.muted,film.videoWidth,film.videoHeight,film.duration,film.currentSrc.startsWith('data:video/mp4;base64,'),document.fonts.check('550 20px Oswald'),chapters.children.length];}),[kind,true,false,1280,720,exp.end,true,true,7]);
  if(exp.cues){
   await wait(()=>film.textTracks[0]?.cues?.length>0);const cues=await page.evaluate(()=>Array.from(film.textTracks[0].cues,c=>[c.startTime,c.endTime,c.text]));assert.equal(cues.length,exp.cues);for(const term of exp.terms)assert.ok(cues.some(c=>c[2].includes(term)),'Missing on-track: '+term);
   assert.equal(await page.locator('.community a').count(),Number(kind==='full'));
   if(kind==='full'){
    for(const a of await page.locator('.community a,#linkplane a').all()){assert.equal(await a.getAttribute('href'),'https://t.me/blitz_legacy');assert.equal(await a.getAttribute('target'),'_blank');assert.match(await a.getAttribute('rel'),/noopener/);}
    assert.ok(await page.locator('#linkplane').isHidden());
   }
   await press('#cc');assert.equal(await page.evaluate(()=>film.textTracks[0].mode),'showing');await press('#cc');assert.equal(await page.evaluate(()=>film.textTracks[0].mode),'hidden');
  }
  const snap=async name=>{if(process.env.TRAILER_STILLS){const dir=path.join(process.env.TRAILER_STILLS,kind);fs.mkdirSync(dir,{recursive:true});await page.screenshot({path:path.join(dir,name+'.jpg'),type:'jpeg',quality:90});}};
  await snap(phone?'phone':'desktop');
  if(phone){for(const [width,height] of [[320,568],[390,844],[844,390]]){
   await page.setViewportSize({width,height});assert.ok(await page.evaluate(()=>{const r=watch.getBoundingClientRect(),s=cover.getBoundingClientRect();return document.documentElement.scrollWidth<=innerWidth&&r.top>=s.top&&r.bottom<=s.bottom+1&&r.right<=innerWidth;}),'Overflow at '+width);await snap('fit-'+width);
  }await page.setViewportSize({width:390,height:844});}
  await press('#watch');await wait(()=>!film.paused&&film.currentTime>.25&&film.getVideoPlaybackQuality().totalVideoFrames>0);await press('#play');assert.ok(await page.evaluate(()=>film.paused));
  await press('#sound');assert.ok(await page.evaluate(()=>film.muted));await press('#sound');assert.ok(await page.evaluate(()=>!film.muted));
  await page.locator('#seek').fill('12.5');await wait(()=>!film.seeking&&Math.abs(film.currentTime-12.5)<.11&&film.paused);
  await press('#chapters button:nth-child(5)');await wait(t=>!film.paused&&film.currentTime>=t&&film.currentTime<t+2&&chapters.children[4].getAttribute('aria-current')==='true',exp.chapter);
  await press('#full');await wait(()=>!!document.fullscreenElement||projector.classList.contains('theatre'));await press('#full');await wait(()=>!document.fullscreenElement&&!projector.classList.contains('theatre'));
  if(!phone){await page.keyboard.press('k');await wait(()=>film.paused);await page.locator('#seek').fill(String(exp.focus));await wait(t=>!film.seeking&&Math.abs(film.currentTime-t)<.11,exp.focus);await snap('game');
   if(kind==='full'){await page.locator('#seek').fill('78.7');await wait(()=>!film.seeking&&!linkplane.hidden);const spot=page.locator('#linkplane a');await spot.scrollIntoViewIfNeeded();assert.ok(await spot.evaluate(a=>{const r=a.getBoundingClientRect();return r.width>50&&r.height>12&&document.elementFromPoint(r.left+r.width*.5,r.top+r.height*.5)===a;}));await snap('browser-and-telegram');}
   await page.keyboard.press('k');await wait(()=>!film.paused);
  }
  await page.locator('#seek').fill(String(exp.end-.6));await wait(()=>film.ended&&!replay.hidden);await press('#replay');await wait(()=>!film.ended&&!film.paused&&film.currentTime>0&&film.currentTime<3);
  await press('#play');assert.equal(await page.locator('#notice').innerText(),'');assert.deepEqual(errors,[]);console.log(`${kind}: ${phone?'touch':'desktop'} · offline ZIP / ${exp.end}s / controls, chapters, captions, fullscreen, end & replay / zero external requests.`);
 }finally{await context.close();}
}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});try{
 for(const archive of process.argv.length>2?process.argv.slice(2):['CITY-TANKS-TRAILER.zip','CITY-TANKS-1.3-TRAILER.zip']){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ct-movie-check-'));try{
   const kind=/1\.3/.test(path.basename(archive))?'update':/WINTER/i.test(path.basename(archive))?'winter':'full';
   execFileSync('python3',['-c',`from pathlib import Path
import re, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    assert z.namelist()==['index.html'] and z.testzip() is None
    html=z.read('index.html'); assert not re.search(b'@[A-Z]{2,16}@',html)
    (Path(sys.argv[2])/'index.html').write_bytes(html)`,path.resolve(root,archive),temp]);
   const url=pathToFileURL(path.join(temp,'index.html')).href;await check(b,url,kind,false);await check(b,url,kind,true);
   const native=await b.newContext({offline:true,javaScriptEnabled:false});try{const p=await native.newPage();await p.goto(url);assert.ok(await p.locator('video[controls]').isVisible());assert.ok(await p.locator('#cover').isHidden());assert.ok(await p.locator('#desk').isHidden());if(kind==='full')assert.ok(await p.locator('.community a').isVisible());console.log(kind+': native video and link fallback OK.');}finally{await native.close();}
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
 }
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
