// Arena blueprints are authored in game metres. Instantiate a fresh copy per match:
// the picker, simulation, bots, minimap and renderer all read the same floor plan.
const BattleMaps = (() => {
  const specs = {
    city: {
      name: 'Литейный квартал',
      sector: '01',
      size: [420, 300],
      base: [-109, 0],
      spread: 68,
      hubs: [
        [-5, -69],
        [0, 0],
        [5, 69]
      ],
      weather: ['clear', 'clear', 'rain', 'night'],
      ground: '#858675',
      ink: '#a69a87',
      seed: 3709,
      detail: 'Сеть улиц между цехами и широкий центральный проспект.',
      layout(b) {
        for (const x of [-205, -140, -70, 0, 70, 140, 205]) b.zone('asphalt', x, 0, 10, 300);
        for (const y of [-71, 0, 71]) b.zone('asphalt', 0, y, 420, y === 0 ? 17 : 13);
        for (const [j, y] of [-114, -35, 35, 114].entries())
          for (const [i, x] of [-173, -107, -36, 36, 107, 173].entries()) {
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
      size: [500, 360],
      base: [-122, -15],
      spread: 49,
      hubs: [
        [-9, -59],
        [5, 12],
        [12, 77]
      ],
      weather: ['clear', 'clear', 'rain'],
      ground: '#839361',
      ink: '#a9b984',
      seed: 5903,
      detail: 'Фермы, рощи и просёлки между двумя прудами.',
      layout(b) {
        b.zone('trail', 0, 6, 500, 10);
        b.zone('trail', -64, 0, 9, 360);
        b.zone('trail', 85, 0, 9, 360);
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
      size: [540, 360],
      base: [-135, 8],
      spread: 49,
      hubs: [
        [-8, -76],
        [0, 0],
        [8, 76]
      ],
      weather: ['clear', 'clear', 'sandstorm'],
      ground: '#c6a370',
      ink: '#c1946f',
      seed: 1199,
      detail: 'Песчаная долина с каменными воротами и длинными боковыми проходами.',
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
            [216, -38, 25, 46]
          ])
            b.prop('mesa', s * x, s * y, w, h, 7 + w * 0.12);
          for (let i = 0; i < 9; i++)
            b.zone('sand', s * (-210 + 51 * i), s * (147 + 8 * Math.sin(i)), 35, 14);
          b.zone('trail', s * 135, s * 80, 170, 9);
          b.zone('mud', s * 190, s * 24, 25, 14);
          b.prop('rock', s * 37, -s * 12, 8, 8, 4);
        }
      }
    },
    port: {
      name: 'Грузовой порт',
      sector: '04',
      size: [400, 300],
      base: [0, -92],
      spread: 46,
      hubs: [
        [-56, 3],
        [0, 0],
        [73, -6]
      ],
      weather: ['clear', 'clear', 'rain', 'night'],
      ground: '#848d89',
      ink: '#bd8d70',
      seed: 4211,
      detail: 'Контейнерные ряды и три причала. Команды начинают на севере и юге.',
      layout(b) {
        b.zone('asphalt', -49, 0, 13, 300);
        b.zone('asphalt', 27, 0, 13, 300);
        for (const y of [-77, 0, 77]) b.zone('asphalt', -10, y, 380, 12);
        for (const y of [-103, -38, 38, 103]) b.water(165, y, 70, 30);
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
            [154, 74, 20, 8]
          ])
            b.prop('container', s * x, s * y, w, h, Math.abs(x) % 3 === 0 ? 5.6 : 3.1);
          b.prop('building', s * 113, -s * 115, 30, 17, 8);
        }
      }
    },
    quarry: {
      name: 'Медный карьер',
      sector: '05',
      size: [480, 340],
      base: [-128, 14],
      spread: 52,
      hubs: [
        [-12, -74],
        [0, 0],
        [12, 74]
      ],
      weather: ['clear', 'clear', 'night'],
      ground: '#a38d74',
      ink: '#c3987b',
      seed: 7137,
      detail: 'Каменные уступы разбивают площадку на кольцо с поперечными проездами.',
      layout(b) {
        for (const s of [-1, 1]) {
          b.zone('gravel', 0, s * 83, 344, 18);
          b.zone('gravel', s * 162, 0, 18, 179);
          for (const [x, y, w, h] of [
            [0, 45, 71, 16],
            [62, 27, 18, 43],
            [126, 64, 34, 13],
            [-90, 105, 68, 21],
            [29, 127, 32, 20],
            [173, 106, 42, 33],
            [-207, 41, 22, 68]
          ])
            b.prop('bench', s * x, s * y, w, h, 6 + Math.min(w, h) * 0.32);
          b.prop('crate', s * 95, s * 15, 7, 9, 4);
          b.prop('rock', s * 31, -s * 16, 11, 8, 5);
          b.zone('mud', s * 9, s * 103, 43, 10);
          b.prop('silo', s * 193, -s * 130, 10, 10, 13);
        }
        b.zone('gravel', 0, 0, 480, 10);
      }
    },
    frost: {
      name: 'Ледовая переправа',
      sector: '06',
      size: [520, 380],
      base: [-127, 0],
      spread: 67,
      hubs: [
        [0, -69],
        [0, 0],
        [0, 69]
      ],
      weather: ['snow', 'clear', 'snow'],
      ground: '#c3d1cb',
      ink: '#829b9c',
      seed: 9371,
      detail: 'Три ледовые переправы через протоку, ели и заснеженные берега.',
      layout(b) {
        b.zone('ice', 0, 0, 47, 380);
        for (const [lo, hi] of [
          [-190, -90],
          [-50, -16],
          [16, 50],
          [90, 190]
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
            [-213, -99]
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
        }
      }
    }
  };
  function create(id) {
    if (!Object.hasOwn(specs, id)) throw new Error('Неизвестная карта.');
    const spec = specs[id],
      m = BATTLE_UNITS_PER_METRE;
    const point = ([x, y]) => ({ x: x * m, y: y * m });
    const [width, height] = spec.size;
    const arena = {
      id,
      spec,
      bounds: point([width / 2, height / 2]),
      walls: [],
      zones: [],
      water: [],
      revision: 0,
      bases: [point(spec.base), point(spec.base.map((v) => -v))],
      hubs: spec.hubs.map(point),
      spread: spec.spread * m
    };
    const rect = (x, y, w, h) => ({ x: (x - w / 2) * m, y: (y - h / 2) * m, w: w * m, h: h * m });
    spec.layout({
      prop(type, x, y, w, h, tall, solid = true) {
        arena.walls.push({ ...rect(x, y, w, h), type, height: tall * m, solid, hp: 300, maxHp: 300 });
      },
      zone(type, x, y, w, h) {
        arena.zones.push({ ...rect(x, y, w, h), type });
      },
      water(x, y, w, h) {
        arena.water.push(rect(x, y, w, h));
      }
    });
    return arena;
  }
  return { specs, create };
})();
