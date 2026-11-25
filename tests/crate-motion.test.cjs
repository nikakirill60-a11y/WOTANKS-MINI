const test=require('node:test'), assert=require('node:assert/strict');
const {openGame}=require('./winter-harness.cjs');
// Golden values sampled from the provided HTML's running Three r187 scene, not from
// the port: SHA-256 60e2f7188f6f9895e2a15e5bb7198411a45a6595ee154819f8fe62abd6f8eb74.
// Each row is [hinge.x, pointLight.intensity, eye.x/y/z, bulb0/1 emissive, bulb0 red].
const reference=require('./fixtures/crate-motion.json');

test('the actual inventory opening and inspection use the author’s independent hinge, camera and bulb tracks (wide and mobile)',async t=>{
  const {page,click,saved}=await openGame(t,{webgl:true,seed:{inventory:{collection:3}}});
  await click('Контейнеры');await page.emulateMedia({reducedMotion:'no-preference'});
  const initial=await saved();
  for(const width of [390,800]){
    await page.setViewportSize({width:width===390?390:1000,height:760});
    const rows=await page.evaluate(wide=>{
      let frame=0,time=1000,seen;const q=new Map(),oldRAF=window.requestAnimationFrame,oldCancel=window.cancelAnimationFrame,oldNow=performance.now;
      const after=THREE.Scene.prototype.onAfterRender;
      try {
        // Control only the visible stage. Timesteps include a dropped frame, so an elapsed-time
        // smoothstep substituted for damp(..., min(dt,.1)) would fail even at the same endpoint.
        performance.now=()=>time;window.requestAnimationFrame=cb=>{q.set(++frame,cb);return frame;};window.cancelAnimationFrame=id=>q.delete(id);
        THREE.Scene.prototype.onAfterRender=function(r,s,c){
          after.apply(this,arguments);const h=s.getObjectByName('LidHinge');if(!h)return;let lamp,bulbs=[];
          h.parent.traverse(o=>{if(o.isPointLight)lamp=o;if(['ff5a4e','ffd35a'].includes(o.material?.emissive?.getHexString()))bulbs.push(o.material);});
          seen=[h.rotation.x,lamp.intensity,...c.position.toArray(),bulbs[0].emissiveIntensity,bulbs[1].emissiveIntensity,bulbs[0].color.r];
        };
        if(wide)openAllFromInventory('collection');else CrateView.show('collection');
        const rows=[seen];if(!wide)document.getElementById('unpack-demo').click();
        for(const opening of [true,false]){
          if(!opening){if(wide)break;document.getElementById('unpack-demo').click();}
          for(const [i,dt] of [50,50,100,200,100,100,100,100,100,100,50,50].entries()){
            time+=dt;const callbacks=[...q.values()];q.clear();for(const fn of callbacks)fn(time);
            if([0,2,3,7,11].includes(i))rows.push(seen);
          }
        }
        return rows;
      }finally{CrateView.close();THREE.Scene.prototype.onAfterRender=after;window.requestAnimationFrame=oldRAF;window.cancelAnimationFrame=oldCancel;performance.now=oldNow;}
    },width===800);
    const expected=reference[width].slice(0,width===800?6:11);assert.equal(rows.length,expected.length);
    rows.forEach((r,i)=>r.forEach((v,k)=>assert.ok(Math.abs(v-expected[i][k])<1e-6,`width ${width} frame ${i} track ${k}: ${v} != ${expected[i][k]}`)));
    if(width===390)assert.deepEqual(await saved(),initial);else assert.deepEqual((await saved()).inventory,{});
  }
});

test('no WebGL: an actual offline film moves, can be skipped and replayed without rewards; reduced motion stays still unless explicitly requested',async t=>{
  const {page,click,saved}=await openGame(t,{mobile:true,seed:{inventory:{basic:2,collection:1}}});await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('navigation').getByRole('button',{name:/^Инвентарь/}).click();
  await page.evaluate(()=>{
    const draw=CanvasRenderingContext2D.prototype.drawImage;window.tiles=[];
    CanvasRenderingContext2D.prototype.drawImage=function(sheet,x,y){
      if(this.canvas.className==='crate-film')tiles.push([sheet.src.split('/').pop(),x,y]);return draw.apply(this,arguments);
    };
  });
  await page.locator('.inv-card').filter({hasText:'Полевой ящик'}).getByRole('button',{name:'ОТКРЫТЬ ВСЕ'}).click();
  await page.waitForFunction(()=>new Set(tiles.map(t=>t.join())).size>=3);const bulk=await saved();assert.deepEqual(bulk.inventory,{collection:1});
  await click('Пропустить анимацию');assert.ok(await page.locator('#reward-display').isVisible());await click('Повторить анимацию');await click('ЗАБРАТЬ');assert.deepEqual(await saved(),bulk);
  await page.emulateMedia({reducedMotion:'reduce'});await click('ОТКРЫТЬ 1');assert.ok(await page.locator('#reward-display').isVisible());assert.ok(await page.locator('.crate-poster').isVisible());assert.equal(await page.locator('.crate-film').count(),0);
  const single=await saved();await click('Повторить анимацию');await page.waitForFunction(()=>tiles.filter(t=>t[0]==='collection-motion.webp').length>=3);
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'ЗАБРАТЬ'}).waitFor();await page.reload();assert.deepEqual(await saved(),single);
});
