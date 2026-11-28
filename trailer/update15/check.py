"""Check the distributed file, including every spoken phrase against the approved-ID takes."""
import hashlib,json,re,subprocess,sys
from pathlib import Path
import numpy as np
import imageio_ffmpeg as ff
from edit import ROOT,HERE,END,FPS,TITLE,CHAPTERS,TAKES,captions,CUTS,SPAN,START
F=ff.get_ffmpeg_exe();SR=24000

def read(*args):return subprocess.check_output([F,'-nostdin','-v','error',*map(str,args)])
def mono(path):return np.frombuffer(read('-i',path,'-map','0:a:0','-ar',SR,'-ac',1,'-f','f32le','pipe:1'),'<f4')
def ms(word):
    h,m,s,z=map(int,re.split('[:,]',word));return ((h*60+m)*60+s)*1000+z

def check(master):
    manifest=json.loads((HERE/'voices.json').read_text());assert manifest['voice_id']=='voice-02' and manifest['language']=='ru'
    assert hashlib.sha256((HERE.parent/'voices/ru-narrator/reference.mp3').read_bytes()).hexdigest()==manifest['reference_sha256']
    listing=subprocess.run([F,'-hide_banner','-i',str(master)],capture_output=True,text=True).stderr
    for s in ('h264 (High)','1280x720','24 fps','Audio: aac','48000 Hz, stereo','Реплики диктора'):assert s in listing,s
    meta=read('-i',master,'-f','ffmetadata','pipe:1').decode();assert 'title='+TITLE in meta
    records=re.findall(r'\[CHAPTER\]\nTIMEBASE=(\d+)/(\d+)\nSTART=(\d+)\nEND=(\d+)\ntitle=([^\n]+)',meta);assert len(records)==len(CHAPTERS)
    for (a,b,s,e,k),(start,name),(end,_) in zip(records,CHAPTERS,CHAPTERS[1:]+[(END,'')]):
        assert k==name and abs(int(s)*int(a)/int(b)-start)<.001 and abs(int(e)*int(a)/int(b)-end)<.001,k
    prog=read('-progress','pipe:1','-xerror','-i',master,'-map','0:v:0','-map','0:a:0','-f','null','-').decode();assert f'frame={FPS*END}\n' in prog and 'progress=end' in prog
    subs=read('-i',master,'-map','0:s:0','-f','srt','pipe:1').decode().strip().split('\n\n');rows=captions();assert len(subs)==len(rows)
    for sub,(a,b,s) in zip(subs,rows):
        _,times,*lines=sub.splitlines();u,v=map(ms,times.split(' --> '));assert len(lines)<=2 and ' '.join(lines)==s and abs(u-a*1000)<=1.01 and abs(v-b*1000)<=1.01,sub
    audio=mono(master);assert abs(len(audio)/SR-END)<.05;quality=[]
    for at,name,cues in TAKES:
        p=HERE/'voice'/(name+'.mp3');assert hashlib.sha256(p.read_bytes()).hexdigest()==manifest['takes'][p.name];dry=mono(p);pos=round(at*SR)
        for a,b,_ in cues:
            l,r=round(a*SR),round(b*SR);ref=dry[l:r];above=np.abs(ref)>.065;assert above.sum()>.035*SR,(name,a)
            ref=ref[above];dub=audio[pos+l:pos+r][above];corr=float((dub@ref)/(np.linalg.norm(dub)*np.linalg.norm(ref)));assert corr>.86,(name,a,corr);quality.append(corr)
    solo=audio[round(START['drive']*SR):round(START['boxes']*SR)];assert np.sqrt(np.mean(solo**2))>.045
    for at,k in CUTS:
        frame=np.frombuffer(read('-ss',f'{at+.50*SPAN[k]:.4f}','-i',master,'-frames:v',1,'-vf','scale=200:112','-f','rawvideo','-pix_fmt','rgb24','pipe:1'),np.uint8);assert frame.size==200*112*3 and frame.std()>16,k
    print(f'{END} s · {FPS*END} decoded frames · {len(CHAPTERS)} chapters · {len(CUTS)} pictures · {len(subs)} synced captions.')
    print(f'{len(TAKES)} voice-02 takes verified in final AAC; minimum phrase correlation {min(quality):.4f}.')
if __name__=='__main__':check(Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'CITY-TANKS-1.5-TRAILER.mp4')
