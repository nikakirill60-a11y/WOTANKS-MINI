"""Score and mix the winter film around whole takes from the selected narrator.
No speech generation or network access is needed for a rebuild.
"""
import subprocess
import wave
import imageio_ffmpeg
import numpy as np
from edit import CUTS, SECONDS, AT, SPAN, KPZ_ACTION, CASE_OPEN
from narration import TAKES

SR = 48000


def write_mix(path):
    rng = np.random.default_rng(1404)
    end = SR * SECONDS
    mix = np.zeros((end, 2), np.float32)
    voice = np.zeros(end, np.float32)
    tau = np.pi * 2
    def clock(d): return np.arange(round(d*SR)) / SR
    def hz(midi): return 440*2**((midi-69)/12)
    def put(start, x, gain, pan=0):
        i=round(start*SR); n=min(len(x),end-i)
        if i<0 or n<=0: return
        y=x[:n]*gain
        mix[i:i+n,0]+=y*np.sqrt((1-pan)*.5); mix[i:i+n,1]+=y*np.sqrt((1+pan)*.5)
    def env(t, a, r): return np.minimum(1,t/a)*np.minimum(1,(t[-1]-t)/r)
    def noise(t, rate):
        n=int(t[-1]*rate)+2
        return np.interp(t*rate,np.arange(n),rng.uniform(-1,1,n))
    def pad(s,chord,d,g):
        t=clock(d+.38)
        for j,n in enumerate(chord):
            p=tau*hz(n)*t+.085*np.sin(t*tau*(4.7+.07*j));q=p+np.sin(.8*t+j)*.61
            x=(np.sin(p)+.32*np.sin(2*q)+.2*np.sin(3*p+.3)+.08*np.sin(5*q))*(.71+.12*np.cos(t*1.7+j))*env(t,.38,.55)
            loc=[-.43,.27,-.13,.58][j];put(s,x,g,loc);put(s+.028,x,g*.14,-loc)
    def pluck(s,n,g,pan=0,metal=False):
        d=2.3 if metal else .73;t=clock(d);p=tau*hz(n)*t
        x=(np.sin(p)*np.exp(-t*(2.5 if metal else 6.5))+.35*np.sin(2.005*p)*np.exp(-t*(4 if metal else 8))+.15*np.sin((3.93 if metal else 3)*p)*np.exp(-t*8))*(1-np.exp(-t/.009))*env(t,.002,.15)
        put(s,x,g,pan);put(s+.14,x,g*.15,-pan)
    def beat(s,f,g,pan=0):
        t=clock(.85);p=tau*(f*t+1.63*(1-np.exp(-t*21)))
        put(s,(np.sin(p)*np.exp(-t*6)+.24*noise(t,650)*np.exp(-t*17))*env(t,.003,.13),g,pan)
    def brush(s,d,g,up=False,pan=0):
        t=clock(d);x=.55*noise(t,4900)+.35*noise(t,980)+.2*noise(t,80)
        put(s,x*(t/d if up else np.exp(-6*t/d))*env(t,.003,.04),g,pan)
    # Distinct arrangements for the technical opening, travelling theme, lamp-lit
    # social chapter, winter break, then an eight-route reprise and a resolved chord.
    sections=[(0,AT['quarry'],100,'machine'),(AT['quarry'],AT['squad'],100,'journey'),
              (AT['squad'],AT['tree'],104,'company'),(AT['tree'],AT['fr1'],88,'winter'),
              (AT['fr1'],AT['end'],112,'fleet'),(AT['end'],SECONDS,86,'end')]
    harmony=[(50,57,62,65),(46,53,62,65),(53,60,64,69),(48,55,62,67),
             (43,50,58,62),(46,53,60,65),(48,55,64,67),(45,52,61,64)]
    for left,right,bpm,mode in sections:
        step=60/bpm;bar=4*step
        for j,s in enumerate(np.arange(left,right-.22,bar)):
            chord=harmony[j%8] if mode!='end' else (50,57,62,66)
            pad(s,chord,min(bar,right-s),.072 if mode!='winter' else .059)
            if mode=='end':
                if not j:beat(s,42,.55);pluck(s+.05,74,.16,.22,True)
                continue
            if mode!='winter':
                for k in range(8):
                    at=s+k*step/2
                    if at>right-.22 or mode=='machine' and at<1.7:continue
                    n=chord[0]-12+[0,12,7,0,12,7,0,19][k];pluck(at,n,.155 if k in (0,4) else .073,(-1)**k*.22)
                for k in ([0,2.5] if mode=='journey' else [0,1.5,2,3.5]):
                    at=s+k*step
                    if at<right-.2:beat(at,41+k*2,.30 if k==0 else .155,.1*np.sin(j+k))
                if mode in ('company','fleet'):
                    for k in (1,3):
                        if s+k*step<right-.2:brush(s+k*step,.23,.155,pan=.22)
            melody={'machine':[(.5,1),(2.5,3)],'journey':[(.2,2),(1.7,1),(2.85,3)],
                    'company':[(.5,2),(2,0)],'winter':[(0,2),(.8,3),(2.15,1),(3.2,2)],
                    'fleet':[(.5,3),(1.5,2),(2.75,1)]}[mode]
            for k,idx in melody:
                at=s+k*step
                if at>right-.27:continue
                pluck(at,chord[idx]+(12 if mode=='winter' else 0),.12 if mode=='winter' else .098,np.sin(j*.75+k)*.57,True)
    for at,k in CUTS[1:]:
        brush(at-.57,.57,.13,True,.4)
        if k in ('guide','burgstadt','squad','promo','tree','fr1','sturm'):beat(at,41,.42)
    # One real calibrated shot in this filmed take; two selector latches, not two shots.
    for i in (8,24,64,80):pluck(KPZ_ACTION+i/16,79,.13,.28)
    shot=KPZ_ACTION+38/16
    brush(shot,.47,.56,pan=-.25);beat(shot,33,.74);brush(shot+.125,.65,.19,pan=.47)
    for k,mode in [('kpz','engine'),('cape','sea'),('sawmill','leaves'),('squad','engine')]:
        s,d=AT[k],SPAN[k];t=clock(d);v=(noise(t,95)*.40+np.sin(tau*(42*t+.35*t*t))*.35)*(1+.22*np.cos(t*64)) if mode=='engine' else (noise(t,900)*.63+noise(t,3200)*.24)*(.51+.39*np.cos(1.51*t))
        put(s,v*env(t,.48,.55),.16 if mode=='engine' else .092,-.23)
    brush(CASE_OPEN,.24,.22);pluck(CASE_OPEN+.28,81,.17,.34,True);pluck(CASE_OPEN+.99,86,.11,-.27,True)
    for delay,gain in ((.042,.074),(.129,.048)):
        k=round(delay*SR);mix[k:]+=gain*mix[:-k,::-1]
    # Full, gapless-decoded sources, no time stretching or pitch change. The intro
    # is decoded straight from the approved reference, not a second performance.
    for name,take in TAKES.items():
        pcm=subprocess.check_output([imageio_ffmpeg.get_ffmpeg_exe(),'-nostdin','-v','error',
            '-i',str(take.path),'-ac','1','-ar',str(SR),'-f','f32le','pipe:1'])
        x=np.frombuffer(pcm,'<f4');assert abs(len(x)-take.duration*SR)<SR*.002,name
        active=x[np.abs(x)>.018];assert len(active)>SR*.5,name
        i=round(take.at*SR);voice[i:i+len(x)]=x*(.16/np.sqrt(np.mean(active**2)))
    # Look ahead/hold across tiny gaps between syllables, then ramp smoothly.
    # Do not let the score jump back up in the middle of the channel name.
    block=960;rms=np.sqrt(np.mean(voice.reshape(-1,block)**2,axis=1))
    busy=np.clip(np.convolve((rms>.014).astype(float),np.ones(14),'same'),0,1)
    duck=np.convolve(busy,np.ones(13)/13,'same')
    gain=np.interp(np.arange(end)/block,np.arange(len(duck)),.88-.73*duck).astype('float32')
    mix*=gain[:,None]
    mix+=voice[:,None];mix=np.tanh(mix*1.16);mix*=.84/max(.01,float(np.max(np.abs(mix))))
    k=round(1.45*SR);mix[-k:]*=np.linspace(1,0,k)[:,None];mix[:SR//10]*=np.linspace(0,1,SR//10)[:,None]
    with wave.open(str(path),'wb') as w:
        w.setparams((2,2,SR,0,'NONE','not compressed'));w.writeframes(np.round(mix*32767).astype('<i2').tobytes())
