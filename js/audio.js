// Local sound desk. One reusable context, a bounded one-shot pool, and four continuous
// sources per live sortie. Physics never waits for audio or creates a note every tick.
const AudioSystem = (() => {
  let ctx,master,compressor,session=null,audition=null,enabled=true,volume=1,variation=0;
  const bank=new Map(),voices=new Set(),clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
  function unlock(){
    if(!enabled)return false;
    try {
      if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
        ctx=new AC();master=ctx.createGain();compressor=ctx.createDynamicsCompressor();
        compressor.threshold.value=-13;compressor.knee.value=13;compressor.ratio.value=5;compressor.release.value=.20;
        volume=clamp(GameState.settings?.volume??1,0,1);master.gain.value=volume;
        compressor.connect(master);master.connect(ctx.destination);
      }
      if(ctx.state==='suspended'||ctx.state==='interrupted')ctx.resume()?.catch(()=>{});
      return ctx.state!=='closed';
    }catch{enabled=false;return false;}
  }
  function setVolume(v){if(!Number.isFinite(v))return;volume=clamp(v,0,1);if(master)master.gain.setValueAtTime(volume,ctx.currentTime);}
  function cached(key,make){if(!bank.has(key))bank.set(key,make());return bank.get(key);}
  function panOf(source){
    const p=GameState.player;if(!p||!source||source===p)return [1,0,9700];
    const dx=(source.x-p.x)/BATTLE_UNITS_PER_METRE,dy=(source.y-p.y)/BATTLE_UNITS_PER_METRE,d=Math.hypot(dx,dy);
    if(!Number.isFinite(d)||d>470||(source.team==='enemy'&&source.visible===false))return [0,0,0];
    // Free-look can leave the gun pointing elsewhere; the overhead board has north up.
    const a=BattleView.listenerYaw??p.lookYaw??p.angle??0;return [1/(1+d/43)**1.16,clamp((dy*Math.cos(a)-dx*Math.sin(a))/Math.max(d,8),-.92,.92),1600+8000/(1+d/64)];
  }
  function finish(v){if(!voices.delete(v))return;v.src.onended=null;for(const n of v.nodes)n.disconnect();}
  function kill(v){v.src.stop();finish(v);}
  function play(type,level=1,source=null){
    if(!session||!volume||document.hidden||ctx.state!=='running')return;
    const [gain,pan,cut]=panOf(source);if(!gain)return;
    const local=!source||source===GameState.player;
    // Keep the own vehicle intelligible during a 30-actor volley.
    if(voices.size>=(local?18:14)){if(!local)return;kill([...voices].find(v=>!v.local)||voices.values().next().value);}
    const buf=cached(type,()=>SectorFoley.effect(ctx,type));if(!buf)return;
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain(),p=ctx.createStereoPanner?.();
    src.buffer=buf;src.playbackRate.value=.945+((++variation*29)%101)*.0011;
    filter.type='lowpass';filter.frequency.value=cut;filter.Q.value=.56;g.gain.value=clamp(level,0,1)*gain*.73;
    src.connect(filter);filter.connect(g);if(p){p.pan.value=pan;g.connect(p);p.connect(session.bus);p.connect(session.echo);}else{g.connect(session.bus);g.connect(session.echo);}
    const v={src,nodes:[src,filter,g,...(p?[p]:[])],local};voices.add(v);src.onended=()=>finish(v);src.start();
  }
  let lastAirKey='',lastAir;
  function airBuffer(id,weather){const key=id+':'+weather;if(key!==lastAirKey){lastAir=SectorFoley.ambience(ctx,id,weather);lastAirKey=key;}return lastAir;}
  function layer(buffer,gain,to,filterHz){
    const src=ctx.createBufferSource(),amp=ctx.createGain(),filter=ctx.createBiquadFilter();src.loop=true;src.buffer=buffer;
    amp.gain.value=gain;filter.type='lowpass';filter.frequency.value=filterHz;filter.Q.value=.5;
    src.connect(filter);filter.connect(amp);amp.connect(to);src.start();return {src,amp,filter};
  }
  function stopLayer(l){l.src.stop();l.src.disconnect();l.amp.disconnect();l.filter.disconnect();}
  function stopPreview(){if(!audition)return;const {src,amp,done}=audition;audition=null;src.onended=null;src.stop();src.disconnect();amp.disconnect();done?.();}
  function preview(id,done){
    stopPreview();if(session||!unlock()||document.hidden||!volume)return;
    const src=ctx.createBufferSource(),amp=ctx.createGain(),now=ctx.currentTime;
    src.buffer=airBuffer(id,'clear');src.connect(amp);amp.connect(compressor);
    amp.gain.setValueAtTime(0,now);amp.gain.linearRampToValueAtTime(.65,now+.22);amp.gain.setValueAtTime(.65,now+4.0);amp.gain.linearRampToValueAtTime(0,now+4.5);
    audition={src,amp,done};src.onended=()=>{audition=null;src.disconnect();amp.disconnect();done?.();};src.start();src.stop(now+4.5);return true;
  }
  function stop(){stopPreview();for(const v of voices)kill(v);if(!session)return;
    const {layers,bus,echo,soft,send}=session;session=null;for(const l of layers)stopLayer(l);
    // Discard the echo line as well, so a previous sector cannot ring into the next one.
    for(const n of [bus,echo,soft,send])n.disconnect();
  }
  function enter(){
    stop();if(document.hidden||!GameState.arena||!unlock())return;
    const id=GameState.arena.id,bus=ctx.createGain(),echo=ctx.createDelay(.6),soft=ctx.createBiquadFilter(),send=ctx.createGain();
    const urban=['city','burgstadt','port'].includes(id),bowl=['desert','quarry'].includes(id);
    echo.delayTime.value=urban ? .11:bowl ? .29:.18;soft.type='lowpass';soft.frequency.value=urban?2200:1350;send.gain.value=urban ? .22:bowl ? .17:.075;
    bus.connect(compressor);echo.connect(soft);soft.connect(send);send.connect(bus);
    const layers=['engine','chain','grit'].map(k=>layer(cached(k,()=>SectorFoley.motor(ctx,k)),0,bus,5900));
    layers.push(layer(airBuffer(id,WeatherEngine.currentWeather),0,bus,8400));layers[3].amp.gain.setTargetAtTime(.32,ctx.currentTime,.23);
    session={bus,echo,soft,send,layers,next:-1};motion();
  }
  function motion(){
    const p=GameState.player,s=session;if(!s||!p||ctx.currentTime<s.next)return;
    const n=ctx.currentTime;s.next=n+.060;
    const speed=Math.abs(p.speedKmh||0),rated=DB[p.id]?.speed||40,travel=clamp(speed/rated,0,1),
      pivot=clamp(Math.abs(p.yawRate||0),0,1),load=clamp(Math.abs(p.accel||0)/2.8+Math.abs(p.groundPitch||0)*2,0,1),
      ground=p.currentTerrain,hard=['asphalt','runway','rail','timber','cobble','paving'].includes(ground),ice=ground==='ice',soft=ground==='mud'||ground==='sand',
      off=p.dead||p.engineRestartAt>BattleClock.date(),roll=p.dead||p.airborne?0:clamp(speed/16+pivot*.52,0,1),heavy=['ht','spg'].includes(DB[p.id]?.cls);
    const [motor,chain,grit]=s.layers;
    const tune=(param,value)=>param.setTargetAtTime(value,n,.085);
    tune(motor.src.playbackRate,(heavy ? .86:1.04)*(.85+travel*.88+load*.22+pivot*.12));
    tune(motor.amp.gain,off?0:.19+.11*load+.07*travel);tune(motor.filter.frequency,440+1250*travel+820*load);
    tune(chain.src.playbackRate,.47+travel*1.83+pivot*.4);tune(chain.amp.gain,(hard ? .26:soft ? .068:.145)*roll);
    tune(grit.src.playbackRate,.65+travel*.96);tune(grit.amp.gain,(ice ? .20:hard ? .075:.20)*roll);
    tune(grit.filter.frequency,ice?6100:soft?730:hard?2200:3400);
  }
  // iOS may require a fresh interaction after an external audio interruption.
  for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>{if((session||audition)&&ctx?.state!=='running')unlock();},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  return {unlock,enter,stop,motion,play,preview,stopPreview,setVolume,get context(){return ctx},get masterGain(){return master}};
})();
function snd(type,volume,source){AudioSystem.play(type,volume,source);}
