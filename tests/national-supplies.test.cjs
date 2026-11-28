const test=require('node:test'),assert=require('node:assert/strict');
const {openGame}=require('./winter-harness.cjs'),{ids,active}=require('./fixtures/national.cjs');
const counts={ussr:14,germany:15,usa:15,sweden:14,japan:13,france:15};

test('20% for a victory box and 10% for a tank on opening are separate rolls: boundaries, full manifests, fallback weights and unknown countries',async t=>{
  const {page}=await openGame(t);
  const results=await page.evaluate(()=>{
    const unsupported=['BT42','V440','NAT015','does-not-exist'];
    for(const id of unsupported){const g={player:{id},inventory:{}};if(nationalVictoryBox(g,true,()=>{throw Error(id+' rolled');}) || Object.keys(g.inventory).length)throw Error(id);}
    const out={};
    for(const [id,b] of Object.entries(CONTAINERS).filter(([,b])=>b.national)){
      if(b.cost || b.slotChance!==0)throw Error(id+' for sale or bonus');
      const nat=id.slice(9),player=Object.values(DB).find(t=>t.nat===nat && !t.source),g={player,selected:'IS7',curNat:'france',inventory:{basic:2}};
      if(nationalVictoryBox(g,false,()=>{throw Error('roll on loss');})!==null)throw Error('loss');
      for(const r of [.20,.9999])if(nationalVictoryBox(g,true,()=>r)!==null)throw Error('win boundary: '+id);
      for(const r of [0,.199999])if(nationalVictoryBox(g,true,()=>r)!==id)throw Error('missed win: '+id);
      if(g.inventory[id]!==2 || g.inventory.basic!==2)throw Error('wrong inventory');
      const check=(rolls)=>{const r=openContainerDirect(id,()=>{if(!rolls.length)throw Error('unexpected RNG '+id);return rolls.shift();});if(rolls.length || r.slot)throw Error(id);return r;};
      const draws=b.vehicles.map((_,i)=>{
        GameState.owned=[];GameState.pendingVehicles=[];GameState.rentalBattles={};const r=check([.099999,(i+.5)/b.vehicles.length]);
        if(r.type!=='vehicle' || !GameState.owned.includes(r.id))throw Error(id+' failed to award');return r.id;
      });
      GameState.owned=[];
      for(const [value,expected,amt] of [[.10,'silver',5000],[.63999999,'silver',5000],[.64000001,'xp',2000],[.90999999,'xp',2000],[.91000001,'gold',50]]){
        const r=check([value,0]);if(r.type!==expected || r.amount!==amt)throw Error(id+': '+JSON.stringify(r));
      }
      GameState.owned=b.vehicles.slice(0,3);GameState.pendingVehicles=b.vehicles.slice(3); // nothing left, even those in the queue count
      for(const [roll,k,max] of [[0,'silver',15000],[.60,'xp',8000],[.90,'gold',200]]){
        const r=check([roll,.999999]);if(r.type!==k || r.amount!==max)throw Error('complete collection: '+id);
      }
      out[nat]=draws;
    }
    return out;
  });
  assert.deepEqual(Object.keys(results).sort(),Object.keys(counts).sort());
  for(const [nat,n] of Object.entries(counts)){assert.equal(results[nat].length,n);assert.deepEqual(results[nat].sort(),ids(nat,'collection').sort());}
});

test('earned inventory: open a national batch once; show resources and queued M7, deliver after sale, reload intact',async t=>{
  const owned=['MS1','LTR','T26','IS3','BT2','BT7','A20','T34','T50','V440'];
  const {page,click,saved}=await openGame(t,{mobile:true,seed:{owned,selected:'V440',garageSlots:10,GOLD:0,SILVER:0,XP:0,
    inventory:{...Object.fromEntries(Object.keys(counts).map(n=>['national-'+n,1])),'national-usa':4,basic:1,'national-finland':3}}});
  const stock=(await saved()).inventory;assert.equal(Object.keys(stock).length,7);assert.equal(stock['national-finland'],undefined);
  await page.getByRole('navigation').getByRole('button',{name:/^Инвентарь/}).click();
  const card=page.locator('.inv-card').filter({hasText:'Ящик США × 4'});
  assert.match(await card.locator('.c-desc').innerText(),/^10% на танк.*Серебро — 54%, опыт — 27%, золото — 9%/);
  await card.getByRole('button',{name:'Осмотреть модель: Ящик США'}).click();await click('Открыть крышку');await click('Назад');
  assert.deepEqual((await saved()).inventory,stock);
  await card.locator('.inv-open-all').evaluate(b=>{
    const old=Math.random,values=[.099999,3.5/15,.10,0,.80,0,.99,0]; // corrected fourth US row is M7; then three resources
    try{Math.random=()=>{return values.length ? values.shift() : old();};b.click();}finally{Math.random=old;}
  });
  await page.locator('#reward-display:not([hidden])').waitFor();
  assert.match(await page.locator('#reward-lines').innerText(),/M7[\s\S]*Ожидает слота/);
  const before=await saved(),{['national-usa']:used,...rest}=stock;
  assert.deepEqual([before.inventory,before.pendingVehicles,before.owned,before.SILVER,before.XP,before.GOLD,before.garageSlots],
    [rest,['NAT114'],owned,5000,2000,50,10]);
  await page.locator('#unpack-replay').click();await page.locator('#unpack-skip').click();await page.locator('#unpack-collect').click();
  await page.reload();assert.deepEqual(await saved(),before);await click('Продать: Straussler V-4');
  await click('Подтвердить продажу');const delivered=await saved();assert.ok(delivered.owned.includes('NAT114'));assert.deepEqual(delivered.pendingVehicles,[]);
  await click('Выбрать для боя: M7');await page.reload();assert.equal(await page.locator('#dispatch-name').innerText(),'M7');assert.equal((await saved()).researched.includes('NAT114'),false);
});

test('a last rental wins its own country once; loss, aborted and duplicate results do not add national stock',async t=>{
  const {page,saved}=await openGame(t,{webgl:true,seed:{owned:['MS1','GPZ'],selected:'GPZ',curNat:'france',rentalBattles:{GPZ:1},usedPromos:['ARTA']}});
  const settle=async(won)=>page.evaluate(async won=>{
    GameState.controlMode='mobile';if(!await launchBattle(1))throw Error('Launch failed');stopBattleLoop();
    const sortie=[GameState.player.id,GameState.selected,!!GameState.player.rented],old=Math.random;
    try{Math.random=()=>.19;if(won!==null){endBattle(won);endBattle(true);}else{backToGarage();endBattle(true);}}finally{Math.random=old;}
    if(won!==null)backToGarage();return sortie;
  },won);
  assert.deepEqual(await settle(true),['GPZ','MS1',true]);
  for(const won of [false,null])assert.deepEqual(await settle(won),['MS1','MS1',false]);
  await page.reload();const s=await saved();assert.equal(s.totalBattles,2);assert.deepEqual(s.owned,['MS1']);assert.deepEqual(s.rentalBattles,{});
  assert.equal(s.inventory['national-germany'],1);assert.ok(!s.inventory['national-ussr'] && !s.inventory['national-france']);
});

test('all 24 new premiums can actually be bought for gold within ten dates; old save aliases never grant a special',async t=>{
  const {page,click,saved}=await openGame(t,{seed:{owned:['MS1','CHINI','R35','NAT087'],selected:'NAT087',GOLD:200000,garageSlots:31}});
  assert.deepEqual((await saved()).owned,['MS1']);await click('Премиум-магазин');
  assert.equal(await page.locator('#premium-roster li').count(),29);
  const bought=await page.evaluate(()=>{
    const now=WinterSeason.now,start=now(),firstGold=GameState.GOLD,bought={};let spend=0;
    try{for(let i=0;i<10;i++){
      const ms=start+i*86400000;WinterSeason.now=()=>ms;renderPremiumShop();
      for(const t of WinterSeason.offers(ms)){
        if(!t.id.startsWith('NAT') || GameState.owned.includes(t.id))continue;
        const card=document.querySelector(`.offer-card[data-id="${t.id}"] button`);if(!card || card.disabled)throw Error('unavailable '+t.id);
        card.click();if(!GameState.owned.includes(t.id))throw Error(t.id);bought[t.id]=t.price;spend+=t.price;
        if(GameState.GOLD!==firstGold-spend || !document.querySelector(`.offer-card[data-id="${t.id}"] button`).disabled)throw Error('double charge');
      }
    }}finally{WinterSeason.now=now;}return bought;
  });
  assert.deepEqual(bought,Object.fromEntries(active.filter(t=>t.source==='premium').map(t=>[t.id,t.tier*900])));
  const s=await saved();await page.reload();assert.deepEqual(await saved(),s);assert.deepEqual(s.researched,['MS1']);
});

for(const mobile of [false,true])test(`French all-branches graph: distinct clickable cards and a drawn prerequisite for every child (${mobile?'phone':'desktop'})`,async t=>{
  const {page,click}=await openGame(t,{mobile});await click('Дерево развития');await click('ФРАНЦИЯ');
  const report=await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll('#nodes .node')], overlap=[],noEdge=[],canvas=document.querySelector('#tree-canvas'),ctx=canvas.getContext('2d'),dpr=canvas.width/canvas.offsetWidth;
    nodes.forEach((a,i)=>{
      const r=a.getBoundingClientRect();for(const b of nodes.slice(i+1)){
        const s=b.getBoundingClientRect();if(Math.min(r.right,s.right)>Math.max(r.left,s.left) && Math.min(r.bottom,s.bottom)>Math.max(r.top,s.top))overlap.push([a.dataset.tankId,b.dataset.tankId]);
      }
      const parent=researchParent(a.dataset.tankId);if(!parent)return;
      const p=nodes.find(n=>n.dataset.tankId===parent),x=(p.offsetLeft+p.offsetWidth+a.offsetLeft)/2,y=(p.offsetTop+a.offsetTop+a.offsetHeight)/2;
      if(!ctx.getImageData(Math.round(x*dpr),Math.round(y*dpr),1,1).data[3])noEdge.push(a.dataset.tankId);
    });return [nodes.length,overlap,noEdge];
  });assert.deepEqual(report,[51,[],[]]);
  for(const [id,name] of [['AMX-12-T','AMX 12 t'],['AMD178B','Panhard AMD 178B']]){await page.locator(`.node[data-tank-id="${id}"]`).click();assert.equal(await page.locator('#tree-name').innerText(),name);}
});
