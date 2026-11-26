"""24 fps picture edit for the complete, user-selected Russian narration."""
from bisect import bisect_right
from narration import cue_start

FPS = 24
SECONDS = 245
TITLE = 'CITY TANKS 1.4 — Зимний выезд'
# Same destination as the original full trailer (editions/cuts.py: FULL['telegram']).
HANDLE = '@blitz_legacy'
TELEGRAM = 'https://t.me/' + HANDLE[1:]
QR_ORIGIN = (878, 167)  # Native 296 px code, including its four-module quiet zone.

CUTS = [(0, 'cover'), (13.875, 'kpz'), (20.375, 'guide'), (40, 'quarry'),
        (47.25, 'burgstadt'), (53.75, 'cape'), (62.5, 'sawmill'), (72.375, 'airfield'),
        (82, 'squad'), (96.625, 'link'), (105.5, 'gift'), (119.125, 'reserve'),
        (126.75, 'boards'), (136.875, 'promo'), (147.625, 'tree'), (157.375, 'case'),
        (167.75, 'toys'), (195.25, 'fr1'), (208, 'fr2'), (213.25, 'td'),
        (223.5, 'ares'), (228.25, 'sturm'), (237.125, 'end')]
AT = {k: s for s,k in CUTS}
SPAN = {k: e-s for (s,k),(e,_) in zip(CUTS, CUTS[1:]+[(SECONDS, '')])}
assert all(s*FPS == int(s*FPS) and SPAN[k]>0 for s,k in CUTS)

CHAPTER_NAMES = {'cover':'Зимний выезд', 'kpz':'Калибровка KPz 67', 'quarry':'Улучшенные карты',
                 'burgstadt':'Бургштадт', 'cape':'Мыс Фонарный', 'sawmill':'Янтарная лесопилка',
                 'airfield':'Аэродром «Вираж»', 'squad':'Взвод против ботов', 'link':'Пригласи друга',
                 'reserve':'Офицерский резерв', 'boards':'Три рейтинга', 'promo':'Промокод 15_zar',
                 'tree':'Ёлка и ларец', 'toys':'Четыре украшения', 'fr1':'Франция', 'td':'США',
                 'sturm':'Германия', 'end':'Telegram · '+HANDLE}
CHAPTERS = [(s,CHAPTER_NAMES[k]) for s,k in CUTS if k in CHAPTER_NAMES]

# A diagram or pair of tanks follows the sentence being read, not an even division
# of the shot. The calibration demo itself runs in real time at 16 source fps.
KPZ_ACTION = AT['kpz'] + .25
CASE_OPEN = cue_start('winter',6)
FOCUS = {k:[cue_start(take,i) for i in indices] for k,take,indices in [
    ('guide','calibration',(3,4,5,6)), ('boards','ranks',(1,2,3)),
    ('toys','ornaments',(0,2,4,5)), ('fr1','france',(1,2)),
    ('fr2','france',(3,4)), ('td','usa-germany',(1,2))]}


def film_time(k,u):
    return AT[k] + u*(SPAN[k]-1/FPS)


def focus(k,u):
    return bisect_right(FOCUS[k],film_time(k,u))-1

# Names and sizes on screen come from BattleMaps; descriptions are editorial copy.
MAPS = {
 'quarry': ('Изменённый рельеф','В порту дороги спускаются к причалам. Здесь, в Медном карьере,','уклоны ведут с верхних уступов на дно чаши.'),
 'burgstadt': ('Бургштадт','От вокзала на западе улицы ведут к ратуше. На востоке два серпантина','сходятся во дворе замка: въедь с одной стороны, выезжай с другой.'),
 'cape': ('Мыс Фонарный','Полосатый маяк стоит между бухтами. Путь через рыбацкий посёлок','уходит от моря, а береговая дорога петляет между лодочными сараями.'),
 'sawmill': ('Янтарная лесопилка','Осенний лес и мельничный двор разделяет ручей. За дощатым настилом —','цех с водяным колесом и штабеля брёвен.'),
 'airfield': ('Аэродром «Вираж»','Полоса 09/27 проходит мимо ангаров и стоянок самолётов.','Сверни за диспетчерской вышкой — там начинается обход по холмам.')}
BRANCHES = ['AMX-M4-54','B-C-25-T','AMX-50-B','FOCH-155','T110E3','T110E4','ARES-90','STURMTIGER']
PAIR = {'fr1':('Франция','01 / 02',BRANCHES[:2],('Одиночный выстрел: 520','Барабан: 5 × 390')),
        'fr2':('Франция','03 / 04',BRANCHES[2:4],('Барабан: 4 × 400','Барабан: 3 × 750')),
        'td':('США','05 / 06',BRANCHES[4:6],('Неподвижная рубка','Башня поворачивается на 90° в каждую сторону'))}
# Descriptive text track doubles as a selectable, accessible chapter-by-chapter synopsis.
TEXT = {
 'cover':'CITY TANKS 1.4. Зимний выезд.',
 'kpz':'Kampfpanzer 67. Клавиша G или кнопка «Калибровка». Вход и выход занимают по 1 секунде.',
 'guide':'Снаряды · KPz 67: урон БП и КС 420 → 380; рикошет БП 70° → 75°; нормализация БП 2° → 7°; потеря пробития КС 5% → 2%. ОФ без изменений.',
 **{k:' '.join(v) for k,v in MAPS.items()},
 'squad':'2–3 зарегистрированных игрока выезжают вместе в бой 7×7. Остальные союзники и все противники — боты.',
 'link':'За каждую новую регистрацию по своей ссылке выбери 25 золота или 250 опыта. Создай ссылку и отправь её друзьям.',
 'gift':'Ты же выбираешь подарок новичку: 250 золота + 1000 опыта ИЛИ Pz.Kpfw. II Ausf. J навсегда + T67 на 5 боёв.',
 'reserve':'Офицерский резерв: общий шанс 2% на одну недостающую постоянную машину — Pz.Kpfw. II Ausf. J или T67.',
 'boards':'Три топ-10: постоянные танки в ангаре, победы за всё время и текущий баланс золота.',
 'promo':'В честь первых 15 зарегистрированных игроков: код 15_zar даёт 500 золота и 2500 опыта один раз на профиль.',
 'tree':'Игрушки хранятся в инвентаре. Вручную повесь до четырёх на ёлку. Только они дают бонусы к наградам за бой.',
 'case':'После завершённого боя шанс получить бесплатный ёлочный ларец — 20%. Внутри только одно украшение.',
 'toys':'Пряник 70%: +5% серебра. Олень 24%: +5% опыта. Ёлка 5%: +5% золота. Шар 1%: +10% ко всем трём. Хотя бы один шар на ёлке повышает шанс ларца до 30%.',
 'fr1':'Восемь веток к X уровню. Франция: AMX M4 mle. 54 и Bat.-Châtillon 25 t.',
 'fr2':'Франция: AMX 50 B и AMX 50 Foch (155).',
 'td':'От T82 расходятся американские ветки T110E3 и T110E4.',
 'ares':'США: Ares 75 → Ares 85 → Ares 90. Семь снарядов по 105, полная перезарядка 8 секунд.',
 'sturm':'Германия: от Marder II к Sturmtiger. Семь новых машин. На X уровне — 1300 урона за выстрел.',
 'end':f'CITY TANKS. Telegram-канал {HANDLE}: {TELEGRAM}. На экране также QR-код канала.'}
assert set(dict((k,t) for t,k in CUTS)) == set(TEXT)
