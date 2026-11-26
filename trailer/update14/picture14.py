"""The winter roadbook. Live game photography, turning meshes and typeset field notes."""
from pathlib import Path
from functools import lru_cache
from bisect import bisect_right
import json
import math
import subprocess
import sys
import numpy as np
from PIL import Image,ImageDraw
from edit import CUTS,SECONDS,FPS,MAPS,BRANCHES,PAIR

HERE=Path(__file__).resolve().parent; ROOT=HERE.parents[1]; sys.path.insert(0,str(HERE.parent/'editions'))
from picture import txt,face,smooth
W,H=1280,720; R=Image.Resampling
INK=(24,40,44); DARK=(12,28,33); PAPER=(241,236,217); MILK=(250,245,225); TEAL=(24,104,103)
MINT=(147,225,201); GOLD=(255,201,115); RED=(172,60,40); VERM=(242,132,89); GREY=(77,96,94); FOG=(179,200,196)
GOLD_INK=(127,79,17)

def box(im,x,y,r,b,col): ImageDraw.Draw(im).rectangle((round(x),round(y),round(r),round(b)),fill=col)
def line(im,pts,col,w=1): ImageDraw.Draw(im).line(tuple(round(v) for v in pts),fill=col,width=w)
def text(im,s,x,y,size,col=INK,weight=500,maxw=None,align='left'):
    s=str(s)
    if '→' not in s:
        txt(im,s,x,y,size,col,weight,align,maxw);return
    # Oswald contains Cyrillic but no right arrow. Draw it at the baseline of
    # the adjoining type, not as a missing-glyph rectangle in the encoded video.
    parts=s.split('→')
    def metrics(n):
        f=face(n,weight);ww=[f.getlength(part) for part in parts];arrow=n*.92
        return ww,arrow,sum(ww)+arrow*(len(parts)-1)
    widths,aw,total=metrics(size)
    while maxw and total>maxw and size>12:
        size-=1;widths,aw,total=metrics(size)
    xx=x-(total/2 if align=='center' else total if align=='right' else 0)
    for j,part in enumerate(parts):
        if part:txt(im,part,xx,y,size,col,weight)
        xx+=widths[j]
        if j<len(parts)-1:
            yy=y-size*.32;l=xx+size*.08;r=xx+aw-size*.12;q=size*.19;pen=max(2,round(size/15))
            line(im,(l,yy,r,yy),col,pen);line(im,(r-q,yy-q,r,yy,r-q,yy+q),col,pen);xx+=aw

def chip(im,s,x,y,fg,bg,size=17):
    w=round(face(size,550).getlength(s))+24;box(im,x,y,x+w,y+size+13,bg)
    text(im,s,x+12,y+size+4,size,fg,550);return w

def paste(im,a,cx,cy,w,h=None):
    w=max(1,round(w));h=max(1,round(h or w*a.height/a.width));b=a if a.size==(w,h) else a.resize((w,h),R.BICUBIC)
    im.paste(b,(round(cx-w/2),round(cy-h/2)),b if b.mode=='RGBA' else None)

@lru_cache(75)
def rgba(p):
    with Image.open(p) as src:return src.convert('RGBA')
@lru_cache(22)
def rgb(p):
    with Image.open(p) as src:return src.convert('RGB')
# Soft relief lines were drawn for this film, not copied from stock backgrounds.
_y,_x=np.mgrid[0:H,0:W].astype('float32');_x/=W;_y/=H
@lru_cache(8)
def board(style):
    light=style=='paper';col={'cover':(37,78,81),'steel':(45,74,79),'winter':(37,64,76),'night':(29,56,69),'paper':(31,26,18)}[style]
    if light:
        shade=.17+np.clip(.52*_y+.16*_x-.4*np.exp(-((_x-.23)/.33)**2-((_y-.22)/.42)**2),-.1,.8)
        noise=np.random.default_rng(14).normal(0,.85,(H,W)).astype('float32');a=np.stack([c-shade*s+noise for c,s in zip((253,250,233),col)],2)
    else:
        glow=np.exp(-((_x-.69)/.62)**2-((_y-.48)/.64)**2);a=np.stack([base+glow*c for base,c in zip((8,23,29),col)],2)
    im=Image.fromarray(a.clip(0,255).astype('uint8'));d=ImageDraw.Draw(im,'RGBA')
    ink=(52,87,76) if light else (177,223,206)
    for g in range(0,W,44):d.line((g,0,g,H),fill=(*ink,9 if light else 8))
    for g in range(0,H,44):d.line((0,g,W,g),fill=(*ink,9 if light else 8))
    for j in range(19):
        pts=[(x,423+11*j+39*math.sin(x/138+.057*j)+16*math.sin(x/58-j*.088)+49*math.sin(x/307+2.2)) for x in range(-10,W+12,6)]
        d.line(pts,fill=(*ink,21 if j%4==0 else 9))
    return im

LUT=[min(255,max(0,round((v-111)*1.08+111+sh*(1-v/255)-hi*(v/255)**2))) for sh,hi in [(0,1),(2,2),(4,4)] for v in range(256)]
M_VIGN=np.clip(((_x-.51)**2*1.6+(_y-.5)**2*.85-.13)*.36,0,.25)
MASK={k:Image.fromarray(np.uint8(np.clip(a+M_VIGN,0,.96)*255)) for k,a in {
    'top': .83*np.clip((.47-_y)/.43,0,1)*np.clip((1.05-_x)/.58,.15,1),
    'left': .95*np.clip((.55-_x)/.31,0,1),
    'hud': .74*np.clip((.43-_y)/.38,0,1)+.73*np.clip((_y-.73)/.23,0,1)}.items()}
NIGHT=Image.new('RGB',(W,H),DARK)

def folio(im,k,t,dark=True):
    # A very thin locator, not a fake interactive progress control.
    b=INK if not dark else (17,35,39);fg=(198,210,195);box(im,0,681,W,H,b)
    text(im,'CITY TANKS     /     ПУТЕВОЙ ЛИСТ',53,707,15,fg,480)
    for i,(s,_) in enumerate(CUTS):
        x=588+i*16;col=GOLD if t>=s else (66,84,83);box(im,x,697,x+9,699,col)
    text(im,'ВЫПУСК  1.4     /     %02d'% (k+1),1227,707,15,fg,480,align='right')
    line(im,(0,718,round(W*t/SECONDS),718),GOLD,2)

def top(im,section,dark=False):
    fg=FOG if dark else GREY;c=GOLD if dark else RED
    line(im,(55,53,1225,53),tuple(int(v*.78) for v in fg));box(im,55,50,105,55,c)
    text(im,section,55,39,19,c,560);text(im,'СЕВЕРНОЕ ДЕПО   /   1.4',1225,39,17,fg,480,align='right')

def rings(im,cx,cy,r,colour=MINT):
    d=ImageDraw.Draw(im,'RGBA')
    for i,a in enumerate((55,25,18)):
        rr=r+i*17;d.ellipse((cx-rr,cy-rr*.19,cx+rr,cy+rr*.19),outline=(*colour,a),width=2 if not i else 1)
    for j in range(10):
        x=cx-r+j*2*r/9;d.line((x,cy+9,x,cy+14),fill=(*colour,90))

def stamp(im,cx,cy,num,caption,colour):
    d=ImageDraw.Draw(im);d.ellipse((cx-53,cy-53,cx+53,cy+53),outline=colour,width=2);d.ellipse((cx-47,cy-47,cx+47,cy+47),outline=colour,width=1)
    text(im,num,cx,cy+6,40,colour,600,align='center');text(im,caption,cx,cy+29,15,colour,500,align='center')

class Film:
    def __init__(self,work):
        self.work=Path(work);self.starts=[round(t*FPS) for t,k in CUTS]+[SECONDS*FPS]
        self.catalog=json.loads(subprocess.check_output(['node',str(HERE/'ledger.cjs')]))
        self.fleet=self.catalog['fleet'];self.routes=self.catalog['routes'];self.slates={}
        for k in ('kpz','squad','tree','case',*MAPS):
            d=self.work/'rushes'/k;slate=json.loads((d/'slate.json').read_text());self.slates[k]=slate
            if {f.stem for f in d.glob('*.jpg')}!={f'{i:03d}' for i in range(slate['n'])}:raise ValueError('Incomplete rush: '+k)
        for k in [*BRANCHES,'KPZ-67','PZ-II-J','T67']:
            d=self.work/'plates'/k
            if {p.stem for p in d.glob('*.webp')}!={f'{i:02d}' for i in range(56)}:raise ValueError('Missing rotating plate '+k)
        assert self.slates['kpz']['damage']==380 and self.slates['kpz']['off'] and self.slates['kpz']['blocked']
        assert self.slates['squad']['humans']==3 and self.slates['squad']['bots']==11
        assert self.slates['tree']['slots']==list(self.catalog['toys'])
        assert self.slates['case']['reward']=='gingerbread' and self.catalog['slots']==4
        assert sum(t['odds'] for t in self.catalog['toys'].values())==100
        for k in BRANCHES:assert len(self.routes[k])==10 and self.fleet[k]['tier']==10
        for k,data in list(MAPS.items())[1:]:assert data[0]==self.slates[k]['name']
    def plate(self,im,k,u,cx,cy,w):
        n=min(55,max(0,round(55*u)));paste(im,rgba(self.work/'plates'/k/f'{n:02d}.webp'),cx,cy,w)
    def take(self,k,u,overlay=None):
        n=self.slates[k]['n'];t=min(n-1,max(0,(n-1)*u));i=int(t);d=self.work/'rushes'/k
        im=rgb(d/f'{i:03d}.jpg');j=min(i+1,n-1)
        if i!=j and t-i>.03 and not (k in MAPS and k!='quarry' and j==n//2):im=Image.blend(im,rgb(d/f'{j:03d}.jpg'),t-i)
        im=im.point(LUT);return Image.composite(NIGHT,im,MASK[overlay]) if overlay else im
    def opener(self,u,last=False):
        im=board('cover' if not last else 'night').copy();top(im,'СПЕЦВЫПУСК   /   ИГРОВОЙ ТРЕЙЛЕР',True)
        rings(im,914,519,314);self.plate(im,'STURMTIGER' if last else 'KPZ-67',.12+.79*u,919,385,709)
        dx=round(19*(1-smooth(u*6)))
        chip(im,'ОБНОВЛЕНИЕ',58+dx,112,DARK,GOLD,21)
        text(im,'CITY TANKS',54+dx,254,99,MILK,640,599);text(im,'1.4',45+dx,485,239,GOLD,680,558)
        if last:
            text(im,'Какую ветку откроешь первой?',59,568,43,MILK,510,790)
            text(im,'ИГРА В БРАУЗЕРЕ   /   КОМПЬЮТЕР И ТЕЛЕФОН',60,621,22,MINT,480)
        else:
            text(im,'Зимний выезд',59,567,59,MILK,570)
            text(im,'4 КАРТЫ     /     8 ВЕТОК     /     1 ЁЛКА',61,622,23,MINT,520)
        text(im,'X   /   '+('STURMTIGER' if last else 'KAMPFPANZER 67'),1209,574,19,FOG,440,align='right')
        return im
    def calibration(self,u):
        im=self.take('kpz',u,'hud');chip(im,'НА ПОЛИГОНЕ    /    ГЕРМАНИЯ  ·  X',55,37,DARK,GOLD)
        text(im,'Калибровка снаряда',54,139,70,MILK,630);text(im,'Kampfpanzer 67',57,179,30,MINT,460)
        state=self.slates['kpz']['status'][min(96,round(u*96))]
        box(im,54,553,107,606,GOLD);text(im,'G',80,596,41,DARK,600,align='center')
        text(im,'Калибровка: '+state,126,596,37,MILK,580)
        text(im,'Вход и выход — по 1 с. Пока идёт переход, стрелять нельзя.',56,645,28,MILK,410,1148)
        if .394<=u<=.64:chip(im,'БП   /   '+str(self.slates['kpz']['damage'])+' УРОНА',960,562,DARK,MINT,23)
        return im
    def guide(self,u):
        im=board('paper').copy();top(im,'01   /   ОРУДИЕ');text(im,'Что меняется перед выстрелом?',53,136,62,INK,600,1138)
        text(im,'АНГАР   →   СНАРЯДЫ · KPz 67',57,183,21,TEAL,550)
        box(im,54,218,863,263,INK);text(im,'ПАРАМЕТР',70,248,20,MILK,520)
        text(im,'ОБЫЧНЫЙ',593,248,20,MILK,520,align='center');text(im,'КАЛИБРОВКА',768,248,20,GOLD,540,align='center')
        rows=[('Урон БП и КС','420','380'),('Рикошет БП','70°','75°'),('Нормализация БП','2°','7°'),('Потеря пробития КС','5%','2%')]
        for j,(name,a,b) in enumerate(rows):
            y=270+j*73;active=j==min(3,int(4*u));
            if active:box(im,54,y,863,y+63,(220,226,206));box(im,54,y,61,y+63,TEAL)
            text(im,name,72,y+45,32,INK,490);text(im,a,593,y+46,36,GREY,480,align='center');text(im,'→',679,y+42,31,GREY,500,align='center');text(im,b,766,y+46,38,TEAL,620,align='center');line(im,(54,y+65,863,y+65),(159,175,162))
        ix=int(u>=.56);x=917;y=216;a=rgba(self.work/'inserts'/f'guide-{ix}.png');w=292;h=round(w*a.height/a.width)
        box(im,x-6,y-6,x+w+6,y+h+6,(155,166,150));paste(im,a,x+w/2,y+h/2,w)
        text(im,'ОФ остаётся без изменений.',56,624,32,RED,490);return im
    def map(self,k,u):
        a=self.slates[k];new=k!='quarry';scenery=self.take(k,u);im=scenery.copy();im.paste(scenery.crop((0,96,W,596)),(0,0));im=Image.composite(NIGHT,im,MASK['top']);c=GOLD if new else MINT
        chip(im,'АТЛАС ДЕПО    /    '+('НОВЫЕ КАРТЫ' if new else 'ЗНАКОМЫЕ КАРТЫ'),55,36,DARK,c)
        text(im,('0'+str(list(MAPS).index(k))+'  /  04') if new else '05  /  МЕДНЫЙ КАРЬЕР',57,122,41,MILK,560)
        # Paper margin is deliberately opaque: text survives both the snow and a bright sky.
        im.paste(board('paper').crop((0,494,W,681)),(0,494));box(im,0,494,W,498,TEAL)
        name,l1,l2=MAPS[k];text(im,name,54,564,59,INK,630,936)
        text(im,l1,56,609,28,INK,425,939);text(im,l2,56,646,28,INK,425,939)
        box(im,1034,469,1225,661,MILK);paste(im,rgb(self.work/'inserts'/(k+'-plan.png')),1129,552,155,155)
        text(im,'СЕКТОР '+a['sector']+'   /   '+str(a['size'][0])+' × '+str(a['size'][1])+' м',1130,651,17,TEAL,500,175,'center')
        return im
    def squad(self,u):
        im=self.take('squad',u,'hud');chip(im,'СОВМЕСТНЫЙ ВЫЕЗД   /   7 × 7',55,35,DARK,GOLD)
        text(im,'Одной командой',52,151,77,MILK,630);text(im,'2–3 игрока во взводе',57,199,35,MINT,490)
        text(im,'Создай взвод и передай код друзьям.',55,595,39,MILK,510,1165)
        text(im,'Нужны аккаунты и интернет. Свободные места заполняют боты; против вас — семь ботов.',56,645,28,MILK,410,1170)
        return im
    def link(self,u):
        im=board('paper').copy();top(im,'03   /   ПРИГЛАШЕНИЕ');text(im,'Кого позовёшь в игру?',54,151,72,INK,600,1157)
        text(im,'За каждую новую регистрацию по твоей ссылке выбери награду себе:',57,208,33,GREY,450,1164)
        for j,(value,unit,fg,bg) in enumerate([('25','ЗОЛОТА',GOLD,INK),('250','ОПЫТА',MINT,(31,69,70))]):
            x=55+j*597;box(im,x,251,x+574,490,bg);text(im,value,x+31,421,151,fg,650);text(im,unit,x+34,467,29,MILK,490)
            amount=smooth(u*2) if j==0 else smooth(u*2-.81);line(im,(x,490,x+574*amount,490),fg,5)
        chip(im,'ИЛИ',606,349,MILK,RED,20)
        text(im,'Профиль  →  Пригласить друзей  →  Создать ссылку',55,564,40,INK,545,1165)
        text(im,'Скопируй ссылку и отправь её. Награду даёт новая регистрация, не переход по ссылке.',57,625,29,TEAL,440,1158)
        return im
    def gift(self,u):
        im=board('steel').copy();top(im,'03   /   ПОДАРОК ПО ССЫЛКЕ',True);text(im,'Новичку — один из двух наборов',54,139,61,MILK,620,1158)
        box(im,55,196,455,564,(39,69,68));chip(im,'НАБОР 01  /  РЕСУРСЫ',75,217,DARK,GOLD)
        text(im,'250',73,360,106,GOLD,620);text(im,'золота',274,356,40,MILK,470)
        text(im,'+',74,409,37,MINT,530);text(im,'1 000',73,513,91,MINT,610);text(im,'опыта',285,508,39,MILK,470)
        chip(im,'НАБОР 02  /  ДВЕ МАШИНЫ',484,217,DARK,MINT)
        self.plate(im,'PZ-II-J',u,661,381,339);self.plate(im,'T67',1-u,1038,381,352)
        for x,name,note in [(662,'Pz.Kpfw. II Ausf. J','навсегда'),(1039,'T67','на 5 боёв')]:
            text(im,name,x,504,35,MILK,550,349,'center');text(im,note,x,550,30,GOLD,500,268,'center')
        text(im,'Оба выбора закреплены за ссылкой. Подарок выбирает приглашающий.',55,629,31,MINT,440,1170);return im
    def reserve(self,u):
        im=board('paper').copy();top(im,'03   /   КОНТЕЙНЕРЫ');text(im,'Офицерский резерв',54,150,72,INK,620)
        text(im,'2%',42,447,220,RED,660,600);text(im,'ОБЩИЙ ШАНС НА ТАНК',58,497,33,INK,550)
        w=422+round(20*smooth(u));paste(im,rgba(ROOT/'assets/crates/premium.webp'),940,342-5*math.sin(u*math.pi),w)
        text(im,'Pz.Kpfw. II Ausf. J   /   T67',942,540,31,TEAL,550,477,'center')
        text(im,'Выпадает одна недостающая машина. Из резерва обе — навсегда.',55,626,32,INK,450,1162);return im
    def boards(self,u):
        im=board('paper').copy();top(im,'04   /   РЕЙТИНГИ');text(im,'Три таблицы лидеров',54,151,72,INK,620)
        box(im,55,214,381,546,INK);text(im,'ТОП',78,307,66,MINT,520);text(im,'10',72,499,172,MILK,640)
        for j,(tag,note) in enumerate([('Танки','Постоянные машины в ангаре'),('Победы','Все победы аккаунта'),('Золото','Текущий баланс')]):
            y=219+j*113
            if j==min(2,int(u*3)):box(im,413,y-2,1215,y+98,(224,228,209));box(im,413,y-2,418,y+98,TEAL)
            text(im,str(j+1).zfill(2),424,y+44,25,RED,560);text(im,tag,486,y+45,48,INK,570);text(im,note,487,y+84,27,GREY,420);line(im,(424,y+102,1214,y+102),(144,161,147))
        text(im,'Открой «Топы» в ангаре. Своё место видно и за пределами десятки.',55,627,32,TEAL,450,1160);return im
    def promo(self,u):
        im=board('cover').copy();top(im,'04   /   ПОДАРОК СООБЩЕСТВУ',True)
        box(im,55,103,1222,583,PAPER);box(im,55,103,70,583,RED)
        chip(im,'В ЧЕСТЬ ПЕРВЫХ 15 ЗАРЕГИСТРИРОВАННЫХ ИГРОКОВ',104,137,MILK,RED,21)
        text(im,'15_zar',94,416,198,INK,645,752);text(im,'АНГАР   →   КОД   →   АКТИВИРОВАТЬ',106,506,25,TEAL,550)
        for j in range(17):line(im,(795,140+24*j,795,151+24*j),(144,160,145),2)
        if u>.47:stamp(im,690,330+round(9*(1-smooth((u-.47)*9))),'15','ИГРОКОВ',TEAL)
        text(im,'500',844,303,100,GOLD_INK,610);text(im,'ЗОЛОТА',851,350,28,INK,500)
        text(im,'2 500',844,472,96,TEAL,620);text(im,'ОПЫТА',851,521,28,INK,500)
        text(im,'Один раз на профиль.',57,641,29,MINT,465);return im
    def tree(self,u):
        im=self.take('tree',u,'left');chip(im,'05   /   НОВОГОДНИЙ ИВЕНТ',55,40,DARK,GOLD)
        text(im,'Ёлка в ангаре',54,172,65,MILK,610,475);text(im,'04',48,369,165,GOLD,620)
        text(im,'СЛОТА ДЛЯ ИГРУШЕК',58,416,28,MILK,520);line(im,(57,446,355,446),MINT,2)
        for j,s in enumerate(['Украшения — в инвентаре.','Сам выбираешь, какие повесить.','Бонус дают только игрушки на ёлке.']):text(im,s,57,496+43*j,27,MILK,425,412)
        return im
    def case(self,u):
        im=board('winter').copy();top(im,'05   /   БОЕВАЯ НАГРАДА',True);text(im,'Ёлочный ларец',53,151,76,MILK,620)
        text(im,'20%',46,394,146,GOLD,650,429);text(im,'ПОСЛЕ БОЯ',57,448,38,MILK,520)
        text(im,'И за победу, и за поражение.',57,509,27,MINT,435,423)
        box(im,507,185,1226,590,(110,148,141));paste(im,self.take('case',u),866,388,712,400)
        text(im,'Внутри одно украшение. Ни танков, ни валюты, ни слотов.',56,639,33,MILK,450,1158);return im
    def toys(self,u):
        im=board('paper').copy();top(im,'05   /   КОЛЛЕКЦИЯ');text(im,'Что можно повесить на ёлку?',52,140,64,INK,610,1170)
        colors=[(147,100,50),(52,115,91),(111,79,141),(156,98,36)];ds=['+5% серебра','+5% опыта','+5% золота','+10% ко всем трём']
        for j,(id,toy) in enumerate(self.catalog['toys'].items()):
            x=54+j*300;box(im,x,197,x+271,517,(229,229,208));box(im,x,197,x+271,202,colors[j]);cx=x+135
            text(im,toy['rarity'].upper(),x+15,235,18,colors[j],550);text(im,str(toy['odds'])+'%',x+251,238,23,INK,600,align='right')
            bob=3*math.sin(2*math.pi*(u+j*.16));paste(im,rgba(ROOT/'assets/ornaments'/(id+'.webp')),cx,331+bob,150)
            text(im,toy['name'],cx,455,43,INK,580,245,'center');text(im,ds[j],cx,495,26,colors[j],510,250,'center')
        text(im,'С шаром на ёлке шанс ларца: 20%  →  30%.',55,588,44,TEAL,590,1162)
        text(im,'Копии в четырёх слотах складывают бонусы. Второй шар не повышает шанс выше 30%.',57,638,28,GREY,435,1160);return im
    def pair(self,k,u):
        nat,no,ids,desc=PAIR[k];im=board('steel').copy();top(im,'06   /   ВОСЕМЬ ВЕТОК РАЗВИТИЯ',True)
        text(im,nat,55,149,75,MILK,620);text(im,'МАРШРУТЫ   '+no+'     /     X УРОВЕНЬ',1219,136,22,GOLD,490,560,'right')
        line(im,(640,183,640,582),(104,144,136),1)
        for j,id in enumerate(ids):
            x=55+j*597;cx=x+278;t=self.fleet[id];par=self.fleet[t['parent']]['name'];cl={'ht':'ТЯЖЁЛЫЙ ТАНК','td':'ПТ-САУ','mt':'СРЕДНИЙ ТАНК'}[t['cls']]
            chip(im,'X     /     '+cl,x+8,194,DARK,MINT,17);rings(im,cx,418,220);self.plate(im,id,.09+.83*u,cx,340,521)
            text(im,t['name'],cx,491,48,MILK,590,553,'center');text(im,desc[j],cx,539,30,GOLD,465,548,'center');text(im,'IX   /   '+par,cx,584,22,FOG,430,544,'center')
        text(im,{'fr1':'Четыре французские ветки начинаются с одного Renault FT.', 'fr2':'Два разных барабана: у тяжёлого танка и у ПТ-САУ.', 'td':'На III уровне от T82 расходятся две американские ветки ПТ-САУ.'}[k],56,647,29,MINT,450,1170)
        return im
    def single(self,k,u):
        ar=k=='ares';id='ARES-90' if ar else 'STURMTIGER';v=self.fleet[id];im=board('steel' if ar else 'cover').copy();top(im,'06   /   ВОСЕМЬ ВЕТОК РАЗВИТИЯ',True)
        chip(im,('США     /     ВЕТКА 07' if ar else 'ГЕРМАНИЯ     /     ВЕТКА 08'),56,104,DARK,GOLD,19)
        text(im,v['name'],53,245,94,MILK,625,594);text(im,('7 × 105' if ar else '1 300'),49,417,115,GOLD,635,583)
        text(im,'УРОНА ЗА ОЧЕРЕДЬ' if ar else 'УРОНА ЗА ВЫСТРЕЛ',58,471,30,MILK,505)
        rings(im,900,504,306);self.plate(im,id,.1+.84*u,901,373,689)
        if ar:foot='VIII   Ares 75      →      IX   Ares 85      →      X   Ares 90'
        else:foot='От Marder II — семь новых машин. Bär ведёт к Sturmtiger.'
        text(im,foot,56,584,36,MINT,485,1170);text(im,('Полная перезарядка: 8 с.' if ar else 'Полная перезарядка: 27 с.'),57,637,28,FOG,420)
        return im
    def frame(self,n):
        idx=bisect_right(self.starts,n)-1;a,b=self.starts[idx:idx+2];u=(n-a)/max(1,b-a-1);k=CUTS[idx][1]
        if k in MAPS:im=self.map(k,u)
        elif k in PAIR:im=self.pair(k,u)
        elif k in ('ares','sturm'):im=self.single(k,u)
        elif k in ('cover','end'):im=self.opener(u,k=='end')
        elif k=='kpz':im=self.calibration(u)
        else:im=getattr(self,k)(u)
        folio(im,idx,n/FPS)
        # Small advancing ticket edge on the cut. Never flash a full white frame.
        dt=(n-a)/FPS
        if idx and dt<.22:
            w=round(46*(1-smooth(dt/.22)));ImageDraw.Draw(im).polygon([(0,0),(w+2,0),(0,520)],fill=VERM)
        if k=='end' and u>.88:im=Image.blend(im,NIGHT,.83*smooth((u-.88)/.12))
        return im
