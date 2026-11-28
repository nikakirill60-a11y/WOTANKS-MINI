const test = require('node:test'), assert = require('node:assert/strict');
const {openGame} = require('./winter-harness.cjs');
const boxIds = ['ussr','germany','france','sweden','usa','japan'].map(n => 'national-' + n);
const fullFleet = ['MS1','LTR','T26','T46','KV1','IS','IS3','NAT110','NAT085','NAT086'];

// Click the real payment button, substituting just the prize draws, not the ledger or UI.
const pay = (page, values, twice = false) => page.locator('#roulette-spin').evaluate((button, {values, twice}) => {
  const random = Math.random; let i = 0;
  try { Math.random = () => i < values.length ? values[i++] : random(); button.click(); if (twice) button.click(); }
  finally { Math.random = random; }
  return i;
}, {values, twice});

test('roulette: exact tier boundaries, six equally selectable national boxes, real 907, duplicate compensation and both resource ranges', async t => {
  const {page} = await openGame(t, {seed:{GOLD:50000}});
  const result = await page.evaluate(() => {
    const r = Roulette907, g = GameState;
    const awards = [], play = (...values) => {
      const receipt = r.spin(() => { if (!values.length) throw Error('extra prize roll'); return values.shift(); });
      if (values.length || !receipt) throw Error('incomplete draw'); awards.push([receipt.prize,receipt.amount]);
    };
    play(0); play(.009999999);
    for (let i=0; i<r.boxes.length; i++) play(i ? .039999999 : .01, (i+.5)/r.boxes.length);
    play(.04,0); play(.339999999,.999999); play(.34,0); play(.999999,.999999);
    const before = progressSnapshot(); g.gameActive = true;
    if (r.spin(() => { throw Error('draw while in battle'); }) || before !== progressSnapshot()) throw Error('paid while in battle');
    return {awards, widths:r.bands.map(b => b.end-b.start), last:g.roulette907, stock:g.inventory, fleet:g.owned,
      researched:g.researched, funds:g.GOLD, silver:g.SILVER, cost:r.price(g.roulette907.spins), tank:DB[r.tank].n};
  });
  const expected = [['NAT014',1],['duplicate',1000],...boxIds.map(id => [id,1]),['gold',50],['gold',300],['silver',5000],['silver',25000]];
  assert.deepEqual(result.awards,expected); assert.deepEqual(result.widths,[1,3,30,66]);
  assert.equal(result.tank,'Объект 907'); assert.deepEqual(result.fleet,['MS1','NAT014']); assert.deepEqual(result.researched,['MS1']);
  assert.deepEqual(result.stock,Object.fromEntries(boxIds.map(id=>[id,1])));
  assert.deepEqual(result.last,{spins:12,prize:'silver',amount:25000}); assert.equal(result.cost,750);
  assert.equal(result.funds,50000 - (150+700)*12/2 + 1000+50+300); assert.equal(result.silver,35000);
});

test('mobile desk: insufficient gold is a no-op; legacy or malformed counts cannot give a prize or a negative price', async t => {
  const {page,click,saved} = await openGame(t,{mobile:true, seed:{GOLD:149, oldWheelSpins:77}});
  const before = await saved(); await click('Рулетка');
  assert.equal(await page.locator('#roulette-spin').innerText(),'Крутить · 150 G'); assert.ok(await page.locator('#roulette-spin').isDisabled());
  assert.equal(await page.locator('#roulette-odds li').count(),4); assert.match(await page.locator('#roulette-short').innerText(),/Не хватает 1 G/);
  assert.ok(await page.locator('#roulette-modal').evaluate(d=>d.scrollWidth<=d.clientWidth));
  assert.equal(await pay(page,[0]),0);
  assert.deepEqual(await page.evaluate(()=>{
    if (Roulette907.spin(()=>{throw Error('rolled without payment');})) throw Error('charged');
    return [null, {spins:-4}, {spins:.8}, {spins:'7'}, {spins:2,prize:'unlisted-crate',amount:1}, {spins:3,prize:'gold',amount:999}].map(raw=>{
      const g=decodeProgress({roulette907:raw});return [g.roulette907,Roulette907.price(g.roulette907.spins)];
    });
  }),[0,0,0,0,2,3].map(n=>[{spins:n,prize:'',amount:0},150+n*50]));
  await page.keyboard.press('Escape'); await page.reload(); await click('Рулетка'); assert.deepEqual(await saved(),before);
});

test('normal and reduced motion: one charge on double tap, exact stopping sector, immediate reload/close preserves crate and next price', async t => {
  const {page,click,saved} = await openGame(t,{seed:{GOLD:600,SILVER:0}});
  await page.emulateMedia({reducedMotion:'no-preference'}); await click('Рулетка');
  assert.equal(await pay(page,[.025,.75],true),2); assert.ok(await page.locator('#roulette-spin').isDisabled());
  const state = await saved(); assert.deepEqual([state.GOLD,state.roulette907,state.inventory],[450,{spins:1,prize:'national-usa',amount:1},{'national-usa':1}]);
  assert.ok(await page.locator('#roulette-disc').evaluate(d=>d.getAnimations().length>0));
  await page.reload(); await click('Рулетка'); assert.equal(await page.locator('#roulette-spin').innerText(),'Крутить · 200 G');
  assert.equal(await page.locator('#roulette-result').innerText(),'Ящик США'); assert.deepEqual(await saved(),state);
  assert.equal(await page.locator('#roulette-disc').evaluate(d=>d.style.transform),'rotate(351deg)'); // midpoint of the real 1–4% band
  await click('В инвентарь'); assert.equal(await page.locator('.inv-card .inv-name').innerText(),'Ящик США × 1'); await click('В ангар');
  await click('Рулетка'); assert.equal(await pay(page,[.4,0]),2); await click('В ангар'); await click('Рулетка');
  assert.equal(await page.locator('#roulette-spin').innerText(),'Крутить · 250 G'); await page.emulateMedia({reducedMotion:'reduce'});
  await pay(page,[.1,0],true); await page.waitForFunction(()=>document.querySelector('#roulette-spin').textContent.includes('300 G'));
  const last = await saved(); assert.deepEqual([last.GOLD,last.SILVER,last.roulette907,last.inventory],[50,5000,{spins:3,prize:'gold',amount:50},{'national-usa':1}]);
  assert.ok(await page.locator('#roulette-spin').isDisabled()); assert.equal(await page.locator('#roulette-result').innerText(),'+50 G');
});

test('907 on a full roster is queued once, also counts as received for a second spin, and arrives as a playable permanent vehicle', async t => {
  const {page,click,saved} = await openGame(t,{seed:{owned:fullFleet,selected:'MS1',GOLD:1000}});
  await click('Рулетка'); await pay(page,[.001]); assert.match(await page.locator('#roulette-detail').innerText(),/Ожидает свободного слота/);
  let state=await saved(); assert.deepEqual(state.pendingVehicles,['NAT014']); assert.deepEqual(state.owned,fullFleet); assert.equal(state.GOLD,850);
  await page.reload(); await click('Рулетка'); await pay(page,[.005]); assert.match(await page.locator('#roulette-detail').innerText(),/Компенсация/);
  state=await saved(); assert.deepEqual(state.pendingVehicles,['NAT014']); assert.deepEqual(state.owned,fullFleet); assert.equal(state.GOLD,1650);
  await click('В ангар'); await click('Продать: МС-1'); await click('Подтвердить продажу');
  await click('Выбрать для боя: Объект 907'); await page.reload();
  state=await saved(); assert.equal(state.selected,'NAT014'); assert.equal(state.owned.length,10); assert.deepEqual(state.pendingVehicles,[]);
  assert.ok(!state.rentalBattles.NAT014 && !state.researched.includes('NAT014'));
});

test('a 907 won in the wheel can be selected and driven into a real offline Atlas training sortie', async t => {
  const {page,click,saved} = await openGame(t,{webgl:true, mobile:true, seed:{GOLD:150}});
  await click('Рулетка'); await pay(page,[0]); await click('В ангар'); await click('Выбрать для боя: Объект 907');
  await page.selectOption('#map-select','burgstadt');
  const deployed=await page.evaluate(async()=>{
    GameState.controlMode='mobile'; if(!await launchBattle(1)) throw Error('No training sortie');
    stopBattleLoop(); const p=GameState.player, state=[p.id,p.hp,GameState.arena.id,BattleView.stats().units,p.modelAsset.sourceTriangles];
    backToGarage(); return state;
  });
  assert.deepEqual(deployed,['NAT014',2000,'burgstadt',2,20757]); assert.equal((await saved()).roulette907.spins,1);
});
