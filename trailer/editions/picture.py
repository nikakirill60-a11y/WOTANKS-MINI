"""720p picture edit. Cropped game rushes, photographed meshes and original motion titles."""
import json
import math
from functools import lru_cache
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE=Path(__file__).resolve().parent; ROOT=HERE.parent.parent
W,H=1280,720; R=Image.Resampling
WHITE=(239,244,242); MINT=(134,231,211); GOLD=(250,195,118); PEACH=(247,166,124); GREY=(170,195,199); BLACK=(9,18,25)
ROM=['I','II','III','IV','V','VI','VII','VIII','IX','X']
LENS={'cradle':108,'debut':132,'scout':100,'foundry':112,'tiger':112,'titan':164,'summit':168,'carrier':112,'scope':152,'first':124,'team':180,'salvo':180,'drive':120}
OLD={'team','salvo','drive'}

def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)
@lru_cache(90)
def face(n,w):
    f=ImageFont.truetype(str(HERE.parent/'fonts/Oswald.ttf'),n);f.set_variation_by_axes([w]);return f
@lru_cache(450)
def sprite(s,n,w,color):
    f=face(n,w);l,t,r,b=f.getbbox(s,anchor='ls');im=Image.new('RGBA',(max(1,r-l+2),max(1,b-t+2)));ImageDraw.Draw(im).text((1-l,1-t),s,font=f,anchor='ls',fill=color);return im,l-1,t-1

def txt(im,s,x,y,n,color=WHITE,w=550,align='left',limit=None):
    if limit:
        while n>12 and face(n,w).getlength(s)>limit:n-=1
    p,l,t=sprite(s,n,w,color)
    if align=='center':x-=p.width*.5
    elif align=='right':x-=p.width
    im.paste(p,(round(x+l),round(y+t)),p)

def rect(im,xy,c):ImageDraw.Draw(im).rectangle(tuple(round(v) for v in xy),fill=c)
def line(im,xy,c,width=1):ImageDraw.Draw(im).line(tuple(round(v) for v in xy),fill=c,width=width)
def kick(im,s,x,y,c=MINT):
    rect(im,(x,y-12,x+30,y-9),c);txt(im,s,x+43,y,19,c,520)

def center_paste(im,src,cx,cy,w,h=None):
    size=(round(w),round(h if h is not None else w*src.height/src.width));sub=src if size==src.size else src.resize(size,R.BICUBIC)
    pos=(round(cx-size[0]/2),round(cy-size[1]/2));im.paste(sub,pos,sub if sub.mode=='RGBA' else None)

@lru_cache(12)
def photo(path):
    with Image.open(path) as a:return a.convert('RGB')
@lru_cache(28)
def transparent(path):
    with Image.open(path) as a:return a.convert('RGBA')

y,x=np.mgrid[0:H,0:W].astype('float32'); x/=W;y/=H
VIGN=np.clip(((x-.5)**2*2+(y-.51)**2*1.45-.14)*.48,0,.30)
BLACK_FRAME=Image.new('RGB',(W,H),BLACK)
MASKS={k:Image.fromarray(np.uint8(np.clip(a+VIGN,0,.94)*255)) for k,a in {
 'bottom':.79*np.clip((y-.57)/.36,0,1)**1.25,'top':.79*np.clip((.53-y)/.28,0,1)*np.maximum(0,1-x/.82),
 'soft':.11*np.maximum(0,(y-.60)/.40),'left':.87*np.maximum(0,1-x/.68)**1.25}.items()}
LUT={k:[min(255,max(0,round((v-110)*contrast+110+sh*(1-v/255)-hi*(v/255)**2))) for sh,hi in channels for v in range(256)] for k,(contrast,channels) in {
 'epic':(1.115,[(0,-5),(1,1),(5,9)]),'patch':(1.075,[(0,2),(4,0),(5,1)])}.items()}

def shade(im,mode):return Image.composite(BLACK_FRAME,im,MASKS[mode])
@lru_cache(8)
def board(theme):
    full=theme=='epic';main={'japan':(91,45,46),'ussr':(77,67,44),'germany':(41,75,89),'epic':(149,85,36)}.get(theme,(36,87,87))
    glow=np.exp(-((x-(.68 if full else .64))/.53)**2-((y-(.54 if full else .42))/.43)**2)
    light=np.exp(-((x-.84)/.15)**2-((y-.34)/.13)**2) if full else 0
    arr=np.stack([v+glow*k+light*h for v,k,h in zip((8,17,25),main,(38,23,6))],2);im=Image.fromarray(np.uint8(np.clip(arr,0,255)));d=ImageDraw.Draw(im,'RGBA')
    if not full:
        for i in range(0,W,40):d.line((i,0,i,H),fill=(196,235,230,12 if i%160==0 else 5))
        for i in range(0,H,40):d.line((0,i,W,i),fill=(196,235,230,10 if i%160==0 else 5))
        for n in range(7):
            pts=[(i,round(476+18*n+18*math.sin(i/95+n*.21)+20*math.cos(i/175-n*.19))) for i in range(0,W+8,8)];d.line(pts,fill=(139,205,196,13),width=1)
    else:
        for level,(base,c) in enumerate([(407,(41,42,40,146)),(452,(33,39,40,193)),(527,(19,30,34,240))]):
            pts=[(i,base+19*math.sin(i/(91+level*23)+level*3)+9*math.cos(i/53+3*level)) for i in range(-10,W+20,10)];d.polygon(pts+[(W,H),(0,H)],fill=c)
        for j in range(75):
            px=(j*773)%W;py=(j*313)%(H-100)+50;d.ellipse((px,py,px+1,py+1),fill=(248,218,160,55))
    return im

def dust(im,u):
    d=ImageDraw.Draw(im,'RGBA')
    for j in range(28):
        a=(j*581+53*u+6*math.sin(j+u*4))%W;b=(j*189+67*u)%(H-100)+48;r=1+(j%6==0);d.ellipse((a-r,b-r,a+r,b+r),fill=(245,210,137,50+j%49))

def deck(im,cx,cy,w,col=MINT):
    d=ImageDraw.Draw(im,'RGBA');h=w*.081
    for off,alpha in [(0,48),(7,23),(18,12)]:d.ellipse((cx-w*.5-off,cy-h*.5-off*.2,cx+w*.5+off,cy+h*.5+off*.2),outline=(*col,alpha),width=1)

def rail(im,level,epic=True):
    c=GOLD if epic else MINT;start,step,y0=63,44,624;line(im,(start,y0,start+9*step,y0),(90,104,105),2)
    line(im,(start,y0,start+(level-1)*step,y0),c,3)
    for j in range(10):
        r=5 if j+1==level else 3;px=start+j*step;rect(im,(px-r,y0-r,px+r,y0+r),c if j<level else (95,106,108));txt(im,ROM[j],px,y0+25,16,c if j+1==level else GREY,450,'center')

class Picture:
    def __init__(self,work,legacy,meta,proof=False):
        self.work=work;self.legacy=legacy;self.meta=meta;self.proof=proof;self.epic=meta['kind']=='full'
        self.ledger=json.loads((work/'inserts/ledger.json').read_text());self.files={}
        for k in LENS:
            p=(legacy if k in OLD else work)/('proof' if proof and k!='first' else 'frames')/k
            if p.is_dir():self.files[k]={int(f.stem):f for f in p.glob('*.jpg')}
        self.takes=[(round(t*24),k) for t,k in meta['cuts']]+[(meta['seconds']*24,'end')]
    def take(self,k,u,a=0,b=None):
        end=LENS[k]-1 if b is None else b;n=round(a+(end-a)*min(1,max(0,u)));files=self.files[k]
        if self.proof:n=min(files,key=lambda m:abs(m-n))
        return photo(files[n]).point(LUT['epic' if self.epic else 'patch'])
    def plate(self,im,k,u,cx,cy,w):
        n=round(55*min(1,max(0,u)));p=transparent(self.work/'plates'/k/f'{n:02d}.webp');center_paste(im,p,cx,cy,w)
    def icon(self,im,filename,cx,cy,w):center_paste(im,transparent(ROOT/'models'/filename),cx,cy,w)
    def pano(self,u,update=False):
        im=board('cyan' if update else 'epic').copy()
        if update:
            deck(im,910,567,729);self.plate(im,'GPZ',u,898,390,765)
        else:
            deck(im,981,441,524,GOLD);self.plate(im,'MAUS',.62-.30*u,987,366,571)
            deck(im,810,585,716,GOLD);self.plate(im,'IS7',.28+.48*u,807,485,807);dust(im,u)
        return im
    def poster(self):return self.pano(.56,not self.epic)
    @staticmethod
    def upper(im,nation,title,info):
        kick(im,nation,58,88);txt(im,title,56,159,63,WHITE,650);txt(im,info,1221,149,21,GREY,400,'right',480)
    def pair(self,u,theme,head,title,info,entries,foot):
        im=board(theme).copy();self.upper(im,head,title,info)
        for j,(k,name,level,info2) in enumerate(entries):
            x0=54+j*600;cx=x0+285;d=ImageDraw.Draw(im,'RGBA');d.rounded_rectangle((x0,193,x0+572,579),radius=5,fill=(7,18,24,100),outline=(146,192,193,65))
            rect(im,(x0+19,213,x0+25,236),MINT);txt(im,level,x0+38,233,21,GREY,500)
            deck(im,cx,461,443);self.plate(im,k,min(1,.04+.92*u),cx,363,550)
            txt(im,name,cx,523,49,WHITE,600,'center',543);txt(im,info2,cx,558,24,GREY,410,'center',543)
        txt(im,foot,65,642,28,MINT,460,limit=1152);return im
    def footage(self,k,u,kicktext,title,sub,mode='bottom',a=0,b=None):
        im=shade(self.take(k,u,a,b),mode);y0=101 if mode=='top' else 472;dx=round(17*(1-smooth(u*12)))
        kick(im,kicktext,60+dx,y0);txt(im,title,58+dx,y0+77,70,WHITE,620,limit=1156)
        if sub:txt(im,sub,61+dx,y0+123,31,WHITE,440,limit=1150)
        return im
    def update(self,k,u):
        if k in ('version','release'):
            im=self.pano(u,True)
            if k=='version':
                kick(im,'БЮЛЛЕТЕНЬ ДЕПО  /  CITY TANKS',61,141);txt(im,'ОБНОВЛЕНИЕ',57,252,67,WHITE,650);txt(im,'1.3',48,498,241,MINT,680);txt(im,'Первая САУ выходит из ангара',64,577,33,WHITE,450)
            else:
                kick(im,'ОБНОВЛЕНИЕ 1.3',61,179);txt(im,'CITY',58,317,122,WHITE,650);txt(im,'TANKS',58,439,127,MINT,690);txt(im,'ARTA  /  Аренда на 4 боя',64,546,38,WHITE,500)
            return im
        if k=='carrier':return self.footage(k,u,'КОЛЛЕКЦИОННАЯ МАШИНА   /   II УРОВЕНЬ','G.Pz. Mk. VI (e)','Первая в игре САУ с арт-прицелом')
        if k=='scope':return self.footage(k,u,'ИГРОВОЙ КАДР   /   ТРЕНИРОВКА','Арт-прицел','Вид сверху · сведение · выстрел')
        if k=='rental':
            im=board('cyan').copy();self.upper(im,'АНГАР   /   ПРОМОКОД','Аренда на 4 боя','БЕСПЛАТНО  /  ОДИН РАЗ НА ПРОФИЛЬ')
            d=ImageDraw.Draw(im,'RGBA');d.rounded_rectangle((64,207,1216,604),radius=12,fill=(9,24,30,214),outline=(153,217,205,141),width=2)
            for j in range(21):line(im,(688,222+j*18,688,230+j*18),(91,131,131),2)
            txt(im,'ВВЕДИ В АНГАРЕ',104,271,24,GREY,500);txt(im,'ARTA',91,431,160,MINT,680);txt(im,'G.Pz. Mk. VI (e)',104,495,40,WHITE,490)
            for j in range(4):
                x0=105+j*122;rect(im,(x0,527,x0+103,563),(36,72,73));txt(im,f'БОЙ  0{j+1}',x0+12,554,21,WHITE,500)
            self.plate(im,'GPZ',1-u,951,361,462);sub=photo(self.work/'inserts/rental.png').crop((27,60,274,143));center_paste(im,sub,952,524,324)
            return im
        if k=='bots':return self.footage('team',u,'КОМАНДНЫЙ БОЙ  /  БОТЫ','Боты стали умнее','Разведчики расходятся по секторам' if u<.54 else 'При малом запасе прочности бот может отойти','top')
        if k=='roster':
            im=board('cyan').copy();self.upper(im,'ЖРЕБИЙ  /  ПРИМЕР ИЗ ИГРЫ','Команды больше не зеркальные','СЛУЧАЙНЫЙ СОСТАВ  /  7 × 7')
            for j,team in enumerate(self.ledger['roster']):
                x0=60+j*601;c=(134,227,209) if j==0 else PEACH;rect(im,(x0,181,x0+560,225),tuple(int(v*.26) for v in c));txt(im,['СОЮЗНИКИ','ПРОТИВНИКИ'][j],x0+16,212,23,c,550)
                for q,item in enumerate(team):
                    if u+.04<q*.012:continue
                    y0=237+q*50;line(im,(x0,y0+45,x0+558,y0+45),(46,66,74));self.icon(im,item['art'],x0+65,y0+23,93);txt(im,item['n'],x0+127,y0+35,29,WHITE,500,limit=358);txt(im,ROM[item['t']-1],x0+534,y0+33,24,c,500,'right')
            txt(im,'Новый бой — независимый подбор для обеих сторон.',65,641,31,MINT,460);return im
        if k=='japan':return self.pair(u,'japan','ЯПОНИЯ   /   НОВЫЕ ВЕТКИ','Две дороги от Renault Otsu','ОДИН ОБЩИЙ ТАНК I УРОВНЯ', [('STB-1','STB-1','X   /   СРЕДНИЙ','через STA-1 и Type 61'),('TYPE-5-H','Type 5 Heavy','X   /   ТЯЖЁЛЫЙ','через O-Ho и Type 4 Heavy')],'Две отдельные ветки исследования')
        if k=='soviet':return self.pair(u,'ussr','СССР   /   ТЯЖЁЛЫЕ','После ИС','РАЗНЫЕ ПУТИ ИССЛЕДОВАНИЯ',[('OBJ-705A','Объект 705А','X   /   ТЯЖЁЛЫЙ','ИС-М  /  Объект 705'),('ST-II','СТ-II','X   /   ДВА СТВОЛА','ИС-2-II  /  ИС-3-II')],'СТ-II: оба ствола стреляют одновременно')
        if k=='salvo':return self.footage('salvo',u,'СТ-II   /   ИГРОВОЙ КАДР','Два ствола. Один залп.','2 × 440  /  880 урона в этом бою' if u>.6 else 'Одно нажатие — два снаряда','top',45,151)
        if k=='td':return self.pair(u,'ussr','СССР   /   ПТ-САУ','Два финала ветки ПТ','ОБЩИЙ ПУТЬ ДО СУ-101',[('OBJ-2684','Объект 268 Вариант 4','X   /   ПТ-САУ','через Объект 263 (IX)'),('OBJ-263-X','Объект 263','X   /   ПТ-САУ','через СУ-122-54 (IX)')],'Объект 263 на IX и на X уровне — разные исследуемые машины')
        if k=='drum':
            im=board('ussr').copy();self.upper(im,'СССР   /   ТЯЖЁЛЫЙ','ТЭТ-100','X УРОВЕНЬ');deck(im,883,547,627);self.plate(im,'TET-100',u,892,418,752)
            txt(im,'Три выстрела',64,363,77,WHITE,650);txt(im,'по очереди.',65,443,76,MINT,660);txt(im,'Барабан · не двойной залп',67,506,31,GREY,450)
            for j in range(3):rect(im,(70+j*67,546,121+j*67,561),MINT if u>.20*j else (53,76,75))
            return im
        if k=='leopard':return self.footage('drive',u,'ГЕРМАНИЯ   /   X УРОВЕНЬ','Leopard 1','Средний танк  /  до 70 км/ч','top')
        if k=='german':return self.pair(u,'germany','ГЕРМАНИЯ   /   ТЯЖЁЛЫЕ','Выбор на X уровне','ПОСЛЕ VK 45.02 (P) AUSF. B',[('PZKPFW-VII','Pz.Kpfw. VII','X  /  ТЯЖЁЛЫЙ','первый финал ветки'),('VK-7201-K','VK 72.01 (K)','X  /  ТЯЖЁЛЫЙ','второй финал ветки')],'От Tiger (P)  /  две машины на выбор')
        if k=='chain':
            im=board('germany').copy();self.upper(im,'ГЕРМАНИЯ   /   ОТ TIGER I','Путь к Kampfpanzer 67','ТРИ ПОСЛЕДОВАТЕЛЬНЫХ УРОВНЯ')
            for j,(id,n) in enumerate([('PZ-55','Pz.Kpfw. 55'),('VPZ-57','Versuchspanzer 57'),('KPZ-67','Kampfpanzer 67')]):
                cx=231+j*408;d=ImageDraw.Draw(im,'RGBA');d.rounded_rectangle((cx-183,213,cx+183,563),4,fill=(8,19,26,122),outline=(148,196,196,65));txt(im,ROM[7+j],cx,273,42,MINT,630,'center');self.plate(im,id,u,cx,391,362);txt(im,n,cx,520,38,WHITE,570,'center',348)
                if j<2:line(im,(cx+186,393,cx+218,393),MINT,3);line(im,(cx+212,387,cx+219,393,cx+212,400),MINT,3)
            txt(im,'VIII, IX, X  /  Каждая машина открывает следующую.',61,636,32,MINT,460);return im
        raise ValueError(k)
    def full_shot(self,k,u,tag,title,level=None,sub=None,a=0,b=None):
        im=shade(self.take(k,u,a,b),'bottom');yy=570 if level else 608
        kick(im,tag,64,yy-70,GOLD);txt(im,title,60,yy,69,WHITE,640,limit=1112)
        if level:rail(im,level)
        if sub:txt(im,sub,1215,638,25,GREY,450,'right',610)
        return im
    def gallery(self,u,side,index,model=None):
        tank=self.ledger['routes'][side][index];im=board('epic').copy();deck(im,895,533,649,GOLD)
        if model:self.plate(im,model,u,880,406,795)
        else:self.icon(im,tank['art'],866,404,565+25*smooth(u))
        kick(im,['ВЕТКА СССР','ВЕТКА ГЕРМАНИИ'][side]+'   /   ДЕРЕВО РАЗВИТИЯ',62,161,GOLD)
        txt(im,ROM[index],58,346,140,GOLD,650);txt(im,tank['n'],62,444,77,WHITE,620,limit=590);txt(im,'Уровень за уровнем.',67,511,32,GREY,420);rail(im,index+1);return im
    def full(self,k,u):
        if k=='cradle':return self.full_shot(k,u,'БРАУЗЕРНАЯ ИГРА   /   ПЕРВЫЙ УРОВЕНЬ','МС-1',1)
        if k=='debut':return self.full_shot(k,u,'ЗЕЛЁНАЯ ДОЛИНА','За воротами',None,'Первый выезд')
        if k=='first':return self.take(k,u)
        if k=='xp':
            im=board('epic').copy();img=photo(self.work/'inserts/tree.jpg');z=smooth(u);cx=421-48*z;cy=352+12*z;ww=865-134*z;hh=ww*.57
            crop=img.resize((713,406),R.BICUBIC,box=(cx-ww*.46,cy-hh/2,cx+ww*.54,cy+hh/2)) if cx-ww*.46>=0 else img.crop((0,152,864,644)).resize((713,406),R.BICUBIC)
            im.paste(crop,(511,157));ImageDraw.Draw(im).rectangle((510,156,1224,564),outline=(126,127,109),width=2);kick(im,'ПЕРВОЕ ИССЛЕДОВАНИЕ',59,182,GOLD);txt(im,'Опыт',56,332,113,WHITE,660);txt(im,'становится',61,403,61,GOLD,560);txt(im,'машиной.',61,474,61,GOLD,560);rail(im,2);return im
        if k=='foundry':return self.full_shot(k,u,'ЛИТЕЙНЫЙ КВАРТАЛ','КВ-1',5)
        if k=='squad':return self.full_shot('team',u,'ГРУЗОВОЙ ПОРТ  /  15 × 15','Теперь — в строю',None,None,47,179)
        if k=='scout':return self.full_shot(k,u,'ДОРОГА К MAUS  /  ГЕРМАНИЯ','Leichttraktor',1)
        if k=='tiger':return self.full_shot(k,u,'МЕДНЫЙ КАРЬЕР  /  ГЕРМАНИЯ','Tiger (P)',7)
        if k=='mauschen':return self.gallery(u,1,8,'MAUSCHEN')
        if k=='titan':return self.full_shot(k,u,'ТЯЖЁЛЫЙ ТАНК   /   X УРОВЕНЬ','MAUS',10)
        if k=='memory':
            ix=min(4,int(u*5));return self.gallery((u*5)%1,0,ix,'MS1' if ix==0 else None)
        if k=='ancestor':return self.gallery(u,0,7 if u<.7 else 8,'IS3' if u<.7 else None)
        if k=='summit':
            if u>=131/167:return self.full_shot(k,u,'ЛЕДОВАЯ ПЕРЕПРАВА  /  КАДР ИЗ ИГРЫ','Попадание')
            return self.full_shot(k,u,'ДОРОГА К ИС-7   /   СССР','ИС-7',10)
        if k=='final':
            im=self.pano(u);kick(im,'ПОЛНЫЙ ТРЕЙЛЕР',62,170,GOLD);txt(im,'CITY',59,328,147,WHITE,680);txt(im,'TANKS',56,470,147,GOLD,690);txt(im,'Пройди путь от I до X уровня.',62,551,35,WHITE,470);return im
        if k=='browser':
            im=board('epic').copy();dust(im,u);kick(im,'CITY TANKS   /   I — X',61,152,GOLD);txt(im,'Прямо',58,283,106,WHITE,670);txt(im,'в браузере.',58,398,105,GOLD,680);txt(im,'На компьютере или телефоне',65,460,32,WHITE,430)
            # A browser-window end slate, containing a frame of the real playable guest session.
            x0,y0,ww,hh=666,190,549,309;rect(im,(x0-6,y0-38,x0+ww+6,y0+hh+5),(52,66,69));rect(im,(x0-4,y0-35,x0+ww+4,y0),(26,39,46))
            for j in range(3):ImageDraw.Draw(im).ellipse((x0+9+j*14,y0-22,x0+15+j*14,y0-16),fill=(121,143,145))
            txt(im,'CITY TANKS   /   index.html',x0+68,y0-10,16,GREY,420);center_paste(im,self.take('first',.26),x0+ww/2,y0+hh/2,ww,hh)
            rect(im,(65,506,122,509),GOLD);txt(im,'TELEGRAM',66,550,21,GREY,550);txt(im,'@blitz_legacy',65,606,49,WHITE,610);txt(im,'https://t.me/blitz_legacy',1213,608,39,GOLD,500,'right');return im
        raise ValueError(k)
    def frame(self,i):
        j=next(n for n in range(len(self.takes)-1) if self.takes[n][0]<=i<self.takes[n+1][0]);start,k=self.takes[j];stop=self.takes[j+1][0]
        u=(i-start)/max(1,stop-start-1);im=self.full(k,u) if self.epic else self.update(k,u)
        fade=(max(0,1-(i-start)/6)*.46 if j else max(0,1-i/18)*.84)+max(0,1-(stop-1-i)/4)*(.27 if stop<self.meta['seconds']*24 else 0)
        if fade>0:im=Image.blend(im,BLACK_FRAME,min(.9,fade))
        if self.epic:
            rect(im,(0,0,W,48),BLACK);rect(im,(0,672,W,H),BLACK);txt(im,'CITY TANKS   /   ОТ I ДО X',46,31,16,GREY,550);txt(im,'ИГРА В БРАУЗЕРЕ',1233,31,16,GOLD,500,'right')
            txt(im,'C I T Y    T A N K S',46,702,14,GREY,450);line(im,(1048,695,1232,695),(55,69,70),2);line(im,(1048,695,1048+184*(i/(self.meta['seconds']*24-1)),695),GOLD,2)
        else:
            rect(im,(0,0,W,34),BLACK);rect(im,(0,681,W,H),BLACK);txt(im,'CITY TANKS   /   ВЕСТНИК ОБНОВЛЕНИЯ',45,23,15,WHITE,520);txt(im,'ВЕРСИЯ  1.3',1231,23,16,MINT,540,'right')
            txt(im,f'CT   /   1.3      •      {j+1:02d}  /  15',46,706,16,GREY,450)
            for n in range(15):rect(im,(964+n*18,699,976+n*18,702),MINT if n==j else (58,78,82))
        return im
