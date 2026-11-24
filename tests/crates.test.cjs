const test=require('node:test'),assert=require('node:assert/strict');
const {openGame}=require('./winter-harness.cjs');
const full=['MS1','T26','T46','T28_USSR','KV1','KV1S','IS','IS3','OBJ257','IS7'];
// Only the button handler gets this roll sequence. Rendering the physical crate after
// the transaction is free to use Three's normal randomness (UUIDs, etc.).
async function pressWithRolls(button,values){
  const left=await button.evaluate((b,seq)=>{
    const normal=Math.random;Math.random=()=>seq.length?seq.shift():normal();
    try{b.click();return seq.length;}finally{Math.random=normal;}
  },values);
  assert.equal(left,0);
}

test('10 berths including starter: no paid, free-root or premium acquisition over capacity; selling releases a usable berth',async t=>{
  const {page,click,saved}=await openGame(t,{seed:{owned:full.slice(0,-1),selected:'OBJ257',XP:200000,GOLD:20000}});
  assert.equal(await page.locator('#fleet-count').innerText(),'9 / 10');await click('Дерево развития');await click('Исследовать: ИС-7');
  const atLimit=await saved();assert.deepEqual(atLimit.owned,full);assert.equal(atLimit.XP,5000);assert.equal(atLimit.garageSlots,10);
  await click('ГЕРМАНИЯ');await click('Характеристики: Leichttraktor');assert.match(await page.locator('#tree-status').innerText(),/Ангар заполнен \(10\/10\)/);
  await page.evaluate(()=>researchTank('BT2'));assert.deepEqual((await saved()).owned,full);assert.equal((await saved()).XP,5000);
  await click('Премиум-магазин');assert.equal(await page.locator('.offer-card button:disabled').count(),3);
  const offer=await page.locator('.offer-card').first().getAttribute('data-id');await page.evaluate(id=>buyPremium(id,WinterSeason.dateKey(WinterSeason.now())),offer);
  assert.match(await page.locator('#premium-status').innerText(),/Ангар заполнен/);assert.equal((await saved()).GOLD,20000);
  await click('В ангар');await page.getByRole('button',{name:'Выбрать для боя: Т-26',exact:true}).focus();await click('Продать: Т-26');await click('Подтвердить продажу');
  assert.equal(await page.locator('#fleet-count').innerText(),'9 / 10');await click('Премиум-магазин');await page.locator(`.offer-card[data-id="${offer}"] button`).click();
  const after=await saved();assert.equal(after.garageSlots,10);assert.equal(after.owned.length,10);assert.ok(after.owned.includes(offer));assert.ok(after.GOLD<20000);
  await page.reload();assert.deepEqual(await saved(),after);
});

test('legacy large fleet and earned capacity persist; restore sanitizes the delivery queue without cloning tanks',async t=>{
  const prior=full.concat('LTR','PZII','T62A');const {page,saved}=await openGame(t,{seed:{owned:prior,selected:'PZII',inventory:{collection:4}}});
  const old=await saved();assert.deepEqual(old.owned,prior);assert.equal(old.selected,'PZII');assert.equal(old.garageSlots,13);assert.equal(old.inventory.collection,4);
  await page.reload();assert.deepEqual(await saved(),old);
  const restored=await page.evaluate(()=>{
    const data={owned:['MS1','BT42'],garageSlots:14,pendingVehicles:['BT42','TL7','TL7','BAD','KV1']};
    const p=decodeProgress(data);return [p.owned,p.pendingVehicles,p.garageSlots,decodeProgress({garageSlots:11.5}).garageSlots,initialProgress().garageSlots];
  });assert.deepEqual(restored,[['MS1','BT42','TL7'],[],14,10,10]);
});

test('independent bonus slot from all four boxes: boundary at 10%, keeps the primary prize and can park a same-box vehicle',async t=>{
  const {page}=await openGame(t,{seed:{owned:full}});
  const out=await page.evaluate(()=>{
    const opened=[];for(const id of ['basic','premium','supply','collection']){
      for(const bonus of [.1,.099999]){
        const seq=[.06,0,bonus],g=GameState.garageSlots,r=openContainerDirect(id,()=>seq.shift());
        opened.push([id,r.type,r.amount,r.slot,GameState.garageSlots-g]);
      }
    }
    GameState.garageSlots=GameState.owned.length;const seq=[.049999,.999999,0],r=openContainerDirect('collection',()=>seq.shift());
    return {opened,r,count:GameState.owned.length,cap:GameState.garageSlots,waiting:GameState.pendingVehicles};
  });
  assert.deepEqual(out.opened,[['basic',5000],['premium',15000],['supply',30000],['collection',10000]].flatMap(([id,n])=>[[id,'silver',n,false,0],[id,'silver',n,true,1]]));
  assert.equal(out.r.id,'TL7');assert.equal(out.r.slot,true);assert.equal(out.count,11);assert.equal(out.cap,11);assert.deepEqual(out.waiting,[]);
});

test('full garage: Advent and two distinct box wins queue FIFO. Bulk slot, sale and later slot deliver once, across reloads',async t=>{
  const {page,click,saved}=await openGame(t,{mobile:true,date:'2026-12-16T11:30:00Z',seed:{owned:full,GOLD:0,SILVER:0,selected:'IS7',
    inventory:{collection:3,basic:1},advent2026:{dates:Array.from({length:14},(_,i)=>`2026-12-${String(i+1).padStart(2,'0')}`)}}});
  assert.deepEqual((await saved()).pendingVehicles,['BT42']);assert.equal((await saved()).owned.length,10);
  await click('Адвент');assert.match(await page.locator('#milestone-15').innerText(),/ожидает слота/);await click('В ангар');await click('Ожидают слота: 1');
  const inventory=id=>page.locator('.inv-card').filter({hasText:id});
  assert.match(await page.locator('#vehicle-deliveries').innerText(),/БТ-42/);
  await pressWithRolls(inventory('Коллекционный контейнер').getByRole('button',{name:'ОТКРЫТЬ ВСЕ'}),[0,.9999,.1, 0,.9999,.1, .525,0,.09999]);
  const state=await saved();assert.deepEqual(state.inventory,{basic:1});assert.deepEqual(state.pendingVehicles,['TL7','T62A']);
  assert.deepEqual(state.owned,full.concat('BT42'));assert.equal(state.garageSlots,11);assert.equal(state.GOLD,75); // daily 50 + primary 25
  const text=await page.locator('#reward-lines').innerText();for(const term of [/Слоты ангара: \+1/,/TL-7/,/Т-62А/,/Ожидает слота/,/Доставлено из очереди/])assert.match(text,term);
  assert.match(await page.locator('.crate-poster').getAttribute('src'),/collection-open.webp$/);assert.match(await page.locator('#unpack-hint').innerText(),/WebGL 2/);
  // No collect button is necessary for durability, even on devices with no WebGL.
  await page.reload();assert.deepEqual(await saved(),state);assert.equal(await page.locator('[aria-label="Выбрать для боя: TL-7"]').count(),0);
  await page.evaluate(()=>sellTank('T26'));await click('Подтвердить продажу');assert.deepEqual((await saved()).pendingVehicles,['T62A']);assert.ok((await saved()).owned.includes('TL7'));
  await click('Ожидают слота: 1');await pressWithRolls(inventory('Полевой ящик').getByRole('button',{name:'ОТКРЫТЬ 1'}),[0,0,0]);await click('ЗАБРАТЬ');
  assert.ok(await page.locator('#vehicle-deliveries').isHidden());const done=await saved();assert.equal(done.owned.length,12);assert.equal(done.garageSlots,12);
  assert.deepEqual(done.owned.slice(-3),['BT42','TL7','T62A']);assert.deepEqual(done.pendingVehicles,[]);assert.deepEqual(done.inventory,{});
  await click('В ангар');await click('Выбрать для боя: Т-62А');await page.reload();assert.equal((await saved()).selected,'T62A');
});

test('supplied crate rigs render offline, open on their original hinge, skip/context loss do not double spend, depot resumes',async t=>{
  const {page,click,saved}=await openGame(t,{webgl:true,mobile:true,seed:{inventory:{collection:2,basic:2}}});
  await page.waitForFunction(()=>DepotView.stats()?.id==='MS1');await click('Контейнеры');assert.equal(await page.locator('#depot-canvas').count(),0);
  assert.equal(await page.locator('.c-card img').evaluateAll(async ns=>{await Promise.all(ns.map(n=>n.decode()));return ns.filter(n=>n.naturalWidth===512).length;}),4);
  await page.evaluate(()=>{
    const after=THREE.Scene.prototype.onAfterRender;window.framesSeen=[];
    THREE.Scene.prototype.onAfterRender=function(renderer,scene,cam){
      after.apply(this,arguments);const h=scene.getObjectByName('LidHinge');if(!h)return;
      let tris=0,n=0;h.parent.traverse(m=>{if(m.isMesh){n++;tris+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;}});
      framesSeen.push({angle:h.rotation.x,pivot:h.position.toArray(),tris,n,parcels:scene.getObjectByName('Cargo').children.length,eye:cam.position.toArray(),calls:renderer.info.render.calls});
    };
  });
  const initial=await saved();await click('Осмотреть модель: Коллекционный контейнер');let closed=await page.evaluate(()=>framesSeen.at(-1));
  assert.deepEqual([closed.pivot,closed.tris,closed.n,closed.parcels],[[0,1.575,-.71],2918,85,3]);assert.equal(Math.abs(closed.angle),0);assert.ok(closed.calls>10);
  await page.emulateMedia({reducedMotion:'no-preference'});await click('Открыть крышку');await page.waitForFunction(()=>framesSeen.at(-1).angle===-2.55);
  assert.ok(await page.evaluate(()=>framesSeen.some(f=>f.angle<-.1&&f.angle>-2.45)));assert.notDeepEqual(await page.evaluate(()=>framesSeen.at(-1).eye),closed.eye);
  await click('Назад');assert.deepEqual(await saved(),initial,'free inspection cannot roll or consume anything');
  await click('Инвентарь');const card=page.locator('.inv-card').filter({hasText:'Коллекционный контейнер'});
  const packed=await card.getByRole('button',{name:'ОТКРЫТЬ 1'}).evaluate(button=>{
    button.click();openAllFromInventory('collection');return [GameState.inventory.collection,document.getElementById('reward-display').hidden];
  });assert.deepEqual(packed,[1,true]);const once=await saved();await click('Пропустить анимацию');assert.equal(await page.evaluate(()=>framesSeen.at(-1).angle),-2.55);
  await click('ЗАБРАТЬ');assert.deepEqual(await saved(),once);assert.equal(await page.locator('#crate-canvas').count(),0);
  // A device reset during a bulk reveal must still show the stored receipt and free the context.
  await page.locator('.inv-card').filter({hasText:'Полевой ящик'}).getByRole('button',{name:'ОТКРЫТЬ ВСЕ'}).click();
  await page.waitForFunction(()=>framesSeen.at(-1).tris===558);const plain=await page.evaluate(()=>framesSeen.at(-1));assert.equal(plain.n,45);assert.equal(plain.parcels,2);
  const bulk=await saved();await page.locator('#crate-canvas').evaluate(c=>c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.locator('.crate-poster').waitFor();assert.match(await page.locator('.crate-poster').getAttribute('src'),/basic-open.webp$/);assert.deepEqual(await saved(),bulk);
  await click('ЗАБРАТЬ');await click('В ангар');await page.waitForFunction(()=>DepotView.stats()?.id==='MS1');await page.reload();assert.deepEqual(await saved(),bulk);
});
