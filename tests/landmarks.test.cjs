const test = require('node:test');
const assert = require('node:assert/strict');
const { openGame } = require('./winter-harness.cjs');

// Launch each training sector via the normal picker; observe the actual WebGL
// batches rather than comparing the blueprint to a second list of coordinates.
test('all ten training sectors: offline scenery fits the physical cover and disappears with its owner', async (t) => {
  const { page } = await openGame(t, { webgl: true, mobile: true });
  const sectors = await page.locator('#map-select option').evaluateAll((opts) => opts.map((o) => o.value));
  assert.equal(sectors.length, 10);
  await page.evaluate(() => {
    const build = buildBattleWorld;
    buildBattleWorld = function (scene, state) {
      const world = build(scene, state);
      window.mapMeshes = scene.children.filter((m) => m.geometry?.name.startsWith('landmark:'));
      return world;
    };
  });
  for (const id of sectors) {
    await page.selectOption('#map-select', id);
    const state = await page.evaluate(async () => {
      if (!(await startTraining())) throw Error(document.querySelector('#battle-notice-text').textContent);
      stopBattleLoop();
      const g = GameState,
        a = g.arena,
        m = BATTLE_UNITS_PER_METRE,
        landmarks = a.walls.filter((w) => w.model);
      const matrix = new THREE.Matrix4();
      const remaining = new Set(landmarks);
      for (const mesh of window.mapMeshes) {
        if (!mesh.isInstancedMesh || !mesh.material.vertexColors)
          throw Error('Expected batched coloured scenery');
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          const bb = mesh.geometry.boundingBox.clone().applyMatrix4(matrix);
          const owner = landmarks.find(
            (w) =>
              mesh.geometry.name === 'landmark:' + w.model &&
              Math.abs(bb.min.x - w.x) < 0.01 &&
              Math.abs(bb.max.x - w.x - w.w) < 0.01 &&
              Math.abs(bb.min.z - w.y) < 0.01 &&
              Math.abs(bb.max.z - w.y - w.h) < 0.01 &&
              Math.abs(bb.min.y - w.baseHeight) < 0.01 &&
              Math.abs(bb.max.y - w.baseHeight - w.height) < 0.01
          );
          if (!remaining.delete(owner))
            throw Error('Unmatched scenery: ' + mesh.geometry.name + ' in ' + a.id);
        }
      }
      const victim = landmarks.find((w) => w.type === 'building');
      if (victim) damageWall(victim, victim.maxHp, g.walls.indexOf(victim));
      BattleView.draw();
      const count = window.mapMeshes.reduce((sum, b) => sum + b.count, 0);
      const stats = BattleView.stats(),
        sights = [...document.querySelectorAll('#map-sights li')].map((li) => li.textContent);
      if (a.id === 'airfield') {
        const walk = a.zones.filter((z) => z.type === 'asphalt' || z.type === 'runway'),
          nav = g.navigation;
        for (const z of walk) {
          const x = z.x + z.w / 2,
            y = z.y + z.h / 2;
          if (
            !nav.clear(
              z.w > z.h ? z.x : x,
              z.w > z.h ? y : z.y,
              z.w > z.h ? z.x + z.w : x,
              z.w > z.h ? y : z.y + z.h
            )
          )
            throw Error('Obstructed runway/taxiway');
        }
        for (let x = -430; x <= 430; x += 10)
          if (getTerrainAt(x * m, 0) !== 'runway' || Math.abs(a.ground.at(x * m, 0)) > 0.01)
            throw Error('Runway must be level');
      }
      if (
        a.id === 'sawmill' &&
        a.paths
          .filter((p) => p.type === 'timber')
          .some((p) => getTerrainAt(p.points[0].x, p.points[0].y) !== 'timber')
      )
        throw Error('Missing board deck');
      const info = {
        id: a.id,
        designs: window.mapMeshes.length,
        missing: remaining.size,
        count,
        models: landmarks.length,
        destroyed: !!victim,
        units: stats.units,
        calls: stats.calls,
        triangles: stats.triangles,
        sights: sights.length,
        legendOK: sights.every((s, i) => s === a.sights[i].name)
      };
      backToGarage();
      window.mapMeshes = null;
      return info;
    });
    assert.equal(state.id, id);
    assert.ok(state.legendOK && state.sights >= 2, id + ' chart');
    assert.equal(state.missing, 0, id);
    assert.equal(state.count, state.models - Number(state.destroyed), id + ' destruction sync');
    assert.ok(state.models >= 4 && state.designs <= 15, id + ' bounded batches');
    assert.equal(state.units, 2);
    assert.ok(
      state.calls < 95 && state.triangles > 2000 && state.triangles < 180000,
      id + ' training render budget: ' + JSON.stringify(state)
    );
  }
});
