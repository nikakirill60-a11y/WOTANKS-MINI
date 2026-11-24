// Arena blueprints are authored in game metres. Instantiate a fresh copy per match:
// the picker, simulation, bots, minimap and renderer all read the same floor plan.
const BattleMaps = (() => {
  // hills: centre x/y (m), elliptical radii (m), heading (degrees), summit (m).
  const specs = {
    city: {
      name: 'Литейный квартал',
      sector: '01',
      size: [700, 700],
      plan: [720, 540],
      base: [-224, 0],
      spread: 71,
      hubs: [
        [0, -150],
        [-5, -71],
        [0, 0],
        [5, 71],
        [0, 150]
      ],
      weather: ['clear', 'clear', 'rain', 'night'],
      ground: '#858675',
      ink: '#a69a87',
      seed: 3709,
      detail: 'Холм литейных цехов и приподнятые окраины связывают пологие улицы.',
      hills: [
        [-162, -125, 235, 185, 24, 18],
        [151, 119, 235, 188, -24, 19],
        [60, -201, 185, 156, 12, 15],
        [-87, 202, 160, 143, -30, 12]
      ],
      layout(b) {
        for (const x of [-350, -280, -210, -140, -70, 0, 70, 140, 210, 280, 350])
          b.zone('asphalt', x, 0, 12, 540);
        for (const y of [-213, -150, -71, 0, 71, 150, 213]) b.zone('asphalt', 0, y, 720, y === 0 ? 17 : 13);
        for (const [j, y] of [-241, -179, -109, -35, 35, 109, 179, 241].entries())
          for (const [i, x] of [-315, -246, -173, -107, -36, 36, 107, 173, 246, 315].entries()) {
            b.prop(
              'building',
              x + (j % 2 ? 2 : -2),
              y,
              31 + (i % 3) * 4,
              23 + (j % 2) * 7,
              7 + ((i + j) % 3) * 2
            );
            if ((i + j) % 3 === 0) b.prop('crate', x + 22, y + 13, 6, 7, 3);
          }
      }
    },
    field: {
      name: 'Зелёная долина',
      sector: '02',
      size: [1000, 1000],
      plan: [850, 620],
      base: [-216, -15],
      spread: 60,
      hubs: [
        [-18, -164],
        [-9, -65],
        [5, 12],
        [12, 77],
        [18, 172]
      ],
      weather: ['clear', 'clear', 'rain'],
      ground: '#839361',
      ink: '#a9b984',
      seed: 5903,
      detail: 'Между высокими травянистыми грядами лежат фермы и низкие берега прудов.',
      hills: [
        [-165, -118, 302, 226, -20, 33],
        [163, 120, 298, 223, -20, 32],
        [127, -288, 256, 183, 35, 23],
        [-214, 312, 241, 181, -28, 25],
        [307, -17, 184, 160, 20, 18]
      ],
      layout(b) {
        b.zone('trail', 0, 6, 850, 10);
        for (const s of [-1, 1]) {
          b.zone('trail', 0, s * 170, 820, 12);
          b.zone('trail', s * 286, 0, 10, 620);
          b.zone('stubble', s * 322, s * 108, 150, 82);
          b.zone('stubble', s * 169, -s * 232, 176, 76);
          b.water(s * 278, -s * 116, 62, 34);
          for (const [x, y] of [
            [335, 220],
            [266, -63],
            [70, -254]
          ]) {
            b.prop('barn', s * x, s * y, 21, 12, 7);
            b.prop('silo', s * (x + 18), s * (y + 2), 8, 8, 10);
          }
          for (let i = 0; i < 10; i++)
            b.prop('grove', s * (-360 + i * 75), s * (250 + 16 * Math.sin(1 + i)), 13, 13, 10);
        }
        b.zone('trail', -64, 0, 9, 620);
        b.zone('trail', 85, 0, 9, 620);
        for (const [x, y, w, h] of [
          [-158, -106, 102, 44],
          [124, 83, 108, 41],
          [-150, 63, 84, 38],
          [137, -136, 116, 42]
        ])
          b.zone('stubble', x, y, w, h);
        b.water(-42, -107, 52, 36);
        b.water(57, 103, 42, 32);
        for (const [x, y] of [
          [-175, 43],
          [-44, -36],
          [44, 44],
          [174, -46],
          [165, 133],
          [-190, -124]
        ]) {
          b.prop('barn', x, y, 17, 10, 6);
          b.prop('silo', x + 13, y - 1, 6, 6, 9);
        }
        for (const sign of [-1, 1]) {
          for (let i = 0; i < 8; i++)
            b.prop('grove', sign * (-205 + i * 51), sign * (140 + 11 * Math.sin(i * 2)), 10, 10, 9);
          for (const [x, y] of [
            [26, 28],
            [89, -57],
            [157, 80],
            [-103, 151]
          ])
            b.prop('rock', sign * x, sign * y, 12, 9, 4.5);
          b.zone('mud', sign * 37, sign * 81, 36, 16);
        }
      }
    },
    desert: {
      name: 'Песчаный рубеж',
      sector: '03',
      size: [1000, 1000],
      plan: [920, 640],
      base: [-236, 8],
      spread: 67,
      hubs: [
        [-20, -174],
        [-8, -76],
        [0, 0],
        [8, 76],
        [20, 174]
      ],
      weather: ['clear', 'clear', 'sandstorm'],
      ground: '#c6a370',
      ink: '#c1946f',
      seed: 1199,
      detail: 'Песчаные гребни тянутся наискось через пути между каменными воротами.',
      hills: [
        [-134, -140, 317, 227, 37, 35],
        [141, 149, 314, 229, 37, 36],
        [224, -229, 282, 195, 37, 27],
        [-227, 225, 281, 195, 37, 27],
        [-311, -292, 165, 128, 32, 15],
        [322, 286, 160, 128, 32, 15]
      ],
      layout(b) {
        for (const s of [-1, 1]) {
          for (const [x, y, w, h] of [
            [25, 39, 40, 17],
            [73, 70, 29, 24],
            [106, 33, 14, 19],
            [48, 111, 58, 18],
            [-77, 101, 49, 21],
            [-161, 62, 25, 14],
            [192, 111, 52, 30],
            [-211, 129, 37, 18],
            [216, -38, 25, 46],
            [305, 34, 43, 24],
            [353, 141, 65, 22],
            [240, 218, 55, 26],
            [134, 273, 39, 26],
            [13, 225, 72, 19],
            [-133, 198, 35, 34],
            [-350, 245, 61, 22]
          ])
            b.prop('mesa', s * x, s * y, w, h, 7 + w * 0.12);
          for (let i = 0; i < 9; i++)
            b.zone('sand', s * (-210 + 51 * i), s * (147 + 8 * Math.sin(i)), 35, 14);
          b.zone('trail', s * 135, s * 80, 170, 9);
          b.zone('trail', 0, s * 172, 800, 12);
          b.zone('sand', s * 342, -s * 82, 82, 84);
          b.prop('rock', s * 33, s * 282, 16, 10, 6);
          b.zone('mud', s * 190, s * 24, 25, 14);
          b.prop('rock', s * 37, -s * 12, 8, 8, 4);
        }
      }
    },
    port: {
      name: 'Грузовой порт',
      sector: '04',
      size: [800, 800],
      plan: [700, 520],
      base: [0, -160],
      spread: 55,
      hubs: [
        [-156, 4],
        [-56, 3],
        [0, 0],
        [73, -6],
        [164, -4]
      ],
      weather: ['clear', 'clear', 'rain', 'night'],
      ground: '#848d89',
      ink: '#bd8d70',
      seed: 4211,
      detail: 'С причалов у воды дороги поднимаются на складские террасы и западную насыпь.',
      hills: [
        [-173, 8, 314, 177, 83, 21],
        [-104, -219, 223, 189, 20, 18],
        [97, 165, 249, 182, 53, 18],
        [124, -134, 182, 139, 78, 13]
      ],
      layout(b) {
        for (const x of [-257, -156, -49, 27, 164, 251]) b.zone('asphalt', x, 0, 13, 520);
        for (const y of [-166, -77, 0, 77, 166]) b.zone('asphalt', -36, y, 612, 13);
        for (const y of [-184, -103, -38, 38, 103, 184]) b.water(309, y, 82, 30);
        for (const s of [-1, 1]) {
          for (const [x, y, w, h] of [
            [-105, 19, 33, 8],
            [-68, 41, 10, 29],
            [-13, 28, 24, 7],
            [57, 40, 10, 26],
            [94, 20, 31, 9],
            [108, 68, 27, 8],
            [-136, 76, 24, 9],
            [61, 116, 34, 9],
            [-98, 122, 30, 9],
            [154, 74, 20, 8],
            [201, 115, 34, 9],
            [223, 65, 10, 33],
            [249, 22, 23, 8],
            [-215, 32, 30, 9],
            [-252, 88, 10, 35],
            [-193, 194, 44, 9],
            [85, 215, 35, 11]
          ])
            b.prop('container', s * x, s * y, w, h, Math.abs(x) % 3 === 0 ? 5.6 : 3.1);
          b.prop('building', s * 113, -s * 115, 30, 17, 8);
          b.prop('building', s * 226, -s * 207, 40, 22, 10);
          b.prop('building', s * 49, -s * 198, 29, 18, 7);
        }
      }
    },
    quarry: {
      name: 'Медный карьер',
      sector: '05',
      size: [1000, 1000],
      plan: [840, 600],
      base: [-218, 14],
      spread: 63,
      hubs: [
        [-15, -160],
        [-12, -74],
        [0, 0],
        [12, 74],
        [15, 160]
      ],
      weather: ['clear', 'clear', 'night'],
      ground: '#a38d74',
      ink: '#c3987b',
      seed: 7137,
      detail: 'Гравийные съезды ведут со скальных плеч в центральную чашу карьера.',
      hills: [
        [-109, -172, 293, 223, 23, 37],
        [113, 179, 289, 223, 23, 37],
        [-291, 95, 246, 178, 75, 27],
        [286, -89, 245, 181, 74, 27],
        [27, -328, 231, 160, -15, 19],
        [-25, 322, 220, 166, -18, 20]
      ],
      layout(b) {
        for (const s of [-1, 1]) {
          b.zone('gravel', 0, s * 83, 344, 18);
          b.zone('gravel', s * 162, 0, 18, 179);
          b.zone('gravel', 0, s * 162, 696, 18);
          b.zone('gravel', s * 345, 0, 16, 342);
          for (const [x, y, w, h] of [
            [0, 45, 71, 16],
            [62, 27, 18, 43],
            [126, 64, 34, 13],
            [-90, 105, 68, 21],
            [29, 127, 32, 20],
            [173, 106, 42, 33],
            [-207, 41, 22, 68],
            [268, 40, 23, 85],
            [309, 108, 35, 18],
            [-153, 212, 76, 27],
            [33, 215, 46, 25],
            [269, 237, 79, 23],
            [-354, 207, 31, 52]
          ])
            b.prop('bench', s * x, s * y, w, h, 6 + Math.min(w, h) * 0.32);
          b.prop('crate', s * 95, s * 15, 7, 9, 4);
          b.prop('rock', s * 31, -s * 16, 11, 8, 5);
          b.zone('mud', s * 9, s * 103, 43, 10);
          b.prop('silo', s * 193, -s * 130, 10, 10, 13);
        }
        b.zone('gravel', 0, 0, 840, 10);
      }
    },
    frost: {
      name: 'Ледовая переправа',
      sector: '06',
      size: [1000, 1000],
      plan: [900, 660],
      base: [-225, 0],
      spread: 72,
      hubs: [
        [0, -183],
        [0, -69],
        [0, 0],
        [0, 69],
        [0, 183]
      ],
      weather: ['snow', 'clear', 'snow'],
      ground: '#c3d1cb',
      ink: '#829b9c',
      seed: 9371,
      detail: 'Лесистые сопки по обоим берегам спускаются к пяти низким ледовым переправам.',
      hills: [
        [-183, 78, 301, 189, 76, 29],
        [184, -81, 301, 192, 75, 29],
        [-173, -243, 229, 174, 63, 23],
        [167, 233, 234, 181, 63, 24],
        [-315, 290, 198, 165, 35, 21],
        [321, -301, 197, 168, 35, 21]
      ],
      layout(b) {
        b.zone('ice', 0, 0, 47, 660);
        for (const [lo, hi] of [
          [-330, -202],
          [-164, -90],
          [-50, -16],
          [16, 50],
          [90, 164],
          [202, 330]
        ])
          b.water(0, (lo + hi) / 2, 37, hi - lo);
        for (const s of [-1, 1]) {
          for (const [x, y] of [
            [42, 36],
            [69, -30],
            [93, 83],
            [142, 97],
            [180, 138],
            [-55, 117],
            [-125, 142],
            [-196, 61],
            [-213, -99],
            [-337, 38],
            [-260, -186],
            [319, 121],
            [-369, 221],
            [190, -257],
            [70, 234],
            [274, 57],
            [104, -168],
            [-170, -271]
          ]) {
            b.prop('grove', s * x, s * y, 12, 12, 12);
            b.prop('grove', s * (x + 11), s * (y + 9), 8, 8, 8);
          }
          for (const [x, y] of [
            [54, -14],
            [87, 119],
            [186, -43],
            [-76, 64],
            [-183, 148]
          ])
            b.prop('rock', s * x, s * y, 15, 10, 5);
          b.prop('barn', s * 162, -s * 74, 17, 9, 6);
          b.zone('trail', s * 123, s * 67, 188, 9);
          b.zone('trail', s * 191, s * 183, 334, 12);
          b.prop('barn', s * 289, -s * 216, 20, 12, 7);
          b.prop('rock', s * 225, s * 129, 17, 11, 6);
        }
      }
    }
  };
  function create(id) {
    if (!Object.hasOwn(specs, id)) throw new Error('Неизвестная карта.');
    const spec = specs[id],
      m = BATTLE_UNITS_PER_METRE;
    // Layout coordinates are a blueprint, not a new metres-per-world-unit scale.
    // Move landmarks and fit connected ground/water strips to the playable square;
    // individual buildings, vehicles, speeds and training distances stay metric.
    const [width, height] = spec.size,
      sx = width / spec.plan[0],
      sy = height / spec.plan[1];
    const point = ([x, y]) => ({ x: x * sx * m, y: y * sy * m });
    const arena = {
      id,
      spec,
      bounds: { x: (width * m) / 2, y: (height * m) / 2 },
      walls: [],
      zones: [],
      water: [],
      revision: 0,
      bases: [point(spec.base), point(spec.base.map((v) => -v))],
      hubs: spec.hubs.map(point),
      spread: spec.spread * m * (id === 'port' ? sx : sy)
    };
    const rect = (x, y, w, h, prop = false) => {
      const X = x * sx,
        Y = y * sy,
        W = prop ? w : w * sx,
        H = prop ? h : h * sy;
      const left = Math.max(-arena.bounds.x, (X - W / 2) * m),
        top = Math.max(-arena.bounds.y, (Y - H / 2) * m);
      return {
        x: left,
        y: top,
        w: Math.min(arena.bounds.x, (X + W / 2) * m) - left,
        h: Math.min(arena.bounds.y, (Y + H / 2) * m) - top
      };
    };
    spec.layout({
      prop(type, x, y, w, h, tall, solid = true) {
        arena.walls.push({ ...rect(x, y, w, h, true), type, height: tall * m, solid, hp: 300, maxHp: 300 });
      },
      zone(type, x, y, w, h) {
        arena.zones.push({ ...rect(x, y, w, h), type });
      },
      water(x, y, w, h) {
        arena.water.push(rect(x, y, w, h));
      }
    });
    // Individual trees on the edge of a grove can be knocked over. Dense groves
    // remain map cover. The soft obstacles never close a corridor to a moving tank.
    arena.trees = [];
    arena.treeRevision = 0;
    for (const [i, w] of arena.walls.entries())
      if (w.type === 'grove') {
        const x = w.x + w.w / 2 + (i % 2 ? 1 : -1) * (w.w / 2 + 7 * m),
          y = w.y + w.h * 0.4;
        if (
          Math.abs(x) > arena.bounds.x - 9 * m ||
          Math.abs(y) > arena.bounds.y - 9 * m ||
          (Math.abs(x) < 35 * m && Math.abs(y) < 15 * m)
        )
          continue;
        if (
          [...arena.water, ...arena.walls].some(
            (r) => x > r.x - 4 * m && x < r.x + r.w + 4 * m && y > r.y - 4 * m && y < r.y + r.h + 4 * m
          )
        )
          continue;
        arena.trees.push({ x, y, r: 0.32 * m, height: (6 + (i % 4)) * m, fallen: false });
      }
    arena.ground = new BattleGround(arena);
    return arena;
  }
  return { specs, create };
})();
