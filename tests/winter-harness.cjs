const {chromium}=require('playwright-core');
const {pathToFileURL}=require('url'),path=require('path'),assert=require('node:assert/strict');
const index=pathToFileURL(process.env.CITY_TANKS_INDEX || path.resolve(__dirname,'../index.html')).href;
const guestKey='ct_progress_v1';
async function openGame(t,{seed,date='2026-11-22T09:00:00Z',route,clock=false,mobile=false}={}) {
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--disable-webgl']});
  const context=await browser.newContext({viewport:mobile?{width:390,height:780}:{width:960,height:720},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  t.after(async()=>{await browser.close();assert.deepEqual(errors,[]);}); page.on('pageerror',e=>errors.push(e.message));
  await page.route(/^https?:/,req=>{ if(route)return route(req);errors.push('Unexpected network request: '+req.request().url());return req.abort(); });
  if(clock)await page.clock.install({time:new Date(date)});else await page.clock.setFixedTime(new Date(date));
  if(seed)await page.addInitScript(({seed,guestKey})=>{
    if(!sessionStorage.fixture){localStorage.setItem(guestKey,JSON.stringify(seed));sessionStorage.fixture='ok';}
  },{seed,guestKey});
  page.setDefaultTimeout(8000);await page.goto(index);await page.locator('.tank-slot.selected').waitFor();
  return {page,click:name=>page.getByRole('button',{name,exact:true}).click(),saved:()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),guestKey)};
}
module.exports={openGame};
