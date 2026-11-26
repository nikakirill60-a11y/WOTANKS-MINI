"""Check the actual downloaded/playable MP4, including the previous narrator's waveform."""
import argparse
from pathlib import Path
import re
import struct
import subprocess
import numpy as np
import imageio_ffmpeg
from build import verify_sources
from edit import CHAPTERS,CUTS,VOICE,FPS,SECONDS,TITLE,TEXT
from score import TAKES

FF=imageio_ffmpeg.get_ffmpeg_exe()
ROOT=Path(__file__).resolve().parents[2]

def run(*args):return subprocess.check_output([FF,'-nostdin','-v','error',*map(str,args)])

def audio(file,stereo=False):
    # Use the arithmetic mean, not FFmpeg's +3 dB equal-power downmix of
    # two correlated channels. It must not manufacture over-fullscale samples.
    pan=['-af','pan=mono|c0=0.5*c0+0.5*c1'] if stereo else []
    return np.frombuffer(run('-i',file,'-map','0:a:0',*pan,'-ac','1','-ar','24000','-f','f32le','pipe:1'),'<f4')

def check(master):
    verify_sources();size=master.stat().st_size;atoms=[]
    with master.open('rb') as f:
        while f.tell()<size:
            start=f.tell();n,k=struct.unpack('>I4s',f.read(8))
            if n==1:n=struct.unpack('>Q',f.read(8))[0]
            if n==0:n=size-start
            assert 8<=n<=size-start;atoms.append(k);f.seek(start+n)
    assert atoms.index(b'moov')<atoms.index(b'mdat'),'not fast-start MP4'
    listing=subprocess.run([FF,'-hide_banner','-i',str(master)],capture_output=True,text=True).stderr
    for field in ('h264 (High)','1280x720','24 fps','Audio: aac','48000 Hz, stereo','Реплики диктора','Путевой лист — описание обновления'):
        assert field in listing,field
    meta=run('-i',master,'-f','ffmetadata','pipe:1').decode()
    assert 'title='+TITLE in meta
    chapters=re.findall(r'\[CHAPTER\]\nTIMEBASE=(\d+)/(\d+)\nSTART=(\d+)\nEND=(\d+)\ntitle=([^\n]+)',meta)
    assert len(chapters)==len(CHAPTERS),meta
    for row,(start,name),end in zip(chapters,CHAPTERS,[c[0] for c in CHAPTERS[1:]]+[SECONDS]):
        a,b,s,e,title=row;assert title==name and abs(int(s)*int(a)/int(b)-start)<.001 and abs(int(e)*int(a)/int(b)-end)<.001,row
    # Decode every picture and both channels; do not accept an intact moov with a truncated mdat.
    progress=run('-progress','pipe:1','-xerror','-i',master,'-map','0:v:0','-map','0:a:0','-f','null','-').decode()
    assert f'frame={FPS*SECONDS}\n' in progress and 'progress=end' in progress,progress[-500:]
    for i,words in [(0,[v[-1] for v in VOICE]),(1,[TEXT[k] for _,k in CUTS])]:
        text=run('-i',master,'-map',f'0:s:{i}','-c:s','srt','-f','srt','pipe:1').decode();assert all(line in text for line in words)
    result=audio(master,stereo=True);assert abs(len(result)/24000-SECONDS)<.055
    assert np.max(np.abs(result))<1 and np.std(result)>.035
    # Compare each archive edit to the clean original, sample-for-sample after AAC
    # decoding. Underlying music means it isn't bit-identical; no voice embedding or
    # 'similar-sounding' speaker can satisfy this waveform test.
    takes={n:audio(TAKES/(n+'.mp3')) for n in {v[1] for v in VOICE}};scores=[]
    for at,name,a,b,words in VOICE:
        ref=takes[name][round(a*24000):round(b*24000)];i=round(at*24000);x=result[i:i+len(ref)]
        mask=np.abs(ref)>.055;assert mask.sum()>2400,name
        z,orig=x[mask],ref[mask];cor=float(z@orig/(np.linalg.norm(z)*np.linalg.norm(orig)));scores.append(cor)
        assert cor>.86,(name,words,cor)
    for j,(s,k) in enumerate(CUTS):
        e=CUTS[j+1][0] if j+1<len(CUTS) else SECONDS
        frame=np.frombuffer(run('-ss',(s+e)/2,'-i',master,'-frames:v','1','-vf','scale=160:90','-f','rawvideo','-pix_fmt','rgb24','pipe:1'),np.uint8)
        assert len(frame)==160*90*3 and np.std(frame)>18,k
    print(f'{size:,} bytes; {SECONDS}s / {FPS*SECONDS} decoded frames; {len(CHAPTERS)} chapters; 2 Russian text tracks.')
    print(f'All {len(CUTS)} scenes present. All {len(scores)} original voice excerpts present in the final mix: minimum correlation {min(scores):.4f}.')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('master',type=Path,nargs='?',default=ROOT/'CITY-TANKS-1.4-TRAILER.mp4');check(p.parse_args().master)
