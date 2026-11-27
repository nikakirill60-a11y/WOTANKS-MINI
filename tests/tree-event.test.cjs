const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { openGame } = require('./winter-harness.cjs');
const root = path.dirname(process.env.CITY_TANKS_INDEX || path.resolve(__dirname,'../index.html'));
const rules = vm.runInNewContext(fs.readFileSync(path.join(root,'js/tree-event.js'),'utf8')+';TreeEvent');
const empty = { gingerbread:0, deer:0, fir:0, bauble:0 }, bare = [null,null,null,null];

test('one toy per case: exact intervals, even on repeats', () => {
  const collection = rules.counts(); let calls = 0;
  for (let i=0;i<10000;i++) rules.collect(collection, () => { calls++; return (i+.5)/10000; });
  assert.deepEqual({...collection}, {gingerbread:7000, deer:2400, fir:500, bauble:100}); assert.equal(calls,10000);
  const limits = [0,.699999,.70,.939999,.94,.989999,.99,.999999];
  assert.deepEqual(limits.map(x=>rules.collect(rules.counts(),()=>x).ornament), ['gingerbread','gingerbread','deer','deer','fir','fir','bauble','bauble']);
});

test('four assignments total; reject overbooking, preserve positions on restore, and roll 20/30% from equipped balls only', () => {
  const owned={gingerbread:2,deer:1,fir:0,bauble:5};
  assert.deepEqual([...rules.restoreSlots(null,owned)],bare,'old saves are never auto-equipped');
  assert.deepEqual([...rules.restoreSlots(['deer','deer','fir','bauble','gingerbread'],owned)],['deer',null,null,'bauble']);
  assert.deepEqual([...rules.restoreSlots(['oops','__proto__',42,null],owned)],bare);
  const g={tree2026:{...owned},treeSlots2026:rules.emptySlots(),inventory:{}}, base={silver:200,xp:1000,gold:50};
  const set=(i,id)=>rules.setSlot(g,i,id);
  function settle(x) { let used=0; const r=rules.settle(g,base,()=>{used++;return x;}); assert.equal(used,1); return r; }
  assert.equal(settle(.199999).dropped,true); assert.equal(settle(.20).dropped,false);
  assert.deepEqual({...settle(.99).extra},{silver:0,xp:0,gold:0});
  assert.equal(set(0,'fir'),false);assert.equal(set(1,'__proto__'),false);assert.equal(set(2.5,'bauble'),false);assert.equal(set(4,'bauble'),false);
  assert.ok(set(0,'deer')); assert.equal(set(3,'deer'),false);assert.ok(set(1,'gingerbread'));assert.ok(set(2,'gingerbread'));assert.ok(set(3,'bauble'));
  assert.deepEqual({...rules.bonuses(g.treeSlots2026)},{silver:20,xp:15,gold:10});
  assert.deepEqual({...settle(.30).extra},{silver:40,xp:150,gold:5});assert.equal(settle(.299999).dropped,true);assert.equal(settle(.30).dropped,false);
  for (let i=0;i<3;i++) assert.ok(set(i,'bauble'));
  assert.deepEqual({...rules.bonuses(g.treeSlots2026)},{silver:40,xp:40,gold:40});assert.equal(settle(.30).dropped,false);
  for (let i=0;i<3;i++) assert.ok(set(i,null)); assert.equal(settle(.29).dropped,true);
  assert.ok(set(3,null));assert.equal(settle(.20).dropped,false);assert.deepEqual(g.inventory,{ornament:3});assert.deepEqual(g.tree2026,owned);
});

const withRolls = (button,rolls) => button.evaluate((el,rolls) => {
  const random = Math.random; try { Math.random = () => rolls.length ? rolls.shift() : random(); el.click(); return rolls.length; }
  finally { Math.random = random; }
},rolls);
const hook = (page, n) => page.getByRole('combobox',{name:'Слот '+n,exact:true});
const perks = page => page.locator('.tree-bonuses dd').allInnerTexts();

test('mobile tree: open, manually hang, replace and take down; single/bulk never equip, consume stock twice or issue slots/resources', async t => {
  const {page,click,saved}=await openGame(t,{mobile:true,seed:{inventory:{ornament:6,collection:1},tree2026:{gingerbread:2,deer:-3,fir:1.5,bauble:'2',unknown:99}}});
  const start=await saved();assert.deepEqual(start.tree2026,{...empty,gingerbread:2});assert.deepEqual(start.treeSlots2026,bare);
  const decoded=await page.evaluate(()=>decodeProgress({tree2026:{gingerbread:1,bauble:1},treeSlots2026:['bauble',{},'gingerbread','gingerbread','bauble']}).treeSlots2026);
  assert.deepEqual(decoded,['bauble',null,'gingerbread',null]);
  await click('Контейнеры'); assert.equal(await page.locator('#container-grid .c-card').count(),4);
  assert.equal(await page.locator('#container-grid').getByText('Ёлочный ларец',{exact:true}).count(),0);
  await page.evaluate(()=>buyContainer('ornament'));assert.deepEqual(await saved(),start);await click('В ангар');
  await click('Ёлка');assert.equal(await page.locator('#tree-stock').innerText(),'6');
  assert.deepEqual(await page.locator('#tree-manifest small').allTextContents(),['Обычное · 70%','Необычное · 24%','Эпическое · 5%','Легендарное · 1%']);
  assert.equal(await page.locator('#tree-branches select').count(),4);assert.equal(await page.locator('.tree-hook.filled').count(),0);
  assert.ok(await hook(page,3).locator('[value=bauble]').evaluate(opt=>opt.disabled));
  assert.ok(await page.locator('#tree-modal').evaluate(d=>d.scrollWidth<=d.clientWidth && d.getBoundingClientRect().width<=innerWidth));
  await page.locator('#tree-case-inspect').click(); assert.equal(await page.locator('#unpack-title').innerText(),'Ёлочный ларец');
  await page.emulateMedia({reducedMotion:'no-preference'}); await click('Открыть крышку');
  await page.locator('canvas.crate-film').waitFor(); await click('Пропустить анимацию');
  await click('Назад'); await page.emulateMedia({reducedMotion:'reduce'}); assert.deepEqual(await saved(),start,'inspection/film does not consume or roll');
  assert.equal(await withRolls(page.locator('#tree-unpack'),[.99]),0); assert.match(await page.locator('#reward-lines').innerText(),/Шар × 1/);
  const after=await saved(); assert.equal(after.inventory.ornament,5); assert.equal(after.tree2026.bauble,1);assert.deepEqual(after.treeSlots2026,bare);
  await page.reload();await click('Ёлка');assert.deepEqual(await perks(page),['+0%','+0%','+0%','20%']);
  await hook(page,1).selectOption('gingerbread');await hook(page,2).selectOption('gingerbread');await hook(page,3).selectOption('bauble');
  assert.ok(await hook(page,4).locator('[value=gingerbread]').evaluate(opt=>opt.disabled));assert.ok(await hook(page,4).locator('[value=bauble]').evaluate(opt=>opt.disabled));
  assert.deepEqual(await perks(page),['+20%','+10%','+10%','30%']);
  await click('В ангар');await page.getByRole('navigation').getByRole('button',{name:/^Инвентарь/}).click();
  const shelf=page.locator('#inventory-toys');
  assert.deepEqual(await shelf.locator('h4').allInnerTexts(),['Пряник × 2','Шар × 1']);
  assert.deepEqual(await shelf.locator('.tree-quantity').allInnerTexts(),['На ёлке: 2 · В запасе: 0','На ёлке: 1 · В запасе: 0']);
  const card=page.locator('.inv-card').filter({hasText:'Ёлочный ларец'});assert.doesNotMatch(await card.locator('.c-desc').innerText(),/слот|танк/i);
  assert.equal(await withRolls(card.getByRole('button',{name:'ОТКРЫТЬ ВСЕ'}),[.01,.69999,.70,.94,.999]),0);
  assert.deepEqual((await page.locator('#reward-lines strong').allInnerTexts()).sort(),['Пряник × 2','Олень × 1','Ёлка × 1','Шар × 1'].sort());
  const done=await saved();assert.deepEqual(done,{...start,inventory:{collection:1},tree2026:{gingerbread:4,deer:1,fir:1,bauble:2},treeSlots2026:['gingerbread','gingerbread','bauble',null]});
  await click('Повторить анимацию');await click('Пропустить анимацию');await click('ЗАБРАТЬ');
  assert.deepEqual(await shelf.locator('h4').allInnerTexts(),['Пряник × 4','Олень × 1','Ёлка × 1','Шар × 2']);
  assert.equal(await shelf.locator('[data-toy=bauble] .tree-quantity').innerText(),'На ёлке: 1 · В запасе: 1');
  await click('К ёлке');assert.ok(await page.locator('#container-modal').isHidden());
  assert.ok(await page.locator('#tree-unpack').isDisabled());assert.ok(await page.locator('#tree-unpack-all').isHidden());assert.deepEqual(await saved(),done);
  await hook(page,4).selectOption('bauble');assert.deepEqual(await perks(page),['+30%','+20%','+20%','30%']);
  await hook(page,3).selectOption('fir');assert.deepEqual(await perks(page),['+20%','+10%','+15%','30%']);
  await hook(page,4).selectOption('');assert.deepEqual(await perks(page),['+10%','+0%','+5%','20%']);
  assert.equal(await page.locator('#tree-manifest [data-toy=bauble] .tree-quantity').innerText(),'На ёлке: 0 · В запасе: 2');
  await page.reload();await click('Ёлка');assert.equal(await page.locator('#tree-total').innerText(),'Занято: 3 / 4');
  await click('В ангар');await page.getByRole('navigation').getByRole('button',{name:/^Инвентарь/}).click();
  assert.equal(await shelf.locator('[data-toy=bauble] .tree-quantity').innerText(),'На ёлке: 0 · В запасе: 2');
  assert.deepEqual(await saved(),{...done,treeSlots2026:['gingerbread','gingerbread','fir',null]});
});

test('desktop inventory: an unopened case is not a toy; the first toy appears immediately after opening the last case', async t => {
  const {page,click,saved}=await openGame(t,{seed:{inventory:{ornament:1}}});
  await click('Контейнеры');await page.locator('#container-modal').getByRole('button',{name:'Инвентарь',exact:true}).click();
  assert.ok(await page.locator('#inventory-toys-empty').isVisible());assert.equal(await page.locator('#inventory-toys article').count(),0);
  const stock=page.locator('#inventory-grid');
  assert.equal(await withRolls(stock.getByRole('button',{name:'ОТКРЫТЬ 1'}),[.94]),0);await click('ЗАБРАТЬ');
  assert.ok(await page.locator('#inventory-empty').isVisible());assert.equal(await stock.locator('article').count(),0);
  const toy=page.locator('#inventory-toys article');assert.equal(await toy.count(),1);assert.equal(await toy.locator('h4').innerText(),'Ёлка × 1');
  assert.equal(await toy.locator('.tree-quantity').innerText(),'На ёлке: 0 · В запасе: 1');assert.ok(await page.locator('#inventory-toys-empty').isHidden());
  assert.ok(await toy.locator('img').evaluate(async img=>{await img.decode();return img.naturalWidth>0;}));
  assert.deepEqual((await saved()).treeSlots2026,bare);assert.deepEqual((await saved()).inventory,{});
});

test('actual 3D branches and completed sorties follow the chosen slots, not total copies; taking off the last ball resets the roll',async t=>{
  const {page,click,saved}=await openGame(t,{webgl:true,seed:{tree2026:{gingerbread:6,deer:1,fir:3,bauble:2},boosters:{silver:1,xp:1,gold:1}}});
  await page.waitForFunction(()=>DepotView.stats());
  await page.evaluate(()=>{
    const prev=THREE.Scene.prototype.onAfterRender;
    THREE.Scene.prototype.onAfterRender=function(r,s,c){prev.apply(this,arguments);
      const tree=s.getObjectByName('festive-spruce');if(tree) window.branches=tree.children.filter(b=>b.name.startsWith('tree-slot-')).map(b=>b.children[0]?.name||null);
      const h=s.getObjectByName('LidHinge');if(h) window.caseFrame={angle:h.rotation.x, body:!!s.getObjectByName('Enamel case'),
        pieces:s.getObjectByName('Ornament tray').children.map(m=>[m.name,m.isMesh,m.geometry.attributes.position.count])};
    }; DepotView.view('iso');
  });
  await page.waitForFunction(()=>window.branches);assert.deepEqual(await page.evaluate(()=>branches),bare);
  await click('Ёлка');for(const [i,id] of ['gingerbread','deer','bauble','fir'].entries()) await hook(page,i+1).selectOption(id);
  const before=await saved();await page.locator('#tree-case-inspect').click();await page.locator('#crate-canvas').waitFor();
  assert.deepEqual(await page.evaluate(()=>[caseFrame.angle,caseFrame.body]),[0,true]);
  const pieces=await page.evaluate(()=>caseFrame.pieces);assert.deepEqual(pieces.map(p=>p[0]),['ornament-gingerbread','ornament-deer','ornament-fir','ornament-bauble']);assert.ok(pieces.every(p=>p[1]&&p[2]>75));
  await click('Открыть крышку');await page.waitForFunction(()=>caseFrame.angle < -1);await page.keyboard.press('Escape');await click('В ангар');
  await page.waitForFunction(()=>window.branches?.[2]==='ornament-bauble');assert.deepEqual(await page.evaluate(()=>branches),before.treeSlots2026.map(id=>'ornament-'+id));
  const launch=()=>page.evaluate(async()=>{if(!await launchBattle(1))throw Error('training launch');stopBattleLoop();});
  await launch();await page.evaluate(()=>{creditKill(GameState.player,500);backToGarage();});assert.deepEqual(await saved(),before,'a quit has no tree draw or partial kill payout');
  await launch();await page.evaluate(()=>{
    creditDamage(GameState.player,200);creditKill(GameState.player,500);
    const rand=Math.random;try {Math.random=()=>.299999;endBattle(true);endBattle(true);}finally{Math.random=rand;}
  });
  // One of each hung: +15% each; base silver 300*2, XP 800*2 + tier XP 500, gold 50*2.
  const win=await saved();assert.deepEqual([win.SILVER-before.SILVER,win.XP-before.XP,win.GOLD-before.GOLD,win.totalBattles,win.lifetimeWins],[690,2415,115,1,1]);
  assert.deepEqual(win.inventory,{ornament:1});assert.deepEqual(win.boosters,{silver:0,xp:0,gold:0});assert.match(await page.locator('#result-tree').innerText(),/Получен ёлочный ларец/);
  await page.locator('#result-screen button').click();await click('Ёлка');await hook(page,3).selectOption('');await click('В ангар');
  await page.waitForFunction(()=>window.branches?.[2]===null && branches[3]==='ornament-fir');
  await launch();await page.evaluate(()=>{const rand=Math.random;try{Math.random=()=>.25;endBattle(false);}finally{Math.random=rand;}});
  const loss=await saved();assert.deepEqual([loss.SILVER-win.SILVER,loss.XP-win.XP,loss.GOLD-win.GOLD,loss.totalBattles,loss.lifetimeWins],[0,105,10,2,1]);
  assert.deepEqual(loss.tree2026,before.tree2026);assert.deepEqual(loss.inventory,{ornament:1});assert.match(await page.locator('#result-tree').innerText(),/не выпал.*20%/);
});
