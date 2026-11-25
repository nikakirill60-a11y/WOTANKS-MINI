"""Two original scores, synchronised arcade effects and a centred, ducked Russian voice track."""
import subprocess
import wave
from pathlib import Path
import numpy as np
import imageio_ffmpeg

SR=48000
HERE=Path(__file__).resolve().parent

def soundtrack(meta, destination):
    epic=meta['kind']=='full'; seconds=meta['seconds']; end=seconds*SR
    music=np.zeros((end,2),np.float32);voice=np.zeros(end,np.float32);rng=np.random.default_rng(1401 if epic else 1304)
    tau=2*np.pi;beat=60/(78 if epic else 110);bar=beat*4
    def clock(d):return np.arange(max(1,int(d*SR)),dtype=np.float64)/SR
    def hz(n):return 440*2**((n-69)/12)
    def lay(s,a,g,pan=0):
        i=round(s*SR);n=min(len(a),end-i)
        if i<0 or n<=0:return
        x=a[:n]*g;music[i:i+n,0]+=x*np.sqrt((1-pan)/2);music[i:i+n,1]+=x*np.sqrt((1+pan)/2)
    def noise(t,rate):
        count=int(t[-1]*rate)+2;return np.interp(t*rate,np.arange(count),rng.uniform(-1,1,count))
    def env(t,attack,release):return np.minimum(1,t/attack)*np.minimum(1,(t[-1]-t)/release)
    def bell(s,n,g,p):
        t=clock(1.85);ph=tau*hz(n)*t;x=(1-np.exp(-t/.009))*(np.sin(ph)*np.exp(-2.3*t)+.37*np.sin(ph*2.008)*np.exp(-4*t)+.19*np.sin(ph*3.012)*np.exp(-6*t));lay(s,x,g,p);lay(s+.17,x,.17*g,-p)
    def strings(s,ns,d,g):
        t=clock(d+.19);en=env(t,.33,.35)
        for j,n in enumerate(ns):
            ph=tau*hz(n)*t+.13*np.sin(t*tau*(4.3+j*.18));drift=.35*np.sin(t*.85+j)
            x=(np.sin(ph)+.44*np.sin(ph*2+.22)+.25*np.sin(ph*3+drift)+.10*np.sin(ph*5)+.09*np.sin(ph*7)) * en*(.70+.19*np.cos(.81*t+j));p=[-.54,.33,-.15,.64][j];lay(s,x,g,p);lay(s+.025,x,.17*g,-p)
    def brass(s,n,d,g):
        t=clock(d);f=hz(n);ph=tau*f*t+.16*np.sin(t*tau*4.35);en=env(t,.19,.23)
        x=(np.sin(ph)+.48*en*np.sin(2*ph)+.21*en**2*np.sin(3*ph)+.13*np.sin(4*ph))*en;lay(s,x,g,-.19);lay(s+.027,x,g*.47,.39)
    def pulse(s,n,d,g,p):
        t=clock(d);ph=t*tau*hz(n);x=(np.sin(ph)+.29*np.sin(ph*2)+.19*np.sin(ph*4))*np.exp(-3.5*t/d)*env(t,.007,.055);lay(s,x,g,p)
    def drum(s,f,g,pan=0):
        t=clock(.88);ph=tau*(t*f+1.75*(1-np.exp(-t*22)));x=(np.sin(ph)*np.exp(-5*t)+.32*noise(t,525)*np.exp(-11*t)+.12*noise(t,3800)*np.exp(-26*t))*env(t,.002,.11);lay(s,x,g,pan);lay(s+.12,x,g*.15,-.33)
    def rise(s,d,g):
        t=clock(d);x=(.44*noise(t,3200)+.43*noise(t,650)+.19*noise(t,103))*np.power(t/d,1.6)*np.minimum(1,(t[-1]-t)/.05);lay(s,x,g,-.22);lay(s+.019,x,g*.45,.62)
    def report(s,g):
        t=clock(1.1);x=(noise(t,7200)*np.exp(-23*t)+noise(t,530)*np.exp(-8*t))*env(t,.002,.08);lay(s,x,g*.81,-.35);lay(s+.013,x,.46*g,.58);drum(s,40,g)
    roots=([50,46,53,48,43,46,48,45] if epic else [52,48,50,47,52,55,50,47]);mel=([0,7,12,10,7,3,5,7] if epic else [12,7,14,10,12,3,7,5])
    for j,s in enumerate(np.arange(0,seconds,bar)):
        if s>=seconds-2:break
        root=roots[j%len(roots)];third=3 if (j%4 in (0,3)) else 4
        amp=(.037 if s<11 else .064 if s<41 else .078) if epic else .051
        strings(s,[root,root+7,root+12,root+12+third],bar,amp)
        if epic and s>30:
            brass(s,root+mel[j%8],bar*.9,.12 if s>41 else .072);brass(s+2.5*beat,root+7+12,beat*.95,.057)
        if s>(7 if epic else 1) and s<seconds-3:
            for k in range(8):
                at=s+k*beat/2;note=root+[-12,0,-5,7,-12,-5,0,7][k]
                pulse(at,note,.55 if epic else .33,(.14 if k in (0,4) else .073)*(.8 if epic and s<20 else 1),-.2+k%3*.19)
            for k in ([0,2.5] if epic and s<31 else [0,1.5,2.5,3.5] if epic else [0,2,3.5]):drum(s+k*beat,49+2*k,.34 if k==0 else .16,.14*np.sin(j))
        if j%2==0 or not epic:
            for k,iv in ((.15,mel[j%8]),(1.65,7),(2.57,3 if j%4==0 else 10)):
                bell(s+k*beat,root+12+iv,.083 if epic else .065,.56*np.cos(k+j))
    for at,key in meta['cuts'][1:]:
        d=(1.15 if epic else .52);rise(at-d,d,.19 if epic else .125)
    if epic:
        # Musical negative space before the reveal; engines and impacts are sound design, not recordings.
        for left,right in ((0,5),(40.7,42.28)):
            a=round(left*SR);b=round(right*SR);music[a:b]*=np.linspace(.23,.54,b-a,dtype='float32')[:,None]
        for start,d,power in [(7,4,.15),(21,4.4,.16),(31,3,.18),(42.3,7.8,.26)]:
            t=clock(d);x=(noise(t,95)*.64+.36*np.sin(tau*(43*t+.7*t*t)))*(1+.23*np.cos(10*tau*t))*env(t,.25,.48);lay(start,x,power,-.21)
        for at,g in ((13.15,.45),(15.76,.50),(63.36,.85)):report(at,g)
        for at,f,g in [(6.25,41,.65),(42.28,32,.78),(58.5,43,.65),(64.2,58,.49),(66.75,37,.86),(71.5,43,.48)]:drum(at,f,g)
        bell(77,74,.16,.35);bell(79,81,.10,-.42);bell(81,74,.16,-.1)
    else:
        for at,g in ((15.66,.54),(65.34,.73)):report(at,g)
        for at in (17.75,36.5,57.5,76.25,91.5,101.75):drum(at,44,.47)
        for j in range(3):pulse(78.65+j*.58,59+j*2,.32,.18,-.2+j*.20)
        bell(102.2,76,.13,.27);bell(103.8,83,.11,-.3)
    for ds,g in ((.063,.082),(.153,.042)):
        delay=round(SR*ds);music[delay:]+=music[:-delay,::-1]*g
    for when,name in meta['voice']:
        cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-nostdin','-loglevel','error','-i',str(HERE/'voice'/f'{name}.mp3'),'-af','highpass=f=65','-ac','1','-ar',str(SR),'-f','f32le','pipe:1']
        a=np.frombuffer(subprocess.check_output(cmd),'<f4');active=a[np.abs(a)>.015];assert len(active)>SR*.2
        a=np.tanh(a*min(3,.18/max(.02,np.mean(active**2)**.5))*1.25)*.80
        i=round(when*SR);assert i+len(a)<end;voice[i:i+len(a)]+=a
    # Sidechain keyed by actual spoken phrases, not a constant volume cut on the whole film.
    block=960;power=np.sqrt(np.mean(voice.reshape(-1,block)**2,axis=1));key=np.convolve(np.minimum(1,power/.061),np.ones(13)/13,'same');duck=np.interp(np.arange(end)/block,np.arange(len(key)),key).astype('float32')
    music*=((.98 if epic else .90)-.72*duck)[:,None];music+=voice[:,None];music=np.tanh(music*1.18)
    fade=round(1.4*SR);music[-fade:]*=np.linspace(1,0,fade,dtype='float32')[:,None];music[:SR//6]*=np.linspace(0,1,SR//6,dtype='float32')[:,None];music*=.86/max(.13,float(np.max(np.abs(music))))
    with wave.open(str(destination),'wb') as w:w.setparams((2,2,SR,0,'NONE','not compressed'));w.writeframes(np.round(music*32767).astype('<i2').tobytes())
