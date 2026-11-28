"""Original cue sheet: restrained felt keys / bass pulse, game PCM, whole voice-02 takes."""
import json, hashlib, subprocess, wave
import imageio_ffmpeg as ff
import numpy as np
from edit import HERE, END, START, SPAN, TAKES
SR=48000

def decode(path,channels):
    b=subprocess.check_output([ff.get_ffmpeg_exe(),'-loglevel','error','-i',str(path),'-ar',str(SR),'-ac',str(channels),'-f','f32le','-'])
    return np.frombuffer(b,'<f4').reshape(-1,channels)

def mix(work):
    n=END*SR;music=np.zeros((n,2),np.float32);game=np.zeros_like(music);voice=np.zeros(n,np.float32);rng=np.random.default_rng(15026)
    def tvec(d):return np.arange(round(d*SR),dtype='float32')/SR
    def fade(t,a,r):return np.minimum(1,t/max(.001,a))*np.minimum(1,(t[-1]-t)/max(.001,r))
    def add(arr,at,v,level=1,pan=0):
        pos=round(at*SR);m=min(len(v),len(arr)-pos)
        if m<1:return
        if v.ndim==1:v=v[:,None]
        arr[pos:pos+m]+=v[:m]*np.array([1-max(0,pan),1+min(0,pan)],np.float32)*level
    def note(at,midi,d,level,kind,pan=0):
        t=tvec(d);ph=2*np.pi*440*2**((midi-69)/12)*t
        if kind=='pad':v=(np.sin(ph)+.28*np.sin(ph*1.997+.25*np.sin(t*2.2))+.13*np.sin(3*ph))*fade(t,.49,.46)
        else:v=(np.sin(ph)*np.exp(-2.6*t)+.42*np.sin(2.002*ph)*np.exp(-5.5*t)+.13*np.sin(3.978*ph)*np.exp(-8*t))*fade(t,.008,.15)
        add(music,at,v,level,pan)
    # Four chords and a short descending motif. More movement under the rotating gallery;
    # the demonstrator and tiny leading/trailing handles are completely music-free.
    step=.56;bar=step*4;chords=[(50,57,62,65),(46,53,57,62),(53,60,64,69),(48,55,62,67)]
    for j,at in enumerate(np.arange(.12,END-.44,bar)):
        chord=chords[j%4];bright=at>=START['GWE100'];end=at>=START['end']
        for h,k in enumerate(chord):note(at,k,bar+.13,.045 if not end else .05,'pad',[-.43,-.1,.17,.51][h]);
        for h in ([0,3,4,7] if bright else [0,3,6]):
            note(at+h*step/2,chord[[2,1,3,0][h%4]]+(12 if h%2 else 0),1.66,.091 if h%2==0 else .057,'key',.36*np.sin(j*.61+h))
        if end:continue
        for h in ([0,2,3.5] if bright else [0,2.5]):
            t=tvec(.42);thump=np.sin(2*np.pi*(42*t+1.55*(1-np.exp(-27*t))))*np.exp(-10*t)*fade(t,.004,.06);add(music,at+h*step,thump,.17 if h==0 else .093)
        t=tvec(.20);brush=rng.normal(0,.36,len(t))*np.exp(-t*23)*fade(t,.006,.05);add(music,at+step,brush,.082,.24);add(music,at+step*3,brush,.071,-.36)
    def sound(id,channels=1):return decode(work/'foley'/(id+'.wav'),channels)
    def bed(id,at,d,g,channels=1):
        source=sound(id,channels);t=tvec(d);v=np.tile(source,(int(len(t)/len(source))+1,1))[:len(t)];add(game,at,v*fade(t,.15,.22)[:,None],g)
    bed('burgstadt',6.44,3.31,.90,2);bed('port',9.10,4.08,.93,2)
    solo=START['drive'];d=SPAN['drive'];bed('field',solo,d,.27,2);bed('engine',solo,d,.49);bed('chain',solo+1.0,2.9,.45);bed('ground',solo+1.0,2.9,.35)
    slate=json.loads((work/'rushes/drive/slate.json').read_text());assert slate['shot'] and slate['metres']>1
    add(game,solo+slate['fireFrame']/slate['fps'],sound('bigshot'),.81,.02)
    for at,id,level in [(START['open']+1.0,'service',.19),(START['wheel']+4.48,'ready',.26)]:add(game,at,sound(id),level)
    t=tvec(END);music*=np.clip(np.maximum((solo-t)/.37,(t-(solo+d))/.4),0,1)[:,None]
    manifest=json.loads((HERE/'voices.json').read_text());assert manifest['voice_id']=='voice-02'
    for i,(at,name,_) in enumerate(TAKES):
        p=HERE/'voice'/(name+'.mp3');assert hashlib.sha256(p.read_bytes()).hexdigest()==manifest['takes'][p.name],p
        v=decode(p,1).ravel();pos=round(at*SR);assert (pos+len(v))/SR<(TAKES[i+1][0] if i+1<len(TAKES) else END)
        rms=np.sqrt(np.mean(v*v));gain=min(2.6,.17/max(.001,rms));voice[pos:pos+len(v)]=v*gain
        # Smooth side-chain between phrases, with a readable bed when the narrator stops.
        tt=tvec(len(v)/SR+.54);duck=1-.65*np.minimum(1,tt/.20)*np.minimum(1,(tt[-1]-tt)/.33);begin=pos-round(.2*SR);music[begin:begin+len(tt)]*=duck[:,None]
    total=music+game+voice[:,None];total*=np.minimum(1,t/.25)[:,None]*np.minimum(1,(END-t)/1.05)[:,None]
    total=np.tanh(total*1.13);total*=.94/max(1,np.max(np.abs(total)));assert np.isfinite(total).all()
    with wave.open(str(work/'mix.wav'),'wb') as w:w.setparams((2,2,SR,0,'NONE','not compressed'));w.writeframes((total*32767).astype('<i2').tobytes())
    return work/'mix.wav'
