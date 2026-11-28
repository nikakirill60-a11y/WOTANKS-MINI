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
  assert.equal(s.GOLD,27*50+4*700);await page.reload();assert.deepEqual(await saved(),s);
});

test('collection: a single 2% roll for the whole pool, equal missing vehicles, two currency bands and no duplicates',async t=>{
  const {page}=await openGame(t);
  const {pool,full,oneLeft,edges}=await page.evaluate(()=>{
    const pool=CONTAINERS.collection.vehicles;
    function draw(owned,outcome,detail){
      GameState.owned=['MS1',...owned];
      const rolls=[outcome,detail,.9];
      const r=openContainerDirect('collection',()=>rolls.shift());
      return r.id || [r.type,r.amount];
    }
    // A stratified sample checks the exact bands, not a flaky random frequency estimate.
    function histogram(owned){
      const hits={};
      for(let i=0;i<2000;i++){
        const r=draw(owned,(i+.5)/2000,(i%5+.5)/5), k=Array.isArray(r)?r[0]:r;
        hits[k]=(hits[k]||0)+1;
      }
      return hits;
    }
    return {pool,full:histogram([]),oneLeft:histogram(pool.slice(0,-1)),edges:[
      draw([],0,0),draw([],.01999999,.999999),draw([],.02,0),draw([],.7059999,.999999),
      draw([],.706001,0),draw([],.999999,.999999),draw(pool,0,0),draw(pool,.699999,.999999),draw(pool,.7,.999999)
    ]};
  });
  assert.deepEqual(pool,['M4A3E2','T71DA','JPANTHERII','T62A','TL7']);
  assert.deepEqual(full,{M4A3E2:8,T71DA:8,JPANTHERII:8,T62A:8,TL7:8,silver:1372,gold:588});
  assert.deepEqual(oneLeft,{TL7:40,silver:1372,gold:588});
  assert.deepEqual(edges,['M4A3E2','TL7',['silver',100],['silver',50000],['gold',1],['gold',650],['silver',100],['silver',50000],['gold',650]]);
});

test('500 gold each; insufficient funds leave old boxes alone; single and mixed bulk rewards survive reload',async t=>{
  const {page,click,saved}=await openGame(t,{mobile:true,seed:{GOLD:999,SILVER:75000,owned:['MS1','T62A'],inventory:{collection:4,basic:2}}});
  const alerts=[];page.on('dialog',d=>{alerts.push(d.message());return d.dismiss();});
  await click('Контейнеры');
  const box=page.locator('.c-card').filter({hasText:'Новогодний ящик'}),buy=box.getByRole('button',{name:'КУПИТЬ · 500 G'});
  const odds=await box.locator('.c-desc').innerText();
  assert.match(odds,/^2% на танк.*Серебро — 68,6%, золото — 29,4%.*Дополнительный слот ангара — 5%/);
  const manifest=await box.locator('.crate-manifest li').allTextContents();
  assert.deepEqual(manifest.slice(-2).map(s=>s.replace(/\s/g,' ')),['Серебро: 100–50 000','Золото: 1–650']);
  assert.equal(await box.locator('.c-name').innerText(),'Новогодний ящик');
  await buy.click();const paid=await saved();assert.equal(paid.GOLD,499);assert.equal(paid.SILVER,75000);
  assert.equal(await page.locator('#supply-feedback').innerText(),'Добавлено: Новогодний ящик');
  assert.deepEqual(paid.inventory,{collection:5,basic:2});await buy.click();assert.match(alerts.pop(),/Недостаточно золота/);assert.deepEqual(await saved(),paid);
  await page.reload();await page.getByRole('navigation').getByRole('button',{name:/^Инвентарь/}).click();
  const old=page.locator('.inv-card').filter({hasText:'Новогодний ящик'});
  assert.equal(await old.locator('.inv-name').innerText(),'Новогодний ящик × 5');
  assert.equal(await old.locator('.c-desc').innerText(),odds);
  async function open(button,rolls){
    // Limit deterministic random input to this actual inventory button's synchronous click handler.
    const unused=await old.getByRole('button',{name:button}).evaluate((b,values)=>{
      const normal=Math.random;Math.random=()=>values.length?values.shift():normal();
      try{b.click();return values.length;}finally{Math.random=normal;}
    },rolls);
    assert.equal(unused,0);
    assert.equal(await page.locator('#unpack-title').innerText(),'Новогодний ящик');
    return page.locator('#reward-display').innerText();
  }
  assert.match(await open('ОТКРЫТЬ 1',[.02,0,.5]),/100 ₽/);await click('ЗАБРАТЬ');
  assert.deepEqual((await saved()).owned,['MS1','T62A']);
  const rewards=await open('ОТКРЫТЬ ВСЕ',[.99,.999999,.5, .019999,.999999,.5, .509999,.999999,.5, .706001,0,.5]);
  assert.match(rewards,/TL-7/);assert.match(rewards,/651 G/);assert.match(rewards,/50000 ₽/);
  assert.deepEqual(await page.locator('#reward-lines [data-card-nation]').evaluateAll(frames => frames.map(f => [f.dataset.cardNation,f.querySelector('img').getAttribute('src')])),[['usa','models/tl-7.webp']]);
  await click('ЗАБРАТЬ');
  const s=await saved();assert.deepEqual(s.inventory,{basic:2});assert.deepEqual(s.owned,['MS1','T62A','TL7']);
  assert.equal(s.SILVER,125100);assert.equal(s.GOLD,1150);assert.equal(s.XP,paid.XP);assert.equal(s.charges,undefined);
  await click('В ангар');await click('Выбрать для боя: TL-7');await page.reload();assert.equal((await saved()).selected,'TL7');assert.equal(await page.locator('#dispatch-dmg').innerText(),'1440 (4 × 360)');
  await page.evaluate(()=>{researchTank('TL7OLEN');researchTank('LOWE');sellTank('TL7');buyPremium('LOWE','2000-01-01');});
  assert.ok(await page.locator('#sale-modal').isVisible());await click('Отмена');
  assert.deepEqual((await saved()).owned,s.owned);assert.equal((await saved()).GOLD,s.GOLD);
});

test('completed collection shows resource-only odds before purchase; no silver is needed to buy the last affordable box',async t=>{
  const {page,click,saved}=await openGame(t,{seed:{GOLD:500,SILVER:0,owned:['MS1','M4A3E2','T71DA','JPANTHERII','T62A','TL7']}});
  await click('Контейнеры');const box=page.locator('.c-card').filter({hasText:'Новогодний ящик'});
  assert.match(await box.locator('.c-desc').innerText(),/Все пять.*Серебро — 70%, золото — 30%/);
  await box.getByRole('button',{name:'КУПИТЬ · 500 G'}).click();assert.equal((await saved()).GOLD,0);assert.equal((await saved()).inventory.collection,1);
  await click('Инвентарь');await click('ОТКРЫТЬ 1');await click('ЗАБРАТЬ');const s=await saved();
  assert.equal(s.owned.length,6);assert.deepEqual(s.inventory,{});assert.ok((s.SILVER>=100 && s.SILVER<=50000 && s.GOLD===0) || (s.GOLD>=1 && s.GOLD<=650 && s.SILVER===0));
});
