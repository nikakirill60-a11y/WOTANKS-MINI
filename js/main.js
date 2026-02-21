const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),mCtx=document.getElementById('minimap').getContext('2d');

function update(){
    if(!GameState.gameActive||!GameState.player)return;
    if(GameState.player.dead){endBattle(false);return;}
    if(GameState.adrenalineActive&&Date.now()>GameState.adrenalineTimer){GameState.adrenalineActive=false;crewMsg("Адреналин кончился","#aaa");}
    const p=GameState.player,spd=p.trackBroken?p.baseSpeed*.3:p.baseSpeed,sz=25*p.s;
    p.isMoving=false;
    if(GameState.controlMode==='pc'){
        let nx=p.x,ny=p.y;
        if(GameState.keys['KeyW']){nx+=Math.cos(p.angle)*spd;ny+=Math.sin(p.angle)*spd;p.isMoving=true;}
        if(GameState.keys['KeyS']){nx-=Math.cos(p.angle)*spd*.6;ny-=Math.sin(p.angle)*spd*.6;p.isMoving=true;}
        if(GameState.keys['KeyA'])p.angle-=.04;if(GameState.keys['KeyD'])p.angle+=.04;
        if(!tankCollides(nx,ny,p.angle,sz)){p.x=nx;p.y=ny;}else p.isMoving=false;
        if(!p.isPT)p.tAngle=Math.atan2(GameState.mouse.y-canvas.height/2,GameState.mouse.x-canvas.width/2);
        if(GameState.mouseDown)p.fire(GameState.curShell);else if(p.flame)p.flameActive=false;
    }else{
        if(GameState.joystickData.mag>.15){const ta=GameState.joystickData.angle;let ad=ta-p.angle;while(ad>Math.PI)ad-=Math.PI*2;while(ad<-Math.PI)ad+=Math.PI*2;p.angle+=Math.sign(ad)*Math.min(Math.abs(ad),.08);const nx=p.x+Math.cos(p.angle)*spd*GameState.joystickData.mag,ny=p.y+Math.sin(p.angle)*spd*GameState.joystickData.mag;if(!tankCollides(nx,ny,p.angle,sz)){p.x=nx;p.y=ny;p.isMoving=true;}p.tAngle=p.angle;}
        if(GameState.mobileFireActive)p.fire(GameState.curShell);else if(p.flame)p.flameActive=false;
    }
    if(p.isPT)p.tAngle=p.angle;if(p.justFired&&Date.now()>p.fireTimer)p.justFired=false;
    if(p.flame&&p.flameActive&&Date.now()-p.lastShot>200)p.flameActive=false;
    if(p.isMoving){p.engineTick++;if(p.engineTick%5===0){smoke(p.x-Math.cos(p.angle)*22*p.s,p.y-Math.sin(p.angle)*22*p.s);snd('eng');}if(p.engineTick%3===0)GameState.tracks.push({x:p.x,y:p.y,a:p.angle,life:200,s:p.s});}
    GameState.cam.x=p.x-canvas.width/2;GameState.cam.y=p.y-canvas.height/2;
    if(GameState.shakeTimer>0){GameState.shakeTimer--;GameState.cam.x+=(Math.random()-.5)*GameState.shakeIntensity;GameState.cam.y+=(Math.random()-.5)*GameState.shakeIntensity;}
    updateAI();updateBullets();
    for(let i=GameState.particles.length-1;i>=0;i--){const pp=GameState.particles[i];pp.x+=pp.vx;pp.y+=pp.vy;pp.life--;if(pp.life<=0)GameState.particles.splice(i,1);}
    for(let i=GameState.tracks.length-1;i>=0;i--){GameState.tracks[i].life--;if(GameState.tracks[i].life<=0)GameState.tracks.splice(i,1);}
    updateHUD();
    const ea=GameState.units.filter(u=>u.team==='enemy'&&!u.dead).length,aa=GameState.units.filter(u=>u.team!=='enemy'&&!u.dead).length;
    if(ea===0&&GameState.units.length>1)endBattle(true);if(aa===0&&GameState.units.length>1)endBattle(false);
}

function updateAI(){
    GameState.units.forEach(u=>{
        if(u.dead||u===GameState.player)return;
        if(u.justFired&&Date.now()>u.fireTimer)u.justFired=false;
        if(u.flame&&u.flameActive&&Date.now()-u.lastShot>200)u.flameActive=false;
        const spd=u.trackBroken?u.baseSpeed*.3:u.baseSpeed,sz=25*u.s;
        const dm=Math.hypot(u.x-u.lastPos.x,u.y-u.lastPos.y);if(dm<.5)u.stuckTimer++;else u.stuckTimer=0;u.lastPos={x:u.x,y:u.y};
        let targets=GameState.units.filter(t=>!t.dead&&(u.team==='enemy'?t.team!=='enemy':t.team==='enemy'));
        targets=targets.filter(t=>canSee(u,t)||GameState.units.some(a=>!a.dead&&a!==u&&((u.team==='enemy')===(a.team==='enemy'))&&canSee(a,t)));
        const target=targets.sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y))[0];
        u.isMoving=false;
        if(target){
            const dist=Math.hypot(target.x-u.x,target.y-u.y),ta=Math.atan2(target.y-u.y,target.x-u.x);
            let ad=ta-u.angle;while(ad>Math.PI)ad-=Math.PI*2;while(ad<-Math.PI)ad+=Math.PI*2;
            u.angle+=Math.sign(ad)*Math.min(Math.abs(ad),.06);u.tAngle=u.angle;
            const engR=u.flame?u.flameRange*.8:300;
            if(dist>engR){if(u.stuckTimer>30){u.wanderAngle=u.angle+(Math.random()>.5?1:-1)*(Math.PI/2+Math.random());u.stuckTimer=0;u.wanderTimer=60;}const ma=u.wanderTimer>0?u.wanderAngle:u.angle;if(u.wanderTimer>0)u.wanderTimer--;let nx=u.x+Math.cos(ma)*spd,ny=u.y+Math.sin(ma)*spd;if(!tankCollides(nx,ny,u.angle,sz)){u.x=nx;u.y=ny;u.isMoving=true;}else{for(let off of[.4,-.4,.8,-.8,1.2,-1.2]){nx=u.x+Math.cos(ma+off)*spd;ny=u.y+Math.sin(ma+off)*spd;if(!tankCollides(nx,ny,u.angle,sz)){u.x=nx;u.y=ny;u.isMoving=true;break;}}}}
            const fR=u.flame?u.flameRange:600,fA=u.flame?u.flameCone*.8:.3;
            if(dist<fR&&Math.abs(ad)<fA)u.fire(u.flame?0:u.dmg>=400?1:0);else if(u.flame)u.flameActive=false;
        }else{
            if(u.flame)u.flameActive=false;
            const ca=Math.atan2(-u.y,-u.x);let ad=ca-u.angle;while(ad>Math.PI)ad-=Math.PI*2;while(ad<-Math.PI)ad+=Math.PI*2;
            u.angle+=Math.sign(ad)*Math.min(Math.abs(ad),.04);u.tAngle=u.angle;
            const nx=u.x+Math.cos(u.angle)*spd*.7,ny=u.y+Math.sin(u.angle)*spd*.7;
            if(!tankCollides(nx,ny,u.angle,sz)){u.x=nx;u.y=ny;u.isMoving=true;}else u.angle+=.15;
        }
        u.engineTick=(u.engineTick||0)+1;if(u.isMoving&&u.engineTick%8===0)GameState.tracks.push({x:u.x,y:u.y,a:u.angle,life:150,s:u.s});
    });
}

function updateBullets(){
    for(let i=GameState.bullets.length-1;i>=0;i--){
        const b=GameState.bullets[i];b.x+=Math.cos(b.a)*b.speed;b.y+=Math.sin(b.a)*b.speed;let hit=false;
        for(let w of GameState.walls){if(w.type==='bush'||w.type==='dune')continue;if(b.x>w.x&&b.x<w.x+w.w&&b.y>w.y&&b.y<w.y+w.h){hit=true;sparks(b.x,b.y);snd('hit');break;}}
        if(!hit){for(let u of GameState.units){const fr=(b.team===u.team)||(b.team==='player'&&u.team==='ally')||(b.team==='ally'&&u.team==='player');if(!u.dead&&!fr&&Math.hypot(u.x-b.x,u.y-b.y)<30*u.s){
            if(checkRicochet(b.shooter,u,b.st)){hit=true;sparks(b.x,b.y);snd('rico');if(b.team==='player')crewMsg("Рикошет!","#ff8800");break;}
            u.hp-=b.dmg;hit=true;sparks(b.x,b.y);snd('hit');
            if(!u.trackBroken&&Math.random()<.1){u.trackBroken=true;if(u===GameState.player)crewMsg("Гусеница!","#e74c3c");}
            if(b.team==='player'){GameState.battleDmg+=b.dmg;dmgLog(`-${Math.floor(b.dmg)}`,'#ff4444');crewMsg(CONFIG.CREW_MESSAGES.HIT[Math.floor(Math.random()*CONFIG.CREW_MESSAGES.HIT.length)],'#2ecc71');}
            if(u===GameState.player){dmgLog(`-${Math.floor(b.dmg)}`,'#ff0000');GameState.shakeTimer=5;GameState.shakeIntensity=3;}
            if(u.hp<=0){u.dead=true;boom(u.x,u.y);snd('boom');if(b.team==='player'){GameState.XP+=u.tier*500;GameState.battleKills++;crewMsg(CONFIG.CREW_MESSAGES.KILL[Math.floor(Math.random()*CONFIG.CREW_MESSAGES.KILL.length)],'#f1c40f');}}
            updateScoreboard();break;}}}
        if(hit||Math.abs(b.x-GameState.player.x)>3000||Math.abs(b.y-GameState.player.y)>3000)GameState.bullets.splice(i,1);
    }
}

function updateHUD(){
    const p=GameState.player,at=document.getElementById('ammo-val');
    if(p.isReloading){at.innerText="ПЕРЕЗАРЯДКА...";at.style.color="#ff4444";}
    else if(p.flame){const pct=Math.round(p.curMag/p.magSize*100);at.innerText=`🔥 ТОПЛИВО: ${pct}% [${p.curMag}/${p.magSize}]`;at.style.color=p.curMag>p.magSize*.3?"#ff4500":"#ff0000";}
    else{const sh=CONFIG.SHELLS[GameState.curShell];at.innerText=p.magSize>1?`${sh.name}|${p.curMag}/${p.magSize}`:`${sh.name}|ГОТОВ`;at.style.color=sh.color;}
    document.getElementById('hp-bar').style.width=Math.max(0,p.hp/p.maxHp*100)+"%";
    const mm=document.getElementById('minimap'),mw=mm.width,mh=mm.height;
    mCtx.fillStyle="rgba(0,0,0,.8)";mCtx.fillRect(0,0,mw,mh);
    GameState.units.forEach(u=>{if(u.team==='enemy'&&!u.visible&&!u.dead)return;mCtx.fillStyle=u.dead?"#444":u.team==='enemy'?"red":u.team==='player'?"#2ecc71":"#3498db";const mx=mw/2+(u.x-p.x)/40,my=mh/2+(u.y-p.y)/40;if(mx>2&&mx<mw-2&&my>2&&my<mh-2)mCtx.fillRect(mx-2,my-2,4,4);});
    mCtx.fillStyle="#fff";mCtx.fillRect(mw/2-2,mh/2-2,4,4);
}

function draw(){
    canvas.width=window.innerWidth;canvas.height=window.innerHeight;
    if(!GameState.gameActive||!GameState.player)return;
    const{cam,curMap,player:p}=GameState;
    ctx.fillStyle=curMap==='desert'?'#3d3520':curMap==='field'?'#1e2e1e':'#1a1a1a';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle=curMap==='desert'?'#4a4030':curMap==='field'?'#2a3a2a':'#252525';ctx.lineWidth=1;
    const gx=Math.floor(cam.x/200)*200,gy=Math.floor(cam.y/200)*200;
    for(let x=gx;x<cam.x+canvas.width;x+=200){ctx.beginPath();ctx.moveTo(x-cam.x,0);ctx.lineTo(x-cam.x,canvas.height);ctx.stroke();}
    for(let y=gy;y<cam.y+canvas.height;y+=200){ctx.beginPath();ctx.moveTo(0,y-cam.y);ctx.lineTo(canvas.width,y-cam.y);ctx.stroke();}
    GameState.tracks.forEach(t=>{const a=t.life/200;ctx.save();ctx.translate(t.x-cam.x,t.y-cam.y);ctx.rotate(t.a);ctx.fillStyle=`rgba(60,50,30,${a*.4})`;ctx.fillRect(-18*t.s,-14*t.s,4,28*t.s);ctx.fillRect(14*t.s,-14*t.s,4,28*t.s);ctx.restore();});
    GameState.walls.forEach(w=>{if(w.type==='bush'){ctx.fillStyle='#3a7a2a';ctx.beginPath();ctx.arc(w.x-cam.x+w.w/2,w.y-cam.y+w.h/2,w.w/2,0,Math.PI*2);ctx.fill();return;}ctx.fillStyle=w.color||'#333';ctx.fillRect(w.x-cam.x,w.y-cam.y,w.w,w.h);if(w.type!=='dune'){ctx.strokeStyle="#222";ctx.lineWidth=2;ctx.strokeRect(w.x-cam.x,w.y-cam.y,w.w,w.h);}});
    GameState.units.forEach(u=>u.draw(ctx));
    GameState.bullets.forEach(b=>{ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x-cam.x,b.y-cam.y,4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.3;ctx.strokeStyle=b.color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x-cam.x,b.y-cam.y);ctx.lineTo(b.x-cam.x-Math.cos(b.a)*20,b.y-cam.y-Math.sin(b.a)*20);ctx.stroke();ctx.globalAlpha=1;});
    GameState.particles.forEach(pp=>{const a=pp.life/pp.ml;ctx.globalAlpha=a;ctx.fillStyle=pp.color;ctx.beginPath();ctx.arc(pp.x-cam.x,pp.y-cam.y,pp.sz*a,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
    if(!p.dead){ctx.strokeStyle='rgba(100,200,100,.12)';ctx.lineWidth=1;ctx.setLineDash([5,10]);ctx.beginPath();ctx.arc(p.x-cam.x,p.y-cam.y,p.vr,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    if(!p.dead&&p.flame){ctx.save();ctx.translate(p.x-cam.x,p.y-cam.y);ctx.rotate(p.isPT?p.angle:p.tAngle);ctx.strokeStyle='rgba(255,69,0,0.15)';ctx.fillStyle='rgba(255,69,0,0.05)';ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,p.flameRange,-p.flameCone,p.flameCone);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
    if(GameState.controlMode==='mobile'){ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(p.tAngle);ctx.strokeStyle=p.flame?'#ff4500':'#e74c3c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(50,0);ctx.lineTo(120,0);ctx.stroke();ctx.beginPath();ctx.arc(120,0,8,0,Math.PI*2);ctx.stroke();ctx.restore();if(GameState.joystickData.mag>.15){ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(GameState.joystickData.angle);ctx.strokeStyle='rgba(46,204,113,0.5)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(30,0);ctx.lineTo(30+GameState.joystickData.mag*40,0);ctx.stroke();const ax=30+GameState.joystickData.mag*40;ctx.beginPath();ctx.moveTo(ax-8,-6);ctx.lineTo(ax,0);ctx.lineTo(ax-8,6);ctx.stroke();ctx.restore();}}
}

function gameLoop(){update();draw();requestAnimationFrame(gameLoop);}
function init(){updateScale();setupPCControls();setupMobileControls();fillTrainNatSelect();fillEnemySelect();renderTree();renderCarousel();updateResources();gameLoop();console.log('🎮 CITY TANKS запущен! Танков:',Object.keys(DB).length,'🔥 Огнемётных:',Object.keys(COLLECTION_DB).filter(id=>COLLECTION_DB[id].flame).length);}
init();