const test = require('node:test');
const assert = require('node:assert/strict');
const {openGame} = require('./winter-harness.cjs');

// Inspect the actual painted layer, not just a data attribute or a flag filename in the source.
async function checkCards(images, ids = []) {
  return images.evaluateAll((images, ids) => Promise.all(images.map(async (img, i) => {
    const owner = img.closest('[data-tank-id], [data-id]');
    const id = ids[i] || owner?.dataset.tankId || owner?.dataset.id, t = DB[id];
    const frame = img.parentElement, layer = getComputedStyle(frame, '::before');
    const flag = new URL('assets/flags/' + t.nat + '.webp', document.baseURI).href;
    if (frame.dataset.cardNation !== t.nat || !layer.backgroundImage.includes(`url("${flag}")`) ||
        layer.zIndex !== '-1' || layer.pointerEvents !== 'none' || Number(layer.opacity) <= 0 ||
        !frame.clientWidth || !frame.clientHeight) throw Error('Missing flag behind ' + id);
    await img.decode();
    if (img.getAttribute('src') !== 'models/' + t.thumbnail || !img.naturalWidth) throw Error('Lost cut-out for ' + id);
    return id;
  })), ids);
}

test('all twenty supplied flag plates decode from disk, including reserves, without adding research countries', async t => {
  const {page} = await openGame(t);
  const keys = 'argentina canada china czechoslovakia finland france german-empire germany hungary israel italy japan poland romania russian-empire sweden uk usa ussr vietnam'.split(' ');
  const branches = await page.evaluate(async keys => {
    const frame = document.createElement('span'); document.body.append(frame);
    try {
      for (const nat of keys) {
        frame.dataset.cardNation = nat;
        const url = getComputedStyle(frame, '::before').backgroundImage.match(/url\("([^"]+)"\)/)?.[1];
        if (url !== new URL(`assets/flags/${nat}.webp`, location.href).href) throw Error('Wrong art: ' + nat);
        const flag = new Image(); flag.src = url; await flag.decode();
      }
      return [...PLAYABLE_NATIONS].sort();
    } finally { frame.remove(); }
  }, keys);
  assert.deepEqual(branches, ['germany','hungary','sweden','usa','ussr']);
});

test('mobile: every research and special vehicle keeps its own cut-out over its national flag, independent of the browsed tree', async t => {
  const specials = ['M4A3E2','T71DA','JPANTHERII','T62A','TL7','IS6','LOWE','T34HEAVY','STA2','STRVS1','BT42','TL7OLEN'];
  const owned = ['MS1','T54','T54A',...specials];
  const {page,click,saved} = await openGame(t,{mobile:true,seed:{owned,selected:'T54A'}});
  const cards = page.locator('#tank-carousel .slot-bg img');
  const seen = new Set(await checkCards(cards));
  assert.deepEqual([...seen].sort(), [...owned].sort());
  await page.locator('#bay-poster:not([hidden])').waitFor();
  await checkCards(page.locator('#bay-poster img'), ['T54A']);
  await click('Дерево развития');
  for (const name of ['СССР','ГЕРМАНИЯ','США','ШВЕЦИЯ','ВЕНГРИЯ']) {
    await click(name);
    const ids = await checkCards(page.locator('#nodes .node img'));
    assert.ok(ids.length >= 10); ids.forEach(id => seen.add(id));
  }
  assert.equal(seen.size,166);
  assert.equal(await page.locator('.tank-slot[data-tank-id="T54"] .slot-bg').getAttribute('data-card-nation'), 'ussr');
  assert.equal(await page.locator('.tank-slot[data-tank-id="T54A"] .slot-bg').getAttribute('data-card-nation'), 'hungary');
  await click('Характеристики: T-55AM');
  await checkCards(page.locator('#tree-photo'), ['T55AM1']);
  assert.equal((await saved()).selected,'T54A');
  await click('Выбрать для боя: БТ-42'); await click('Продать: БТ-42');
  await checkCards(page.locator('#sale-photo'), ['BT42']);
  await click('Отмена'); assert.deepEqual((await saved()).owned,owned);
  assert.equal((await saved()).selected,'BT42');
});

test('premium offers and the Finnish and US Advent gifts use the same offline plates', async t => {
  const {page,click} = await openGame(t);
  await click('Премиум-магазин');
  assert.equal((await checkCards(page.locator('.offer-card img'))).length,3);
  await click('В ангар'); await click('Адвент');
  assert.deepEqual(await checkCards(page.locator('.advent-milestones img'), ['BT42','TL7OLEN']), ['BT42','TL7OLEN']);
});
