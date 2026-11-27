"""Cut the standalone 1.4 MP4, no HTML player or ZIP. Scratch outputs stay in WORK."""
import argparse
from pathlib import Path
import subprocess
from textwrap import fill
from PIL import Image,ImageDraw
import imageio_ffmpeg
from edit import FPS,SECONDS,CUTS,CHAPTERS,TEXT,TITLE,TELEGRAM
from narration import captions as speech_captions, verify_sources
from picture14 import Film, ROOT
from score import write_mix

def stamp(t):
    ms=round(t*1000);s,ms=divmod(ms,1000);m,s=divmod(s,60);h,m=divmod(m,60)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'

def captions(path,rows):
    path.write_text('\n'.join(f'{i}\n{stamp(a)} --> {stamp(b)}\n{text}\n' for i,(a,b,text) in enumerate(rows,1)),encoding='utf-8')

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('work',type=Path);p.add_argument('--boards',action='store_true');p.add_argument('--output',type=Path,default=ROOT/'CITY-TANKS-1.4-TRAILER.mp4');a=p.parse_args()
    work=a.work.resolve();verify_sources(SECONDS);film=Film(work);marks=CUTS+[(SECONDS,'')]
    if a.boards:
        d=work/'review';d.mkdir(exist_ok=True);sheet=Image.new('RGB',(4*314,((len(CUTS)+3)//4)*198),(20,35,38));draw=ImageDraw.Draw(sheet)
        for i,((start,k),(end,_)) in enumerate(zip(marks,marks[1:])):
            im=film.frame(round((start+.48*(end-start))*FPS));im.save(d/(k+'.jpg'),quality=92);im.thumbnail((310,174));x=i%4*314;y=i//4*198;sheet.paste(im,(x,y));draw.text((x+5,y+176),f'{start:g}  /  {k}',fill='white')
        sheet.save(d/'edit.jpg',quality=93);return
    mix=work/'mix.wav';sub=work/'voice.srt';desc=work/'roadbook.srt';chapters=work/'chapters.txt';tmp=work/'finished.mp4'
    write_mix(mix)  # Never trust a scratch WAV from a previous narrator or edit.
    # Two readable lines at most for a spoken phrase; the second track describes the picture.
    captions(sub,[(a,b,fill(words,46,break_long_words=False,break_on_hyphens=False)) for a,b,words in speech_captions()])
    captions(desc,[(start,end,TEXT[k]) for (start,k),(end,_) in zip(marks,marks[1:])]);points=CHAPTERS+[(SECONDS,'')]
    chapters.write_text(';FFMETADATA1\n'+''.join(f'[CHAPTER]\nTIMEBASE=1/1000\nSTART={round(s*1000)}\nEND={round(e*1000)}\ntitle={name}\n' for (s,name),(e,_) in zip(points,points[1:])),encoding='utf-8')
    cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-nostdin','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r',str(FPS),'-i','pipe:0','-i',str(mix),'-i',str(sub),'-i',str(desc),'-f','ffmetadata','-i',str(chapters),'-map','0:v','-map','1:a','-map','2:s','-map','3:s','-map_chapters','4','-map_metadata','4','-c:v','libx264','-preset','veryfast','-threads','2','-crf','19','-profile:v','high','-level:v','3.1','-g','48','-pix_fmt','yuv420p','-vf','scale=out_color_matrix=bt709','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','aac','-b:a','160k','-ar','48000','-c:s','mov_text','-disposition:s:0','0','-disposition:s:1','0','-metadata','title='+TITLE,'-metadata','artist=CITY TANKS','-metadata','comment=Telegram CITY TANKS: '+TELEGRAM,'-metadata:s:a:0','language=rus','-metadata:s:s:0','language=rus','-metadata:s:s:0','handler_name=Реплики диктора','-metadata:s:s:1','language=rus','-metadata:s:s:1','handler_name=Путевой лист — описание обновления','-movflags','+faststart','-t',str(SECONDS),str(tmp)]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    try:
        for n in range(SECONDS*FPS):
            proc.stdin.write(film.frame(n).tobytes())
            if n and n%(FPS*12)==0:print(f'{n//FPS} / {SECONDS} s',flush=True)
        proc.stdin.close()
        if proc.wait():raise RuntimeError('MP4 encode failed')
    finally:
        if proc.poll() is None:proc.kill();proc.wait()
    # Atomic replacement in the destination directory; WORK may be on another mount.
    import shutil
    dest=a.output.resolve();dest.parent.mkdir(exist_ok=True,parents=True);temp=dest.with_suffix('.partial.mp4');shutil.copyfile(tmp,temp);temp.replace(dest)
    print(f'{dest.name}: {dest.stat().st_size:,} bytes, {SECONDS} s',flush=True)

if __name__=='__main__':main()
