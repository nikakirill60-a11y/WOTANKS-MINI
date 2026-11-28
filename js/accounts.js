// Optional online profile. No auth client, clock request or cloud save in a fresh guest session.
// Only the publishable key is distributed; PostgreSQL authorizes the authenticated UUID.
const Accounts = (() => {
  const url = 'https://tkkpdtfhcwwondonfjsi.supabase.co', key = 'sb_publishable_payWOUHbHzhug84GdD4K6A_GxmcFf1X';
  const table = 'city_tanks_saves_v1', tabKey = 'ct_account_tab_v1', guestKey = 'ct_guest_tab_v1';
  const el = id => document.getElementById(id);
  const atEntry = () => !el('entry-screen').hidden;
  let client, tab, player = null, busy = false, syncTimer, enterHangar;
  let serverTime = 0, timeAt = 0;
  let keepReview = null; // one explicit comparison, bound to this account, snapshot and remote revision
  const now = () => serverTime + performance.now() - timeAt;
  function message(text) {
    el(atEntry() && !el('account-modal').open ? 'entry-status' : 'account-message').textContent = text;
  }
  function rememberGuest(guest) {
    try { if (guest) sessionStorage.setItem(guestKey,'1'); else sessionStorage.removeItem(guestKey); }
    catch { /* The choice still works for this visit with storage blocked. */ }
  }
  const authKey = () => 'ct_auth_v1_' + tab;
  function sdk() {
    if (client) return client;
    // Sessions stay in this tab (including reload), not in the guest data or another user's save.
    tab = sessionStorage.getItem(tabKey) || Array.from(crypto.getRandomValues(new Uint32Array(4)),x=>x.toString(16).padStart(8,'0')).join('');
    sessionStorage.setItem(tabKey, tab);
    client = new CTAuth.AuthClient({url:url+'/auth/v1', headers:{apikey:key}, storageKey:authKey(),
      storage:sessionStorage, persistSession:true, autoRefreshToken:false, detectSessionInUrl:false,
      fetch:(input, init={}) => fetch(input,{...init,signal:init.signal || AbortSignal.timeout(9000)})});
    return client;
  }
  async function token(p) {
    const {data,error} = await sdk().getSession();
    if (error || !data.session || data.session.user.id !== p.id) throw Error('session');
    return data.session.access_token;
  }
  async function rest(p, route, method='GET', body) {
    const authorization = p ? {Authorization:'Bearer '+await token(p)} : {};
    const r = await fetch(`${url}/rest/v1/${route}`, {method, cache:'no-store', signal:AbortSignal.timeout(9000),
      headers:{apikey:key,...authorization,'Content-Type':'application/json',Prefer:'return=representation'},
      ...(body && {body:JSON.stringify(body)})});
    if (!r.ok) throw Object.assign(Error('rest'),{status:r.status});
    return r.json();
  }
  async function readRemote(p) {
    const rows = await rest(p,`${table}?player_id=eq.${encodeURIComponent(p.id)}&select=revision,progress`);
    if (!Array.isArray(rows) || rows.length > 1) throw Error('save format');
    if (!rows.length) return {rev:0, data:initialProgress()};
    if (!Number.isSafeInteger(rows[0].revision) || rows[0].revision < 1) throw Error('save format');
    const raw=rows[0].progress;
    const migrate=!Array.isArray(raw.researched) || Object.hasOwn(raw,'charges') ||
      raw.inventory?.supply !== undefined || raw.inventory?.waffentrager !== undefined;
    return {rev:rows[0].revision, data:decodeProgress(raw), raw, migrate};
  }
  async function readClock(p) {
    const ms = Date.parse(await rest(p,'rpc/city_tanks_clock_v1','POST',{}));
    if (!Number.isFinite(ms)) throw Error('clock');
    return ms;
  }
  // An outbox per player AND tab keeps an offline/rejected write from replacing another
  // device's cloud save. A new tab may recover the most recent draft for the SAME UUID.
  const prefix = p => 'ct_cloud_draft_v1:'+p.id+':';
  const draftKey = p => prefix(p)+tab;
  function findDraft(p) {
    let best = null;
    for (let i=0; i<localStorage.length; i++) {
      const k = localStorage.key(i); if (!k.startsWith(prefix(p))) continue;
      const raw = localStorage.getItem(k), d = JSON.parse(raw);
      if (!Number.isSafeInteger(d.rev) || d.rev < 0 || !isProgressObject(d.data)) throw Error('draft format');
      const item = {k,raw,...d};
      if (k === draftKey(p)) return item;
      if (!best || item.at > best.at) best = item;
    }
    return best;
  }
  function forgetExact(k,raw) { if (k && localStorage.getItem(k) === raw) localStorage.removeItem(k); }
  function clearDraft(p) {
    try {
      forgetExact(draftKey(p), p.draftRaw);
      if (p.adopted) forgetExact(p.adopted.k,p.adopted.raw);
      p.adopted = p.draftRaw = null;
    } catch { /* A retained snapshot is harmless; equality is checked on recovery. */ }
  }
  function cache(p) {
    try {
      const raw = JSON.stringify({rev:p.rev,at:Date.now(),data:JSON.parse(p.snapshot)});
      localStorage.setItem(draftKey(p),raw); p.draftRaw = raw; p.cached = true;
    } catch { p.cached = false; }
  }
  function stateLabel(p) {
    if (p.conflict) return p.cached ? 'Другая версия в облаке · откройте профиль' : 'Конфликт · скачайте копию, не закрывайте вкладку';
    if (p.snapshot !== p.ack && !p.cached) return 'Копия не записана · не закрывайте вкладку';
    if (p.error) return 'Нет связи · изменения на устройстве';
    return p.snapshot === p.ack ? 'Прогресс сохранён в облаке' : 'Сохранение в облако…';
  }
  function status(p) {
    if (p !== player) return;
    setSaveStatus(stateLabel(p),!!(p.error || p.conflict || (!p.cached && p.ack !== p.snapshot)));
    el('profile-sync').textContent = stateLabel(p);
    el('cloud-conflict').hidden = !p.conflict;
    el('cloud-options').hidden = !!keepReview;
    el('cloud-keep').hidden = !p.registered;
  }
  function capture() {
    const p = player; if (!p) return;
    const snapshot = progressSnapshot();
    if (snapshot !== p.snapshot) {
      p.snapshot = snapshot;
      if (snapshot !== p.ack || p.writing || p.conflict) cache(p); else clearDraft(p);
    }
    if ((p.conflict || p.snapshot !== p.ack) && !p.cached) cache(p);
    if (p.snapshot !== p.ack && !p.conflict) {
      if (!syncTimer && !p.writing) syncTimer = setTimeout(() => { syncTimer=0; flush(p); },300);
    }
    status(p);
  }
  // Both autosave and a player-confirmed replacement require the expected revision.
  // A missing row may only be inserted, never upserted over a concurrent save.
  async function writeNext(p, expected, snapshot) {
    const revision = expected + 1, progress = JSON.parse(snapshot);
    try {
      const rows = expected === 0 ? await rest(p,table+'?select=revision','POST',{player_id:p.id,revision,progress}) :
        await rest(p,`${table}?player_id=eq.${p.id}&revision=eq.${expected}&select=revision`,'PATCH',{revision,progress});
      return Array.isArray(rows) && rows.length === 1 && rows[0].revision === revision;
    } catch (e) { if (e.status === 409) return false; throw e; }
  }
  function flush(p) {
    if (p.writing) return p.writing;
    if (p !== player || p.conflict || p.ack === p.snapshot) return Promise.resolve();
    p.writing = (async () => {
      while (p === player && p.ack !== p.snapshot) {
        const snapshot = p.snapshot, revision = p.rev+1;
        if (!await writeNext(p,p.rev,snapshot)) {
          // A lost response may already have committed. Never blindly upsert over a newer revision.
          const remote = await readRemote(p);
          if (remote.migrate || JSON.stringify(remote.data) !== snapshot) { p.conflict = true; break; }
          p.rev = remote.rev;
        } else p.rev = revision;
        p.ack = snapshot; p.error = false;
        if (p.ack === p.snapshot) clearDraft(p); else cache(p);
      }
    })().catch(() => { p.error = true; }).finally(() => { p.writing = null; status(p); });
    return p.writing;
  }
  function ui() {
    if (keepReview && (keepReview.owner !== player || !player.conflict)) discardReview();
    el('account-form').hidden = !!player; el('cloud-profile').hidden = !player;
    el('account-mode').textContent = player ? 'Аккаунт' : 'Гость';
    el('profile-email').textContent = player?.email || '';
    el('account-modal').setAttribute('aria-busy', String(busy));
    for (const node of document.querySelectorAll('#account-modal input,#account-modal button,.entry-actions button')) node.disabled = busy;
    el('account-back').textContent = atEntry() ? 'Назад' : 'В ангар';
    if (player) { el('profile-title').textContent = 'Профиль игрока'; status(player); }
  }
  function changedProfile() {
    TankSales.close(); el('sale-status').hidden = true;
    if (el('tree-modal').open) el('tree-modal').close();
    if (el('roulette-modal').open) el('roulette-modal').close();
    if (el('container-modal').open || CrateView.active) hideContainerShop();
    el('season-note').hidden = true;
    applySettings(); updateResources(); renderTree(); renderCarousel(); updateInvCount(); updateBoosterUI();
  }
  const collect = (p, rev) => rest(p,'rpc/city_tanks_referral_collect_v1','POST',{expected_revision:rev});
  function createInvite(payout,gift) {
    if (!player || GameState.gameActive) return;
    run(async () => {
      message('');
      try { Referrals.publish(await rest(player,'rpc/city_tanks_invite_v1','POST',{payout,gift})); }
      catch { el('invite-status').textContent = 'Ссылка не создана. Проверьте соединение и попробуйте ещё раз.'; }
    });
  }
  function checkInvites() {
    if (!player || GameState.gameActive) return;
    // While the modal is busy, profile switching, player input and seasonal rewards are suspended.
    run(async () => {
      message(''); const p=player; capture(); await flush(p);
      if (p.conflict || !p.rev || p.ack !== p.snapshot) {
        el('invite-status').textContent = 'Сначала синхронизируйте ангар с облаком. Награды останутся на аккаунте.'; return;
      }
      try {
        let r = await collect(p,p.rev);
        if (r.stale) {
          // Another device (or an earlier call whose reply was lost) advanced this clean save.
          const row = await readRemote(p); Object.assign(GameState,row.data);
          p.rev=row.rev; p.ack=row.migrate ? null : progressSnapshot(); capture(); await flush(p); changedProfile();
          if (p.conflict || p.ack!==p.snapshot) throw Error('migration not saved');
          r = await collect(p,p.rev); if (r.stale) throw Error('changed again');
        }
        if (!Number.isSafeInteger(r.invited) || !Number.isSafeInteger(r.gold) || !Number.isSafeInteger(r.xp) ||
            r.revision !== p.rev + Number(!!(r.gold || r.xp))) throw Error('receipt');
        GameState.GOLD += r.gold; GameState.XP += r.xp;
        p.rev=r.revision; p.ack=p.snapshot=progressSnapshot(); p.error=false; status(p); updateResources();
        Referrals.count(r.invited); const paid=Referrals.earnings(r);
        el('invite-status').textContent = paid ? 'Начислено: ' + paid + '.' : 'Все награды уже зачислены.';
      } catch { el('invite-status').textContent = 'Не удалось проверить награды. Повторите проверку при подключении.'; }
    });
  }
  async function activate(session, welcome) {
    if (!session?.user || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(session.user.id)) throw Error('session');
    const p = {id:session.user.id, registered:!session.user.is_anonymous, email:session.user.email?.replace(/@players\.citytanks\.invalid$/,'') || 'Профиль',cached:false};
    const draft = findDraft(p); let rewards;
    const load = async () => {
      // Don't advance a server revision underneath an unsent draft. On a clean login read the
      // save AFTER settlement, even if its response was lost. Ordinary login works without the RPC.
      if (!draft) try { rewards = await collect(p,null); } catch { /* retry in the referral desk */ }
      return readRemote(p);
    };
    const [row, ms] = await Promise.all([load(),readClock(p)]), remote = JSON.stringify(row.data);
    // On first entry the guest never started playing: don't migrate/write that slot behind the menu.
    const fromEntry = atEntry();
    if (!fromEntry) saveProgress();
    p.rev = row.rev; p.ack = row.rev && !row.migrate ? remote : null; let data = row.data;
    if (draft) {
      const recovered = decodeProgress(draft.data);
      if (JSON.stringify(recovered) !== remote) {
        data = recovered; p.conflict = draft.rev !== row.rev; p.rev = draft.rev; p.adopted = draft;
      } else forgetExact(draft.k,draft.raw);
    }
    player = p; serverTime = ms; timeAt = performance.now();
    Object.assign(GameState,data); rememberGuest(false); capture();
    if (fromEntry) {
      const dialog = el('account-modal');
      if (dialog.open && !p.conflict) dialog.close();
      enterHangar();
      if (p.conflict && !dialog.open) dialog.showModal();
    } else changedProfile();
    const arrived = Referrals.incoming; Referrals.resetProfile(); Referrals.count(rewards?.invited);
    if (arrived || welcome) Referrals.clear();
    const paid = Referrals.earnings(rewards);
    Referrals.announce(welcome ? `Подарок за приглашение: ${Referrals.gifts[welcome]}. Уже в вашем ангаре.` :
      arrived ? 'Подарок по ссылке предназначен только для нового аккаунта.' : paid ? 'За приглашения начислено: ' + paid + '.' : '');
    message(p.conflict ? 'Черновик сохранён отдельно. Выберите, какую версию оставить.' : 'Вы вошли. Гостевой ангар сохранён отдельно.');
  }
  function formMode(register) {
    const form = el('account-form'), password = form.elements.password;
    form.dataset.mode = register ? 'register' : 'login'; Referrals.mode(register);
    password.value = ''; password.autocomplete = register ? 'new-password' : 'current-password';
    if (register) password.minLength = 8; else password.removeAttribute('minlength');
    el('profile-title').textContent = register ? 'Регистрация' : 'Вход в аккаунт';
    el('account-intro').textContent = register ? 'Создайте личный ангар с облачным сохранением. Почта не нужна.' : 'Войдите в свой облачный ангар. В профиле можно создать ссылку для друзей.';
    el('account-hint').textContent = register ? 'Позывной: 3–24 латинские буквы, цифры или _. Пароль — от 8 символов. Сохраните его: восстановление по почте недоступно.' : 'Для прежнего аккаунта Wot-mini вместо позывного можно указать почту.';
    el('account-submit').textContent = register ? 'Создать аккаунт' : 'Войти';
    el('account-switch').textContent = register ? 'Уже есть аккаунт' : 'Регистрация';
    el('account-message').textContent = '';
  }
  function open(mode = 'login') {
    if (GameState.gameActive || busy) return;
    if (!player) formMode(mode === 'register');
    el('entry-status').textContent = '';
    ui(); if (!el('account-modal').open) el('account-modal').showModal();
    if (!player) el('profile-handle').focus();
  }
  function errorText(err) {
    if (err.code === 'email_not_confirmed') return 'Сначала подтвердите почту по ссылке из письма.';
    // Some auth gateways do not expose the SDK's version header across origins.
    if (err.code === 'invalid_credentials' || (err.status === 400 && err.message === 'Invalid login credentials'))
      return 'Не удалось войти. Проверьте позывной и пароль.';
    if (err.code === 'weak_password') return 'Выберите более надёжный пароль (не менее 8 символов).';
    if (err.status === 429) return 'Слишком много запросов. Попробуйте чуть позже.';
    if (err.code === 'invalid_invite') return 'Приглашение недействительно. Попросите другую ссылку или выберите регистрацию без приглашения.';
    if (err.code === 'taken') return 'Этот позывной уже занят. Войдите или выберите другой.';
    return 'Не удалось подключить профиль. Проверьте интернет и доступ к хранилищу браузера. Гостевой прогресс не изменён.';
  }
  async function run(action) {
    if (busy) return; busy = true; ui(); message('Соединение с Wot-mini…');
    try { await action(); } catch (e) {
      if (!player && tab) { try { sessionStorage.removeItem(authKey()); } catch { /* storage blocked */ } }
      message(errorText(e));
    }
    finally { busy = false; ui(); if (!atEntry()) WinterSeason.refresh(true); }
  }
  function submit(event) {
    event.preventDefault(); const form = event.currentTarget, registering = form.dataset.mode === 'register';
    const handle = form.elements.handle.value.trim().toLowerCase(), password = form.elements.password.value;
    const nickname = /^[a-z0-9_]{3,24}$/.test(handle);
    if (!nickname && (registering || !handle.includes('@'))) { message('Позывной: 3–24 латинские буквы, цифры или _.'); return; }
    if (registering && (password.length < 8 || new TextEncoder().encode(password).length > 72)) { message('Для регистрации нужен пароль от 8 символов, не длиннее 72 байт.'); return; }
    const email = nickname ? handle+'@players.citytanks.invalid' : handle;
    run(async () => {
      // Probe tab storage before creating any account. Guest storage is never overwritten.
      const auth = sdk(); let offer;
      if (registering) {
        offer = await Referrals.resolve();
        const response = await fetch(url+'/functions/v1/city-tanks-register',{method:'POST',signal:AbortSignal.timeout(15000),
          headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({handle,password,...(offer && {invite:offer.code})})});
        if (!response.ok) throw Object.assign(Error('registration'),{status:response.status,code:response.status===409?'taken':response.status===422?'invalid_invite':null});
        if (offer && (await response.json()).result !== 'referred') throw Error('invite receipt');
      }
      const {data,error} = await auth.signInWithPassword({email,password});
      if (error) throw error;
      form.elements.password.value = '';
      await activate(data.session,offer?.gift);
    });
  }
  function logout() {
    run(async () => {
      const p = player; capture(); await flush(p);
      if ((p.conflict || p.snapshot !== p.ack) && !p.cached) { message('Не удалось сохранить изменения. Скачайте копию или дождитесь связи.'); return; }
      clearTimeout(syncTimer); syncTimer = 0;
      // Local scope only: logging out here must not revoke the player's other devices.
      try { await sdk().signOut({scope:'local'}); } catch { /* still close the local session offline */ }
      sessionStorage.removeItem(authKey()); client?.stopAutoRefresh(); client = null;
      player = null; Referrals.resetProfile(); rememberGuest(true); loadProgress(); changedProfile(); saveProgress();
      formMode(false);
      message(p.snapshot === p.ack ? 'Вы вернулись в локальный гостевой ангар.' : 'Черновик аккаунта остался на устройстве до следующего входа. Вы играете как гость.');
    });
  }
  function downloadSave(json, name) {
    const a = document.createElement('a'), file = URL.createObjectURL(new Blob([json],{type:'application/json'}));
    a.href = file; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(file),1000);
  }
  function downloadDraft() {
    if (player) downloadSave(progressSnapshot(),'city-tanks-progress.json');
  }
  function discardReview() {
    keepReview = null;
    el('cloud-review').hidden = true; el('cloud-options').hidden = false;
    el('review-local').textContent = el('review-cloud').textContent = '';
  }
  function describeGarage(g) {
    const fmt = n => n.toLocaleString('ru-RU');
    return `Машин: ${g.owned.length} · в очереди: ${g.pendingVehicles.length}. Выбрана: ${DB[g.selected]?.n || '—'}.\n` +
      `Золото: ${fmt(g.GOLD)} · серебро: ${fmt(g.SILVER)} · опыт: ${fmt(g.XP)}.`;
  }
  function reviewDevice() {
    const p = player;
    if (!p?.registered || !p.conflict || !el('account-modal').open || GameState.gameActive) return;
    run(async () => {
      discardReview();
      let row;
      try { row = await readRemote(p); }
      catch { message('Не удалось прочитать облачную версию. Проверьте интернет. Ангар на устройстве не изменён.'); return; }
      if (p !== player || !p.conflict || !el('account-modal').open) return;
      capture();
      keepReview = {owner:p, rev:row.rev, raw:row.raw, snapshot:p.snapshot};
      el('review-local').textContent = describeGarage(JSON.parse(p.snapshot));
      el('review-cloud').textContent = row.rev ? describeGarage(row.data) : 'Облачного сохранения пока нет.';
      el('cloud-backup').hidden = !row.rev;
      el('cloud-review').hidden = false; el('cloud-options').hidden = true;
      message(''); el('review-title').focus();
    });
  }
  function keepDevice() {
    const r = keepReview, p = player;
    if (busy || !p?.registered || !p.conflict || r?.owner !== p || !el('account-modal').open || GameState.gameActive) return;
    run(async () => {
      discardReview(); capture();
      if (p.snapshot !== r.snapshot) { message('Ангар на устройстве изменился. Сравните версии ещё раз.'); return; }
      try {
        if (!await writeNext(p,r.rev,r.snapshot)) {
          message('Облако изменилось после сравнения. Замена не выполнена. Сравните версии ещё раз.'); return;
        }
      } catch {
        // The reply may have been lost after a successful write. Never guess a
        // new revision or retry an overwrite; the next comparison reads the server.
        message('Нет подтверждения сохранения. Ангар на устройстве остался прежним. Проверьте связь и сравните версии ещё раз.'); return;
      }
      // Do not load either side into GameState. A newer local edit during the
      // request stays live and is queued against the acknowledged revision.
      p.rev = r.rev+1; p.ack = r.snapshot; p.conflict = p.error = false; p.snapshot = null;
      capture(); message(p.snapshot === p.ack ? 'Ангар с этого устройства сохранён в облаке. Можно вернуться во взвод.' :
        'Выбранный ангар сохранён в облаке. Отправляем более свежие изменения с этого устройства.');
    });
  }
  function recover() {
    if (!player?.conflict || !confirm('Скачать копию текущего ангара и продолжить с облачной версией?')) return;
    run(async () => {
      const p = player, row = await readRemote(p); downloadDraft(); clearDraft(p);
      p.rev=row.rev; p.ack=row.rev && !row.migrate ? JSON.stringify(row.data) : null; p.conflict=p.error=false;
      Object.assign(GameState,row.data); p.snapshot = null; capture(); changedProfile(); message('Загружена облачная версия.');
    });
  }
  function enterGuest() {
    if (busy || !atEntry()) return;
    // Another tab may have played while the checkpoint was open. Read the guest slot now.
    loadProgress(); rememberGuest(true); enterHangar();
  }
  function init(onEnter) {
    enterHangar = onEnter;
    Referrals.init({preview:code => rest(null,'rpc/city_tanks_invite_preview_v1','POST',{code}), create:createInvite, check:checkInvites});
    el('entry-login').addEventListener('click',() => open('login'));
    el('entry-register').addEventListener('click',() => open('register'));
    el('entry-guest').addEventListener('click',enterGuest);
    el('account-switch').addEventListener('click',() => open(el('account-form').dataset.mode === 'login' ? 'register' : 'login'));
    el('account-form').addEventListener('submit',submit);
    el('account-modal').addEventListener('cancel',e => { if (busy) e.preventDefault(); });
    el('cloud-keep').addEventListener('click',reviewDevice);
    el('cloud-confirm').addEventListener('click',keepDevice);
    el('cloud-cancel').addEventListener('click',() => { discardReview(); message('Замена отменена. Оба ангара сохранены как были.'); el('cloud-keep').focus(); });
    el('cloud-backup').addEventListener('click',() => {
      if (keepReview?.owner === player && keepReview?.raw) downloadSave(JSON.stringify(keepReview.raw),`city-tanks-cloud-r${keepReview.rev}.json`);
    });
    el('account-modal').addEventListener('close',() => { discardReview(); el('account-form').reset(); });
    window.addEventListener('online',() => { if (player) { capture(); flush(player); } });
    window.addEventListener('focus',async () => {
      const p=player; if (!p || busy || performance.now()-timeAt < 60000) return;
      try { const ms=await readClock(p); if (p===player) { serverTime=ms; timeAt=performance.now(); WinterSeason.refresh(true); } } catch { /* keep the last server clock */ }
    });
    let resumeAuth = false, resumeGuest = false;
    try {
      tab = sessionStorage.getItem(tabKey);
      resumeAuth = tab && sessionStorage.getItem(authKey());
      resumeGuest = sessionStorage.getItem(guestKey) === '1';
    } catch { /* An offline guest can still play with all storage disabled. */ }
    if (resumeAuth) run(async () => {
      const {data,error} = await sdk().getSession(); if (error || !data.session) throw error || Error('session');
      await activate(data.session);
    });
    else if (Referrals.incoming) open('register');
    else if (resumeGuest) enterGuest();
  }
  // Bind the transport to this particular login. Never use a guest save or the next
  // account in the same tab. A legacy email address is not a public callsign.
  function platoonConnection() {
    const p = player;
    if (!p?.registered || busy) return null;
    const check = () => { if (p !== player) throw Error('account'); };
    return {
      async sync() {
        check(); capture(); await flush(p); check();
        if (p.conflict || p.snapshot !== p.ack) throw Error('save');
      },
      rpc(op,ticket,args={}) { check(); return rest(p,'rpc/city_tanks_platoon_v1','POST',{op,ticket,args}); },
      frame(ticket,packet) { check(); return rest(p,'rpc/city_tanks_platoon_frame_v1','POST',{ticket,packet}); },
      async socket() {
        check(); const socket = new CTRealtime.RealtimeClient(url.replace('https:', 'wss:')+'/realtime/v1', {
          params:{apikey:key}, accessToken:() => { check(); return token(p); }
        });
        await socket.setAuth(); check(); return socket;
      }
    };
  }
  // Show the latest acknowledged save, including a purchase or battle just finished.
  // Viewing as a guest does not create an auth session or upload the local hangar.
  async function standings() {
    const p = player;
    if (p) await flush(p);
    if (p !== player) throw Error('account');
    return rest(p,'rpc/city_tanks_standings_v1','POST',{});
  }
  return {init,open,logout,recover,downloadDraft,capture,now,platoonConnection,standings,
    get callsign(){return player?.registered ? (/^[a-z0-9_]{3,24}$/.test(player.email) ? player.email : 'Танкист-'+player.id.slice(0,6)) : '';},get active(){return !!player;},get switching(){return busy;}};
})();
