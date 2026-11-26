const test = require('node:test');
const assert = require('node:assert/strict');
const { openGame } = require('./winter-harness.cjs');
const { ares, e3, e4 } = require('./fixtures/american.cjs');
const ids = (rows) => rows.map((row) => row[0]);
const patton = ['T1C', 'T2MEDIUM', 'M2MEDIUM', 'M3LEE', 'M4SHERMAN', 'M4A3E8', 'T20'];
const costs = [0, 150, 350, 1500, 4000, 8000, 25000, 60000, 120000, 195000];
const routes = [
  [patton.slice(0, 1), e3],
  [['T1C', 'T18', 'T82'], e4],
  [patton, ares]
];

test('mobile US tree: unlock both TD routes and Ares once, keeping shared tiers and the T67 rental', async (t) => {
  const owned = ['MS1', 'T28_USSR', 'T67', ...patton];
  let xp = routes.reduce((total, [prefix]) => total + costs.slice(prefix.length).reduce((a, b) => a + b), 0);
  const { page, click, saved } = await openGame(t, {
    mobile: true,
    seed: { owned, XP: xp, selected: 'T20', rentalBattles: { T67: 3 }, garageSlots: owned.length + 19 }
  });
  await click('Дерево развития');
  await click('США');
  const nodes = page.locator('#nodes .node'),
    picker = page.getByLabel('Показать ветку');
  assert.equal(await nodes.count(), 52);
  assert.equal(await picker.locator('option').count(), 9);
  const fits = await nodes.evaluateAll((ns) =>
    ns.every((n, i) =>
      ns
        .slice(i + 1)
        .every((m) => n.offsetLeft !== m.offsetLeft || Math.abs(n.offsetTop - m.offsetTop) >= n.offsetHeight)
    )
  );
  assert.ok(fits, 'unfiltered branches must not overlap');
  const before = await saved();
  await click('Характеристики: T110E4');
  assert.equal(await page.locator('#tree-status').innerText(), 'Сначала исследуйте T30');
  assert.deepEqual(await saved(), before);
  for (const [prefix, rows] of routes) {
    await picker.selectOption(rows.at(-1)[0]);
    assert.deepEqual(
      await nodes.evaluateAll((ns) => ns.map((n) => n.dataset.tankId)),
      prefix.concat(ids(rows))
    );
    for (const [j, [id, name, hp, dmg, mag, sec, pen, hull, turret, speed]] of rows.entries()) {
      await click('Исследовать: ' + name);
      owned.push(id);
      xp -= costs[prefix.length + j];
      const s = await saved();
      assert.deepEqual([s.owned, s.selected, s.XP, s.rentalBattles], [owned, id, xp, { T67: 3 }]);
      assert.deepEqual((await page.locator('#tree-stats dd').allTextContents()).slice(0, 6), [
        hp + ' HP',
        mag === 1 ? String(dmg) : `${dmg * mag} (${mag} × ${dmg})`,
        sec.toLocaleString('ru-RU') + ' с',
        pen + ' мм',
        `${hull} / ${turret ?? '—'} мм`,
        speed + ' км/ч'
      ]);
    }
  }
  await page.reload();
  const s = await saved();
  assert.deepEqual([s.owned, s.selected, s.XP], [owned, 'ARES-90', 0]);
  assert.equal(await page.locator('#bay-name').innerText(), 'Ares 90');
});

test('legacy US keys keep the right T28, Hellcat and equipment; the V is not a free duplicate', async (t) => {
  const { page, saved } = await openGame(t, {
    seed: {
      owned: ['T28_USSR', 'T28', 'T25AT', 'T28PROT', 'HELLCAT', 'T67'],
      selected: 'T28',
      modules: { T28: ['rammer'], T28_USSR: ['optics'], HELLCAT: ['turbo'] },
      rentalBattles: { T67: 2 },
      XP: 71
    }
  });
  const s = await saved();
  assert.deepEqual(s.owned, ['T28_USSR', 'T28-US', 'T25-AT', 'T28-PROTOTYPE', 'HELLCAT', 'T67']);
  assert.deepEqual(
    [s.selected, s.modules, s.rentalBattles, s.XP],
    ['T28-US', { 'T28-US': ['rammer'], T28_USSR: ['optics'], HELLCAT: ['turbo'] }, { T67: 2 }, 71]
  );
  await page.reload();
  assert.deepEqual(await saved(), s);
});

test('all 19 US exports deploy offline: distinct Hellcats, live TD hits and every round/reload of all three Ares', async (t) => {
  const rows = [...e3, ...e4, ...ares],
    byId = new Map(rows.map((row) => [row[0], row]));
  const pairs = [
    ['ARES-75', 'T30'],
    ['ARES-85', 'JACKSON'],
    ['ARES-90', 'T252'],
    ['T110E3', 'T28-US'],
    ['T110E4', 'T28-PROTOTYPE'],
    ['T95', 'T25-AT'],
    ['HELLCAT-V', 'M8A1'],
    ['HELLCAT', 'WOLVERINE'],
    ['T18', 'T82'],
    ['T82', 'T40']
  ];
  assert.deepEqual(new Set(pairs.flat()), new Set(byId.keys()));
  const { page, click } = await openGame(t, {
    webgl: true,
    seed: { owned: ids(rows), selected: 'ARES-75', garageSlots: 19 }
  });
  await page.context().setOffline(true);
  for (const [id, other] of pairs) {
    const [, name, , dmg, mag, sec] = byId.get(id),
      target = byId.get(other);
    await click('Выбрать для боя: ' + name);
    await page.waitForFunction((id) => DepotView.stats()?.id === id, id);
    assert.equal(await page.evaluate(() => DepotView.stats().triangles), byId.get(id).at(-1));
    if (!(await page.locator('#enemy-select').isVisible())) await click('ТРЕНИРОВКА');
    await page.locator('#train-nat-select').selectOption('usa');
    await page.locator('#enemy-select').selectOption(other);
    await click('НАЧАТЬ');
    const run = await page.evaluate(async () => {
      if (!(await selectControl('mobile')))
        throw Error(document.querySelector('#battle-notice-text').textContent);
      stopBattleLoop();
      const g = GameState,
        p = g.player,
        e = g.units[1],
        old = BattleClock.now,
        random = Math.random;
      try {
        let ms = BattleClock.now();
        BattleClock.now = () => ms;
        Math.random = () => 0.99;
        const models = g.units.map((u) => [
          u.id,
          ['hull', 'turret', 'gun'].reduce((n, k) => n + u.modelAsset[k].attributes.position.count / 3, 0)
        ]);
        p.lookAtPoint(e.x, e.y, e.aimHeight);
        p.slewSight(Math.PI, Math.PI);
        BattleView.syncCamera();
        BattleView.aim();
        BattleView.draw();
        if (p.sightHit().hit !== e) throw Error('Model sight not aligned: ' + p.id);
        const stats = g.units.map((u) => [
          u.hp,
          u.dmg,
          u.magSize,
          u.reloadTime / 1000,
          u.pen,
          u.armor,
          u.turretArmor,
          Math.round((u.baseSpeed * 60 * 3.6) / BATTLE_UNITS_PER_METRE)
        ]);
        const hits = [];
        for (let i = 0; i < p.magSize; i++) {
          firePlayer();
          firePlayer();
          if (g.bullets.length !== 1) throw Error('Expected single round');
          const round = g.bullets[0];
          for (let j = 0; j < 60 && g.bullets.length; j++) updateBullets();
          hits.push([round.dmg, p.curMag, e.hp, Math.round(p.nextShot - ms)]);
          ms = p.nextShot;
        }
        ms--;
        firePlayer();
        const earlyBlocked = !g.bullets.length;
        ms++;
        firePlayer();
        return {
          models,
          stats,
          hits,
          earlyBlocked,
          refill: g.bullets.length === 1 && p.curMag === p.magSize - 1
        };
      } finally {
        BattleClock.now = old;
        Math.random = random;
        backToGarage();
      }
    });
    assert.deepEqual(
      run,
      {
        models: [
          [id, byId.get(id).at(-1)],
          [other, target.at(-1)]
        ],
        stats: [byId.get(id).slice(2, -1), target.slice(2, -1)],
        hits: Array.from({ length: mag }, (_, i) => [
          dmg,
          mag - i - 1,
          target[2] - dmg * (i + 1),
          i === mag - 1 ? Math.round(sec * 1000) : 120
        ]),
        earlyBlocked: true,
        refill: true
      },
      id
    );
  }
});

test('Ares 90 can lead a regular 7×7, and all new machines are available for bot matchmaking', async (t) => {
  const { page, click } = await openGame(t, {
    webgl: true,
    seed: { owned: ['ARES-90'], selected: 'ARES-90' }
  });
  const wanted = ids([...e3, ...e4, ...ares]);
  const missing = await page.evaluate((ids) => {
    // Deterministic independent draws at all ten tiers (bot ownership is not required).
    let seed = 73;
    const rand = () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
    const missing = new Set(ids);
    for (const t of US_BRANCH)
      for (let i = 0; i < 40; i++) {
        const [allies, enemies] = makeRosters(t.id, 15, rand);
        for (const id of [...allies.slice(1), ...enemies]) missing.delete(id);
      }
    return [...missing];
  }, wanted);
  assert.deepEqual(missing, []);
  await click('7×7');
  const sortie = await page.evaluate(async () => {
    if (!(await selectControl('mobile')))
      throw Error(document.querySelector('#battle-notice-text').textContent);
    stopBattleLoop();
    try {
      BattleView.draw();
      const g = GameState;
      return [
        g.player.id,
        g.player.magSize,
        BattleView.stats().units,
        g.units.filter((u) => u.bot && u.modelAsset).length
      ];
    } finally {
      backToGarage();
    }
  });
  assert.deepEqual(sortie, ['ARES-90', 7, 14, 13]);
});
