// ========== ИНТЕРФЕЙС ==========

function crewMsg(message, color = '#fff') {
    const el = document.getElementById('crew-msg');
    el.innerText = message;
    el.style.color = color;
    el.style.opacity = 1;
    setTimeout(() => el.style.opacity = 0, 1500);
}

function dmgLog(message, color = '#fff') {
    const el = document.getElementById('dmg-log');
    const div = document.createElement('div');
    div.className = 'dmg-msg';
    div.style.color = color;
    div.innerText = message;
    el.appendChild(div);
    setTimeout(() => div.remove(), 2000);
}

function updateResources() {
    document.getElementById('xp-val').innerText = GameState.XP;
    document.getElementById('gold-val').innerText = GameState.GOLD;
    document.getElementById('silver-val').innerText = GameState.SILVER;
}

function exchangeXP() {
    if (GameState.XP >= 100) {
        GameState.XP -= 100;
        GameState.GOLD += 10;
        document.getElementById('exchange-msg').innerText = "✓";
        setTimeout(() => document.getElementById('exchange-msg').innerText = "", 1500);
        updateResources();
    }
}

function setNat(nation, btn) {
    GameState.curNat = nation;
    renderTree();
    document.querySelectorAll('.n-btn').forEach(b => b.classList.remove('active-n'));
    btn.classList.add('active-n');
}

function setShell(index) {
    GameState.curShell = index;
    document.querySelectorAll('.shell-opt').forEach((e, i) => e.classList.toggle('active', i === index));
    document.querySelectorAll('.m-shell').forEach((e, i) => e.classList.toggle('active', i === index));
}

function useCons(index) {
    if (!GameState.gameActive || !GameState.player || GameState.player.dead || GameState.consumables[index]) {
        return;
    }
    
    if (GameState.SILVER < 500) {
        crewMsg("Нет серебра!", "#e74c3c");
        return;
    }
    
    GameState.SILVER -= 500;
    GameState.consumables[index] = true;
    
    document.getElementById('cons' + (index + 1)).classList.add('used');
    document.getElementById('mcons' + (index + 1)).classList.add('used');
    
    switch(index) {
        case 0:
            GameState.player.trackBroken = false;
            crewMsg("Починено!", "#2ecc71");
            snd('hit');
            break;
        case 1:
            GameState.player.hp = Math.min(GameState.player.maxHp, GameState.player.hp + GameState.player.maxHp * 0.15);
            crewMsg("+15%HP", "#2ecc71");
            snd('hit');
            break;
        case 2:
            GameState.adrenalineActive = true;
            GameState.adrenalineTimer = Date.now() + 10000;
            crewMsg("Адреналин!", "#f39c12");
            snd('hit');
            break;
    }
}

function fillTrainNatSelect() {
    const select = document.getElementById('train-nat-select');
    select.innerHTML = '';
    
    const nations = [...new Set(Object.values(DB).map(d => d.nat))];
    nations.forEach(nat => {
        const opt = document.createElement('option');
        opt.value = nat;
        opt.innerText = CONFIG.NATIONS[nat] || nat;
        select.appendChild(opt);
    });
}

function fillEnemySelect() {
    const nat = document.getElementById('train-nat-select').value;
    const select = document.getElementById('enemy-select');
    select.innerHTML = '';
    
    Object.keys(DB)
        .filter(id => DB[id].nat === nat)
        .sort((a, b) => DB[a].tier - DB[b].tier)
        .forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.innerText = `${DB[id].n} [${CONFIG.TIER_ROMAN[DB[id].tier]}]`;
            select.appendChild(opt);
        });
}

function renderTree() {
    const nodes = document.getElementById('nodes');
    const tc = document.getElementById('tree-canvas');
    const ctx = tc.getContext('2d');
    const sc = nodeScale;
    
    nodes.innerHTML = '';
    ctx.clearRect(0, 0, tc.width, tc.height);
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2 * sc;
    
    for (let id in DB) {
        const t = DB[id];
        if (t.nat !== GameState.curNat) continue;
        
        const sx = t.x * sc;
        const sy = t.y * sc;
        
        // Линия к родителю
        if (t.p && DB[t.p]) {
            ctx.beginPath();
            ctx.moveTo(DB[t.p].x * sc + 62 * sc, DB[t.p].y * sc + 24 * sc);
            ctx.lineTo(sx, sy + 24 * sc);
            ctx.stroke();
        }
        
        // Нода танка
        const div = document.createElement('div');
        div.className = `node ${GameState.owned.includes(id) ? 'owned' : ''} ${GameState.selected === id ? 'selected' : ''} ${t.premium ? 'premium-glow' : ''}`;
        div.style.cssText = `left:${sx}px;top:${sy}px;width:${120*sc}px;height:${48*sc}px;font-size:${9*sc}px`;
        
        const cost = t.gold ? t.gold + 'G' : (t.xp !== undefined ? t.xp + 'XP' : '');
        const cls = CONFIG.TANK_CLASSES[t.cls || 'mt'] || '';
        const mag = t.mag && t.mag > 1 ? `🔄${t.mag}` : '';
        
        div.innerHTML = `<b style="color:${t.premium ? '#f1c40f' : '#fff'}">${t.premium ? '★' : ''}${t.n}</b><br><span style="color:#f1c40f">[${CONFIG.TIER_ROMAN[t.tier]}]</span> ${cls} ${mag}<br>${cost}`;
        
        div.onclick = () => {
            if (GameState.owned.includes(id)) {
                GameState.selected = id;
            } else {
                if (t.gold) {
                    if (GameState.GOLD >= t.gold) {
                        GameState.GOLD -= t.gold;
                        GameState.owned.push(id);
                        GameState.selected = id;
                    }
                } else if (t.xp !== undefined && GameState.XP >= t.xp && (!t.p || GameState.owned.includes(t.p))) {
                    GameState.XP -= t.xp;
                    GameState.owned.push(id);
                    GameState.selected = id;
                }
            }
            renderTree();
            updateResources();
        };
        
        nodes.appendChild(div);
    }
}

function updateScoreboard() {
    const allies = document.getElementById('allies-list');
    const enemies = document.getElementById('enemies-list');
    
    allies.innerHTML = '<b>СОЮЗНИКИ</b><br>';
    enemies.innerHTML = '<b>ВРАГИ</b><br>';
    
    GameState.units.forEach(u => {
        if (u.team === 'enemy' && !u.visible && !u.dead) return;
        
        const span = `<span class="${u.dead ? 'dead' : ''}">${CONFIG.TIER_ROMAN[u.tier]}|${u.name}</span><br>`;
        
        if (u.team === 'enemy') {
            enemies.innerHTML += span;
        } else {
            allies.innerHTML += span;
        }
    });
}