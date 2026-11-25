"""Original 96-BPM instrumental & game sound design. No recordings or downloaded music."""
import wave
import numpy as np

SR, LENGTH, BEAT = 48000, 40, .625


def write_score(path):
    rng = np.random.default_rng(2601)
    mix = np.zeros((SR * LENGTH, 2), np.float32)
    tau = 2 * np.pi
    hz = lambda note: 440 * 2 ** ((note - 69) / 12)
    clock = lambda sec: np.arange(round(sec * SR), dtype=np.float64) / SR

    def lay(at, x, gain, pan=0):
        start = round(at * SR)
        stop = min(len(mix), start + len(x))
        if stop <= start:
            return
        x = x[:stop-start] * gain
        mix[start:stop, 0] += x * np.sqrt((1-pan)/2)
        mix[start:stop, 1] += x * np.sqrt((1+pan)/2)

    def grain(t, rate):
        count = int(t[-1]*rate)+2
        return np.interp(t*rate, np.arange(count), rng.uniform(-1, 1, count))

    def attack(t, a):
        return 1-np.exp(-t/a)

    def pad(at, notes, seconds, gain):
        t = clock(seconds+.38)
        env = np.minimum(1,t/.34)*np.minimum(1,np.maximum(0,(seconds+.38-t)/.52))
        for j,n in enumerate(notes):
            f = hz(n)
            phi = tau*f*t + .10*np.sin(tau*(4.6+.13*j)*t+j)
            osc = np.sin(phi) + .31*np.sin(2*phi+.3) + .14*np.sin(3*phi) + .07*np.sin(5*phi+.9)
            warmth = .76+.17*np.sin(tau*.22*t+j)
            lay(at,osc*env*warmth,gain,[-.52,.34,-.17,.59][j%4]);lay(at+.026,osc*env,gain*.18,.44-j*.21)

    def bells(at,n,gain,pan):
        t = clock(2.4); f=hz(n)
        x = attack(t,.008)*(np.sin(tau*f*t)*np.exp(-2.0*t)+.32*np.sin(tau*f*2.004*t)*np.exp(-3.5*t)+.15*np.sin(tau*f*3.013*t)*np.exp(-5*t))
        lay(at,x,gain,pan);lay(at+.19,x,gain*.19,-pan);lay(at+.405,x,gain*.085,.54)

    def pulse(at,n,gain,length,pan):
        t=clock(length); p=tau*hz(n)*t
        wavelet=(np.sin(p)+.35*np.sin(2*p+.2)+.18*np.sin(3*p)+.09*np.sin(5*p))
        env=attack(t,.018)*np.exp(-3.2*t/length)*np.minimum(1,(length-t)/.06)
        lay(at,wavelet*env,gain,pan)

    def drum(at,gain,low=50,pan=0):
        t=clock(.94);phi=tau*(low*t+2.1*(1-np.exp(-t*16)))
        x=attack(t,.004)*(np.sin(phi)*np.exp(-5*t)+.27*grain(t,480)*np.exp(-10*t)+.08*grain(t,3500)*np.exp(-24*t))
        lay(at,x,gain,pan);lay(at+.115,x,gain*.14,-.35)

    def brush(at,sec,gain):
        t=clock(sec); w=grain(t,1400)*.45+grain(t,5600)*.25+grain(t,156)*.6
        lay(at,w*(t/sec)**1.8*np.minimum(1,(sec-t)/.10),gain,.18)

    chords=[(50,57,62,64),(46,53,62,65),(48,55,60,64),(45,52,57,64),
            (50,57,62,65),(46,53,60,65),(53,60,65,69),(48,55,64,67),
            (43,50,58,62),(45,52,61,64),(46,53,62,65),(50,57,62,65),
            (46,53,62,65),(48,55,64,67),(50,57,62,65),(50,57,62,69)]
    for bar,ch in enumerate(chords):
        at=bar*2.5; pad(at,ch,2.5,.069 if bar<4 else .083)
        if 2<=bar<14:
            root=ch[0]-12
            for k in range(8):
                pos=at+k*BEAT/2
                if 22.95<pos<25.1:continue
                note=(root,root+12,root+7,root+12)[k%4]
                pulse(pos,note,.14 if k%2==0 else .071,.4,-.16 if k%2 else .11)
            for k in ([0,2.5] if bar<4 else [0,1.5,2.5,3.5]):
                if 22.6<at+k*BEAT<25.1:continue
                drum(at+k*BEAT,(.26 if k==0 else .13)*(1 if bar>=4 else .7),48+k*5)
        if bar in (0,2,4,6,11,12,14):
            for beat,n in zip([.12,1.55,2.5,3.25],[ch[2]+12,ch[1]+12,ch[3]+12,ch[2]+12]):
                bells(at+beat*BEAT,n,.112 if beat<1 else .079, np.sin(bar+beat)*.55)
    for at in (4.35,9.35,14.38,19.37,22.65,26.82,34.2):brush(at,.60,.14)
    # Undercarriage rhythm beneath the Leopard tracking shot.
    t=clock(5); lay(10,(grain(t,85)*.37+np.sin(tau*(51*t+2*t*t))*.24)*(1+.28*np.cos(tau*12*t))*np.sin(np.pi*t/5)**.55,.21,-.16)
    # One stereo downbeat, two simultaneous arcade barrel reports; echo is not a second shot.
    for pan in (-.52,.52):
        t=clock(1.55); snap=grain(t,5300)*np.exp(-19*t)+grain(t,260)*np.exp(-5.7*t)
        lay(23.75,attack(t,.002)*snap,.49,pan)
    drum(23.75,.83,38);drum(24.75,.37,60,.28);drum(27.5,.38);drum(35,.34,40)
    bells(35.06,74,.20,-.22);bells(36.25,81,.115,.29);bells(37.5,74,.115,-.35)
    # Small reflections and a soft limit keep the mix comfortable on headphones.
    for delay,gain in ((.047,.065),(.127,.045)):
        d=round(delay*SR);mix[d:]+=gain*mix[:-d,::-1]
    t=clock(LENGTH);mix*=np.minimum(1,t/.12)[:,None]*np.minimum(1,(LENGTH-t)/1.1)[:,None]
    mix=np.tanh(mix*1.15);mix*=.82/max(.01,np.max(np.abs(mix)))
    with wave.open(str(path),'wb') as f:
        f.setparams((2,2,SR,0,'NONE','not compressed'));f.writeframes(np.round(mix*32767).astype('<i2').tobytes())
