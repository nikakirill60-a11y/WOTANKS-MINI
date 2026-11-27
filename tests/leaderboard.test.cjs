const test = require('node:test');
const assert = require('node:assert/strict');
const { database, bridge } = require('./fixtures/referral-db.cjs');
const { openGame } = require('./winter-harness.cjs');

const board = 'select * from public.city_tanks_standings_v1()';
const domain = '@players.citytanks.invalid';
async function player(pg, name, progress) {
  const id = await pg.identity(name.includes('@') ? name : name + domain);
  if (progress) await pg.rows('insert into public.city_tanks_saves_v1 values ($1,1,$2)', [id, JSON.stringify(progress)]);
  return id;
}
const scores = (rows, name) => Object.fromEntries(rows.filter(r => r.callsign === name).map(r => [r.category, r.score]));

test('public standings project only registered callsigns and scores; starter, empty fleet, rentals, queues and malformed values', async t => {
  const pg = await database(t, { standings: true });
  assert.deepEqual(await pg.as(null, board), []);
  const old = await player(pg, 'private@example.org', {
    owned: ['MS1', 'GPZ', 'T67', 'PZ-II-J', 'MS1', null, 42, {}, '', 'bad id'], rentalBattles: { T67: 5 },
    garageSlots: 20, pendingVehicles: ['TL7'], GOLD: 1000, lifetimeWins: 4, note: 'private snapshot'
  });
  const gift = await player(pg, 'gift', { GOLD: 250, XP: 1500 });
  await player(pg, 'starter');
  await player(pg, 'sold', { owned: [], selected: null, GOLD: '99000', lifetimeWins: -2 });
  await player(pg, 'arta', { owned: ['GPZ', 'MS1'], usedPromos: ['ARTA'], lifetimeWins: 1e30 });
  await player(pg, 'permanent', { owned: ['T67', 'GPZ'], totalBattles: 100, lifetimeKills: 999 });
  for (const kind of ['anonymous', 'deleted']) {
    const id = await player(pg, kind, { GOLD: 99999, lifetimeWins: 900 });
    await pg.rows(`update auth.users set ${kind === 'anonymous' ? 'is_anonymous=true' : 'deleted_at=now()'} where id=$1`, [id]);
  }
  const rows = await pg.as(null, board), nick = 'Танкист-' + old.slice(0, 6);
  assert.equal(rows.length, 18);
  assert.deepEqual(scores(rows, nick), { tanks: 3, wins: 4, gold: 1000 });
  assert.deepEqual(scores(rows, 'gift'), { tanks: 1, wins: 0, gold: 250 });
  assert.deepEqual(scores(rows, 'arta'), { tanks: 1, wins: 0, gold: 0 });
  assert.deepEqual(scores(rows, 'sold'), { tanks: 0, wins: 0, gold: 0 });
  assert.deepEqual(scores(rows, 'starter'), { tanks: 1, wins: 0, gold: 0 });
  assert.deepEqual(scores(rows, 'permanent'), { tanks: 2, wins: 0, gold: 0 });
  assert.ok(rows.every(r => r.is_self === false));
  assert.deepEqual(Object.keys(rows[0]).sort(), ['callsign', 'category', 'entry_no', 'is_self', 'place', 'score']);
  assert.doesNotMatch(JSON.stringify(rows), /private|example\.org|anonymous|deleted|@/);
  assert.equal(JSON.stringify(rows).includes(old), false);
  assert.deepEqual((await pg.as(gift, board)).filter(r => r.is_self).map(r => r.callsign), ['gift', 'gift', 'gift']);
  // SECURITY DEFINER is confined to the projection: RLS and direct table grants are unchanged.
  await assert.rejects(pg.as(null, 'select progress from public.city_tanks_saves_v1'), /permission denied/);
  await assert.rejects(pg.as(gift, 'select email from auth.users'), /permission denied/);
  assert.deepEqual(await pg.as(gift, 'select player_id from public.city_tanks_saves_v1'), [{ player_id: gift }]);
});

test('shared ranks, deterministic ten-player cutoff and only the caller’s additional row; scores advance or fall on next read', async t => {
  const pg = await database(t, { standings: true });
  let first, last;
  for (let i = 11; i >= 0; i--) {
    const id = await player(pg, 'pilot' + String(i).padStart(2, '0'), i === 0 ? { owned: ['MS1', 'T67'], lifetimeWins: 5, GOLD: 250 } : {});
    if (!i) first = id;
    if (i === 11) last = id;
  }
  const top = await pg.as(null, board);
  assert.equal(top.length, 30);
  for (const category of ['tanks', 'wins', 'gold']) {
    const list = top.filter(r => r.category === category);
    assert.deepEqual(list.map(r => [r.callsign, r.place, r.entry_no]), Array.from({ length: 10 }, (_, i) => ['pilot0' + i, i ? 2 : 1, i + 1]));
  }
  assert.equal((await pg.as(first, board)).length, 30);
  const personal = await pg.as(last, board);
  assert.equal(personal.length, 33);
  assert.ok(personal.filter(r => r.entry_no > 10).every(r => r.is_self && r.callsign === 'pilot11' && r.entry_no === 12 && r.place === 2));
  await pg.as(last, 'update public.city_tanks_saves_v1 set revision=2,progress=$1 where player_id=$2', [JSON.stringify({ GOLD: 250 }), last]);
  const gold = (await pg.as(null, board)).filter(r => r.category === 'gold');
  assert.deepEqual(gold.slice(0, 3).map(r => [r.callsign, r.place, r.score]), [['pilot00', 1, 250], ['pilot11', 1, 250], ['pilot01', 3, 0]]);
  await pg.as(first, 'update public.city_tanks_saves_v1 set revision=2,progress=$1 where player_id=$2', [JSON.stringify({ owned: [], selected: null, GOLD: 0 }), first]);
  const afterSale = (await pg.as(first, board)).filter(r => r.is_self);
  assert.deepEqual(scores(afterSale, 'pilot00'), { tanks: 0, wins: 0, gold: 0 });
  assert.equal(afterSale.find(r => r.category === 'tanks').place, 12);
});

const status = page => page.locator('#standings-status').innerText();
const loaded = page => page.waitForFunction(() => !document.getElementById('standings-refresh').disabled);
const names = page => page.locator('#standings-table tbody th').allInnerTexts();

test('mobile guest: opt-in only, three independent boards, loading, empty, stale, offline and retry without uploading a guest', async t => {
  const { pg, route } = await bridge(t, { standings: true });
  const requests = []; let offline = false, release, started;
  const firstRequest = new Promise(resolve => { started = resolve; });
  const { page, click, saved } = await openGame(t, { mobile: true, seed: { GOLD: 900000, lifetimeWins: 205 }, route: async r => {
    if (r.request().method() !== 'OPTIONS') {
      requests.push(r.request().url());
      assert.match(r.request().url(), /\/rpc\/city_tanks_standings_v1$/);
      assert.equal(r.request().headers().authorization, undefined);
      assert.deepEqual(r.request().postDataJSON(), {});
      if (requests.length === 1) await new Promise(resolve => { release = resolve; started(); });
      if (offline) return r.abort();
    }
    return route(r);
  } });
  const before = await saved();
  assert.deepEqual(requests, []);
  await click('Топы'); await firstRequest;
  assert.match(await status(page), /Загружаем/);
  assert.ok(await page.locator('#standings-refresh').isDisabled());
  release(); await loaded(page);
  assert.match(await status(page), /Пока нет зарегистрированных/);
  assert.ok(await page.locator('#standings-table').isHidden());
  await player(pg, 'fleet', { owned: ['MS1', 'T1C', 'PZ-II-J', 'T67'], rentalBattles: { T67: 3 }, GOLD: 5 });
  await player(pg, 'ace', { owned: [], selected: null, lifetimeWins: 12, GOLD: 15 });
  await player(pg, 'rich', { lifetimeWins: 4, GOLD: 25000 });
  await click('Обновить'); await loaded(page);
  assert.deepEqual(await names(page), ['fleet', 'rich', 'ace']);
  assert.equal(await page.locator('#standings-table tbody tr:first-child td:last-child').innerText(), '3');
  await click('Победы'); assert.deepEqual(await names(page), ['ace', 'rich', 'fleet']);
  await click('Золото'); assert.deepEqual(await names(page), ['rich', 'ace', 'fleet']);
  assert.equal((await page.locator('#standings-table tbody tr:first-child td:last-child').innerText()).replace(/\s/g, ''), '25000');
  assert.equal(await page.getByRole('button', { name: 'Золото', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(requests.length, 2);
  assert.ok(await page.locator('#leaderboard-modal').evaluate(d => d.scrollWidth <= d.clientWidth && d.getBoundingClientRect().width <= innerWidth));
  offline = true; await click('Обновить'); await loaded(page);
  assert.match(await status(page), /Показаны данные на/); assert.equal((await names(page))[0], 'rich');
  await page.keyboard.press('Escape'); await click('Топы'); await loaded(page);
  assert.match(await status(page), /Проверьте подключение/); assert.deepEqual(await names(page), []);
  offline = false; await click('Обновить'); await loaded(page);
  assert.match(await status(page), /Обновлено/);
  assert.equal(await page.locator('.standings-self').count(), 0);
  await click('В ангар'); assert.ok(await page.locator('#leaderboard-open').evaluate(el => el === document.activeElement));
  assert.deepEqual(await saved(), before);
});

test('account sees its own place outside the ten, then a synced reward moves it to first; logout clears the personal row', async t => {
  const { pg, route } = await bridge(t, { standings: true });
  for (let i = 0; i < 10; i++) await player(pg, 'lead' + i, { owned: ['MS1', 'T1C'], lifetimeWins: 2, GOLD: 150 });
  const { page, click } = await openGame(t, { enterGuest: false, route });
  await click('РЕГИСТРАЦИЯ'); await page.locator('#profile-handle').fill('cadet');
  await page.locator('#profile-pass').fill('fixture passphrase'); await page.locator('#account-submit').click();
  await page.waitForFunction(() => Accounts.active && !Accounts.switching);
  await click('Топы'); await loaded(page);
  for (const tab of ['Танки', 'Победы', 'Золото']) {
    await click(tab); assert.equal((await names(page)).length, 11);
    const self = page.locator('.standings-self'); assert.match(await self.innerText(), /cadet Вы · вне десятки/);
    assert.equal(await self.locator('td').first().innerText(), '11');
  }
  await click('В ангар'); await click('Код'); await page.locator('#promo-input').fill('15_zar'); await click('АКТИВИРОВАТЬ');
  await click('ЗАКРЫТЬ');
  await click('Топы'); await loaded(page); await click('Золото');
  assert.equal((await names(page)).length, 10);
  assert.match((await names(page))[0], /cadet Вы$/);
  assert.deepEqual(await page.locator('.standings-self td').allInnerTexts(), ['1', '500']);
  await click('В ангар'); await click('Профиль игрока'); await click('Выйти в гостевой ангар');
  await page.waitForFunction(() => !Accounts.active && !Accounts.switching);
  await page.locator('#account-back').click(); await click('Топы'); await loaded(page);
  assert.equal((await names(page))[0], 'cadet'); assert.equal(await page.locator('.standings-self').count(), 0);
});
