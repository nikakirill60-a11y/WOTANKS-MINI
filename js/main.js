var canvas=document.getElementById('game');
var ctx=canvas.getContext('2d');
var mCtx=document.getElementById('minimap').getContext('2d');

function update(){
  if(!GameState.gameActive||!GameState.player)return;
  if(GameState.player.dead){endBattle(false);return;}
  if(GameState.adrenalineActive&&Date.now()>GameState.adrenalineTimer){GameState.adrenalineActive=false;crewMsg("Адреналин кончился","#aaa");}
  if(GameState.fuelBoostActive&&Date.now()>GameState.fuelBoostTimer){GameState.fuelBoostActive=false;crewMsg("Топливо кончилось","#aaa");}

  var p=GameState.player;
  var baseSpd=p.trackBroken?p.baseSpeed*0.3:p.baseSpeed;
  baseSpd*=getCritMultiplier(p,'speed');
  baseSpd=applyTerrainToSpeed(p,baseSpd);
  var spd=GameState.fuelBoostActive?baseSpd*1.15:baseSpd;
  var sz=25*p.s;
  p.isMoving=false;

  if(GameState.controlMode==='pc'){
    var nx=p.x,ny=p.y;
    if(GameState.keys['KeyW']){nx+=Math.cos(p.angle)*spd;ny+=Math.sin(p.angle)*spd;p.isMoving=true;}
    if(GameState.keys['KeyS']){nx-=Math.cos(p.angle)*spd*0.6;ny-=Math.sin(p.angle)*spd*0.6;p.isMoving=true;}
    if(GameState.keys['KeyA'])p.angle-=0.04*getTerrainTurnMul(p);
    if(GameState.keys['KeyD'])p.angle+=0.04*getTerrainTurnMul(p);
    if(!tankCollides(nx,ny,p.angle,sz)){p.x=nx;p.y=ny;}else p.isMoving=false;
    applyIceDrift(p);
    if(!p.isPT)p.tAngle=Math.atan2(GameState.mouse.y-canvas.height/2,GameState.mouse.x-canvas.width/2);
    if(GameState.mouseDown)p.fire(GameState.curShell);else if(p.flame)p.flameActive=false;
  }else{
    if(GameState.joystickData.mag>0.15){
      var ta=GameState.joystickData.angle;var ad=ta-p.angle;
      while(ad>Math.PI)ad-=Math.PI*2;while(ad<-Math.PI)ad+=Math.PI*2;
      p.angle+=Math.sign(ad)*Math.min(Math.abs(ad),0.08);
      var nx2=p.x+Math.cos(p.angle)*spd*GameState.joystickData.mag;
      var ny2=p.y+Math.sin(p.angle)*spd*GameState.joystickData.mag;
      if(!tankCollides(nx2,ny2,p.angle,sz)){p.x=nx2;p.y=ny2;p.isMoving=true;}
      p.tAngle=p.angle;
    }
    if(GameState.mobileFireActive)p.fire(GameState.curShell);else if(p.flame)p.flameActive=false;
  }

  if(p.isPT)p.tAngle=p.angle;
  if(p.justFired&&Date.now()>p.fireTimer)p.justFired=false;
  if(p.flame&&p.flameActive&&Date.now()-p.lastShot>200)p.flameActive=false;

  if(p.isMoving){
    p.engineTick++;
    if(p.engineTick%5===0){smoke(p.x-Math.cos(p.angle)*22*p.s,p.y-Math.sin(p.angle)*22*p.s);snd('eng');}
    if(p.engineTick%3===0)GameState.tracks.push({x:p.x,y:p.y,a:p.angle,life:200,s:p.s,terrain:p.currentTerrain||'normal'});
  }

  GameState.cam.x=p.x-canvas.width/2;
  GameState.cam.y=p.y-canvas.height/2;
  if(GameState.shakeTimer>0){
    GameState.shakeTimer--;
    GameState.cam.x+=(Math.random()-0.5)*GameState.shakeIntensity;
    GameState.cam.y+=(Math.random()-0.5)*GameState.shakeIntensity;
  }

  updateAI();
  updateBullets();

  // Горение игрока
  if(p&&!p.dead&&p.onFire){
    if(!p.fireDmgTimer||Date.now()-p.fireDmgTimer>1000){
      var fireDmg=Math.floor(p.maxHp*0.02);
      p.hp-=fireDmg;
      p.fireDmgTimer=Date.now();
      dmgLog('🔥-'+fireDmg,'#ff4500');
      spawnParticles(p.x,p.y,'#ff4500',3,2,10);
      if(p.hp<=0){p.dead=true;boom(p.x,p.y);snd('boom');}
    }
  }

  // Горение ботов
  for(var gi=0;gi<GameState.units.length;gi++){
    var gu=GameState.units[gi];
    if(gu.dead||gu===p||!gu.onFire)continue;
    if(!gu.fireDmgTimer||Date.now()-gu.fireDmgTimer>1000){
      var fd=Math.floor(gu.maxHp*0.02);
      gu.hp-=fd;gu.fireDmgTimer=Date.now();
      spawnParticles(gu.x,gu.y,'#ff4500',2,2,8);
      if(gu.hp<=0){gu.dead=true;boom(gu.x,gu.y);snd('boom');updateScoreboard();}
    }
  }

  for(var pi2=GameState.particles.length-1;pi2>=0;pi2--){
    var pp=GameState.particles[pi2];pp.x+=pp.vx;pp.y+=pp.vy;pp.life--;
    if(pp.life<=0)GameState.particles.splice(pi2,1);
  }
  updateCasings();
  for(var ti=GameState.tracks.length-1;ti>=0;ti--){
    GameState.tracks[ti].life--;
    if(GameState.tracks[ti].life<=0)GameState.tracks.splice(ti,1);
  }

  updateHUD();

  var ea=0,aa=0;
  for(var ci=0;ci<GameState.units.length;ci++){
    if(GameState.units[ci].team==='enemy'&&!GameState.units[ci].dead)ea++;
    if(GameState.units[ci].team!=='enemy'&&!GameState.units[ci].dead)aa++;
  }
  if(ea===0&&GameState.units.length>1)endBattle(true);
  if(aa===0&&GameState.units.length>1)endBattle(false);
}

// ========== УМНЫЙ ИИ ==========
function updateAI(){
  for(var ai=0;ai<GameState.units.length;ai++){
    var u=GameState.units[ai];
    if(u.dead||u===GameState.player||u.isRemotePlayer)continue;
    
    // Инициализация ИИ параметров
    if(!u.aiState){
      u.aiState={
        coverPos:null,
        healTimer:0,
        lastDmgTime:0,
        aggroLevel:0,
        peekTimer:0,
        flanking:false,
        retreating:false,
        aimTime:0
      };
    }

    if(u.justFired&&Date.now()>u.fireTimer)u.justFired=false;
    if(u.flame&&u.flameActive&&Date.now()-u.lastShot>200)u.flameActive=false;
    var spd2=u.trackBroken?u.baseSpeed*0.3:u.baseSpeed;
    spd2*=getCritMultiplier(u,'speed');
    spd2=applyTerrainToSpeed(u,spd2);
    var sz2=25*u.s;
    var dm=Math.hypot(u.x-u.lastPos.x,u.y-u.lastPos.y);
    if(dm<0.5)u.stuckTimer++;else u.stuckTimer=0;
    u.lastPos={x:u.x,y:u.y};

    // Поиск целей
    var targets=[];
    for(var ti2=0;ti2<GameState.units.length;ti2++){
      var tgt=GameState.units[ti2];
      if(tgt.dead)continue;
      if(u.team==='enemy'&&tgt.team!=='enemy')targets.push(tgt);
      if(u.team!=='enemy'&&tgt.team==='enemy')targets.push(tgt);
    }
    
    // Фильтрация по видимости (разведка)
    targets=targets.filter(function(t){
      if(canSee(u,t))return true;
      for(var a2=0;a2<GameState.units.length;a2++){
        var ally=GameState.units[a2];
        if(ally.dead||ally===u)continue;
        if((u.team==='enemy')===(ally.team==='enemy')){
          if(canSee(ally,t))return true;
        }
      }
      return false;
    });

    // Приоритизация целей (ближайший, низкое HP, опасный)
    targets.sort(function(a,b){
      var distA=Math.hypot(a.x-u.x,a.y-u.y);
      var distB=Math.hypot(b.x-u.x,b.y-u.y);
      var scoreA=distA - (a.maxHp-a.hp)*0.5 - (a.dmg*0.3);
      var scoreB=distB - (b.maxHp-b.hp)*0.5 - (b.dmg*0.3);
      return scoreA-scoreB;
    });

    var target=targets[0];
    u.isMoving=false;

    // === ТАКТИКА ===
    var hpPercent=u.hp/u.maxHp;
    
    // Отступление при низком HP
    if(hpPercent<0.3&&!u.aiState.retreating){
      u.aiState.retreating=true;
      u.aiState.coverPos={x:u.x-Math.random()*400-200,y:u.y+(Math.random()-0.5)*300};
    }
    
    if(u.aiState.retreating&&hpPercent>0.5){
      u.aiState.retreating=false;
    }

    if(target){
      var dist=Math.hypot(target.x-u.x,target.y-u.y);
      var ta2=Math.atan2(target.y-u.y,target.x-u.x);
      var ad2=ta2-u.angle;
      while(ad2>Math.PI)ad2-=Math.PI*2;
      while(ad2<-Math.PI)ad2+=Math.PI*2;

      // === УМНОЕ ДВИЖЕНИЕ ===
      if(u.aiState.retreating){
        // Отступление к укрытию
        var retreatAngle=Math.atan2(u.aiState.coverPos.y-u.y,u.aiState.coverPos.x-u.x);
        var adRetreat=retreatAngle-u.angle;
        while(adRetreat>Math.PI)adRetreat-=Math.PI*2;
        while(adRetreat<-Math.PI)adRetreat+=Math.PI*2;
        u.angle+=Math.sign(adRetreat)*Math.min(Math.abs(adRetreat),0.08);
        
        var nx=u.x+Math.cos(u.angle)*spd2*1.3; // Быстрое отступление
        var ny=u.y+Math.sin(u.angle)*spd2*1.3;
        if(!tankCollides(nx,ny,u.angle,sz2)){
          u.x=nx;u.y=ny;u.isMoving=true;
        }
        
        // Поворот башни на врага
        u.tAngle=ta2;
        
      } else {
        // Оптимальная дистанция боя
        var optimalRange=u.flame?u.flameRange*0.7:(u.isPT?450:350);
        var rangeDiff=dist-optimalRange;
        
        // Фланговая атака для СТ/ЛТ
        if((u.cls==='lt'||u.cls==='mt')&&dist>200&&dist<600&&Math.random()<0.3){
          u.aiState.flanking=!u.aiState.flanking;
        }
        
        if(u.aiState.flanking){
          // Обход с фланга
          var flankAngle=ta2+(Math.random()>0.5?Math.PI/2:-Math.PI/2);
          var adFlank=flankAngle-u.angle;
          while(adFlank>Math.PI)adFlank-=Math.PI*2;
          while(adFlank<-Math.PI)adFlank+=Math.PI*2;
          u.angle+=Math.sign(adFlank)*0.06;
        } else {
          // Поворот корпуса
          u.angle+=Math.sign(ad2)*Math.min(Math.abs(ad2),0.06);
        }
        
        u.tAngle=ta2; // Башня всегда на цель

        // Движение вперёд/назад
        if(Math.abs(rangeDiff)>50){
          if(u.stuckTimer>30){
            u.wanderAngle=u.angle+(Math.random()>0.5?1:-1)*(Math.PI/2+Math.random());
            u.stuckTimer=0;
            u.wanderTimer=60;
          }
          
          var ma=u.wanderTimer>0?u.wanderAngle:u.angle;
          if(u.wanderTimer>0)u.wanderTimer--;
          
          // Приближение или отдаление
          var moveDir=rangeDiff>0?1:-0.6;
          var nx3=u.x+Math.cos(ma)*spd2*moveDir;
          var ny3=u.y+Math.sin(ma)*spd2*moveDir;
          
          if(!tankCollides(nx3,ny3,u.angle,sz2)){
            u.x=nx3;u.y=ny3;u.isMoving=true;
          } else {
            // Обход препятствий
            var offs=[0.4,-0.4,0.8,-0.8,1.2,-1.2];
            for(var oi=0;oi<offs.length;oi++){
              nx3=u.x+Math.cos(ma+offs[oi])*spd2*moveDir;
              ny3=u.y+Math.sin(ma+offs[oi])*spd2*moveDir;
              if(!tankCollides(nx3,ny3,u.angle,sz2)){
                u.x=nx3;u.y=ny3;u.isMoving=true;break;
              }
            }
          }
        }
      }

      // === УМНАЯ СТРЕЛЬБА ===
      var fR=u.flame?u.flameRange:700;
      var aimError=Math.abs(ad2);
      var aimThreshold=u.flame?u.flameCone*0.8:0.15;
      
      // Снижение точности при движении
      if(u.isMoving)aimThreshold*=1.5;
      
      // Прицеливание
      if(dist<fR&&aimError<aimThreshold){
        u.aiState.aimTime++;
        
        // Стрельба после прицеливания (умнее стреляют)
        if(u.aiState.aimTime>10||(u.flame&&u.aiState.aimTime>2)){
          // Выбор снаряда (ББ для тяжёлой брони, ОФ для лёгкой)
          var shellType=0;
          if(target.armor&&target.armor>100&&u.dmg>=300)shellType=2; // Подкал
          else if(target.armor<80&&u.dmg>=400)shellType=1; // ОФ
          
          u.fire(shellType);
          u.aiState.aimTime=0;
        }
      } else {
        u.aiState.aimTime=0;
        if(u.flame)u.flameActive=false;
      }
      
    } else {
      // Нет целей - движение к центру
      if(u.flame)u.flameActive=false;
      var ca=Math.atan2(-u.y,-u.x);
      var ad3=ca-u.angle;
      while(ad3>Math.PI)ad3-=Math.PI*2;
      while(ad3<-Math.PI)ad3+=Math.PI*2;
      u.angle+=Math.sign(ad3)*Math.min(Math.abs(ad3),0.04);
      u.tAngle=u.angle;
      
      var nx4=u.x+Math.cos(u.angle)*spd2*0.7;
      var ny4=u.y+Math.sin(u.angle)*spd2*0.7;
      if(!tankCollides(nx4,ny4,u.angle,sz2)){
        u.x=nx4;u.y=ny4;u.isMoving=true;
      } else {
        u.angle+=0.15;
      }
    }
    
    u.engineTick=(u.engineTick||0)+1;
    if(u.isMoving&&u.engineTick%8===0){
      GameState.tracks.push({x:u.x,y:u.y,a:u.angle,life:150,s:u.s,terrain:u.currentTerrain||'normal'});
    }
  }
}

function updateBullets(){
  for(var bi=GameState.bullets.length-1;bi>=0;bi--){
    var b=GameState.bullets[bi];
    if(b.guided&&b.team==='player'&&GameState.controlMode==='pc'){
      var targetX=GameState.mouse.x+GameState.cam.x;
      var targetY=GameState.mouse.y+GameState.cam.y;
      var desiredAngle=Math.atan2(targetY-b.y,targetX-b.x);
      var diff=desiredAngle-b.a;
      while(diff>Math.PI)diff-=Math.PI*2;
      while(diff<-Math.PI)diff+=Math.PI*2;
      b.a+=Math.sign(diff)*Math.min(Math.abs(diff),0.08);
      GameState.particles.push({x:b.x,y:b.y,vx:(Math.random()-0.5)*2,vy:(Math.random()-0.5)*2,life:15,ml:15,color:'#00ffff',sz:2});
    }
    b.x+=Math.cos(b.a)*b.speed;b.y+=Math.sin(b.a)*b.speed;
    var hit=false;
    for(var wi=0;wi<GameState.walls.length;wi++){
      var w=GameState.walls[wi];
      if(w.type==='bush'||w.type==='dune')continue;
      if(b.x>w.x&&b.x<w.x+w.w&&b.y>w.y&&b.y<w.y+w.h){
        hit=true;sparks(b.x,b.y);snd('hit');
        if(w.type==='building')damageWall(w,b.dmg,wi);
        break;
      }
    }
    if(!hit){
      for(var ui2=0;ui2<GameState.units.length;ui2++){
        var u2=GameState.units[ui2];
        var fr=(b.team===u2.team)||(b.team==='player'&&u2.team==='ally')||(b.team==='ally'&&u2.team==='player');
        if(!u2.dead&&!fr&&Math.hypot(u2.x-b.x,u2.y-b.y)<30*u2.s){
          if(checkRicochet(b.shooter,u2,b.st)&&!b.guided){
            hit=true;sparks(b.x,b.y);snd('rico');
            if(b.team==='player'){crewMsg("Рикошет!","#ff8800");if(typeof onPlayerShotResult==='function')onPlayerShotResult(false);}
            if(u2===GameState.player&&typeof onPlayerBlockedDamage==='function')onPlayerBlockedDamage(b.dmg);
            break;
          }
          var resolved=resolveHit(b,u2);
          var zoneDmg=resolved.dmg;
          u2.hp-=zoneDmg;hit=true;sparksAdvanced(b.x,b.y,b.a);spawnShellCasing(b.shooter);snd('hit');
          if(!u2.trackBroken&&Math.random()<0.1){u2.trackBroken=true;if(u2===GameState.player)crewMsg("Гусеница!","#e74c3c");}
          if(b.team==='player'){GameState.battleDmg+=zoneDmg;dmgLog('-'+Math.floor(zoneDmg)+' ('+CONFIG.ARMOR_ZONES[resolved.zone].label+')','#ff4444');crewMsg(CONFIG.CREW_MESSAGES.HIT[Math.floor(Math.random()*CONFIG.CREW_MESSAGES.HIT.length)],'#2ecc71');addCrewXP(b.shooter,Math.floor(zoneDmg*0.05));addBattlePassXP(Math.floor(zoneDmg*0.1));if(typeof onPlayerShotResult==='function')onPlayerShotResult(true);}
          if(u2===GameState.player){dmgLog('-'+Math.floor(zoneDmg),'#ff0000');GameState.shakeTimer=5;GameState.shakeIntensity=3;if(typeof onPlayerHit==='function')onPlayerHit(b.a,zoneDmg);}
          if(u2.hp<=0){u2.dead=true;boom(u2.x,u2.y);snd('boom');if(b.team==='player'){GameState.XP+=u2.tier*500;GameState.battleKills++;crewMsg(CONFIG.CREW_MESSAGES.KILL[Math.floor(Math.random()*CONFIG.CREW_MESSAGES.KILL.length)],'#f1c40f');addBattlePassXP(150);if(typeof onPlayerKill==='function')onPlayerKill(u2);}}
          updateScoreboard();break;
        }
      }
    }
    if(hit||Math.abs(b.x-GameState.player.x)>3000||Math.abs(b.y-GameState.player.y)>3000)GameState.bullets.splice(bi,1);
  }
}

function updateHUD(){
  var p=GameState.player;
  var at=document.getElementById('ammo-val');
  var now=Date.now();

  if(p.dualGun){
    for(var di=0;di<2;di++){
      if(!p.dualReady[di]&&now>=p.dualCooldowns[di])p.dualReady[di]=true;
    }
    var g1=p.dualReady[0]?'✅':'⏳';
    var g2=p.dualReady[1]?'✅':'⏳';
    var cd1='',cd2='';
    if(!p.dualReady[0]){cd1=' '+Math.max(0,Math.ceil((p.dualCooldowns[0]-now)/1000))+'с';}
    if(!p.dualReady[1]){cd2=' '+Math.max(0,Math.ceil((p.dualCooldowns[1]-now)/1000))+'с';}
    at.innerText='👑 1:'+g1+cd1+' | 2:'+g2+cd2;
    at.style.color=(p.dualReady[0]||p.dualReady[1])?'#f1c40f':'#ff4444';
  }else if(p.isReloading){
    at.innerText="ПЕРЕЗАРЯДКА...";at.style.color="#ff4444";
  }else if(p.flame){
    var pct=Math.round(p.curMag/p.magSize*100);
    at.innerText='🔥 ТОПЛИВО: '+pct+'% ['+p.curMag+'/'+p.magSize+']';
    at.style.color=p.curMag>p.magSize*0.3?"#ff4500":"#ff0000";
  }else{
    var sh=CONFIG.SHELLS[GameState.curShell];
    at.innerText=p.magSize>1?sh.name+'|'+p.curMag+'/'+p.magSize:sh.name+'|ГОТОВ';
    at.style.color=sh.color;
  }

  document.getElementById('hp-bar').style.width=Math.max(0,p.hp/p.maxHp*100)+"%";
  var sixthEl=document.getElementById('sixth-sense-lamp');
  if(sixthEl)sixthEl.style.display=checkSixthSense()?'block':'none';
  var mm=document.getElementById('minimap'),mw=mm.width,mh=mm.height;
  mCtx.fillStyle="rgba(0,0,0,.8)";mCtx.fillRect(0,0,mw,mh);
  for(var mi2=0;mi2<GameState.units.length;mi2++){
    var mu=GameState.units[mi2];
    if(mu.team==='enemy'&&!mu.visible&&!mu.dead)continue;
    mCtx.fillStyle=mu.dead?"#444":mu.team==='enemy'?"red":mu.team==='player'?"#2ecc71":"#3498db";
    var mx=mw/2+(mu.x-p.x)/40,my=mh/2+(mu.y-p.y)/40;
    if(mx>2&&mx<mw-2&&my>2&&my<mh-2)mCtx.fillRect(mx-2,my-2,4,4);
  }
  mCtx.fillStyle="#fff";mCtx.fillRect(mw/2-2,mh/2-2,4,4);
}

function draw(){
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  if(!GameState.gameActive||!GameState.player)return;
  var cam=GameState.cam;var curMap=GameState.curMap;var p=GameState.player;

  ctx.fillStyle=curMap==='desert'?'#3d3520':curMap==='field'?'#1e2e1e':'#1a1a1a';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle=curMap==='desert'?'#4a4030':curMap==='field'?'#2a3a2a':'#252525';ctx.lineWidth=1;
  var gx=Math.floor(cam.x/200)*200,gy=Math.floor(cam.y/200)*200;
  for(var x=gx;x<cam.x+canvas.width;x+=200){ctx.beginPath();ctx.moveTo(x-cam.x,0);ctx.lineTo(x-cam.x,canvas.height);ctx.stroke();}
  for(var y=gy;y<cam.y+canvas.height;y+=200){ctx.beginPath();ctx.moveTo(0,y-cam.y);ctx.lineTo(canvas.width,y-cam.y);ctx.stroke();}

  for(var tri=0;tri<GameState.tracks.length;tri++){
    var tr=GameState.tracks[tri];var al=tr.life/200;
    ctx.save();ctx.translate(tr.x-cam.x,tr.y-cam.y);ctx.rotate(tr.a);
    var trackColor=tr.terrain==='mud'?'rgba(40,30,15,':tr.terrain==='ice'?'rgba(200,230,240,':tr.terrain==='asphalt'?'rgba(20,20,20,':'rgba(60,50,30,';
    ctx.fillStyle=trackColor+(al*0.45)+')';
    ctx.fillRect(-18*tr.s,-14*tr.s,4,28*tr.s);ctx.fillRect(14*tr.s,-14*tr.s,4,28*tr.s);
    ctx.restore();
  }

  drawTerrainZones(ctx,cam);

  for(var wli=0;wli<GameState.walls.length;wli++){
    var wl=GameState.walls[wli];
    if(wl.type==='bush'){ctx.fillStyle='#3a7a2a';ctx.beginPath();ctx.arc(wl.x-cam.x+wl.w/2,wl.y-cam.y+wl.h/2,wl.w/2,0,Math.PI*2);ctx.fill();continue;}
    ctx.fillStyle=wl.color||'#333';ctx.fillRect(wl.x-cam.x,wl.y-cam.y,wl.w,wl.h);
    if(wl.type!=='dune'){ctx.strokeStyle="#222";ctx.lineWidth=2;ctx.strokeRect(wl.x-cam.x,wl.y-cam.y,wl.w,wl.h);}
    drawBuildingHealth(ctx,wl,cam);
  }

  for(var dui=0;dui<GameState.units.length;dui++){drawTankShadow(ctx,GameState.units[dui],cam);}
  for(var dui=0;dui<GameState.units.length;dui++){GameState.units[dui].draw(ctx);}
  drawCasings(ctx,cam);

  for(var bli=0;bli<GameState.bullets.length;bli++){
    var bl=GameState.bullets[bli];
    ctx.fillStyle=bl.color;ctx.beginPath();ctx.arc(bl.x-cam.x,bl.y-cam.y,4,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=0.3;ctx.strokeStyle=bl.color;ctx.lineWidth=2;ctx.beginPath();
    ctx.moveTo(bl.x-cam.x,bl.y-cam.y);ctx.lineTo(bl.x-cam.x-Math.cos(bl.a)*20,bl.y-cam.y-Math.sin(bl.a)*20);ctx.stroke();ctx.globalAlpha=1;
  }

  for(var ppi=0;ppi<GameState.particles.length;ppi++){
    var pp2=GameState.particles[ppi];var alp=pp2.life/pp2.ml;
    ctx.globalAlpha=alp;ctx.fillStyle=pp2.color;ctx.beginPath();
    ctx.arc(pp2.x-cam.x,pp2.y-cam.y,pp2.sz*alp,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;

  if(!p.dead){
    ctx.strokeStyle='rgba(100,200,100,.12)';ctx.lineWidth=1;ctx.setLineDash([5,10]);
    ctx.beginPath();ctx.arc(p.x-cam.x,p.y-cam.y,p.vr,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  }

  if(!p.dead&&p.flame){
    ctx.save();ctx.translate(p.x-cam.x,p.y-cam.y);ctx.rotate(p.isPT?p.angle:p.tAngle);
    ctx.strokeStyle='rgba(255,69,0,0.15)';ctx.fillStyle='rgba(255,69,0,0.05)';
    ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,p.flameRange,-p.flameCone,p.flameCone);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }

  if(GameState.controlMode==='mobile'){
    ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(p.tAngle);
    ctx.strokeStyle=p.flame?'#ff4500':'#e74c3c';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(50,0);ctx.lineTo(120,0);ctx.stroke();
    ctx.beginPath();ctx.arc(120,0,8,0,Math.PI*2);ctx.stroke();ctx.restore();
    if(GameState.joystickData.mag>0.15){
      ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(GameState.joystickData.angle);
      ctx.strokeStyle='rgba(46,204,113,0.5)';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(30,0);ctx.lineTo(30+GameState.joystickData.mag*40,0);ctx.stroke();
      var ax=30+GameState.joystickData.mag*40;
      ctx.beginPath();ctx.moveTo(ax-8,-6);ctx.lineTo(ax,0);ctx.lineTo(ax-8,6);ctx.stroke();ctx.restore();
    }
  }

  // Индикаторы бустеров
  var by=10;
  ctx.font='bold 11px Arial';
  if(GameState.boosters.xp>0){ctx.fillStyle='rgba(52,152,219,0.7)';ctx.fillText('⭐ XP x2 ('+GameState.boosters.xp+')',canvas.width/2-50,by);by+=15;}
  if(GameState.boosters.silver>0){ctx.fillStyle='rgba(189,195,199,0.7)';ctx.fillText('💰 ₽ x2 ('+GameState.boosters.silver+')',canvas.width/2-50,by);by+=15;}
  if(GameState.boosters.gold>0){ctx.fillStyle='rgba(241,196,15,0.7)';ctx.fillText('🪙 G x2 ('+GameState.boosters.gold+')',canvas.width/2-50,by);by+=15;}
  if(GameState.fuelBoostActive){ctx.fillStyle='rgba(241,196,15,0.8)';ctx.font='bold 12px Arial';ctx.fillText('⛽ ТУРБО!',10,canvas.height-10);}
  if(GameState.paiokActive){ctx.fillStyle='rgba(243,156,18,0.8)';ctx.font='bold 12px Arial';ctx.fillText('🍫 +5% урон',10,canvas.height-25);}
}

function gameLoop(){update();draw();requestAnimationFrame(gameLoop);}

function init(){
  updateScale();
  setupPCControls();
  setupMobileControls();
  fillTrainNatSelect();
  fillEnemySelect();
  renderTree();
  renderCarousel();
  updateResources();
  updateInvCount();
  updateBoosterUI();
  gameLoop();
  console.log('🎮 CITY TANKS! Танков:',Object.keys(DB).length);
}

init();