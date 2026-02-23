function setupWalls(mt){
    GameState.walls=[];
    if(mt==='city')for(let r=0;r<5;r++)for(let c=0;c<5;c++)GameState.walls.push({x:-400+c*500,y:-1000+r*500,w:100,h:100,type:'building',color:'#3a3a3a'});
    if(mt==='field')for(let i=0;i<8;i++)GameState.walls.push({x:-1000+Math.random()*2500,y:-1000+Math.random()*2000,w:30+Math.random()*40,h:30+Math.random()*40,type:'bush',color:'#2d5a1e'});
    if(mt==='desert')for(let i=0;i<6;i++)GameState.walls.push({x:-600+Math.random()*2000,y:-600+Math.random()*1200,w:80+Math.random()*60,h:20,type:'dune',color:'#c2a645'});
}
function startBattle(mode){
    GameState.gameActive=true;GameState.battleDmg=0;GameState.battleKills=0;GameState.curMap=document.getElementById('map-select').value;GameState.consumables=[false,false,false];GameState.adrenalineActive=false;
    document.querySelectorAll('.cons-btn').forEach(b=>{b.classList.remove('used');b.classList.add('ready');});document.querySelectorAll('.m-cons').forEach(b=>b.classList.remove('used'));
    document.getElementById('ui').style.display='none';document.getElementById('hud').style.display='block';document.getElementById('result-screen').classList.remove('show');
    if(GameState.controlMode==='mobile')document.getElementById('mobile-controls').classList.add('show');else document.getElementById('mobile-controls').classList.remove('show');
    GameState.player=new Tank(GameState.selected,-1500,0,'player');GameState.units=[GameState.player];GameState.bullets=[];GameState.particles=[];GameState.tracks=[];setupWalls(GameState.curMap);
    const pt=GameState.player.tier,valid=Object.keys(DB).filter(id=>Math.abs(DB[id].tier-pt)<=1&&!DB[id].collection);
    for(let i=0;i<mode-1;i++){const id=valid[Math.floor(Math.random()*valid.length)];GameState.units.push(new Tank(id,-1400+Math.random()*200,-500+Math.random()*1000,'ally'));}
    for(let i=0;i<mode;i++){const id=valid[Math.floor(Math.random()*valid.length)];const e=new Tank(id,1200+Math.random()*600,-500+Math.random()*1000,'enemy');e.angle=Math.PI;GameState.units.push(e);}
    updateScoreboard();
}
function startTraining(){
    GameState.gameActive=true;GameState.battleDmg=0;GameState.battleKills=0;GameState.curMap=document.getElementById('map-select').value;GameState.consumables=[false,false,false];GameState.adrenalineActive=false;
    document.querySelectorAll('.cons-btn').forEach(b=>{b.classList.remove('used');b.classList.add('ready');});document.querySelectorAll('.m-cons').forEach(b=>b.classList.remove('used'));
    const eid=document.getElementById('enemy-select').value;
    document.getElementById('ui').style.display='none';document.getElementById('hud').style.display='block';document.getElementById('result-screen').classList.remove('show');
    if(GameState.controlMode==='mobile')document.getElementById('mobile-controls').classList.add('show');else document.getElementById('mobile-controls').classList.remove('show');
    GameState.player=new Tank(GameState.selected,-500,0,'player');const enemy=new Tank(eid,500,0,'enemy');enemy.angle=Math.PI;
    GameState.units=[GameState.player,enemy];GameState.bullets=[];GameState.particles=[];GameState.tracks=[];setupWalls(GameState.curMap);updateScoreboard();
}

function endBattle(won){
    GameState.gameActive=false;
    const silver=Math.floor(GameState.battleDmg*.5+GameState.battleKills*200);
    GameState.SILVER+=silver;
    
    // === ОБНОВЛЕНИЕ КВЕСТА ===
    if(GameState.quest23 && !GameState.quest23.claimed && GameState.battleKills > 0){
        GameState.quest23.kills += GameState.battleKills;
        // Сохраняем прогресс сразу после боя
        saveProgress();
    }
    // ==========================

    document.getElementById('result-screen').classList.add('show');
    document.getElementById('result-title').innerText=won?"ПОБЕДА!":"ПОРАЖЕНИЕ";
    document.getElementById('result-title').style.color=won?"#2ecc71":"#e74c3c";
    document.getElementById('result-stats').innerHTML=`Урон: ${Math.floor(GameState.battleDmg)}<br>Фрагов: ${GameState.battleKills}<br>Серебро: +${silver}₽`;
}

function backToGarage(){
    document.getElementById('result-screen').classList.remove('show');
    document.getElementById('ui').style.display='flex';
    document.getElementById('hud').style.display='none';
    document.getElementById('mobile-controls').classList.remove('show');
    
    // Обновляем UI квеста при возвращении в ангар
    updateResources();
    if(typeof updateQuestUI === 'function') updateQuestUI();
    renderTree();
    renderCarousel();
}

function spawnParticles(x,y,color,count,speed,life){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=Math.random()*speed;GameState.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,ml:life,color,sz:2+Math.random()*3});}}
function boom(x,y){spawnParticles(x,y,'#ff6600',25,5,40);spawnParticles(x,y,'#ffcc00',15,3,30);spawnParticles(x,y,'#ff0000',10,4,35);spawnParticles(x,y,'#333',8,2,50);}
function sparks(x,y){spawnParticles(x,y,'#ffcc00',6,4,15);spawnParticles(x,y,'#fff',3,3,10);}
function smoke(x,y){GameState.particles.push({x:x+(Math.random()-.5)*5,y:y+(Math.random()-.5)*5,vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5-.3,life:30,ml:30,color:'#555',sz:4+Math.random()*4});}