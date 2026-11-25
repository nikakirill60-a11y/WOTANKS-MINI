// Exercise the actual distributed ZIP, not the template or a game/dev server.
// Optional: CHROMIUM_PATH and TRAILER_STILLS (directory for review screenshots).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const {chromium} = require('../tests/node_modules/playwright-core');
const archive = process.argv[2] || path.join(__dirname,'..','CITY-TANKS-TRAILER.zip');
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'ct-film-check-'));
const url = pathToFileURL(path.join(temp,'index.html')).href;

async function check(browser, phone) {
  const context = await browser.newContext({offline:true, isMobile:phone, hasTouch:phone,
    viewport: phone ? {width:390,height:844} : {width:1366,height:768}});
  try {
    const page = await context.newPage(), errors=[];
    page.setDefaultTimeout(10000);
    page.on('pageerror', e=>errors.push(e.message.slice(0,160)));
    page.on('console', e=>{if(e.type()==='error')errors.push(e.text().slice(0,160));});
    page.on('request', r=>{if(r.url()!==url && !r.url().startsWith('data:'))errors.push('Unexpected request: '+r.url().slice(0,100));});
    await page.goto(url);
    const wait = fn=>page.waitForFunction(fn,null,{timeout:10000});
    const press = selector=>phone ? page.locator(selector).tap() : page.locator(selector).click();
    await wait(()=>film.readyState>=1 && !watch.closest('[hidden]'));
    assert.deepEqual(await page.evaluate(async()=>{await document.fonts.ready;return [film.paused,film.muted,film.videoWidth,film.videoHeight,Math.round(film.duration*100),film.currentSrc.startsWith('data:video/mp4;base64,'),document.fonts.check('550 20px Oswald'),document.querySelectorAll('#chapters button').length];}),[true,false,1280,720,4000,true,true,7]);
    const snap=async name=>{if(process.env.TRAILER_STILLS){fs.mkdirSync(process.env.TRAILER_STILLS,{recursive:true});await page.screenshot({path:path.join(process.env.TRAILER_STILLS,name+'.jpg'),type:'jpeg',quality:89});}};
    await snap(phone?'phone':'desktop');
    if(phone){
      for(const [width,height] of [[320,568],[390,844],[844,390]]){
        await page.setViewportSize({width,height});
        assert.ok(await page.evaluate(()=>{const r=watch.getBoundingClientRect(),s=cover.getBoundingClientRect();return document.documentElement.scrollWidth<=innerWidth && r.top>=s.top && r.bottom<=s.bottom+1 && r.right<=innerWidth;}),'Player overflows '+width+' × '+height);
        await snap('fit-'+width);
      }
      await page.setViewportSize({width:390,height:844});
    }
    await press('#watch');await wait(()=>!film.paused && film.currentTime>.25 && film.getVideoPlaybackQuality().totalVideoFrames>0);
    await press('#play');assert.ok(await page.evaluate(()=>film.paused));
    await press('#sound');assert.ok(await page.evaluate(()=>film.muted));
    await press('#sound');assert.ok(await page.evaluate(()=>!film.muted));
    await page.locator('#seek').fill('12.5');await wait(()=>!film.seeking && Math.abs(film.currentTime-12.5)<.1 && film.paused);
    await press('#chapters button:nth-child(5)');await wait(()=>!film.paused && film.currentTime>=20 && film.currentTime<22 && document.querySelector('#chapters button:nth-child(5)').getAttribute('aria-current')==='true');
    await press('#full');await wait(()=>!!document.fullscreenElement || projector.classList.contains('theatre'));
    await press('#full');await wait(()=>!document.fullscreenElement && !projector.classList.contains('theatre'));
    if(!phone){await page.keyboard.press('k');await wait(()=>film.paused);await page.locator('#seek').fill('23.8');await wait(()=>!film.seeking && film.currentTime>=23.75);await snap('salvo');await page.keyboard.press('k');await wait(()=>!film.paused);}
    await page.locator('#seek').fill('39.4');await wait(()=>film.ended && !replay.hidden);
    await press('#replay');await wait(()=>!film.ended && !film.paused && film.currentTime>0 && film.currentTime<3);
    await press('#play');assert.equal(await page.locator('#notice').innerText(),'');assert.deepEqual(errors,[]);
    console.log((phone?'Touch':'Desktop')+' · offline file://, 1280×720/40 s, start, pause, audio toggle, seek, chapters, fullscreen, end & replay; no external requests.');
  } finally {await context.close();}
}

(async()=>{
  let browser;
  try{
    execFileSync('python3',['-c',`from pathlib import Path
import sys,zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    assert z.namelist()==['index.html'] and z.testzip() is None
    html=z.read('index.html')
    assert all(x not in html for x in (b'@MOVIE@', b'@POSTER@', b'@FONT@', b'@FONTLICENSE@'))
    (Path(sys.argv[2])/'index.html').write_bytes(html)`,archive,temp]);
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined});
    await check(browser,false);await check(browser,true);
    const native=await browser.newContext({offline:true,javaScriptEnabled:false});
    try{const p=await native.newPage();await p.goto(url);assert.ok(await p.locator('video[controls]').isVisible());assert.ok(!await p.locator('#cover').isVisible());assert.ok(!await p.locator('#desk').isVisible());console.log('Native video controls remain available without JavaScript.');}finally{await native.close();}
  }finally{if(browser)await browser.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
