// Four original arenas. Here layout and relief are both authored 1:1 in game metres.
// model(name, x, y, footprint X/Z, height, quarter turns, destructible, colour variant).
const EXPANSION_SECTORS = {
  burgstadt: {
    name: 'Бургштадт',
    sector: '07',
    size: [800, 800],
    plan: [800, 800],
    base: [0, -251],
    spread: 73,
    hubs: [
      [-259, 12],
      [-118, 0],
      [0, 0],
      [112, -12],
      [245, 4]
    ],
    weather: ['clear', 'clear', 'rain'],
    ground: '#8e9479',
    ink: '#c3a28c',
    sky: ['#6d9bb8', '#dde1d9'],
    haze: 0.00027,
    seed: 7817,
    detail:
      'Старый город в духе Химмельсдорфа. На западе идут пути у вокзала, в центре лежит мощёная площадь, на востоке две дороги поднимаются к замку.',
    sights: [
      [-263, -34, 'Западный вокзал'],
      [0, -34, 'Ратушная площадь'],
      [240, 0, 'Замковый двор']
    ],
    hills: [
      [238, 0, 264, 255, 9, 34],
      [187, 184, 173, 180, -22, 17],
      [189, -172, 172, 182, 24, 17],
      [-190, 175, 186, 153, 13, 13],
      [-190, -192, 180, 160, -14, 13]
    ],
    layout(b) {
      // A shunting yard and a traversable crossing, not an invisible wall of trains.
      b.zone('paving', -37, 0, 336, 770); // compacted yards under the cobbled street grid
      b.zone('gravel', -272, 0, 115, 755);
      for (const x of [-312, -287, -245]) b.zone('rail', x, 0, 5, 755);
      b.model('station', -263, -34, 25, 60, 17, 1, true);
      for (const [x, y] of [
        [-312, -160],
        [-312, -137],
        [-287, 95],
        [-287, 118],
        [-245, 213],
        [-245, -238]
      ])
        b.model('wagon', x, y, 4, 19, 4.6, 1);
      for (const s of [-1, 1]) b.model('works', -352, s * 216, 29, 41, 12, 1, true);
      for (const x of [-191, -119, -49, 42, 115]) b.zone('cobble', x, 0, 17, 770);
      for (const y of [-274, -180, -109, -53, 53, 109, 180, 274]) b.zone('cobble', -36, y, 360, 15);
      b.zone('cobble', 0, 0, 140, 107);
      b.model('fountain', 0, -34, 12, 12, 4.6);
      for (const x of [-33, 32]) for (const y of [-32, 35]) b.model('planter', x, y, 11, 4, 1.7);
      // Varied eave heights, continuous frontages, short cross streets and a clear practice lane.
      for (const [i, x] of [-157, -84, -3, 78].entries())
        for (const [j, y] of [-321, -227, -145, -81, 0, 81, 145, 227, 321].entries()) {
          if (j === 4 && i >= 2) continue;
          if (i === 2 && j === 3) b.model('townhall', x, y, 42, 23, 24, 0, true);
          else if ((i + j) % 3 !== 0) {
            // Paired frontages give a block one continuous street wall and two distinct roofs.
            for (const s of [-1, 1])
              b.model(
                'townhouse',
                x + s * 12.8,
                y,
                25.4,
                24 + ((i + j) % 4) * 2,
                13 + ((i + j + s + 4) % 4) * 2,
                s < 0 ? 0 : 2,
                true,
                (i + 2 * j + (s + 1) / 2) % 4
              );
          } else
            b.model(
              'townhouse',
              x + (j % 2 ? 2 : -2),
              y,
              43,
              26,
              14 + ((i * 3 + j) % 4) * 2,
              (i + j) % 4,
              true,
              (i + 2 * j) % 4
            );
        }
      // Both switchbacks meet inside the same OPEN courtyard. Walls and towers have
      // individual foundations; nothing spans or blocks the two gate openings.
      for (const s of [-1, 1]) {
        b.path('cobble', 16, [
          [114, s * 231],
          [159, s * 202],
          [174, s * 154],
          [230, s * 129],
          [268, s * 94],
          [230, s * 65],
          [240, s * 35],
          [240, 0]
        ]);
        b.model('tower', 217, s * 32, 12, 12, 21);
        b.model('tower', 265, s * 32, 12, 12, 21);
        b.model('rampart', 205, s * 32, 14, 7, 9);
        b.model('rampart', 279, s * 32, 15, 7, 9);
        b.model('rampart', 287, s * 17, 7, 24, 9, 1);
        b.prop('grove', 321, s * 101, 16, 14, 13);
        b.prop('grove', 149, s * 107, 12, 13, 10);
        b.model('townhouse', 145, s * 271, 29, 22, 15, 0, true, 2);
        b.zone('trail', -258, s * 181, 137, 13);
      }
      b.zone('cobble', 244, 0, 86, 69);
      b.model('keep', 195, 0, 24, 48, 30, 1);
      b.model('tower', 287, 0, 13, 13, 26);
    }
  },
  cape: {
    name: 'Мыс Фонарный',
    sector: '08',
    size: [900, 900],
    plan: [900, 900],
    base: [-238, 22],
    spread: 77,
    hubs: [
      [-20, -184],
      [-11, -79],
      [0, 0],
      [24, 77],
      [39, 177]
    ],
    weather: ['clear', 'clear', 'rain'],
    ground: '#9aa58a',
    ink: '#b89d83',
    sky: ['#5996b2', '#d3e5dc'],
    haze: 0.00029,
    seed: 8233,
    detail:
      'Старый маяк стоит на мысу между бухтами. Внутренний путь идёт через посёлок, береговой — по сухим перемычкам между лодочными сараями.',
    sights: [
      [178, -76, 'Полосатый маяк'],
      [-117, 73, 'Рыбацкий посёлок'],
      [251, 155, 'Лодочная верфь']
    ],
    hills: [
      [-169, 146, 260, 207, 27, 29],
      [141, -101, 239, 197, -10, 28],
      [-175, -199, 185, 165, -35, 17],
      [98, 208, 191, 155, 14, 20]
    ],
    layout(b) {
      for (const [x, y, w, d] of [
        [351, -228, 198, 114],
        [363, -22, 174, 138],
        [352, 218, 196, 87],
        [-300, 255, 65, 58]
      ])
        b.water(x, y, w, d);
      b.path('gravel', 17, [
        [-398, -85],
        [-235, -90],
        [-100, -25],
        [0, -6],
        [126, 35],
        [211, 113],
        [273, 100],
        [425, 127]
      ]);
      b.path('trail', 14, [
        [187, -391],
        [174, -203],
        [151, -63],
        [228, -44],
        [248, 64],
        [211, 113],
        [188, 252],
        [285, 382]
      ]);
      b.model('lighthouse', 178, -76, 13, 13, 28);
      b.model('cottage', 198, -91, 17, 11, 7, 0, true);
      for (const [i, [x, y]] of [
        [-117, 73],
        [-148, 83],
        [-91, 102],
        [-154, 131],
        [-66, 65],
        [46, -58],
        [-61, -108],
        [-303, -136],
        [75, 211],
        [-209, 261],
        [118, -247]
      ].entries())
        b.model('cottage', x, y, 18, 12, 7 + (i % 3), i % 4, true, i % 3);
      for (const [x, y] of [
        [251, 155],
        [296, 125],
        [229, -217],
        [216, 23],
        [-247, 226]
      ])
        b.model('boathouse', x, y, 27, 14, 8, 1, true);
      b.model('trawler', 225, 155, 19, 7, 7, 0);
      b.model('trawler', 229, -239, 16, 6, 6, 2);
      for (const s of [-1, 1]) {
        for (const [x, y] of [
          [68, 40],
          [65, -93],
          [148, 113],
          [-187, 160],
          [-318, -162],
          [331, 314],
          [42, 297]
        ])
          b.prop('rock', s * x, s * y, 18, 13, 6);
        for (const [x, y] of [
          [101, 179],
          [206, -151],
          [-253, 74],
          [-212, -247],
          [-346, 128]
        ])
          b.prop('grove', s * x, s * y, 14, 14, 11);
      }
    }
  },
  sawmill: {
    name: 'Янтарная лесопилка',
    sector: '09',
    size: [900, 900],
    plan: [900, 900],
    base: [-218, -96],
    spread: 72,
    hubs: [
      [-111, 195],
      [-45, 81],
      [0, 0],
      [57, -87],
      [111, -195]
    ],
    weather: ['clear', 'clear', 'rain'],
    ground: '#9b905e',
    ink: '#ad825b',
    sky: ['#849fb2', '#ead5ab'],
    haze: 0.00032,
    seed: 9227,
    detail:
      'Ручей разделяет осенний лес и лесопильный двор. Два дощатых настила и центральный переезд ведут к штабелям брёвен, навесам и мельничному колесу.',
    sights: [
      [91, -95, 'Лесопильный цех'],
      [70, 111, 'Склад кругляка'],
      [-174, -140, 'Кленовая роща']
    ],
    hills: [
      [-160, -105, 250, 226, -23, 31],
      [170, 134, 249, 195, -19, 30],
      [248, -235, 214, 174, 28, 22],
      [-217, 246, 241, 171, 34, 20]
    ],
    layout(b) {
      for (const [x, y, w, d] of [
        [-8, -304, 42, 250],
        [13, -77, 46, 88],
        [0, 78, 40, 76],
        [-14, 265, 44, 159],
        [1, 377, 45, 66]
      ])
        b.water(x, y, w, d);
      for (const s of [-1, 1]) {
        b.path('trail', 16, [
          [-390, s * 154],
          [-218, s * 122],
          [-118, s * 113],
          [-23, s * 153],
          [97, s * 129],
          [222, s * 107],
          [390, s * 102]
        ]);
        b.path('gravel', 13, [
          [s * 82, -360],
          [s * 58, -185],
          [s * 44, -56],
          [s * 122, 36],
          [s * 95, 183],
          [s * 138, 374]
        ]);
        for (const [x, y] of [
          [68, -68],
          [96, -39],
          [70, 111],
          [118, -176],
          [-177, 157],
          [-300, 235],
          [300, 70],
          [205, -263]
        ])
          b.model('logs', s * x, s * y, 21, 9, 4, 0);
        for (const [x, y] of [
          [169, 64],
          [244, 88],
          [290, -160],
          [164, 137],
          [174, -140],
          [276, 236],
          [331, 321],
          [-86, 230],
          [-298, 38],
          [-208, -310],
          [55, -295]
        ])
          b.prop('grove', s * x, s * y, 16, 15, 13);
        b.model('cottage', s * 181, s * 189, 21, 12, 8, 0, true);
        b.prop('rock', s * 48, -s * 23, 10, 8, 4);
      }
      b.model('sawmill', 91, -95, 35, 21, 12, 0, true);
      b.model('sawmill', -182, 47, 28, 17, 10, 2, true);
      for (const s of [-1, 1])
        b.path('timber', 13, [
          [-22, s * 152.8],
          [42, s * 140]
        ]);
      b.zone('gravel', -7, -10, 290, 16);
      b.zone('mud', -33, 64, 18, 24);
    }
  },
  airfield: {
    name: 'Аэродром «Вираж»',
    sector: '10',
    size: [1000, 1000],
    plan: [1000, 1000],
    base: [-256, 7],
    spread: 85,
    hubs: [
      [-18, -187],
      [8, -86],
      [0, 0],
      [12, 88],
      [-12, 199]
    ],
    weather: ['clear', 'clear', 'night'],
    ground: '#8a996f',
    ink: '#a59c83',
    sky: ['#729ebd', '#e6dfbd'],
    haze: 0.0003,
    seed: 10037,
    detail:
      'Гражданский аэродром: открытая полоса с разметкой, рулёжные дорожки и закрытые ангары. За диспетчерской вышкой начинается обход по травянистым холмам.',
    sights: [
      [44, -92, 'Диспетчерская'],
      [113, -87, 'Северный ангарный ряд'],
      [202, -173, 'Стоянка самолётов']
    ],
    hills: [
      [-119, 210, 262, 230, -13, 28],
      [156, -214, 245, 219, -14, 32],
      [295, 209, 205, 182, 24, 21],
      [-279, -243, 232, 191, 31, 22]
    ],
    layout(b) {
      for (const s of [-1, 1]) b.zone('paving', s * 154, -s * 141, 202, 76);
      b.zone('asphalt', 0, -120, 865, 14);
      b.zone('asphalt', 0, 120, 850, 16);
      for (const x of [-369, -159, 159, 369]) b.zone('asphalt', x, 0, 14, 250);
      b.zone('runway', 0, 0, 866, 42);
      b.model('control', 44, -92, 15, 15, 24);
      for (const s of [-1, 1]) {
        for (const [x, y] of [
          [113, -87],
          [33, 143],
          [-248, 151],
          [-201, -205],
          [352, -267],
          [-62, 291]
        ])
          b.model('hangar', s * x, s * y, 39, 24, 12, s === 1 ? 0 : 2, true);
        for (const [x, y] of [
          [207, -172],
          [-308, 102],
          [108, 223]
        ])
          b.model('plane', s * x, s * y, 16, 13, 4, s === 1 ? 0 : 2);
        for (const [x, y] of [
          [64, 46],
          [188, 88],
          [-94, -55],
          [275, -67],
          [-324, -224],
          [351, 152]
        ])
          b.prop('crate', s * x, s * y, 9, 7, 4);
        for (const [x, y] of [
          [76, 342],
          [-256, 274],
          [332, 245],
          [185, -329],
          [-345, 55]
        ])
          b.prop('grove', s * x, s * y, 15, 13, 11);
        b.path('gravel', 15, [
          [s * 355, -360],
          [s * 288, -228],
          [s * 386, -146],
          [s * 453, 0],
          [s * 395, 141],
          [s * 236, 261],
          [s * 228, 394]
        ]);
      }
    }
  }
};
