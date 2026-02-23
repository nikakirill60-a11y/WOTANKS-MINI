// === КОЛЛЕКЦИОННАЯ ТЕХНИКА ===
const COLLECTION_DB={
    OB907:{n:"Объект 907",nat:"ussr",tier:10,hp:2100,dmg:330,s:1.15,off:5,vr:400,camo:.22,cls:'mt',nc:'#ff4444',premium:true,collection:true,desc:"Секретный опытный средний танк."},
    OB279E:{n:"Об. 279 (р)",nat:"ussr",tier:10,hp:2600,dmg:440,s:1.3,off:10,vr:370,camo:.08,cls:'ht',armor:280,nc:'#ff4444',premium:true,collection:true,desc:"Четырёхгусеничный тяжёлый танк."},
    SU76I:{n:"СУ-76И",nat:"ussr",tier:3,hp:400,dmg:110,s:.8,isPT:true,off:8,vr:300,camo:.4,cls:'td',armor:60,nc:'#ff4444',premium:true,collection:true,desc:"Редчайшая ПТ-САУ."},
    BT7A:{n:"БТ-7 арт.",nat:"ussr",tier:3,hp:300,dmg:180,s:.75,off:5,vr:290,camo:.3,cls:'lt',nc:'#ff4444',premium:true,collection:true,desc:"Лёгкий танк с мощным фугасом."},
    E25:{n:"E 25",nat:"germany",tier:7,hp:900,dmg:150,s:.8,isPT:true,mag:3,reload:5000,off:8,vr:360,camo:.5,cls:'td',nc:'#cc0000',premium:true,collection:true,desc:"Невидимая ПТ с автоматом."},
    PZ2J:{n:"Pz.II J",nat:"germany",tier:3,hp:450,dmg:15,s:.7,mag:6,reload:3000,off:5,vr:260,camo:.3,cls:'lt',armor:80,nc:'#cc0000',premium:true,collection:true,desc:"Неубиваемый лёгкий танк."},
    KPFPZ70:{n:"KPz 70",nat:"germany",tier:9,hp:1800,dmg:400,s:1.1,mag:2,reload:6000,off:5,vr:400,camo:.18,cls:'mt',nc:'#cc0000',premium:true,collection:true,desc:"Ракетный танк (прототип)."},
    CHIEFTAIN:{n:"T95/Chieftain",nat:"uk",tier:10,hp:2500,dmg:440,s:1.25,off:5,vr:400,camo:.08,cls:'ht',armor:280,nc:'#9b59b6',premium:true,collection:true,desc:"Один из самых желанных танков."},
    SENLAC:{n:"FV1066 Senlac",nat:"uk",tier:8,hp:1150,dmg:240,s:.95,off:5,vr:410,camo:.38,cls:'lt',nc:'#9b59b6',premium:true,collection:true,desc:"Британский лёгкий танк."},
    TYPE59:{n:"Type 59",nat:"china",tier:8,hp:1400,dmg:260,s:1.05,off:5,vr:380,camo:.25,cls:'mt',armor:120,nc:'#ff6600',premium:true,collection:true,desc:"Легендарный китайский СТ."},
    TYPE59G:{n:"Type 59 G",nat:"china",tier:8,hp:1500,dmg:280,s:1.05,off:5,vr:380,camo:.25,cls:'mt',armor:140,nc:'#ffd700',premium:true,collection:true,desc:"Золотой Type 59."},
    BZ176:{n:"BZ-176",nat:"china",tier:8,hp:1700,dmg:800,s:1.3,off:12,vr:340,camo:.08,cls:'ht',armor:180,nc:'#ff6600',premium:true,collection:true,reload:9000,desc:"Ракетный тяжёлый танк."},
    STBGOLD:{n:"STB-1 Gold",nat:"japan",tier:10,hp:2000,dmg:360,s:1.15,off:5,vr:410,camo:.2,cls:'mt',nc:'#ffd700',premium:true,collection:true,desc:"Золотой японский СТ."},
    NAMELESS:{n:"Nameless",nat:"japan",tier:9,hp:2000,dmg:440,s:1.2,off:8,vr:380,camo:.1,cls:'ht',armor:200,nc:'#d4a574',premium:true,collection:true,desc:"Безымянный танк."},
    
    // Огнемётные
    M4A3FL:{n:"M4A3E8 FL",nat:"ussr",tier:7,hp:1100,dmg:35,s:.95,off:5,vr:350,camo:.2,cls:'mt',nc:'#ff4500',premium:true,collection:true,flame:true,mag:40,reload:4000,flameRange:180,flameCone:.4,flameDPS:35,desc:"Огнемётный Шерман. Струя пламени!"},
    TF3:{n:"TF-3",nat:"ussr",tier:8,hp:1400,dmg:45,s:1.05,off:8,vr:360,camo:.15,cls:'ht',nc:'#ff4500',premium:true,collection:true,armor:120,flame:true,mag:50,reload:5000,flameRange:200,flameCone:.35,flameDPS:45,desc:"Тяжёлый огнемёт. Бронирован!"},
    TF4:{n:"TF-4",nat:"ussr",tier:9,hp:1750,dmg:55,s:1.15,off:10,vr:370,camo:.12,cls:'ht',nc:'#ff4500',premium:true,collection:true,armor:150,flame:true,mag:60,reload:5500,flameRange:220,flameCone:.3,flameDPS:55,desc:"Усиленный огнемёт!"},
    ASTRONFL:{n:"ASTRON FL",nat:"ussr",tier:10,hp:2100,dmg:70,s:1.2,off:12,vr:390,camo:.1,cls:'ht',nc:'#ff4500',premium:true,collection:true,armor:180,flame:true,mag:80,reload:6000,flameRange:250,flameCone:.35,flameDPS:70,desc:"Апогей огнемётов. Ад на гусеницах!"},
    
    // Ракетный
    SHERIDAN:{n:"Sheridan Missile", nat:"ussr",tier:10, hp:1800, dmg:560, s:1.15, off:5, vr:420, camo:0.35,cls:'lt', nc:'#00ccff', premium:true, collection:true,missile:true, mag:1, reload:12000, desc:"Легендарный ПТУР! Управляйте ракетой курсором мыши."},

    // === СУПЕР-ЭКСКЛЮЗИВ (только по коду) ===
    KV220BT:{
        n:"КВ-220-2 Бета", nat:"ussr", 
        tier:11, hp:3500, dmg:600, s:1.1, off:5, vr:400, camo:0.05,
        cls:'ht', nc:'#8e44ad', 
        premium:true, collection:true, 
        armor:250, 
        desc:"Уникальный танк бета-теста. Недоступен в контейнерах. Выдается только избранным."
    },

    // === ТАНК ЗА КВЕСТ 23 ФЕВРАЛЯ ===
    T3485VIC:{
        n:"Т-34-85 Победный", nat:"ussr",
        tier:6, hp:950, dmg:180, s:1, off:5, vr:360, camo:0.25,
        cls:'mt', nc:'#e74c3c', 
        premium:true, collection:true,
        desc:"Специальная версия в честь 23 февраля. За победу!"
    }
};

const CONTAINERS={
    basic:{name:"Базовый",icon:"📦",cost:{silver:25000},color:"#7f8c8d",desc:"Серебро, опыт или редкая техника",
        drops:[{type:'silver',amount:[5000,15000],weight:35,label:"Серебро"},{type:'xp',amount:[2000,8000],weight:25,label:"Опыт"},{type:'gold',amount:[50,200],weight:15,label:"Золото"},{type:'tank',pool:'common',weight:15,label:"Обычная техника"},{type:'tank',pool:'rare',weight:8,label:"Редкая техника"},{type:'tank',pool:'legendary',weight:2,label:"Легенда!"}]},
    premium:{name:"Премиум",icon:"🎁",cost:{gold:500},color:"#f39c12",desc:"Повышенный шанс на редкую технику",
        drops:[{type:'silver',amount:[15000,40000],weight:20,label:"Серебро"},{type:'xp',amount:[5000,20000],weight:15,label:"Опыт"},{type:'gold',amount:[200,600],weight:15,label:"Золото"},{type:'tank',pool:'common',weight:10,label:"Обычная техника"},{type:'tank',pool:'rare',weight:25,label:"Редкая техника"},{type:'tank',pool:'legendary',weight:15,label:"Легенда!"}]},
    legendary:{name:"Легендарный",icon:"💎",cost:{gold:1500},color:"#9b59b6",desc:"Гарантия редкой или легендарной!",
        drops:[{type:'gold',amount:[500,1500],weight:15,label:"Золото"},{type:'tank',pool:'rare',weight:40,label:"Редкая техника"},{type:'tank',pool:'legendary',weight:40,label:"Легенда!"},{type:'tank',pool:'missile',weight:5,label:"🚀 Sheridan!"}]},
    event:{name:"Ивентовый",icon:"🎪",cost:{silver:50000},color:"#e74c3c",desc:"Специальный контейнер!",
        drops:[{type:'silver',amount:[10000,30000],weight:15,label:"Серебро"},{type:'xp',amount:[10000,30000],weight:10,label:"Опыт"},{type:'gold',amount:[300,800],weight:15,label:"Золото"},{type:'tank',pool:'rare',weight:30,label:"Редкая техника"},{type:'tank',pool:'legendary',weight:30,label:"Легенда!"}]},
    
    // === ОБНОВЛЕННАЯ ТАНКО-ЖАРКА ===
    flamebox:{name:"Танко-Жарка",icon:"🔥",cost:{gold:2000},color:"#ff4500",desc:"99% Золота, 1% Огнемёт!",
        drops:[
            {type:'gold',amount:[300,1000],weight:99,label:"Золото"},
            {type:'tank',pool:'flame',weight:1,label:"🔥 Огнемётный танк!"}
        ]
    }
};

const DROP_POOLS={common:[],rare:[],legendary:[],flame:[],missile:['SHERIDAN']};

function initContainers(){
    for(let id in COLLECTION_DB) DB[id]=COLLECTION_DB[id];
    for(let id in COLLECTION_DB){
        if (id === 'KV220BT' || id === 'T3485VIC') continue; // Не добавляем эксклюзивы в пулы

        const t=COLLECTION_DB[id];
        if(t.flame) DROP_POOLS.flame.push(id);
        else if(id==='SHERIDAN') DROP_POOLS.missile.push(id);
        else if(t.tier<=5) DROP_POOLS.common.push(id);
        else if(t.tier<=8) DROP_POOLS.rare.push(id);
        else DROP_POOLS.legendary.push(id);
    }
}

function getRarityColor(tier){
    if(tier>=11) return "#ff00ff";
    if(tier>=9) return "#9b59b6";
    if(tier>=6) return "#3498db";
    return "#2ecc71";
}
function getRarityName(tier){
    if(tier>=11) return "ЭКСКЛЮЗИВ";
    if(tier>=9) return "ЛЕГЕНДАРНАЯ";
    if(tier>=6) return "РЕДКАЯ";
    return "ОБЫЧНАЯ";
}
function randomRange(a,b){return Math.floor(Math.random()*(b-a+1))+a;}

function openContainer(cid){
    const c=CONTAINERS[cid];if(!c)return null;
    if(c.cost.silver&&GameState.SILVER<c.cost.silver)return{error:"Недостаточно серебра!"};
    if(c.cost.gold&&GameState.GOLD<c.cost.gold)return{error:"Недостаточно золота!"};
    if(c.cost.silver)GameState.SILVER-=c.cost.silver;
    if(c.cost.gold)GameState.GOLD-=c.cost.gold;
    const tw=c.drops.reduce((s,d)=>s+d.weight,0);
    let roll=Math.random()*tw,sel=c.drops[0];
    for(let d of c.drops){roll-=d.weight;if(roll<=0){sel=d;break;}}
    const rwd={type:sel.type,label:sel.label};
    if(sel.type==='silver'){const a=randomRange(sel.amount[0],sel.amount[1]);GameState.SILVER+=a;rwd.amount=a;rwd.display=a+" ₽";rwd.icon="💰";rwd.color="#bdc3c7";}
    else if(sel.type==='xp'){const a=randomRange(sel.amount[0],sel.amount[1]);GameState.XP+=a;rwd.amount=a;rwd.display=a+" XP";rwd.icon="⭐";rwd.color="#3498db";}
    else if(sel.type==='gold'){const a=randomRange(sel.amount[0],sel.amount[1]);GameState.GOLD+=a;rwd.amount=a;rwd.display=a+" G";rwd.icon="🪙";rwd.color="#f1c40f";}
    else if(sel.type==='tank'){
        const pool=DROP_POOLS[sel.pool]||[];const avail=pool.filter(id=>!GameState.owned.includes(id));
        if(!avail.length){const comp=sel.pool==='legendary'?1000:sel.pool==='flame'?1500:sel.pool==='missile'?2000:sel.pool==='rare'?500:200;GameState.GOLD+=comp;rwd.type='compensation';rwd.display=comp+" G (компенсация)";rwd.icon="🔄";rwd.color="#f39c12";rwd.desc="Все танки из пула уже есть!";}
        else{
            const tid=avail[Math.floor(Math.random()*avail.length)];const td=DB[tid];
            GameState.owned.push(tid);
            rwd.tankId=tid;rwd.display=td.n+" ["+(CONFIG.TIER_ROMAN[td.tier]||"XI")+"]";
            rwd.icon=td.flame?"🔥":(td.missile?"🚀":"🎖️");
            rwd.color=td.flame?"#ff4500":(td.missile?"#00ccff":getRarityColor(td.tier));
            rwd.desc=td.desc||"";
            rwd.rarity=td.flame?"ОГНЕМЁТНЫЙ":(td.missile?"ПТУР":getRarityName(td.tier));
            rwd.isFlame=td.flame||false;
        }
    }
    updateResources();return rwd;
}

let containerAnimating=false;
function showContainerShop(){document.getElementById('container-modal').classList.add('show');renderContainerGrid();}
function hideContainerShop(){document.getElementById('container-modal').classList.remove('show');}
function switchTab(tab,btn){
    document.querySelectorAll('.modal-tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active-tab'));
    document.getElementById('tab-'+tab).classList.add('active-tab');
    if(tab==='shop')renderContainerGrid();if(tab==='collection')renderCollectionGrid();
}

function renderContainerGrid(){
    const g=document.getElementById('container-grid');g.innerHTML='';
    for(let id in CONTAINERS){
        const c=CONTAINERS[id];const costTxt=c.cost.gold?c.cost.gold+' G':c.cost.silver+' ₽';
        const ok=c.cost.gold?GameState.GOLD>=c.cost.gold:GameState.SILVER>=c.cost.silver;
        const tw=c.drops.reduce((s,d)=>s+d.weight,0);const isF=id==='flamebox';
        const card=document.createElement('div');card.className='c-card'+(ok?'':' no-money')+(isF?' flame-card':'');card.style.borderColor=c.color;
        let extra='';
        if(isF){
            const ft=Object.keys(COLLECTION_DB).filter(i=>COLLECTION_DB[i].flame);
            extra='<div class="flame-subtitle">🔥 ЭКСКЛЮЗИВ 🔥</div><div class="flame-preview">'+ft.map(i=>{const t=COLLECTION_DB[i];const h=GameState.owned.includes(i);return`<div class="flame-tank-row ${h?'owned':''}"><span class="flame-tier">${CONFIG.TIER_ROMAN[t.tier]}</span><span class="flame-name">${h?t.n:'???'}</span><span class="flame-status">${h?'✅':'🔒'}</span></div>`;}).join('')+'</div>';
        }
        card.innerHTML=`<div class="c-icon" style="text-shadow:0 0 15px ${c.color}">${c.icon}</div><div class="c-name" style="color:${c.color}">${c.name}</div>${extra}<div class="c-desc">${c.desc}</div><div class="c-drops">${c.drops.map(d=>`<div class="c-drop-row"><span>${d.label}</span><span class="c-pct">${Math.round(d.weight/tw*100)}%</span></div>`).join('')}</div><div class="c-cost ${ok?'':'red'}">${costTxt}</div><button class="btn c-buy" ${ok?'':'disabled'} style="background:${c.color}" onclick="buyContainer('${id}')">ОТКРЫТЬ</button>`;
        g.appendChild(card);
    }
}

function buyContainer(cid){if(containerAnimating)return;const rwd=openContainer(cid);if(!rwd)return;if(rwd.error){alert(rwd.error);return;}showOpenAnim(cid,rwd);saveProgress();}

function showOpenAnim(cid,rwd){
    containerAnimating=true;const c=CONTAINERS[cid];const isF=cid==='flamebox'||rwd.isFlame;
    const ov=document.getElementById('container-opening');ov.classList.add('show');
    if(isF)ov.classList.add('flame-opening');else ov.classList.remove('flame-opening');
    const ac=document.getElementById('anim-container'),rd=document.getElementById('reward-display');
    rd.style.display='none';ac.style.display='flex';
    ac.innerHTML=`<div class="op-box ${isF?'flame-box':''}" style="border-color:${c.color};box-shadow:0 0 25px ${c.color}"><span class="op-icon">${c.icon}</span></div>`;
    const box=ac.querySelector('.op-box');
    setTimeout(()=>box.classList.add('shake'),200);
    setTimeout(()=>{box.classList.remove('shake');box.classList.add('glow');box.style.boxShadow=`0 0 50px ${rwd.color},0 0 100px ${rwd.color}`;if(isF)box.classList.add('flame-glow');},1500);
    setTimeout(()=>{box.classList.add('explode');setTimeout(()=>{
        ac.style.display='none';rd.style.display='flex';
        const rb=rwd.rarity?`<div class="rwd-rarity" style="background:${rwd.color}">${rwd.rarity}</div>`:'';
        const tc=rwd.tankId?'<canvas id="rwd-tank-cvs" width="180" height="100"></canvas>':'';
        const ff=rwd.isFlame?'<div class="flame-reward-fx">🔥🔥🔥</div>':'';
        rd.innerHTML=`<div class="rwd-glow ${rwd.isFlame?'flame-reward':''}" style="color:${rwd.color}">${rb}${ff}<div class="rwd-icon">${rwd.icon}</div>${tc}<div class="rwd-text" style="color:${rwd.color}">${rwd.display}</div>${rwd.desc?`<div class="rwd-desc">${rwd.desc}</div>`:''}</div><button class="btn rwd-collect" onclick="collectReward()">ЗАБРАТЬ</button>`;
        if(rwd.tankId)setTimeout(()=>{const cv=document.getElementById('rwd-tank-cvs');if(cv)drawTankIcon(cv,rwd.tankId);},50);
    },400);},2500);
}

function collectReward(){containerAnimating=false;document.getElementById('container-opening').classList.remove('show');document.getElementById('container-opening').classList.remove('flame-opening');renderContainerGrid();renderCarousel();renderTree();updateResources();}

function renderCollectionGrid(){
    const g=document.getElementById('collection-grid');g.innerHTML='';
    const total=Object.keys(COLLECTION_DB).length;const oc=Object.keys(COLLECTION_DB).filter(id=>GameState.owned.includes(id)).length;
    const st=document.createElement('div');st.className='coll-stats';
    st.innerHTML=`<div class="coll-bar"><div class="coll-fill" style="width:${total>0?oc/total*100:0}%"></div></div><div class="coll-text">Собрано: ${oc}/${total} (${total>0?Math.round(oc/total*100):0}%)</div>`;
    g.appendChild(st);
    
    // Специальные (Огнемёт и ПТУР и XI)
    const ft=Object.keys(COLLECTION_DB).filter(id=>COLLECTION_DB[id].flame || COLLECTION_DB[id].missile || COLLECTION_DB[id].tier > 10 || id === 'T3485VIC');
    if(ft.length){
        const h=document.createElement('div');h.className='coll-nat-hdr flame-hdr';h.innerHTML='⭐ СПЕЦИАЛЬНЫЕ ТАНКИ ⭐';g.appendChild(h);
        const gr=document.createElement('div');gr.className='coll-nat-grid';
        ft.sort((a,b)=>COLLECTION_DB[a].tier-COLLECTION_DB[b].tier).forEach(id=>gr.appendChild(mkCollCard(id)));
        g.appendChild(gr);
    }

    ['ussr','germany','france','uk','china','japan'].forEach(nat=>{
        const tanks=Object.keys(COLLECTION_DB).filter(id=>COLLECTION_DB[id].nat===nat && !COLLECTION_DB[id].flame && !COLLECTION_DB[id].missile && COLLECTION_DB[id].tier <= 10 && id !== 'T3485VIC');
        if(!tanks.length)return;
        const h=document.createElement('div');h.className='coll-nat-hdr';h.innerText=CONFIG.NATIONS[nat];g.appendChild(h);
        const gr=document.createElement('div');gr.className='coll-nat-grid';
        tanks.sort((a,b)=>COLLECTION_DB[a].tier-COLLECTION_DB[b].tier).forEach(id=>gr.appendChild(mkCollCard(id)));
        g.appendChild(gr);
    });
}

function mkCollCard(id){
    const t=COLLECTION_DB[id];const has=GameState.owned.includes(id);
    const card=document.createElement('div');
    card.className='coll-card '+(has?'owned':'locked')+(t.flame?' flame-coll':'');
    const border = t.flame ? '#ff4500' : (t.missile ? '#00ccff' : getRarityColor(t.tier));
    card.style.borderColor=has?border:'#333';
    
    const typeLabel = t.flame ? 'ОГНЕМЁТ' : (t.missile ? 'ПТУР' : getRarityName(t.tier));
    const clsLabel = t.flame ? '🔥 ОТ' : (t.missile ? '🚀 ЛТ' : CONFIG.TANK_CLASSES[t.cls||'mt']);
    
    card.innerHTML=`<div class="cc-hdr"><span class="cc-tier" style="color:${border}">${CONFIG.TIER_ROMAN[t.tier]||"XI"}</span><span class="cc-rar" style="color:${border}">${typeLabel}</span></div><div class="cc-body"><canvas class="cc-cvs" width="110" height="60"></canvas></div><div class="cc-name ${has?'':'lk'}">${has?t.n:'???'}</div><div class="cc-cls">${clsLabel}</div>${has&&t.desc?`<div class="cc-desc">${t.desc}</div>`:''}${!has?'<div class="cc-lock">'+(t.flame?'🔥':(t.missile?'🚀':'🔒'))+'</div>':''}`;
    setTimeout(()=>{const cv=card.querySelector('.cc-cvs');if(cv&&has)drawTankIcon(cv,id);else if(cv){const cx=cv.getContext('2d');cx.fillStyle='#222';cx.fillRect(0,0,cv.width,cv.height);cx.fillStyle=t.flame?'#ff4500':(t.missile?'#00ccff':'#444');cx.font='30px Arial';cx.textAlign='center';cx.fillText(t.flame?'🔥':(t.missile?'🚀':'?'),cv.width/2,cv.height/2+10);}},30);
    return card;
}

initContainers();