const {chromium}=require('playwright-core');
const {pathToFileURL}=require('url'),path=require('path'),assert=require('node:assert/strict');
const index=pathToFileURL(process.env.CITY_TANKS_INDEX || path.resolve(__dirname,'../index.html')).href;
const guestKey='ct_progress_v1';
async function openGame(t,{seed,date='2026-11-22T09:00:00Z',route,clock=false,mobile=false,webgl=false,enterGuest=true}={}) {
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:webgl?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--disable-webgl']});
  const context=await browser.newContext({viewport:mobile?{width:390,height:780}:{width:960,height:720},reducedMotion:'reduce',hasTouch:mobile});
  const page=await context.newPage(),errors=[];
  t.after(async()=>{await browser.close();assert.deepEqual(errors,[]);}); page.on('pageerror',e=>errors.push(e.message));
  await page.route(/^https?:/,req=>{ if(route)return route(req);errors.push('Unexpected network request: '+req.request().url());return req.abort(); });
  if(clock)await page.clock.install({time:new Date(date)});else await page.clock.setFixedTime(new Date(date));
  if(seed)await page.addInitScript(({seed,guestKey})=>{
    if(!sessionStorage.fixture){localStorage.setItem(guestKey,JSON.stringify(seed));sessionStorage.fixture='ok';}
  },{seed,guestKey});
  page.on('console',m=>{if(/Shader Error|GL_INVALID_OPERATION/.test(m.text()))errors.push(m.text());});
  page.setDefaultTimeout(webgl?25000:8000);await page.goto(index);
  if(enterGuest){await page.getByRole('button',{name:'ГОСТЬ',exact:true}).click();await page.locator('.tank-slot.selected').waitFor();}
  return {page,click:name=>page.getByRole('button',{name,exact:true}).click(),saved:()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),guestKey)};
}
module.exports={openGame};
