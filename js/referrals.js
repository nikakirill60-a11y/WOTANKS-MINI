// Only an opaque invitation code travels in a link. Display and registration both look up
// the creator's immutable offer on the server; visiting the link never grants a reward.
const Referrals = (() => {
  const el = id => document.getElementById(id);
  const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  const gifts = Object.freeze({resources:'250 золота + 1000 опыта', tanks:'Pz.Kpfw. II Ausf. J навсегда + T67 на 5 боёв'});
  let incoming = new URL(location.href).searchParams.get('ref');
  let preview, cached = null, generation = 0;
  const text = () => incoming ?? el('invite-input').value.trim();
  const invalid = () => Object.assign(Error('invite'), {code:'invalid_invite'});
  function codeFor(raw) {
    let code = raw;
    if (!uuid.test(code)) {
      try { code = new URL(raw).searchParams.get('ref'); } catch { throw invalid(); }
    }
    if (!uuid.test(code)) throw invalid();
    return code.toLowerCase();
  }
  function note(s) { el('invite-offer').hidden = !s; el('invite-offer').textContent = s; }
  async function resolve() {
    if (incoming === null && !text()) return null;
    const code = codeFor(text());
    if (cached?.code !== code) {
      const result = await preview(code);
      if (!Object.hasOwn(gifts,result?.gift)) throw invalid();
      cached = {code, gift:result.gift};
    }
    return cached;
  }
  async function showOffer() {
    const ticket = ++generation;
    el('invite-clear').hidden = incoming === null && !text();
    note('Проверяем приглашение…');
    try {
      const offer = await resolve();
      if (ticket === generation) note(offer ? 'Ваш подарок за регистрацию: ' + gifts[offer.gift] + '.' : '');
    } catch(e) {
      if (ticket === generation) note(e.code === 'invalid_invite' ? 'Эта ссылка недействительна. Попросите новую у пригласившего игрока.' : 'Не удалось проверить приглашение. Для регистрации нужна связь.');
    }
  }
  function mode(register) {
    el('invite-registration').hidden = !register;
    el('invite-manual').hidden = incoming !== null;
    if (register && (incoming !== null || text())) showOffer();
    else { generation++; note(''); el('invite-clear').hidden = true; }
  }
  function clear() {
    generation++; incoming = null; cached = null; el('invite-input').value = '';
    const url = new URL(location.href); url.searchParams.delete('ref');
    try { history.replaceState(history.state,'',url.href); } catch { /* file:// can restrict URL changes */ }
    el('entry-intro').textContent = 'Выберите способ входа в ангар.';
    el('invite-manual').open = false; mode(el('account-form').dataset.mode === 'register');
  }
  function resetDesk() {
    el('invite-share').hidden = true; el('invite-url').value = ''; el('invite-status').textContent = '';
  }
  function resetProfile() {
    resetDesk(); el('referral-desk').open = false;
    for (const r of el('referral-desk').querySelectorAll('input[type=radio]')) r.checked = r.defaultChecked;
    count(null); announce('');
  }
  function announce(s) { el('referral-notice').textContent = s; el('referral-notice').hidden = !s; }
  function count(n) { el('invite-count').textContent = 'Приглашено игроков: ' + (Number.isSafeInteger(n) ? n : '—'); }
  function earnings(r) { return [r?.gold && `+${r.gold} золота`,r?.xp && `+${r.xp} опыта`].filter(Boolean).join(' и '); }
  function publish(code) {
    if (!uuid.test(code)) throw Error('invite response');
    // A file path, loopback address or access-controlled preview is not a shareable game URL.
    const u = new URL('https://wotanks-mini.vercel.app/'); u.searchParams.set('ref',code);
    el('invite-url').value = u.href; el('invite-share').hidden = false;
    el('invite-status').textContent = 'Ссылка готова. Можно пригласить нескольких друзей; награды в этой ссылке уже зафиксированы.';
  }
  async function copy() {
    const field = el('invite-url'), url = field.value; if (!url) return;
    // The platform may leave a permission prompt unanswered. Manual copy is available straight away.
    field.focus(); field.select(); el('invite-status').textContent = 'Ссылка выделена. Скопируйте её вручную, если браузер не разрешает копирование.';
    let copied = false;
    try { await navigator.clipboard.writeText(url); copied = true; } catch {
      if (field.value !== url) return;
      try { copied = document.execCommand('copy'); } catch { /* keep selected */ }
    }
    if (copied && field.value === url) el('invite-status').textContent = 'Ссылка скопирована.';
  }
  function init(callbacks) {
    preview = callbacks.preview;
    if (incoming !== null) el('entry-intro').textContent = 'Вас пригласили в CITY TANKS. Подарок выдаётся при регистрации нового аккаунта.';
    el('invite-preview').onclick = showOffer; el('invite-clear').onclick = clear;
    el('invite-input').oninput = () => { generation++; note(''); el('invite-clear').hidden = !text(); };
    el('referral-desk').onchange = resetDesk;
    el('invite-create').onclick = () => callbacks.create(...['invite-payout','invite-gift'].map(name => document.querySelector(`input[name="${name}"]:checked`).value));
    el('invite-copy').onclick = copy; el('invite-check').onclick = callbacks.check;
  }
  return {init, mode, resolve, clear, publish, count, earnings, resetProfile, announce, gifts, get incoming(){return incoming !== null;}};
})();
