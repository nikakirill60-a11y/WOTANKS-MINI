"""Pictures for the field atlas film: one editorial system, no mock gameplay screens."""
import json, math, sys, wave
from functools import lru_cache
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from edit import HERE, ROOT, W,H,FPS,SPAN,START,ROUTES,scene_at,END
sys.path.insert(0,str(HERE.parent/'editions'))
from picture import txt, center_paste as paste, smooth
R=Image.Resampling
INK=(13,27,32); DARK=(24,42,44); LIGHT=(241,236,217); WHITE=(246,244,230); SOFT=(186,204,197); GOLD=(251,198,111); MINT=(142,225,201); RUST=(158,68,38); TEAL=(32,99,91)
y,x=np.mgrid[:H,:W].astype(np.float32);x/=W;y/=H
@lru_cache(12)
def load(p,mode='RGB'):
    with Image.open(p) as im:return im.convert(mode)
def box(im,xy,col):ImageDraw.Draw(im).rectangle(tuple(round(q) for q in xy),fill=col)
def line(im,xy,col,width=1):ImageDraw.Draw(im).line(tuple(round(q) for q in xy),fill=col,width=width)
def label(im,s,X,Y,n=18,c=SOFT):txt(im,s,X,Y,n,c,470)
def chip(im,s,X,Y,c=MINT,bg=DARK):
    from picture import face
    w=round(face(19,560).getlength(s))+24;box(im,(X,Y-23,X+w,Y+8),bg);txt(im,s,X+12,Y,19,c,560)
def vignette(im,mask):return Image.composite(Image.new('RGB',(W,H),INK),im,mask)
LEFT=Image.fromarray(np.uint8(255*np.clip(.83*(1-x)**1.9+.12*y**4,0,1)))
LOW=Image.fromarray(np.uint8(255*np.clip(.86*np.maximum(y-.54,0)/.46+.28*np.maximum(.18-y,0)/.18,0,.90)))
@lru_cache(4)
def board(style):
    pale=style=='paper';base=(239,236,219) if pale else (13,26,34) if style=='navy' else (16,33,34)
    col=(-20,-15,-12) if pale else (47,53,43);g=np.exp(-(((x-.71)/.52)**2+((y-.48)/.49)**2));grain=np.random.default_rng(1501).normal(0,.62,(H,W));im=Image.fromarray(np.uint8(np.clip(np.stack([base[i]+g*col[i]+grain for i in range(3)],axis=-1),0,255)));d=ImageDraw.Draw(im,'RGBA');ink=(54,94,82) if pale else (165,209,191)
    for k in range(0,W,42):d.line((k,0,k,H),fill=(*ink,15 if k%168==0 else 7));
    for k in range(0,H,42):d.line((0,k,W,k),fill=(*ink,15 if k%168==0 else 7));
    for j in range(13):d.line([(k,390+j*17+52*math.sin(k/195+j*.08)+26*math.cos(k/117-j*.12)) for k in range(-10,W+12,8)],fill=(*ink,13 if j%3 else 26),width=1)
    return im

def mast(im,title,number,pale=False):
    c=TEAL if pale else MINT;fg=INK if pale else WHITE;l=(161,169,147) if pale else (68,90,86)
    box(im,(57,32,64,53),c);txt(im,'CITY TANKS',76,52,22,fg,680);label(im,'/   ПОЛЕВОЙ АТЛАС',193,52,17,c)
    txt(im,title+'   /   '+number,1221,52,18,fg,520,'right');line(im,(58,70,1222,70),l)

def footer(im,title,pale=False):
    c=TEAL if pale else SOFT;line(im,(58,661,1222,661),(161,169,147) if pale else (82,104,99));label(im,title,58,690,17,c);txt(im,'ВЫПУСК   /   1.5',1221,690,17,c,530,'right')

def crop(im,size,zoom=1,fx=.5,fy=.5):
    w,h=size;sw,sh=im.size;scale=min(sw/w,sh/h)/zoom;cw,ch=min(sw,w*scale),min(sh,h*scale);X=(sw-cw)*fx;Y=(sh-ch)*fy
    return im.resize(size,R.BICUBIC,box=(X,Y,min(sw,X+cw),min(sh,Y+ch)))

def plate(im,art,cx,cy,w):paste(im,art,cx,cy,w)

class Film:
    def __init__(self,work):
        self.work=work;self.data=json.loads((work/'ledger.json').read_text());self.fleet=self.data['fleet'];self.maps=self.data['maps'];self.boxes=self.data['boxes'];self.ids=list(self.maps);self.hues={k:v for k,v in zip(ROUTES,[GOLD,MINT,MINT,GOLD,GOLD,GOLD,GOLD])}
        for id in [*ROUTES,'NAT013','NAT035','NAT014']:assert len(list((work/'plates'/id).glob('*.webp')))==56,id
        for id,n in [('burgstadt',44),('port',44),('drive',88)]:assert len(list((work/'rushes'/id).glob('*.jpg')))==n,id
        assert json.loads((work/'rushes/wheel/receipt.json').read_text())==[550,10000,{'spins':1,'prize':'silver','amount':10000}]
        self.samples={}
        for id in ['engine','chain','bigshot']:
            with wave.open(str(work/'foley'/(id+'.wav')),'rb') as f:s=np.frombuffer(f.readframes(f.getnframes()),'<i2').astype(float)/32768
            self.samples[id]=np.array([max(abs(q)) for q in np.array_split(s,103)]);self.samples[id]/=max(self.samples[id])
    def shot(self,id,u,n):
        q=max(0,min(1,u))*(n-1);j=math.floor(q);d=self.work/'rushes'/id
        a=load(d/f'{j:03}.jpg');b=load(d/f'{min(n-1,j+1):03}.jpg');return Image.blend(a,b,q-j).resize((W,H),R.BILINEAR)
    def mesh(self,id,u):return load(self.work/'plates'/id/f'{round(55*smooth(u)):02}.webp','RGBA')
    def art(self,id):return load(ROOT/'assets/crates'/(id+'.webp'),'RGBA')
    def cover(self,end,u):
        pic=crop(load(ROOT/'assets/depot-entry.webp'),(W,H),1.01+.043*(1-u if end else u),.69-.025*u,.59);im=vignette(pic,LEFT);mast(im,'СЕВЕРНОЕ ДЕПО','15');footer(im,'БРАУЗЕРНАЯ ИГРА     /     ПОЛЕВОЕ ИЗДАНИЕ')
        if not end:
            chip(im,'ОБНОВЛЕНИЕ   1.5',62,178,GOLD);txt(im,'ПОЛЕВОЙ',58,320,112,WHITE,670);txt(im,'АТЛАС',58,429,117,WHITE,670);box(im,(63,470,119,474),GOLD);label(im,'10 секторов   /   7 веток в кадре',62,519,29,WHITE)
        else:
            chip(im,'ДО ВСТРЕЧИ В ДЕПО',62,190,GOLD);txt(im,'CITY TANKS',56,343,113,WHITE,690);txt(im,'1.5',62,442,90,GOLD,640);label(im,'Какую ветку возьмёшь первой?',63,501,31,WHITE);label(im,'Telegram    /    @blitz_legacy',64,563,25,SOFT)
        return im
    def panorama(self,id,u):
        m=self.maps[id];im=vignette(self.shot(id,u,44),LOW);chip(im,'ПОЛЕВАЯ ЗАПИСЬ   /   СТЕРЕО',57,57);txt(im,'ЛИСТ  '+m['sec'],1218,55,21,WHITE,590,'right');txt(im,m['title'],58,590,68,WHITE,620);label(im,m['landmark']+'    /    '+('колокольный звон' if id=='burgstadt' else 'портовый гудок'),61,632,28,MINT);return im
    @lru_cache(2)
    def spread(self,page):
        im=board('paper').copy();mast(im,'КАРТОГРАФИЯ',f'0{page+1} / 02',True);txt(im,'ДЕСЯТЬ КАРТ ЗАНОВО',57,146,61,INK,650)
        for j,id in enumerate(self.ids[5*page:5*page+5]):
            m=self.maps[id];X=58+(j%3)*394;Y=178+(j//3)*219;photo=crop(load(ROOT/'assets/sectors'/(id+'.webp')),(374,147));im.paste(photo,(X,Y));box(im,(X,Y,X+44,Y+32),TEAL);txt(im,m['sec'],X+11,Y+24,19,WHITE,610);txt(im,m['title'],X,Y+180,28,INK,590,limit=372);label(im,m['landmark'],X,Y+204,18,TEAL)
        X,Y=846,398;box(im,(X,Y,X+374,Y+146),DARK);txt(im,'10 / 10' if page else '01—05',X+18,Y+70,52,GOLD,630);label(im,'Рельеф · дороги · укрытия',X+19,Y+114,24,WHITE);footer(im,'СНИМКИ ИГРОВЫХ ЛОКАЦИЙ     /     ПОЛЕВОЙ АТЛАС',True);return im
    def listen(self,u):
        im=board('navy').copy();mast(im,'ФОНОТЕКА','01');txt(im,'ЗВУЧИТ ИНАЧЕ',57,164,73,WHITE,660);label(im,'Три звука из игры. Дальше — без музыки и диктора.',60,211,28,SOFT)
        for i,(id,name) in enumerate([('engine','Двигатель'),('chain','Гусеницы'),('bigshot','Выстрел')]):
            top=253+i*124;active=i==min(2,int(u*3));col=GOLD if active else SOFT;box(im,(61,top,1219,top+103),(34,53,57) if active else (25,42,46));label(im,'0'+str(i+1),80,top+38,19,MINT);txt(im,name,137,top+68,37,col,580)
            for j,val in enumerate(self.samples[id]):
                X=475+j*6.8;amp=(.10+.9*val)*32;line(im,(X,top+52-amp,X,top+52+amp),col if active else (108,147,141),3)
            if active:
                X=471+697*((u*3)%1);line(im,(X,top+9,X,top+93),MINT,2)
        footer(im,'ЗВУКОВАЯ ДОРОЖКА     /     ИСХОДНЫЕ ЗВУКИ CITY TANKS');return im
    def drive(self,u):
        im=vignette(self.shot('drive',u,88),LOW);sec=u*SPAN['drive'];name='Двигатель' if sec<1 else 'Гусеницы' if sec<57/16 else 'Выстрел';chip(im,'ТОЛЬКО ЗВУК ИГРЫ',57,58,GOLD);txt(im,'ЗЕЛЁНАЯ ДОЛИНА',1221,54,22,WHITE,540,'right');txt(im,name,55,635,63,WHITE,630);label(im,'ОБЪЕКТ 261   /   ТРЕНИРОВОЧНЫЙ ВЫЕЗД',60,682,19,MINT);return im
    def supply(self,opened,u):
        im=board('green').copy();mast(im,'СНАБЖЕНИЕ','02');txt(im,'НАЦИОНАЛЬНЫЕ ЯЩИКИ',56,155,62,WHITE,640);label(im,'Два разных розыгрыша',61,195,25,SOFT)
        val=round(100*(self.boxes[0][2] if opened else self.data['victory']));txt(im,str(val)+'%',55,385,135,GOLD,640);txt(im,'При открытии' if opened else 'За победу',63,451,45,WHITE,550,limit=430)
        for j,s in enumerate(['на недостающий танк','из ящика этой нации.','Иначе — ресурсы.'] if opened else ['на закрытый ящик','нации твоей машины.','Ящик приходит в инвентарь.']):label(im,s,64,504+j*38,27,SOFT)
        if not opened:
            for j,(id,nat,_) in enumerate(self.boxes):
                X=512+(j%3)*239;Y=218+(j//3)*212;box(im,(X,Y,X+219,Y+186),(35,55,55));plate(im,self.art(id),X+109,Y+78,172);txt(im,nat,X+109,Y+166,24,WHITE,550,'center')
        else:
            sheet=load(ROOT/'assets/crates/national-ussr-motion.webp','RGBA');i=min(27,int(max(0,u*SPAN['open']-1.0)*16));X=i%7*384;Y=i//7*240
            box(im,(510,219,1220,628),(35,55,55));plate(im,sheet.crop((X,Y,X+384,Y+240)),865,421,572);label(im,'Ящик СССР    /    осмотр содержимого',653,601,24,MINT)
        footer(im,'СССР   /   ГЕРМАНИЯ   /   ФРАНЦИЯ   /   ШВЕЦИЯ   /   США   /   ЯПОНИЯ');return im
    def vehicle(self,id,u):
        v=self.fleet[id];isroute=id in ROUTES;atlas=id=='NAT014';premium=id=='NAT035';accent=GOLD if premium or isroute and v['nat']=='Франция' else MINT
        im=board('navy' if v['nat']=='Германия' else 'green').copy();mast(im,'ДЕРЕВО РАЗВИТИЯ' if isroute else ('РУЛЕТКА' if atlas else 'ОСОБЫЙ ПАРК'),f'{ROUTES.index(id)+1:02} / 07' if isroute else '1.5')
        txt(im,('ВЕТКА  '+f'{ROUTES.index(id)+1:02}') if isroute else 'ГЛАВНЫЙ ПРИЗ' if atlas else 'ПРЕМИУМ' if premium else 'КОЛЛЕКЦИЯ',60,126,25,accent,580)
        names={'OBJ261V4':['Объект 261','Вариант 4'],'BC15558':['Bat.-Châtillon','155 58'],'NAT035':['Rheinmetall','Skorpion']}.get(id,[v['name']]);yy=219 if len(names)>1 else 243
        for j,s in enumerate(names):txt(im,s,54,yy+77*j,81,WHITE,640,limit=554)
        cls={'spg':'Самоходная артиллерия','lt':'Колёсный лёгкий танк' if id=='EBR105' else 'Лёгкий танк','mt':'Средний танк','ht':'Тяжёлый танк','td':'ПТ-САУ'}[v['cls']];label(im,v['nat']+'   /   '+('X' if v['tier']==10 else 'VIII')+' уровень',62,348,27,accent);label(im,cls,61,391,33,WHITE)
        d=ImageDraw.Draw(im,'RGBA');d.ellipse((625,173,1172,530),outline=(*accent,52),width=2);d.arc((605,158,1192,545),191,275,fill=(*accent,128),width=2)
        plate(im,self.mesh(id,u),894+5*(u-.5),363,729)
        if isroute:
            line(im,(62,467,1220,467),(78,105,99));label(im,'ПОСЛЕДНИЕ ТРИ СТУПЕНИ ВЕТКИ',63,503,18,SOFT)
            for j,(tier,name) in enumerate(zip(['VIII','IX','X'],v['route'])):
                X=62+j*393;hi=j==2;box(im,(X,527,X+372,627),accent if hi else (35,55,57));fg=INK if hi else WHITE;txt(im,tier,X+15,559,21,fg,570);txt(im,name,X+15,603,32,fg,610,limit=342)
            footer(im,'МАРШРУТ И МОДЕЛЬ     /     ИЗ ИГРОВОГО КАТАЛОГА')
        elif atlas:
            label(im,'ШАНС ЗА ОДИН ПРОКРУТ',63,481,19,SOFT)
            for j,((key,odds),name) in enumerate(zip(self.data['odds'],['Объект 907','Нац. ящик','Золото','Серебро'])):
                X=62+j*295;box(im,(X,504,X+276,625),[(75,55,45),(39,75,65),(81,71,44),(49,63,71)][j]);txt(im,str(odds)+'%',X+15,563,49,WHITE,590);label(im,name,X+16,604,24,WHITE)
            footer(im,'ОДИН ПРОКРУТ     /     ОДИН ПРИЗ')
        else:
            line(im,(62,465,1220,465),(78,105,99));txt(im,str(self.data['counts'][int(premium)]),59,608,105,GOLD,650)
            txt(im,'новых премиум-танка' if premium else 'коллекционных машин',221,546,38,WHITE,550)
            label(im,'Три предложения в день в Премиум-магазине.' if premium else 'В шести национальных ящиках.',222,598,28,SOFT)
            footer(im,'ВИТРИНА МАГАЗИНА     /     НЕ НАГРАДА ИЗ ЯЩИКА' if premium else 'НАЦИОНАЛЬНАЯ СЕРИЯ     /     КОЛЛЕКЦИЯ')
        return im
    def wheel(self,u):
        im=board('navy').copy();mast(im,'ПРИЗОВАЯ СЕРИЯ','907');txt(im,'РУЛЕТКА',57,191,81,WHITE,650);txt(im,'907',56,291,105,GOLD,660)
        sec=u*SPAN['wheel'];a,b=self.data['price'];txt(im,str(a)+' G',60,402,64,MINT,610);label(im,'первый прокрут',63,444,30,WHITE);label(im,'+'+str(b-a)+' G к следующему',63,505,27,SOFT)
        d=self.work/'rushes/wheel';name='before' if sec<2.35 else f'{min(29,int((sec-2.35)*29/1.55)):03}' if sec<3.92 else 'after';shot=load(d/(name+'.png'));w=695;h=round(shot.height*w/shot.width);im.paste(shot.resize((w,h),R.LANCZOS),(525,95));footer(im,'ИГРОВОЕ ЗОЛОТО    /    КАДР ИЗ АНГАРА');return im
    def frame(self,n):
        t=n/FPS;k,u=scene_at(t)
        if k in ('cover','end'):im=self.cover(k=='end',u)
        elif k in ('burgstadt','port'):im=self.panorama(k,u)
        elif k.startswith('atlas-'):im=self.spread(int(k=='atlas-b')).copy()
        elif k=='listen':im=self.listen(u)
        elif k=='drive':im=self.drive(u)
        elif k in ('boxes','open'):im=self.supply(k=='open',u)
        elif k=='wheel':im=self.wheel(u)
        else:im=self.vehicle(k,u)
        # A narrow editorial splice, not a flash or a long fade over text.
        local=t-START[k];alpha=1-min(1,local/(.69 if k=='cover' else .115));alpha=max(alpha,max(0,(t-END+.65)/.65));
        if alpha>0:im=Image.blend(im,Image.new('RGB',(W,H),INK),alpha)
        return im
