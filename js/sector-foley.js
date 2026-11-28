// Original offline foley. Render each short sound once into PCM, then let Web Audio
// resample, filter and position it. This RNG must never consume a gameplay/reward roll.
const SectorFoley = (() => {
  const rate=22050, tau=Math.PI*2;
  function rng(seed){return ()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/2147483648-1;};}
  const exp=(t,k)=>Math.exp(-t*k), sin=(hz,t)=>Math.sin(tau*hz*t);
  const strike=(t,at,hz,decay)=>t<at?0:sin(hz,t-at)*exp(t-at,decay);
  // Pitch falls during the initial impulse. The mechanical return arrives after the report.
  const reports={ rapidfire:[.43,108,37,16,.09],shot:[.94,83,30,8.5,.19],bigshot:[1.32,65,25,5.6,.31],boom:[1.6,53,23,4.6,.38] };
  const lengths={hit:.53,rico:.68,impact:.42,collapse:1.18,smoke:.86,ready:.3,signal:.52,service:.37,splash:.82,timber:.69};
  function effect(c,type){
    const r=reports[type],len=r?r[0]:lengths[type];if(!len)return null;
    const b=c.createBuffer(1,Math.ceil(len*rate),rate),d=b.getChannelData(0),rand=rng(731+type.charCodeAt(1)*39);
    let bass=0,body=0,phase=0;
    for(let i=0;i<d.length;i++){
      const t=i/rate,n=rand();bass+=(n-bass)*.035;body+=(n-body)*.23;let v=0;
      if(r){const [,high,low,decay,latch]=r,f=low+(high-low)*exp(t,16);
        phase+=tau*f/rate;const blast=body*1.5*exp(t,decay*1.35)+bass*2.1*exp(t,decay*.65);
        const click=t-latch;v=(.55*Math.sin(phase)+.14*Math.sin(2.04*phase))*exp(t,decay)+blast+.38*(n-body)*exp(t,82);
        if(click>=0)v+=(type==='boom'?bass*2.4:body*.48+.18*sin(419,click))*exp(click,type==='boom'?5:38);
        if(type==='bigshot'||type==='boom')v+=strike(t,latch+.094,82,11)*.19;
      }else if(type==='hit'||type==='rico'){
        v=.52*body*exp(t,36)+.30*strike(t,0,263,17)+.22*strike(t,.009,697,14)+.12*strike(t,.017,1231,17);
        if(type==='rico'){phase+=tau*(680+1300*exp(t,6))/rate;v+=.34*Math.sin(phase)*exp(t,7);}
        else v+=.27*strike(t,.028,131,19);
      }else if(type==='impact'||type==='collapse'||type==='splash'){
        v=(bass*2.3+.46*body)*exp(t,type==='collapse'?3.9:7)+.25*strike(t,0,67,14);
        if(type==='collapse')for(const [at,hz] of [[.09,163],[.20,91],[.28,241],[.48,179],[.61,118]])if(t>=at)v+=(.17*sin(hz,t-at)+body*.76)*exp(t-at,24);
        if(type==='splash')v+=(n-body)*.37*exp(t,4)*(.3+.7*Math.sin(t*21)**2);
      }else if(type==='timber'){
        v=.72*(n-bass)*exp(t,72)+.35*strike(t,0,172,22)+.22*strike(t,.035,294,29);
        for(const at of [.071,.14,.23])if(t>=at)v+=(.37*body+.2*(n-body))*exp(t-at,35);
        if(t>.27)v+=(1.6*bass+.23*sin(72,t-.27))*exp(t-.27,11);
      }else if(type==='smoke')v=(n-body)*.58*exp(t,5)+.35*strike(t,0,123,34);
      else if(type==='ready')v=.40*strike(t,0,343,35)+.30*strike(t,.072,526,26)+body*.4*exp(t,29);
      else if(type==='signal')v=(.33*sin(274,t)+.14*sin(410,t))*(1-exp(t,32))*exp(Math.max(0,t-.24),23);
      else v=.31*strike(t,0,493,20)+.27*strike(t,.075,739,16);
      d[i]=Math.tanh(v*1.35)*Math.min(1,t/.0025,(len-t)/.027);
    }return b;
  }
  // Copy the extra tail across the loop point (not a fade to silence every revolution).
  function loop(c,seconds,channels,seed,draw){
    const n=Math.round(seconds*rate),over=Math.min(2205,n>>3),b=c.createBuffer(channels,n,rate);
    for(let ch=0;ch<channels;ch++){
      const next=draw(ch,rng(seed+397*ch)),out=b.getChannelData(ch);
      for(let i=0;i<n+over;i++){const v=next(i/rate);if(i<n)out[i]=v;else {const j=i-n,k=j/over;out[j]=v*(1-k)+out[j]*k;}}
    }return b;
  }
  function motor(c,kind){
    return loop(c,2,1,913,(ch,rand)=>{let lp=0,slow=0;return t=>{
      const white=rand();lp+=(white-lp)*.18;slow+=(white-slow)*.037;
      if(kind==='engine'){
        const phase=t*34,beat=phase%1,wobble=1+.09*sin(4.5,t)+.05*sin(8,t);
        return wobble*(.36*sin(34,t)+.18*sin(68,t)+.11*sin(102,t)+(.32*lp+.24*sin(153,t))*exp(beat,6))+.30*slow;
      }
      const tooth=(t*18)%1,alt=1+.22*sin(3,t);
      return kind==='chain'?alt*(.34*sin(558,t)+.17*sin(881,t)+.68*lp)*exp(tooth,10)+.14*slow:
        alt*(.83*lp+.28*(white-lp))*(.34+.66*exp(tooth,2.5));
    };});
  }
  // Environments are in stereo, while UI sounds stay centred. A signature sits
  // behind the wind bed; different districts are audible even with the motor stopped.
  function ambience(c,id,weather){
    const seq=['city','field','desert','port','quarry','frost','burgstadt','cape','sawmill','airfield'];
    const ix=Math.max(0,seq.indexOf(id)),sea=id==='port'||id==='cape',storm=weather==='rain'||weather==='sandstorm';
    return loop(c,7.5,2,4129+ix*109,(ch,rand)=>{
      let low=0,mid=0,last=0,ring=0;
      return time=>{const t=time+ch*.023,n=rand();low+=(n-low)*.014;mid+=(n-mid)*.095;
        const swell=.54+.27*sin(.133,t+ix)+.16*sin(.4,t+ch*.11);
        let bed=low*(1.2+swell)+mid*(storm ? .65:.21)*swell,detail=0;
        if(sea)bed+=mid*(.13+.78*(.5+.5*sin(.27,t+.2*ch))**3);
        if(id==='city'||id==='quarry'){
          const beat=(t*(id==='quarry'?3.2:1.6))%1;detail=(.11*sin(111,t)+.19*mid)*exp(beat,11)+.031*sin(51,t)*(.5+swell);
          if(id==='city')detail+=.07*strike(t,2.1,306,3)+.05*strike(t,2.55,398,3);
        }else if(id==='burgstadt')detail=.22*strike(t,1.4,326,1.9)+.12*strike(t,1.4,792,3.4)+.14*strike(t,2.76,411,2.1);
        else if(id==='port'||id==='airfield'){
          const window=Math.max(0,1-Math.abs(t-(id==='port'?3.1:3.8))/(id==='port'?1.12:2.9));
          detail=id==='port'?window**.7*(.16*sin(103,t)+.09*sin(153.5,t)):
            window*(.12*Math.sin(tau*(76*t-1.4*t*t))+.07*mid)*(.67+.33*sin(16,t));
        }else if(id==='field'||id==='sawmill'||id==='cape'){
          for(const at of [1.12,1.39,4.83]){const q=t-at;if(q>0&&q<.32){const base=id==='cape'?730:id==='field'?1820:1350;
            detail+=.095*Math.sin(Math.PI*q/.32)**2*Math.sin(tau*(base*q+900*q*q+12*Math.sin(q*17)));}}
          if(id==='sawmill')detail+=.15*mid*(.5+.5*sin(.9,t))**5;
        }else if(id==='desert')detail=.09*mid*swell+.043*(sin(215,t)+.4*sin(323,t))*(.5+.5*sin(.17,t))**3;
        else {detail=.06*sin(137,t)*swell+.12*strike(t,3.37,769,14)+.09*strike(t,3.42,433,13);}
        if(weather==='rain'){ring=ring*.93+(n>.992 ? .21:0);detail+=(n-last)*ring;}
        if(weather==='snow'){bed=bed*.6+low*swell*1.4;detail*=.58;} // powder muffles the distant ice
        if(weather==='night'){bed=bed*.69+.03*sin(83,t)*swell;detail*=.62;} // quieter after the last shift
        if(weather==='sandstorm')detail+=(n-mid)*.16*(.5+.5*sin(.4,t))**3;
        last=n;
        return Math.tanh(bed+detail);
      };});
  }
  return {effect,motor,ambience};
})();
