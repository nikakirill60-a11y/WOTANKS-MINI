"""Edit the game rushes, compose the score, then package ONE self-contained HTML.
See README.md here. No game files are written and no network access is used.
"""
import argparse
import base64
from functools import lru_cache
import json
import math
from pathlib import Path
import subprocess
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from score import write_score

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
W,H,FPS,FRAMES=1280,720,24,960
GOLD=(244,193,112); ICE=(234,243,245); MUTED=(184,205,210); INK=(9,19,27)
OSWALD=HERE/'fonts/Oswald.ttf'
RES=Image.Resampling


@lru_cache(maxsize=80)
def face(size,weight=500):
    f=ImageFont.truetype(str(OSWALD),size);f.set_variation_by_axes([weight]);return f


def label(d,xy,s,size=19,color=GOLD,space=2.1,weight=500):
    x,y=xy;f=face(size,weight)
    # 'ls' aligns all glyphs on one baseline, including digits and lowercase.
    for ch in s:
        d.text((round(x),y),ch,font=f,fill=color,anchor='ls');x+=f.getlength(ch)+space
    return x


def text(d,xy,s,size,color=ICE,weight=650,anchor='ls'):
    d.text(xy,s,font=face(size,weight),fill=color,anchor=anchor)


def ramp(t):
    t=min(1,max(0,t));return t*t*(3-2*t)


def shield(d,x,y,scale,color=GOLD):
    def points(ls):return [(round(x+a*scale),round(y+b*scale)) for a,b in ls]
    d.line(points([(0,-18),(16,-12),(16,4),(0,19),(-16,4),(-16,-12),(0,-18)]),fill=color,width=max(2,round(1.8*scale)),joint='curve')
    for n in (0,7):d.polygon(points([(-9,-7+n),(0,-3+n),(9,-7+n),(9,-3+n),(0,2+n),(-9,-3+n)]),fill=color)


def overlay(base,layer,alpha=1):
    if alpha<=0:return base
    if alpha<.999:layer.putalpha(layer.getchannel('A').point([round(i*alpha) for i in range(256)]))
    base.paste(layer,(0,0),layer);return base


Y,X=np.mgrid[0:H,0:W].astype('float32');X/=W;Y/=H
# Negative space, not a black filter across the vehicles.
EDGE=np.clip(((X-.5)**2*1.75+(Y-.51)**2*1.35-.16)*.52,0,.2)
GRADS={}
for name,a in {
    'left':.85*np.maximum(0,1-X/.65)**1.45+EDGE,
    'low':.88*np.clip((Y-.60)/.39,0,1)**1.35+EDGE,
    'top':.84*np.clip((.57-Y)/.24,0,1)*np.maximum(0,1-X/.74)**.85+EDGE,
    'last':.49+.17*(1-X)+EDGE}.items():
    GRADS[name]=Image.fromarray(np.uint8(255*np.clip(a,0,.95)))
DARK=Image.new('RGB',(W,H),INK)


def shade(im,name):return Image.composite(DARK,im,GRADS[name])


class Edit:
    def __init__(self,work,proof=False):
        self.src=work/('proof' if proof else 'frames');self.proof=proof
        self.art=Image.open(ROOT/'assets/depot-entry.webp').convert('RGB')
        self.cutouts={n:Image.open(ROOT/f'models/{n}.webp').convert('RGBA') for n in ('obj-277','kpz-67')}
        self.notes=json.loads((self.src/'salvo'/'notes.json').read_text())
        if self.notes['damage']!=880 or len(self.notes['volley'])!=2:raise ValueError('Missing genuine simultaneous ST-II capture')
        self.grade=[max(0,min(255,round((v-115)*1.075+115+s*(1-v/255)))) for s in (0,3,7) for v in range(256)]
        self.blueprints=[self.board(c) for c in [(54,60,42),(37,59,65)]]
        self.proofs={n:sorted(int(p.stem) for p in (self.src/n).glob('*.jpg')) for n in ('bay','drive','salvo','team')}

    @staticmethod
    def board(tint):
        light=np.exp(-(((X-.76)/.4)**2+((Y-.49)/.5)**2));img=np.stack([7+light*tint[0],17+light*tint[1],25+light*tint[2]],axis=2)
        im=Image.fromarray(np.uint8(img));d=ImageDraw.Draw(im,'RGBA')
        for x in range(0,W,40):d.line((x,30,x,690),fill=(200,227,236,14 if x%160==0 else 7))
        for y in range(40,H,40):d.line((0,y,W,y),fill=(200,227,236,12))
        cx,cy=932,360
        for r in (167,185,245):d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=(199,222,223,28),width=1)
        for j in range(72):
            a=math.radians(5*j);r=184-(9 if j%6==0 else 3);d.line((cx+r*math.cos(a),cy+r*math.sin(a),cx+184*math.cos(a),cy+184*math.sin(a)),fill=(238,203,146,72))
        return im

    def shot(self,n,i):
        if self.proof:i=min(self.proofs[n],key=lambda j:abs(j-i))
        with Image.open(self.src/n/f'{i:03}.jpg') as f:return f.convert('RGB').point(self.grade)

    def artframe(self,u,closing):
        zoom=(1.03+.085*u) if not closing else (1.12-.07*ramp(u));aw,ah=self.art.size;cw=aw/zoom;ch=cw*H/W
        if ch>ah:ch=ah;cw=ch*W/H
        x=(aw-cw)*.63;y=(ah-ch)*.44
        im=self.art.resize((W,H),RES.BICUBIC,box=(x,y,x+cw,y+ch))
        im=shade(im,'last' if closing else 'left');d=ImageDraw.Draw(im,'RGBA')
        for j in range(40):
            x=(j*657+17*u+7*math.sin(u*4+j))%W;y=(j*227+(95+7*j%45)*u)%H;r=1+(j%9==0)
            d.ellipse((x-r,y-r,x+r,y+r),fill=(214,238,249,65+j%67))
        return im

    def card(self,frame):
        german=frame>=60;u=(frame%60)/60;im=self.blueprints[int(german)].copy();d=ImageDraw.Draw(im)
        n='kpz-67' if german else 'obj-277';ico=self.cutouts[n];w=round(704+18*u);h=round(w*ico.height/ico.width)
        tank=ico.resize((w,h),RES.LANCZOS);cx=908+round(43*(1-ramp(min(1,u*4))))
        im.paste(tank,(cx-w//2,358-h//2),tank)
        label(d,(65,147),'НОВЫЕ ВЕТКИ ИССЛЕДОВАНИЯ',18);d.rectangle((65,166,146,169),fill=GOLD)
        text(d,(65,298),'ГЕРМАНИЯ' if german else 'СССР',86,weight=680)
        text(d,(67,355),'4 новые ветки' if german else '6 новых веток',38,GOLD,450)
        text(d,(68,432),'Kampfpanzer 67' if german else 'Объект 277',39)
        text(d,(68,474),'Tiger I  /  Pz.Kpfw. 55  /  Versuchspanzer 57' if german else 'ИС-3  /  Т-10  /  Объект 277',23,MUTED,420)
        label(d,(68,610),'10 ВЕТОК  /  30 НОВЫХ МАШИН',21,ICE,1.5);label(d,(970,610),'КЛАСС  /  ТЯЖЁЛЫЙ',15,MUTED,1.5)
        return im

    @staticmethod
    def lower(im,kicker,title,sub,i,top=False):
        a=ramp((i+1)/11);im=shade(im,'top' if top else 'low');layer=Image.new('RGBA',(W,H));d=ImageDraw.Draw(layer)
        x=64+round(23*(1-a));y=103 if top else 512
        d.rectangle((x,y-13,x+34,y-10),fill=GOLD);label(d,(x+46,y),kicker,17)
        text(d,(x,y+87),title,81);text(d,(x+2,y+128),sub,28,ICE,420)
        return overlay(im,layer,a)

    def frame(self,i):
        if i<120:
            k=0;im=self.artframe(i/120,False);a=ramp(i/16);layer=Image.new('RGBA',(W,H));d=ImageDraw.Draw(layer);x=66+round(24*(1-a))
            d.rectangle((x,196,x+46,199),fill=GOLD);label(d,(x+59,206),'ЗИМНИЙ ВЫПУСК  /  2026',17)
            text(d,(x,330),'СЕВЕРНОЕ',112);text(d,(x,456),'ДЕПО',140,GOLD,700);text(d,(x+2,514),'Здесь начинается смена.',31,ICE,420)
            im=overlay(im,layer,a)
        elif i<240:
            k=1;j=i-120;im=self.lower(self.shot('bay',j),'АНГАР   /   ПОЛЯРНАЯ НОЧЬ','Перед выездом','СТ-II в зимнем депо',j)
        elif i<360:
            k=2;j=i-240;im=self.lower(self.shot('drive',j),'ГЕРМАНИЯ   /   X УРОВЕНЬ','Leopard 1','До 70 км/ч по Песчаному рубежу',j,True)
        elif i<480:k=3;im=self.card(i-360)
        elif i<660:
            k=4;j=i-480;im=self.shot('salvo',j)
            if j<100:im=self.lower(im,'СССР   /   СТ-II','Два ствола.','Одно нажатие.',j,True)
            else:im=self.lower(im,'СТ-II   /   ТРЕНИРОВКА','Один залп.',('2 × 440   /   880 урона' if j>=self.notes['hitFrame'] else 'Два снаряда в полёте'),j-100,True)
            if 90<=j<96:
                fx=Image.new('RGBA',(W,H));d=ImageDraw.Draw(fx);v=1-(j-90)/6
                for x,y in self.notes['tips'][str(j)]:
                    for r,c in [(23,(255,165,54,43)),(10,(255,198,85,124)),(4,(255,239,181,220))]:
                        r*=v;d.ellipse((x-r,y-r,x+r,y+r),fill=c)
                im=overlay(im,fx,v)
        elif i<840:
            k=5;j=i-660;im=self.lower(self.shot('team',j),'ГРУЗОВОЙ ПОРТ   /   КОМАНДНЫЙ БОЙ',
                '15 × 15' if j<90 else 'Шесть карт', 'Союзные боты выходят на позиции' if j<90 else '7 × 7   /   10 × 10   /   15 × 15',j if j<90 else j-90,True)
        else:
            k=6;j=i-840;im=self.artframe(j/120,True);d=ImageDraw.Draw(im,'RGBA');d.rectangle((0,0,W,H),fill=(4,12,20,42));a=ramp((j+1)/14)
            layer=Image.new('RGBA',(W,H));d=ImageDraw.Draw(layer);shield(d,640,213,1.55)
            f=face(146,690);l=f.getlength('CITY');w=f.getlength('TANKS');x=(W-l-w-24)/2
            text(d,(x,409),'CITY',146,ICE,690);text(d,(x+l+24,409),'TANKS',146,GOLD,690)
            text(d,(640,483),'СЕВЕРНОЕ ДЕПО',53,ICE,500,'ms');d.line((523,512,757,512),fill=GOLD,width=2)
            text(d,(640,563),'Зимнее обновление  ·  Играй офлайн',28,MUTED,400,'ms');im=overlay(im,layer,a)
        # A consistent cinema gate and reel number. Short dips (not white flashes) mark cuts.
        if i<9:im=Image.blend(DARK,im,.38+.62*ramp(i/8))
        for at in (120,240,360,420,480,660,840):
            if at-3<=i<at+4:im=Image.blend(im,DARK,.52*(1-abs(i-at)/4));break
        d=ImageDraw.Draw(im);d.rectangle((0,0,W,34),fill=INK);d.rectangle((0,686,W,H),fill=INK)
        label(d,(38,23),'CITY TANKS    /    КИНОЖУРНАЛ',14,ICE,1.4);label(d,(1057,23),'ЗИМНИЙ СЕЗОН   •   2026',14,MUTED,1.2)
        label(d,(38,709),f'CT—01     /     {k+1:02d} : 07',13,MUTED,1.3)
        for n in range(7):d.rectangle((1092+n*22,701,1106+n*22,704),fill=GOLD if n==k else (66,82,92))
        return im


def uri(mime,payload):return 'data:'+mime+';base64,'+base64.b64encode(payload).decode('ascii')


def package(work,zip_path):
    src=(HERE/'player.html.in').read_text(encoding='utf-8');movie=(work/'film.mp4').read_bytes()
    for key,value in {'@MOVIE@':uri('video/mp4',movie),'@POSTER@':uri('image/webp',(ROOT/'assets/depot-entry.webp').read_bytes()),
                      '@FONT@':uri('font/ttf',OSWALD.read_bytes()),'@FONTLICENSE@':(HERE/'fonts/OFL.txt').read_text(encoding='utf-8')}.items():
        if src.count(key)!=1:raise ValueError('Missing or duplicated '+key)
        src=src.replace(key,value)
    html=src.encode('utf-8');release=work/'release';release.mkdir(exist_ok=True);(release/'index.html').write_bytes(html)
    if zip_path.resolve()==ROOT/'CITY-TANKS.zip':raise ValueError('The game archive is not a trailer output')
    entry=ZipInfo('index.html',date_time=(1980,1,1,0,0,0));entry.create_system=3;entry.external_attr=0o100644<<16
    with ZipFile(zip_path,'w') as z:z.writestr(entry,html,compress_type=ZIP_DEFLATED,compresslevel=8)
    with ZipFile(zip_path) as z:assert z.namelist()==['index.html'] and not z.testzip() and z.read('index.html')==html
    print(f'{zip_path}: {zip_path.stat().st_size:,} bytes; one offline index.html',flush=True)


def main():
    p=argparse.ArgumentParser();p.add_argument('work',type=Path);p.add_argument('--stills',action='store_true');p.add_argument('--package-only',action='store_true');p.add_argument('--zip',type=Path,default=ROOT/'CITY-TANKS-TRAILER.zip');a=p.parse_args();work=a.work
    if a.package_only:package(work,a.zip);return
    e=Edit(work,a.stills)
    if a.stills:
        for i in [50,183,300,392,450,560,571,595,712,800,910]:e.frame(i).save(work/f'edit-{i}.jpg',quality=90)
        return
    if any(len(e.proofs[k])!=n for k,n in [('bay',120),('drive',120),('salvo',180),('team',180)]):raise ValueError('Capture all four shots before encoding')
    write_score(work/'score.wav')
    cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pixel_format','rgb24','-s','1280x720','-framerate',str(FPS),'-i','pipe:0','-i',str(work/'score.wav'),'-map','0:v','-map','1:a',
         '-c:v','libx264','-profile:v','high','-level:v','3.1','-preset','fast','-crf','20','-threads','2','-g','48','-pix_fmt','yuv420p',
         '-c:a','aac','-b:a','144k','-movflags','+faststart','-metadata','title=CITY TANKS — Северное депо','-t','40',str(work/'film.mp4')]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    try:
        for i in range(FRAMES):proc.stdin.write(e.frame(i).tobytes())
        proc.stdin.close()
        if proc.wait():raise RuntimeError('Video encoder failed')
    finally:
        if proc.poll() is None:proc.kill();proc.wait()
    package(work,a.zip)


if __name__=='__main__':main()
