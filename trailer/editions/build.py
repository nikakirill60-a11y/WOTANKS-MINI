"""Build either standalone trailer from the two units' rushes, score and spoken takes."""
import argparse
from pathlib import Path
import json
import subprocess
import sys
from PIL import Image, ImageDraw
import imageio_ffmpeg

HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE.parent))
from theatre import render
from cuts import FPS,MOVIES
from picture import Picture,LENS,OLD
from mix import soundtrack


def main():
    p=argparse.ArgumentParser();p.add_argument('edition',choices=MOVIES);p.add_argument('work',type=Path);p.add_argument('first_unit',type=Path,help='Directory from trailer/capture.cjs');p.add_argument('--stills',action='store_true');p.add_argument('--sound-only',action='store_true');p.add_argument('--package-only',action='store_true');p.add_argument('--output-dir',type=Path,default=HERE.parent.parent);a=p.parse_args()
    meta=MOVIES[a.edition];out=a.work/a.edition;out.mkdir(exist_ok=True,parents=True);movie=out/'film.mp4';poster=out/'poster.webp';score=out/'score.wav';archive=a.output_dir/meta['file']
    if a.package_only:render(out,archive,meta,movie,poster);return
    if a.sound_only:soundtrack(meta,score);return
    pic=Picture(a.work,a.first_unit,meta,a.stills);frames=FPS*meta['seconds']
    pic.poster().save(poster,'WEBP',quality=90,method=5)
    if a.stills:
        times=[(round((b*.52+c*.48)*FPS),k) for (b,k),(c,_) in zip(meta['cuts'],meta['cuts'][1:]+[(meta['seconds'],'end')])];sheet=Image.new('RGB',(390*3,242*((len(times)+2)//3)),(11,20,26));d=ImageDraw.Draw(sheet)
        for q,(n,k) in enumerate(times):
            im=pic.frame(n);im.save(out/f'edit-{k}.jpg',quality=92);im.thumbnail((384,216));x=q%3*390;y=q//3*242;sheet.paste(im,(x,y));d.text((x+4,y+218),f'{n/FPS:.1f} s / {k}',fill='white')
        sheet.save(out/'board.jpg',quality=92);return
    names=['team','salvo','drive','carrier','scope'] if a.edition=='update' else ['team','cradle','debut','first','scout','foundry','tiger','titan','summit']
    for k in names:
        if set(pic.files.get(k,{}))!=set(range(LENS[k])):raise ValueError(f'Incomplete shot {k}, need {LENS[k]} numbered real frames')
    def note(key):return json.loads(((a.first_unit if key in OLD else a.work)/'frames'/key/'notes.json').read_text())
    if a.edition=='update':
        receipt=note('scope');assert receipt['sight']=='artillery' and receipt['before']==4 and receipt['ready'] and receipt['damage']>0;assert len(note('salvo')['volley'])==2 and note('salvo')['damage']==880
    else:assert note('first')['next']['id']=='T26' and note('summit')['shot']==99
    soundtrack(meta,score)
    cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-nostdin','-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r',str(FPS),'-i','pipe:0','-i',str(score),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','veryfast','-profile:v','high','-level:v','3.1','-threads','2','-crf','20','-pix_fmt','yuv420p','-g','48','-c:a','aac','-ar','48000','-b:a','160k','-movflags','+faststart','-t',str(meta['seconds']),'-metadata','title=CITY TANKS — '+meta['title'],str(movie)]
    enc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    try:
        for i in range(frames):
            enc.stdin.write(pic.frame(i).tobytes())
            if i and i%480==0:print(a.edition,f'{i/FPS:.0f}/{meta["seconds"]} s',flush=True)
        enc.stdin.close()
        if enc.wait():raise RuntimeError('Encoding failed')
    finally:
        if enc.poll() is None:enc.kill();enc.wait()
    render(out,archive,meta,movie,poster)

if __name__=='__main__':main()
