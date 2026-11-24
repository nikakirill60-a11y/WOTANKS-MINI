const test=require('node:test'),assert=require('node:assert/strict');
const {openGame}=require('./winter-harness.cjs');

test('open shop replaces its trio at 00:00 UTC; December visit is automatic and not paid twice',async t=>{
  const {page,click,saved}=await openGame(t,{date:'2026-11-30T23:59:40Z',clock:true,seed:{GOLD:20000,loginCalendar:{claimedDays:[1,2,15,31]}}});
  await click('Премиум-магазин');const ids=()=>page.locator('.offer-card').evaluateAll(ns=>ns.map(n=>n.dataset.id));
  const yesterday=await ids();assert.equal(new Set(yesterday).size,3);
  await page.clock.fastForward('00:21');const today=await ids();assert.notDeepEqual(today,yesterday);
  assert.equal((await saved()).GOLD,20050);assert.deepEqual((await saved()).advent2026.dates,['2026-12-01']);
  await page.evaluate(id=>buyPremium(id,'2026-11-30'),yesterday[0]);assert.equal((await saved()).GOLD,20050);
  await page.locator('.offer-card button').first().click();const price=await page.evaluate(id=>DB[id].price,today[0]);
  assert.equal((await saved()).GOLD,20050-price);assert.ok(await page.locator('.offer-card button').first().isDisabled());
  await page.evaluate(id=>buyPremium(id,'2026-12-01'),today[0]);assert.equal((await saved()).GOLD,20050-price);
  await page.clock.setSystemTime(new Date('2026-12-01T00:30:00Z'));await page.reload();await click('Премиум-магазин');assert.deepEqual(await ids(),today);
  await click('В ангар');await click('Адвент');assert.equal(await page.locator('.advent-date.received').count(),1);
  assert.equal((await saved()).GOLD,20050-price);assert.equal(await page.locator('#calendar-days button').count(),0);
  assert.equal(await page.evaluate(()=>{const pool=new Set();let last='';for(let day=1;day<=365;day++){
    const a=WinterSeason.offers(86400000*day).map(t=>t.id);if(new Set(a).size!==3||last===a.join())return false;
    a.forEach(id=>pool.add(id));last=a.join();}return [...pool].sort().join();}),'IS6,LOWE,STA2,STRVS1,T34HEAVY');
});

test('missed days do not reset Advent, thresholds count visits, December ends at UTC year boundary',async t=>{
  const {page,click,saved}=await openGame(t,{date:'2026-12-16T10:00:00Z',seed:{
    selected:'MS1',advent2026:{dates:[...Array.from({length:14},(_,i)=>`2026-12-${String(i+1).padStart(2,'0')}`),'2026-12-01','2025-12-15','not-a-date']}}});
  const s=await saved();assert.equal(s.advent2026.dates.length,15);assert.deepEqual(s.owned,['MS1','BT42']);
  await click('Адвент');assert.equal(await page.locator('.advent-date.missed').count(),1);assert.match(await page.locator('#milestone-15').innerText(),/Получено/);
  await click('В ангар');await click('Выбрать для боя: БТ-42');await click('Дерево развития');assert.ok(await page.locator('#nodes .node').count()>0);
  await page.reload();assert.equal(await page.locator('#dispatch-name').innerText(),'БТ-42');assert.equal((await saved()).advent2026.dates.length,15);
  for(let day=17;day<=31;day++){await page.clock.setFixedTime(new Date(`2026-12-${day}T10:00:00Z`));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));}
  assert.equal((await saved()).advent2026.dates.length,30);assert.ok(!(await saved()).owned.includes('TL7OLEN'));
  const final=await saved();await page.clock.setFixedTime(new Date('2027-01-01T00:00:00Z'));await page.reload();assert.deepEqual(await saved(),final);
});

test('all 31 actual December visits award the two distinct milestone vehicles exactly once',async t=>{
  const {page,saved}=await openGame(t,{date:'2026-12-01T18:00:00Z'});
  for(let day=2;day<=31;day++){
    await page.clock.setFixedTime(new Date(`2026-12-${String(day).padStart(2,'0')}T18:00:00Z`));
    await page.evaluate(()=>{WinterSeason.refresh();WinterSeason.refresh();});
    if(day===14||day===30)assert.equal((await saved()).owned.includes(day===14?'BT42':'TL7OLEN'),false);
  }
  const s=await saved();assert.equal(s.advent2026.dates.length,31);assert.deepEqual(s.owned,['MS1','BT42','TL7OLEN']);
  assert.equal(s.GOLD,27*50+4*500);await page.reload();assert.deepEqual(await saved(),s);
});

test('buy, open one and open all: only five missing collectibles, duplicate compensation, persistent playable inventory',async t=>{
  const {page,click,saved}=await openGame(t,{mobile:true,seed:{SILVER:75000,inventory:{collection:5}}});
  await click('Контейнеры');await page.locator('.c-card').filter({hasText:'Коллекционный контейнер'}).getByRole('button').click();
  assert.equal((await saved()).SILVER,0);assert.equal((await saved()).inventory.collection,6);
  await click('🎒 Инвентарь');await click('ОТКРЫТЬ 1');assert.match(await page.locator('#reward-display').innerText(),/ЗАБРАТЬ/);await click('ЗАБРАТЬ');
  await click('ОТКРЫТЬ ВСЕ');assert.match(await page.locator('#reward-display').innerText(),/50000 ₽/);await click('ЗАБРАТЬ');
  const s=await saved();assert.deepEqual(s.owned.sort(),['MS1','M4A3E2','T71DA','JPANTHERII','T62A','TL7'].sort());assert.equal(s.SILVER,50000);assert.deepEqual(s.inventory,{});
  await click('В ангар');await click('Выбрать для боя: TL-7');await page.reload();assert.equal((await saved()).selected,'TL7');assert.equal(await page.locator('#dispatch-dmg').innerText(),'1440 (4 × 360)');
  await page.evaluate(()=>{researchTank('TL7OLEN');researchTank('LOWE');sellTank('TL7');buyPremium('LOWE','2000-01-01');});
  assert.equal((await saved()).owned.length,6);assert.equal((await saved()).GOLD,0);assert.ok(!(await saved()).owned.includes('TL7OLEN'));
});
