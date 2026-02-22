class Tank{
    constructor(id,x,y,team){
        const d=DB[id];this.id=id;this.name=d.n;this.team=team;this.x=x;this.y=y;
        this.hp=d.hp;this.maxHp=d.hp;this.dmg=d.dmg;this.s=d.s;this.tier=d.tier;
        this.isPT=d.isPT||false;this.isLong=d.isLong||false;this.off=d.off||0;
        this.cls=d.cls||'mt';this.nc=d.nc||'#666';this.vr=d.vr||350;this.camo=d.camo||.2;this.armor=d.armor||0;
        this.angle=0;this.tAngle=0;this.lastShot=0;this.dead=false;
        this.magSize=d.mag||1;this.curMag=this.magSize;this.isReloading=false;
        this.reloadTime=d.reload||2500;this.baseSpeed=d.moveSpeed||2.5;
        this.isMoving=false;this.justFired=false;this.fireTimer=0;this.trackBroken=false;
        this.visible=true;this.engineTick=0;this.premium=d.premium||false;this.collection=d.collection||false;
        this.shotDelay=d.shotDelay||(this.magSize>=20?80:200);
        this.flame=d.flame||false;this.flameRange=d.flameRange||0;this.flameCone=d.flameCone||.4;
        this.flameDPS=d.flameDPS||0;this.flameActive=false;this.flameTick=0;
        this.missile=d.missile||false;
        this.stuckTimer=0;this.lastPos={x,y};this.wanderAngle=Math.random()*Math.PI*2;this.wanderTimer=0;
    }
    draw(ctx){
        const{cam}=GameState;
        if(this.team==='enemy'&&!this.dead){this.visible=teamSees(this,'player');if(!this.visible)return;}
        ctx.save();ctx.translate(this.x-cam.x,this.y-cam.y);
        if(!this.dead){
            ctx.fillStyle="#441111";ctx.fillRect(-30,-45,60,6);
            ctx.fillStyle=this.team==='enemy'?"#e74c3c":"#2ecc71";
            ctx.fillRect(-30,-45,60*(this.hp/this.maxHp),6);
            ctx.strokeStyle="#fff";ctx.lineWidth=1;ctx.strokeRect(-30,-45,60,6);
            ctx.fillStyle=this.premium?"#f1c40f":"#fff";ctx.font="bold 9px Arial";ctx.textAlign="center";
            const fi=this.flame?'🔥 ':(this.missile?'🚀 ':''),pi=this.premium&&!this.flame&&!this.missile?'★ ':'';
            ctx.fillText(`${fi}${pi}${this.name} [${CONFIG.TIER_ROMAN[this.tier]}]`,0,-50);
            if(this.trackBroken){ctx.fillStyle="#ff0";ctx.fillText("⚠",0,-60);}
        }
        ctx.save();ctx.rotate(this.angle);
        let bc=this.dead?'#333':this.team==='player'?(this.flame?'#cc3300':this.missile?'#005580':this.premium?'#ff6600':'#27ae60'):this.team==='ally'?(this.nc||'#2980b9'):'#c0392b';
        ctx.fillStyle=bc;let bW=this.isLong?80:44;
        ctx.fillRect(-bW/2*this.s,-14*this.s,bW*this.s,28*this.s);
        ctx.fillStyle="#111";ctx.fillRect(-bW/2*this.s-2,-16*this.s,(bW+4)*this.s,6*this.s);ctx.fillRect(-bW/2*this.s-2,10*this.s,(bW+4)*this.s,6*this.s);
        ctx.restore();
        if(!this.dead){
            ctx.save();ctx.translate(Math.cos(this.angle)*this.off*this.s,Math.sin(this.angle)*this.off*this.s);
            ctx.rotate(this.isPT?this.angle:this.tAngle);
            let tc2=this.team==='player'?(this.flame?'#ff4500':this.missile?'#00ccff':this.premium?'#ff8800':'#2ecc71'):this.team==='ally'?(this.nc||'#3498db'):'#e74c3c';
            ctx.fillStyle=tc2;ctx.fillRect(-10*this.s,-10*this.s,20*this.s,20*this.s);
            if(this.flame){ctx.fillStyle="#333";ctx.fillRect(5*this.s,-5*this.s,25*this.s,10*this.s);ctx.fillStyle="#ff4500";ctx.fillRect(28*this.s,-4*this.s,6*this.s,8*this.s);}
            else{ctx.fillStyle="#111";ctx.fillRect(5*this.s,-3*this.s,35*this.s,6*this.s);}
            if(this.flame&&this.flameActive&&!this.dead) this.drawFlame(ctx);
            ctx.restore();
        }
        ctx.restore();
    }
    drawFlame(ctx){
        const rng=this.flameRange,cone=this.flameCone,time=Date.now()*.01;
        for(let i=0;i<12;i++){
            const dist=30+Math.random()*rng*.9,spread=(Math.random()-.5)*cone*dist*.8;
            const sz=4+Math.random()*8*(1-dist/rng*.5),alpha=.6*(1-dist/rng);
            ctx.globalAlpha=alpha;ctx.fillStyle=`rgb(255,${Math.floor(200*(1-dist/rng))},0)`;
            ctx.beginPath();ctx.arc(dist,spread+Math.sin(time+i)*3,sz,0,Math.PI*2);ctx.fill();
        }
        for(let i=0;i<4;i++){
            const dist=rng*.5+Math.random()*rng*.6,spread=(Math.random()-.5)*cone*dist;
            ctx.globalAlpha=.15;ctx.fillStyle='#555';ctx.beginPath();ctx.arc(dist,spread+Math.sin(time*.5+i*2)*5,6+Math.random()*6,0,Math.PI*2);ctx.fill();
        }
        for(let i=0;i<5;i++){
            const dist=20+Math.random()*rng,spread=(Math.random()-.5)*cone*dist;
            ctx.globalAlpha=.8;ctx.fillStyle='#ffff00';ctx.beginPath();ctx.arc(dist,spread,1+Math.random()*2,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;
    }
    fire(shellType){
        if(this.dead||this.isReloading||Date.now()-this.lastShot<this.shotDelay)return false;
        if(this.flame)return this.fireFlame();
        shellType=shellType||0;
        const sh=CONFIG.SHELLS[shellType],fa=this.isPT?this.angle:this.tAngle;
        const tx=this.x+Math.cos(this.angle)*this.off*this.s,ty=this.y+Math.sin(this.angle)*this.off*this.s;
        
        const b = {x:tx,y:ty,a:fa,team:this.team,dmg:this.dmg*sh.dMul,speed:12*sh.sMul,color:this.missile?'#00ffff':sh.color,st:shellType,shooter:this};
        if(this.missile) {
            b.guided = true;
            b.speed = 8; // Ракеты летят чуть медленнее
            b.dmg = this.dmg; // Фикс урон
        }
        GameState.bullets.push(b);

        this.lastShot=Date.now();this.justFired=true;this.fireTimer=Date.now()+3000;this.curMag--;
        if(this.magSize>=20)snd('rapidfire');else if(this.dmg>=400)snd('bigshot');else snd('shot');
        spawnParticles(tx+Math.cos(fa)*35*this.s,ty+Math.sin(fa)*35*this.s,this.missile?'#00ccff':'#ff8800',this.magSize>=20?2:5,3,10);
        if(this===GameState.player&&this.dmg>=300){GameState.shakeTimer=10;GameState.shakeIntensity=Math.min(this.dmg/100,8);}
        if(this.curMag<=0){this.isReloading=true;const mul=(this===GameState.player&&GameState.adrenalineActive)?.5:1;setTimeout(()=>{this.curMag=this.magSize;this.isReloading=false;},this.reloadTime*mul);}
        return true;
    }
    fireFlame(){
        if(this.curMag<=0)return false;
        this.flameActive=true;this.lastShot=Date.now();this.justFired=true;this.fireTimer=Date.now()+3000;this.curMag--;
        snd('flame');
        const fa=this.isPT?this.angle:this.tAngle;
        const ox=this.x+Math.cos(this.angle)*this.off*this.s,oy=this.y+Math.sin(this.angle)*this.off*this.s;
        GameState.units.forEach(u=>{
            if(u.dead)return;
            const fr=(this.team===u.team)||(this.team==='player'&&u.team==='ally')||(this.team==='ally'&&u.team==='player');
            if(fr)return;
            const dx=u.x-ox,dy=u.y-oy,dist=Math.hypot(dx,dy);
            if(dist>this.flameRange)return;
            const at=Math.atan2(dy,dx);let ad=at-fa;while(ad>Math.PI)ad-=Math.PI*2;while(ad<-Math.PI)ad+=Math.PI*2;
            if(Math.abs(ad)>this.flameCone)return;
            const dmg=this.flameDPS*(1-dist/this.flameRange*.5);
            u.hp-=dmg;
            if(!u.trackBroken&&Math.random()<.03){u.trackBroken=true;if(u===GameState.player)crewMsg("Гусеница горит!","#ff4500");}
            if(this.team==='player'){GameState.battleDmg+=dmg;if(this.flameTick%10===0)dmgLog(`🔥-${Math.floor(dmg)}`,'#ff4500');}
            if(u===GameState.player){if(this.flameTick%10===0)dmgLog(`🔥-${Math.floor(dmg)}`,'#ff0000');GameState.shakeTimer=2;GameState.shakeIntensity=1;}
            if(this.flameTick%5===0){spawnParticles(u.x,u.y,'#ff4500',2,2,15);spawnParticles(u.x,u.y,'#ffcc00',1,1,10);}
            if(u.hp<=0){u.dead=true;boom(u.x,u.y);snd('boom');spawnParticles(u.x,u.y,'#ff4500',20,6,50);spawnParticles(u.x,u.y,'#ff0000',15,4,40);
                if(this.team==='player'){GameState.XP+=u.tier*500;GameState.battleKills++;crewMsg("🔥 Сгорел!","#ff4500");}updateScoreboard();}
        });
        this.flameTick++;
        if(this.flameTick%3===0){const fx=ox+Math.cos(fa)*30*this.s,fy=oy+Math.sin(fa)*30*this.s;spawnParticles(fx,fy,'#ff6600',3,4,12);}
        if(this.curMag<=0){this.flameActive=false;this.isReloading=true;const mul=(this===GameState.player&&GameState.adrenalineActive)?.5:1;setTimeout(()=>{this.curMag=this.magSize;this.isReloading=false;this.flameTick=0;},this.reloadTime*mul);}
        return true;
    }
}

function canSee(obs,tgt){if(obs===tgt||tgt.dead)return true;const d=Math.hypot(obs.x-tgt.x,obs.y-tgt.y);let er=(obs.vr||350)*(1-(tgt.camo||.2)*.7);if(tgt.isMoving)er*=1.3;if(tgt.justFired)er*=1.5;return d<=er;}
function teamSees(tgt,team){for(let u of GameState.units){if(u.dead)continue;const st=(team==='enemy')?(u.team==='enemy'):(u.team!=='enemy');if(st&&canSee(u,tgt))return true;}return false;}
function checkRicochet(shooter,target,st){if(!CONFIG.SHELLS[st].rico)return false;const arm=target.armor||0;if(arm<=0)return false;const ha=Math.atan2(target.y-shooter.y,target.x-shooter.x);let ad=Math.abs(ha-target.angle);while(ad>Math.PI)ad=Math.abs(ad-Math.PI*2);return Math.random()<Math.abs(Math.cos(ad))*(arm/400)*(st===2?.5:1);}
function tankCollides(x,y,angle,size){const pts=[{dx:0,dy:0},{dx:size,dy:0},{dx:-size*.8,dy:0},{dx:size*.6,dy:size*.5},{dx:size*.6,dy:-size*.5},{dx:-size*.6,dy:size*.5},{dx:-size*.6,dy:-size*.5}];for(let p of pts){const rx=x+p.dx*Math.cos(angle)-p.dy*Math.sin(angle),ry=y+p.dx*Math.sin(angle)+p.dy*Math.cos(angle);for(let w of GameState.walls){if(w.type==='bush'||w.type==='dune')continue;if(rx>w.x-5&&rx<w.x+w.w+5&&ry>w.y-5&&ry<w.y+w.h+5)return true;}}return false;}