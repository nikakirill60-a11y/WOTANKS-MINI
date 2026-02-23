function crewMsg(msg,color){const el=document.getElementById('crew-msg');el.innerText=msg;el.style.color=color||'#fff';el.style.opacity=1;setTimeout(()=>el.style.opacity=0,1500);}
function dmgLog(msg,color){const el=document.getElementById('dmg-log'),d=document.createElement('div');d.className='dmg-msg';d.style.color=color||'#fff';d.innerText=msg;el.appendChild(d);setTimeout(()=>d.remove(),2000);}
function updateResources(){document.getElementById('xp-val').innerText=GameState.XP;document.getElementById('gold-val').innerText=GameState.GOLD;document.getElementById('silver-val').innerText=GameState.SILVER;}
function exchangeXP(){if(GameState.XP>=100){GameState.XP-=100;GameState.GOLD+=10;document.getElementById('exchange-msg').innerText="✓";setTimeout(()=>document.getElementById('exchange-msg').innerText="",1500);updateResources();}}
function setNat(nat,btn){GameState.curNat=nat;renderTree();document.querySelectorAll('.n-btn').forEach(b=>b.classList.remove('active-n'));btn.classList.add('active-n');}
function setShell(i){GameState.curShell=i;document.querySelectorAll('.shell-opt').forEach((e,j)=>e.classList.toggle('active',j===i));document.querySelectorAll('.m-shell').forEach((e,j)=>e.classList.toggle('active',j===i));}
function useCons(i){
    if(!GameState.gameActive||!GameState.player||GameState.player.dead||GameState.consumables[i])return;
    if(GameState.SILVER<500){crewMsg("Нет серебра!","#e74c3c");return;}
    GameState.SILVER-=500;GameState.consumables[i]=true;
    document.getElementById('cons'+(i+1)).classList.add('used');document.getElementById('mcons'+(i+1)).classList.add('used');
    if(i===0){GameState.player.trackBroken=false;crewMsg("Починено!","#2ecc71");snd('hit');}
    if(i===1){GameState.player.hp=Math.min(GameState.player.maxHp,GameState.player.hp+GameState.player.maxHp*.15);crewMsg("+15%HP","#2ecc71");snd('hit');}
    if(i===2){GameState.adrenalineActive=true;GameState.adrenalineTimer=Date.now()+10000;crewMsg("Адреналин!","#f39c12");snd('hit');}
}
function fillTrainNatSelect(){const s=document.getElementById('train-nat-select');s.innerHTML='';[...new Set(Object.values(DB).map(d=>d.nat))].forEach(n=>{const o=document.createElement('option');o.value=n;o.innerText=CONFIG.NATIONS[n]||n;s.appendChild(o);});}
function fillEnemySelect(){const nat=document.getElementById('train-nat-select').value,s=document.getElementById('enemy-select');s.innerHTML='';Object.keys(DB).filter(id=>DB[id].nat===nat).sort((a,b)=>DB[a].tier-DB[b].tier).forEach(id=>{const o=document.createElement('option');o.value=id;o.innerText=`${DB[id].n} [${CONFIG.TIER_ROMAN[DB[id].tier]}]${DB[id].collection?' ★':''}${DB[id].flame?' 🔥':''}`;s.appendChild(o);});}
function toggleTraining(){const p=document.getElementById('training-panel');p.style.display=p.style.display==='none'?'block':'none';}
function sellTank(tid){
    if(GameState.owned.length<=1){alert("Нельзя продать последний танк!");return;}
    const t=DB[tid];let price=t.collection?t.tier*15000:t.gold?t.gold*200:t.tier*5000;
    const tag=t.flame?' [ОГНЕМЁТНЫЙ]':(t.missile?' [ПТУР]':(t.collection?' [КОЛЛЕКЦИОННЫЙ]':(t.premium?' [ПРЕМИУМ]':'')));
    const warn=t.collection?'\n⚠️ Коллекционный танк можно получить только из контейнера!':'';
    if(confirm(`Продать ${t.n}${tag} за ${price} серебра?${warn}`)){GameState.SILVER+=price;GameState.owned=GameState.owned.filter(id=>id!==tid);if(GameState.selected===tid)GameState.selected=GameState.owned[0];updateResources();renderCarousel();renderTree();}
}

// === КВЕСТ UI ===
function updateQuestUI() {
    const q = GameState.quest23;
    if(!q) return;
    
    if(q.claimed) {
        document.getElementById('quest-widget').style.display = 'none';
        return;
    }
    
    document.getElementById('quest-widget').style.display = 'block';
    const pct = Math.min(100, (q.kills / q.target) * 100);
    document.getElementById('quest-bar').style.width = pct + '%';
    document.getElementById('quest-text').innerText = `${q.kills} / ${q.target}`;
    
    if (q.kills >= q.target) {
        document.getElementById('quest-claim-btn').style.display = 'block';
        document.getElementById('quest-text').style.display = 'none';
    } else {
        document.getElementById('quest-claim-btn').style.display = 'none';
        document.getElementById('quest-text').style.display = 'block';
    }
}

function claimQuestReward() {
    if(!GameState.quest23.claimed) {
        GameState.quest23.claimed = true;
        GameState.owned.push('T3485VIC');
        alert("🎉 Поздравляем! Танк Т-34-85 Победный добавлен в ангар!");
        updateResources();
        renderCarousel();
        updateQuestUI();
        saveProgress();
    }
}

// === ПРОМОКОДЫ ===
function showPromo(){
    document.getElementById('promo-modal').classList.add('show');
    document.getElementById('promo-input').value = '';
    document.getElementById('promo-result').innerText = '';
}
function hidePromo(){document.getElementById('promo-modal').classList.remove('show');}

function activatePromo(){
    const input = document.getElementById('promo-input');
    const code = input.value.trim().toUpperCase();
    const result = document.getElementById('promo-result');
    
    if(!code) return;
    
    if(GameState.usedPromos.includes(code)){
        result.innerText = "Код уже использован!";
        result.style.color = "#e74c3c";
        return;
    }
    
    const reward = CONFIG.PROMOCODES[code];
    if(reward){
        let msg = "Награда: ";
        if(reward.gold){ GameState.GOLD += reward.gold; msg += `${reward.gold} G `; }
        if(reward.silver){ GameState.SILVER += reward.silver; msg += `${reward.silver} ₽ `; }
        if(reward.xp){ GameState.XP += reward.xp; msg += `${reward.xp} XP `; }
        if(reward.tank){
            if(!GameState.owned.includes(reward.tank)){
                GameState.owned.push(reward.tank);
                msg += `Танк: ${DB[reward.tank].n}`;
            } else {
                msg += `Танк уже есть (компенсация 500 G)`;
                GameState.GOLD += 500;
            }
        }
        
        GameState.usedPromos.push(code);
        
        result.innerText = "Успешно! " + msg;
        result.style.color = "#2ecc71";
        updateResources();
        renderCarousel();
        saveProgress();
    } else {
        result.innerText = "Неверный код!";
        result.style.color = "#e74c3c";
    }
}

function renderCarousel(){
    const c=document.getElementById('tank-carousel');c.innerHTML='';
    [...GameState.owned].sort((a,b)=>{const ta=DB[a],tb=DB[b];if(!ta||!tb)return 0;if(tb.tier!==ta.tier)return tb.tier-ta.tier;if((tb.collection?1:0)!==(ta.collection?1:0))return(tb.collection?1:0)-(ta.collection?1:0);return 0;}).forEach(id=>{
        const t=DB[id];if(!t)return;
        const isColl=t.collection||false,isFlame=t.flame||false,isMissile=t.missile||false;
        const slot=document.createElement('div');slot.className='tank-slot';
        if(t.premium&&!isColl)slot.className+=' premium-slot';
        if(isColl)slot.className+=' collection-slot';
        if(isFlame)slot.className+=' flame-slot';
        if(isMissile)slot.style.borderColor = '#00ccff';
        if(GameState.selected===id)slot.className+=' selected';
        
        slot.onclick=e=>{if(e.target.classList.contains('sell-btn'))return;GameState.selected=id;renderCarousel();renderTree();};
        const sb=document.createElement('button');sb.className='sell-btn';sb.innerText='×';sb.onclick=e=>{e.stopPropagation();sellTank(id);};slot.appendChild(sb);
        if(isColl){const bg=document.createElement('div');bg.className='coll-badge'+(isFlame?' flame-badge':'');bg.style.background=isMissile?'#00ccff':'';bg.innerText=isFlame?'🔥':(isMissile?'🚀':'★');slot.appendChild(bg);}
        const wrap=document.createElement('div');wrap.className='slot-bg';const cv=document.createElement('canvas');cv.width=140;cv.height=80;drawTankIcon(cv,id);wrap.appendChild(cv);
        const info=document.createElement('div');info.className='slot-info';
        const tier=document.createElement('span');tier.className='slot-tier';tier.innerText=CONFIG.TIER_ROMAN[t.tier];
        const name=document.createElement('span');name.className='slot-name';
        if(isFlame)name.style.color='#ff4500';
        else if(isMissile)name.style.color='#00ccff';
        else if(isColl)name.style.color=getRarityColor(t.tier);
        name.innerText=t.n;
        const cls=document.createElement('span');cls.className='slot-cls';cls.innerText=isFlame?'🔥ОТ':(isMissile?'🚀ЛТ':CONFIG.TANK_CLASSES[t.cls||'mt']);
        info.append(tier,name,cls);slot.append(wrap,info);c.appendChild(slot);
    });
}

function drawTankIcon(canvas,tankId){
    const ctx=canvas.getContext('2d'),t=DB[tankId];if(!t)return;ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.scale(.8,.8);const a=-Math.PI/6,s=t.s||1;
    let bc=t.nc||'#666';if(t.flame)bc='#ff4500';else if(t.missile)bc='#00ccff';else if(t.collection)bc=getRarityColor(t.tier);else if(t.premium)bc='#f39c12';
    ctx.save();ctx.rotate(a);ctx.fillStyle=bc;let bW=t.isLong?80:44;
    ctx.fillRect(-bW/2*s,-14*s,bW*s,28*s);ctx.fillStyle="#111";ctx.fillRect(-bW/2*s-2,-16*s,(bW+4)*s,6*s);ctx.fillRect(-bW/2*s-2,10*s,(bW+4)*s,6*s);ctx.restore();
    ctx.save();const off=(t.off||0)*s;ctx.translate(Math.cos(a)*off,Math.sin(a)*off);ctx.rotate(a);ctx.fillStyle=bc;ctx.filter='brightness(1.2)';ctx.fillRect(-10*s,-10*s,20*s,20*s);ctx.filter='none';
    if(t.flame){ctx.fillStyle="#333";ctx.fillRect(5*s,-5*s,25*s,10*s);ctx.fillStyle="#ff4500";ctx.fillRect(28*s,-4*s,6*s,8*s);}
    else if(t.missile){ctx.fillStyle="#111";ctx.fillRect(5*s,-6*s,20*s,12*s);}
    else{ctx.fillStyle="#111";ctx.fillRect(5*s,-3*s,35*s,6*s);}
    ctx.restore();ctx.restore();
}

function renderTree(){
    const nodes=document.getElementById('nodes'),tc=document.getElementById('tree-canvas'),ctx=tc.getContext('2d'),sc=nodeScale;
    nodes.innerHTML='';ctx.clearRect(0,0,tc.width,tc.height);ctx.strokeStyle="#444";ctx.lineWidth=2*sc;
    for(let id in DB){
        const t=DB[id];if(t.nat!==GameState.curNat||t.collection)continue;
        const sx=t.x*sc,sy=t.y*sc;
        if(t.p&&DB[t.p]&&!DB[t.p].collection){ctx.beginPath();ctx.moveTo(DB[t.p].x*sc+62*sc,DB[t.p].y*sc+24*sc);ctx.lineTo(sx,sy+24*sc);ctx.stroke();}
        const div=document.createElement('div');div.className='node';
        if(GameState.owned.includes(id))div.className+=' owned';if(GameState.selected===id)div.className+=' selected';if(t.premium)div.className+=' premium-glow';
        div.style.cssText=`left:${sx}px;top:${sy}px;width:${120*sc}px;height:${48*sc}px;font-size:${9*sc}px`;
        const cost=t.gold?t.gold+'G':(t.xp!==undefined?t.xp+'XP':'');const cls=CONFIG.TANK_CLASSES[t.cls||'mt']||'';const mag=t.mag&&t.mag>1?`🔄${t.mag}`:'';
        div.innerHTML=`<b style="color:${t.premium?'#f1c40f':'#fff'}">${t.premium?'★':''}${t.n}</b><br><span style="color:#f1c40f">[${CONFIG.TIER_ROMAN[t.tier]}]</span> ${cls} ${mag}<br>${cost}`;
        div.onclick=()=>{
            if(GameState.owned.includes(id)){GameState.selected=id;}
            else if(t.gold){if(GameState.GOLD>=t.gold){GameState.GOLD-=t.gold;GameState.owned.push(id);GameState.selected=id;}}
            else if(t.xp!==undefined&&GameState.XP>=t.xp&&(!t.p||GameState.owned.includes(t.p))){GameState.XP-=t.xp;GameState.owned.push(id);GameState.selected=id;}
            renderTree();renderCarousel();updateResources();
        };
        nodes.appendChild(div);
    }
}

function updateScoreboard(){
    const al=document.getElementById('allies-list'),en=document.getElementById('enemies-list');
    al.innerHTML='<b>СОЮЗНИКИ</b><br>';en.innerHTML='<b>ВРАГИ</b><br>';
    GameState.units.forEach(u=>{if(u.team==='enemy'&&!u.visible&&!u.dead)return;const mk=u.flame?'🔥':(u.missile?'🚀':(u.collection?'★':''));const sp=`<span class="${u.dead?'dead':''}">${CONFIG.TIER_ROMAN[u.tier]}|${mk}${u.name}</span><br>`;if(u.team==='enemy')en.innerHTML+=sp;else al.innerHTML+=sp;});
}