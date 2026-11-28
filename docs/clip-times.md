# КД внутри барабана · CITY TANKS 1.5

Интервал отсчитывается **от выстрела до следующего выстрела в том же барабане**. Например, Foch (155) с заряженным барабаном может выстрелить на 0-й, 5-й и 10-й секунде; только после третьего выстрела начинается его полная перезарядка. Значения ниже — для игрового каталога MINI, не для реальной техники.

| Интервал | Машины MINI | Основание для интервала |
|---:|---|---|
| 0,13 с | Pz.Kpfw. II, Pz.Kpfw. II Ausf. J | 20-мм кассеты: Pz. II [1](https://tanks.gg/v13700ru/tank/pz-ii), Ausf. J [3](https://tanks.gg/v0918/tank/pz-ii-j). У Pz. II важна модификация: это не однозарядный вариант. |
| 0,14 с | VK 16.02 Leopard | Кассетный вариант 3 cm M.K. 103 [1](https://tank-compare.com/en/data/germany/light-tanks/vk_16_02_leopard/70). |
| 0,17 с | Pz.Kpfw. I Ausf. C, Luchs | [Pz. I C](https://tanks.gg/tank/pz-i-c), [Luchs](https://tanks.gg/tank/luchs). |
| 0,30 с | Ares 75, Ares 85, Ares 90 | Темп автоматического огня [Ares 75](https://thearmoredpatrol.com/2026/01/08/wot-%F0%9F%87%BA%F0%9F%87%B8ares-75-detailed-stats/), [Ares 85](https://thearmoredpatrol.com/2026/01/08/wot-ares-85-detailed-stats/), Ares 90 [1](https://tanks.gg/tank/ares-90). В MINI используется короткая кассета, а не перегрев. |
| 0,35 с | Т-46 | [Т-46](https://tanks.gg/tank/t-46), интервал автоматического орудия, адаптирован для кассеты MINI. |
| 0,50 с | 38M Toldi I | Баланс MINI: для этой четырёхзарядной игровой конфигурации подтверждённого внешнего интервала нет. Это не значение Toldi III. |
| 2 с | T69, T54E1, T57 Heavy, T71 DA, WT auf E 100, AMX 13 75, Bat.-Châtillon 12 t | [T69](https://tanks.gg/tank/t69/stats?cs=t-54-mod-1&ck=1), [T54E1](https://tanks.gg/tank/t54e1), [T57 Heavy](https://tanks.gg/tank/t57-heavy), [T71 DA](https://tanks.gg/tank/t71-da), [WT E 100](https://tanks.gg/tank/wt-e-100), [AMX 13 75](https://tanks.gg/tank/amx-13-75), [B-C 12 t](https://tanks.gg/tank/b-c-12-t). |
| 2,30 с | TL-7, TL-7 Олень | [TL-7](https://tanks.gg/tank/tl-7); зимняя модификация использует тот же интервал. |
| 2,50 с | AMX 12 t, AMX 50 100, AMX 50 120, AMX 50 B | [AMX 12 t](https://tanks.gg/tank/amx-12-t), [50 100](https://tanks.gg/tank/amx-50-100), [50 120](https://tanks.gg/tank/amx-50-120), [50 B](https://tanks.gg/tank/amx-50-b). |
| 2,73 с | Bat.-Châtillon 25 t AP, Bat.-Châtillon 25 t | [25 t AP](https://tanks.gg/tank/b-c-25-t-ap), [25 t](https://tanks.gg/tank/b-c-25-t). |
| 2,75 с | Kranvagn | [Kranvagn](https://tanks.gg/tank/kranvagn). |
| 3 с | Emil I, Emil II | [Emil I](https://tanks.gg/tank/emil-i), [Emil II](https://tanks.gg/tank/emil-ii). |
| 4 с | КВ-4 Федоренко, КВ-4 Михайлова, КВ-90, ТЭТ-100 | Официальная страница ветки «Мира танков» [2](https://tanki.su/ru/soviet-heavies/): берётся пауза между выстрелами, не время дозарядки. |
| 5 с | AMX 50 Foch (155) | [Foch (155)](https://tanks.gg/tank/foch-155). |

### Шесть барабанов, добавленных в локальной 1.5

| Машина | Между выстрелами | Полный КД в MINI | Игровой источник интервала |
|---|---:|---:|---|
| AMX 13 90 | 2,5 с | 20 с | tanks.gg [2](https://tanks.gg/tank/amx-13-90) |
| AMX 13 105 | 2,73 с | 21 с | tanks.gg [1](https://tanks.gg/tank/amx-13-105) |
| ERAC 105 Proto | 2,5 с | 12,5 с | двухзарядная версия Blitz [1](https://blitzkit.app/ru/tanks/erac-105-proto/) |
| Projet Louis | 2,4 с | 13 с | двухзарядная версия Blitz [2](https://blitzkit.app/ru/tanks/projet-louis/) |
| Projet Murat | 2 с | 12,5 с | двухзарядная версия Blitz [1](https://blitzkit.app/ru/tanks/projet-murat/) |
| Bat.-Châtillon 155 58 | 10 с | 48 с | tanks.gg [1](https://tanks.gg/tank/b-c-155-58) |

Из внешних игровых карточек взята именно строка **Intra-clip reload** или её аналог. Разные версии игр, орудия и размеры магазина могут отличаться. Полная перезарядка, число снарядов и урон в MINI по-прежнему берутся из её собственного каталога `models/catalog.js`. Для игры доступ в интернет не нужен.

### Национальная серия

В таблицах серии указаны число и урон снарядов и **полный** КД, но не интервал внутри барабана. Для MINI приняты следующие игровые интервалы:

| Интервал | Машины |
|---:|---|
| 0,13 с | Т-60, Pz.Kpfw. I |
| 0,17 с | Pz.Kpfw. II Ausf. G |
| 0,35 с | MTLS-1G14 (поочерёдно из двух стволов) |
| 1 с | AMX 13 57 |
| 1,5 с | Panhard EBR 75 (FL 10) |
| 2 с | Strv m/42-57 Alt A.2, Strv 74A2, Bat.-Châtillon Bourrasque |
| 2,25 с | Somua SM |
| 2,5 с | UDES 03 Alt 3, Lorraine 40 t, ELC EVEN 90 |
| 2,75 с | EMIL 1951 |
| 4 с | Char Futur 4 |

Объект 703 Вариант II даёт **одновременный** залп 2 × 390, общий КД 19 с. Это не барабан.
