const test=require('node:test'), assert=require('node:assert/strict');
const {openGame}=require('./winter-harness.cjs');

test('resale desk: all 167 owned models can be quoted, only collectors pay gold; unknown, reserved and unowned tanks cannot be sold',async t=>{
  const {page,saved}=await openGame(t,{seed:{GOLD:44,SILVER:32100}}),initial=await saved();
  const offers=await page.evaluate(()=>{
    const offers={};for(const tank of Object.values(DB)){
      GameState.owned=[tank.id];GameState.selected=tank.id;sellTank(tank.id);
      if(!document.getElementById('sale-modal').open||document.getElementById('sale-name').textContent!==tank.n)throw Error(tank.id);
      const q=TankSales.quote(tank);offers[tank.id]=[q.field,q.amount];document.getElementById('sale-cancel').click();
    }
    GameState.owned=['MS1'];GameState.selected='MS1';GameState.pendingVehicles=['T62A'];
    for(const id of ['constructor','fake','IS6','T62A']){sellTank(id);if(document.getElementById('sale-modal').open)throw Error(id);}
    GameState.pendingVehicles=[];return offers;
  });assert.equal(Object.keys(offers).length,167);
  assert.deepEqual(Object.keys(offers).filter(k=>offers[k][0]==='GOLD').sort(),['GPZ','JPANTHERII','M4A3E2','T62A','T71DA','TL7']);
  for(const id of ['IS6','LOWE','STA2','STRVS1','T34HEAVY'])assert.deepEqual(offers[id],['SILVER',40000]);
  assert.deepEqual(offers.BT42,['SILVER',20000]);assert.deepEqual(offers.TL7,['GOLD',900]);assert.deepEqual(offers.MS1,['SILVER',0]);assert.deepEqual(offers.V440,['SILVER',0]);
  assert.deepEqual(await saved(),initial);
});

test('confirmed sale credits one currency once, releases equipment and berth; a sold collector can drop again, a claimed Advent gift cannot',async t=>{
  const fleet=['MS1','T26','T46','IS','IS3','TL7','BT42','STA2','T62A','IS7'];
  const {page,click,saved}=await openGame(t,{mobile:true,seed:{owned:fleet,selected:'TL7',GOLD:30,SILVER:7000,modules:{TL7:[null,null,null]},upgrades:{TL7:{gun:1}},upgradesBought:{TL7:{gun:[true,true,false]}},
    pendingVehicles:['M4A3E2','T71DA'],advent2026:{dates:Array.from({length:15},(_,i)=>'2026-12-'+String(i+1).padStart(2,'0'))}}});
  const before=await saved();await click('Продать: TL-7');assert.match(await page.locator('#sale-terms').innerText(),/M4A3E2/);
  assert.equal(await page.locator('#sale-price').innerText(),'900 G');await page.keyboard.press('Escape');assert.deepEqual(await saved(),before);
  await click('Продать: TL-7');await page.locator('#sale-confirm').evaluate(b=>{b.click();b.click();});
  let s=await saved();assert.equal(s.GOLD,930);assert.equal(s.SILVER,7000);assert.equal(s.selected,'MS1');assert.equal(s.owned.length,10);assert.equal(s.garageSlots,10);
  assert.deepEqual(s.pendingVehicles,['T71DA']);assert.equal(s.owned.at(-1),'M4A3E2');assert.ok(!s.owned.includes('TL7'));
  for(const k of ['modules','upgrades','upgradesBought'])assert.equal(s[k].TL7,undefined);
  await click('Продать: STA-2');assert.match(await page.locator('#sale-currency').innerText(),/серебро/);await click('Подтвердить продажу');
  await click('Продать: БТ-42');assert.match(await page.locator('#sale-terms').innerText(),/повторно не выдаётся/);await click('Подтвердить продажу');
  s=await saved();assert.equal(s.GOLD,930);assert.equal(s.SILVER,67000);assert.equal(s.owned.length,9);assert.deepEqual(s.pendingVehicles,[]);assert.equal(s.advent2026.dates.length,15);
  await click('Адвент');assert.match(await page.locator('#milestone-15').innerText(),/продано/);await click('В ангар');await page.reload();assert.deepEqual(await saved(),s);
  const win=await page.evaluate(()=>{const v=[0,.999999,.8];return openContainerDirect('collection',()=>v.shift());});assert.equal(win.id,'TL7');
});

test('selling the last tank leaves a persistent empty garage, blocks sorties, and can be recovered with a free starter without printing silver',async t=>{
  const {page,click,saved}=await openGame(t);const fresh=await saved();await click('Продать: МС-1');assert.match(await page.locator('#sale-terms').innerText(),/последняя машина/);await click('Отмена');assert.deepEqual(await saved(),fresh);
  await click('Продать: МС-1');await click('Подтвердить продажу');await page.reload();
  const empty=await saved();assert.deepEqual(empty.owned,[]);assert.equal(empty.selected,null);assert.equal(empty.SILVER,fresh.SILVER);assert.equal(empty.garageSlots,10);
  assert.equal(await page.locator('#dispatch-name').innerText(),'Ангар пуст');assert.equal(await page.locator('#fleet-count').innerText(),'0 / 10');
  assert.equal(await page.locator('#depot-canvas,#tank-carousel .tank-slot').count(),0);assert.ok(await page.locator('#battle-controls').isHidden());assert.ok(await page.getByRole('button',{name:'Обучение'}).isDisabled());
  assert.equal(await page.evaluate(()=>startTraining()),false);assert.equal(await page.evaluate(()=>startBattle(15)),false);
  await click('Открыть дерево развития');await click('Исследовать: МС-1');assert.deepEqual((await saved()).owned,['MS1']);assert.equal((await saved()).SILVER,fresh.SILVER);assert.ok(await page.locator('#battle-controls').isVisible());
  await click('Продать: МС-1');await click('Подтвердить продажу');assert.deepEqual(await page.evaluate(()=>{const r=[0,.999,.5];openContainerDirect('collection',()=>r.shift());return [GameState.owned,GameState.selected];}),[['TL7'],'TL7']);
});
