"""Assemble the 1.5 film; do not replace any previously published game or film."""
import argparse, shutil, subprocess, textwrap
from PIL import Image,ImageDraw
import imageio_ffmpeg as ff
from edit import ROOT, W,H,FPS,END,TITLE,CUTS,SPAN,CHAPTERS,captions
from sound import mix
from visual import Film
from pathlib import Path

def stamp(t):
    ms=round(1000*t);s,ms=divmod(ms,1000);m,s=divmod(s,60);h,m=divmod(m,60);return f'{h:02}:{m:02}:{s:02},{ms:03}'

def assemble(work,output,boards=False):
    film=Film(work)
    if boards:
        sheet=Image.new('RGB',(4*332,((len(CUTS)+3)//4)*207),(20,31,35));draw=ImageDraw.Draw(sheet)
        for j,(s,k) in enumerate(CUTS):
            im=film.frame(round((s+.53*SPAN[k])*FPS));im.save(work/f'review-{k}.jpg',quality=92);im.thumbnail((326,183));x=j%4*332;y=j//4*207;sheet.paste(im,(x,y));draw.text((x+5,y+184),f'{s:05.1f} / {k}',fill='white')
        sheet.save(work/'edit.jpg',quality=92);return
    mix(work);subs=work/'speech.srt';meta=work/'chapters.txt'
    subs.write_text('\n'.join(f'{j}\n{stamp(a)} --> {stamp(b)}\n'+textwrap.fill(s,44,break_long_words=False,break_on_hyphens=False)+'\n' for j,(a,b,s) in enumerate(captions(),1)),encoding='utf-8')
    meta.write_text(';FFMETADATA1\n'+''.join(f'[CHAPTER]\nTIMEBASE=1/1000\nSTART={round(s*1000)}\nEND={round(e*1000)}\ntitle={k}\n' for (s,k),(e,_) in zip(CHAPTERS,CHAPTERS[1:]+[(END,'')])),encoding='utf-8');tmp=work/'finished.mp4'
    cmd=[ff.get_ffmpeg_exe(),'-loglevel','error','-nostdin','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-i',str(work/'mix.wav'),'-i',str(subs),'-f','ffmetadata','-i',str(meta),'-map','0:v','-map','1:a','-map','2:s','-map_chapters','3','-map_metadata','3','-c:v','libx264','-preset','veryfast','-threads','2','-crf','18','-profile:v','high','-level:v','3.1','-g','48','-pix_fmt','yuv420p','-vf','scale=out_color_matrix=bt709','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','aac','-b:a','160k','-ar','48000','-c:s','mov_text','-disposition:s:0','0','-metadata:s:a:0','language=rus','-metadata:s:s:0','language=rus','-metadata:s:s:0','handler_name=Реплики диктора','-metadata','title='+TITLE,'-metadata','artist=CITY TANKS','-movflags','+faststart','-t',str(END),str(tmp)]
    p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    try:
        for n in range(FPS*END):
            p.stdin.write(film.frame(n).tobytes())
            if n and not n%(15*FPS):print(n//FPS,'/',END,'s',flush=True)
        p.stdin.close();assert p.wait()==0,'FFmpeg encode failed'
    finally:
        if p.poll() is None:p.kill();p.wait()
    output=output.resolve();output.parent.mkdir(exist_ok=True,parents=True);partial=output.with_suffix('.partial.mp4');shutil.copyfile(tmp,partial);partial.replace(output);print(output.name,output.stat().st_size,'bytes')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('work',type=Path);p.add_argument('--boards',action='store_true');p.add_argument('--output',type=Path,default=ROOT/'CITY-TANKS-1.5-TRAILER.mp4');a=p.parse_args();assemble(a.work.resolve(),a.output,a.boards)
