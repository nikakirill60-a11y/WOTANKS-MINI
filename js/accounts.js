// Optional online profile. No auth client, clock request or cloud save in a fresh guest session.
// Only the publishable key is distributed; PostgreSQL authorizes the authenticated UUID.
const Accounts = (() => {
  const url = 'https://tkkpdtfhcwwondonfjsi.supabase.co', key = 'sb_publishable_payWOUHbHzhug84GdD4K6A_GxmcFf1X';
  const table = 'city_tanks_saves_v1', tabKey = 'ct_account_tab_v1';
  const el = id => document.getElementById(id);
  let client, tab, player = null, busy = false, syncTimer;
  let serverTime = 0, timeAt = 0;
  const now = () => serverTime + performance.now() - timeAt;
  const message = text => { el('account-message').textContent = text; };
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
    const bearer = await token(p);
    const r = await fetch(`${url}/rest/v1/${route}`, {method, cache:'no-store', signal:AbortSignal.timeout(9000),
      headers:{apikey:key,Authorization:'Bearer '+bearer,'Content-Type':'application/json',Prefer:'return=representation'},
      ...(body && {body:JSON.stringify(body)})});
    if (!r.ok) throw Object.assign(Error('rest'),{status:r.status});
    return r.json();
  }
  async function readRemote(p) {
    const rows = await rest(p,`${table}?player_id=eq.${encodeURIComponent(p.id)}&select=revision,progress`);
    if (!Array.isArray(rows) || rows.length > 1) throw Error('save format');
    if (!rows.length) return {rev:0, data:initialProgress()};
    if (!Number.isSafeInteger(rows[0].revision) || rows[0].revision < 1) throw Error('save format');
    return {rev:rows[0].revision, data:decodeProgress(rows[0].progress)};
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
    if (p.conflict) return 'Другая версия в облаке · откройте профиль';
    if (p.snapshot !== p.ack && !p.cached) return 'Копия не записана · не закрывайте вкладку';
    if (p.error) return 'Нет связи · изменения на устройстве';
    return p.snapshot === p.ack ? 'Прогресс сохранён в облаке' : 'Сохранение в облако…';
  }
  function status(p) {
    if (p !== player) return;
    setSaveStatus(stateLabel(p),!!(p.error || p.conflict || (!p.cached && p.ack !== p.snapshot)));
    el('profile-sync').textContent = stateLabel(p); el('cloud-recover').hidden = !p.conflict;
  }
  function capture() {
    const p = player; if (!p) return;
    const snapshot = progressSnapshot();
    if (snapshot !== p.snapshot) {
      p.snapshot = snapshot;
      if (snapshot !== p.ack || p.writing) cache(p); else clearDraft(p);
    }
    if (p.snapshot !== p.ack && !p.conflict) {
      if (!p.cached) cache(p);
      if (!syncTimer && !p.writing) syncTimer = setTimeout(() => { syncTimer=0; flush(p); },300);
    }
    status(p);
  }
  function flush(p) {
    if (p.writing) return p.writing;
    if (p !== player || p.conflict || p.ack === p.snapshot) return Promise.resolve();
    p.writing = (async () => {
      while (p === player && p.ack !== p.snapshot) {
        const snapshot = p.snapshot, revision = p.rev+1, progress = JSON.parse(snapshot);
        let rows;
        try {
          rows = p.rev === 0 ? await rest(p,table+'?select=revision','POST',{player_id:p.id,revision,progress}) :
            await rest(p,`${table}?player_id=eq.${p.id}&revision=eq.${p.rev}&select=revision`,'PATCH',{revision,progress});
        } catch (e) { if (e.status !== 409) throw e; }
        if (rows?.[0]?.revision !== revision) {
          // A lost response may already have committed. Never blindly upsert over a newer revision.
          const remote = await readRemote(p);
          if (JSON.stringify(remote.data) !== snapshot) { p.conflict = true; break; }
          p.rev = remote.rev;
        } else p.rev = revision;
        p.ack = snapshot; p.error = false;
        if (p.ack === p.snapshot) clearDraft(p); else cache(p);
      }
    })().catch(() => { p.error = true; }).finally(() => { p.writing = null; status(p); });
    return p.writing;
  }
  function ui() {
    el('account-form').hidden = !!player; el('cloud-profile').hidden = !player;
    el('account-mode').textContent = player ? 'Аккаунт' : 'Гость';
    el('profile-email').textContent = player?.email || '';
    el('account-modal').setAttribute('aria-busy', String(busy));
    for (const node of el('account-modal').querySelectorAll('input,button')) node.disabled = busy;
    if (player) status(player);
  }
  function changedProfile() {
    TankSales.close(); el('sale-status').hidden = true;
    if (el('container-modal').open || CrateView.active) hideContainerShop();
    el('season-note').hidden = true;
    applySettings(); updateResources(); renderTree(); renderCarousel(); updateInvCount(); updateBoosterUI();
  }
  async function activate(session) {
    if (!session?.user || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(session.user.id)) throw Error('session');
    const p = {id:session.user.id,email:session.user.email?.replace(/@players\.citytanks\.invalid$/,'') || 'Профиль',cached:false};
    const [row, ms] = await Promise.all([readRemote(p),readClock(p)]);
    const draft = findDraft(p), remote = JSON.stringify(row.data);
    // All reads succeeded. Only now save the guest and atomically change the active profile.
    saveProgress();
    p.rev = row.rev; p.ack = row.rev ? remote : null; let data = row.data;
    if (draft) {
      const recovered = decodeProgress(draft.data);
      if (JSON.stringify(recovered) !== remote) {
        data = recovered; p.conflict = draft.rev !== row.rev; p.rev = draft.rev; p.adopted = draft;
      } else forgetExact(draft.k,draft.raw);
    }
    player = p; serverTime = ms; timeAt = performance.now();
    Object.assign(GameState,data); capture(); changedProfile();
    message(p.conflict ? 'Черновик сохранён отдельно. Выберите, какую версию оставить.' : 'Вы вошли. Гостевой ангар сохранён отдельно.');
  }
  function open() {
    if (GameState.gameActive) return;
    ui(); if (!el('account-modal').open) el('account-modal').showModal();
  }
  function errorText(err) {
    if (err.code === 'email_not_confirmed') return 'Сначала подтвердите почту по ссылке из письма.';
    if (err.code === 'invalid_credentials') return 'Не удалось войти. Проверьте позывной и пароль.';
    if (err.code === 'weak_password') return 'Выберите более надёжный пароль (не менее 8 символов).';
    if (err.status === 429) return 'Слишком много запросов. Попробуйте чуть позже.';
    if (err.code === 'taken') return 'Этот позывной уже занят. Войдите или выберите другой.';
    return 'Не удалось подключить профиль. Проверьте интернет и доступ к хранилищу браузера. Гостевой прогресс не изменён.';
  }
  async function run(action) {
    if (busy) return; busy = true; ui(); message('Соединение с Wot-mini…');
    try { await action(); } catch (e) {
      if (!player && tab) { try { sessionStorage.removeItem(authKey()); } catch { /* storage blocked */ } }
      message(errorText(e));
    }
    finally { busy = false; ui(); WinterSeason.refresh(true); }
  }
  function submit(event) {
    event.preventDefault(); const form = event.currentTarget, registering = event.submitter?.value === 'register';
    const handle = form.elements.handle.value.trim().toLowerCase(), password = form.elements.password.value;
    const nickname = /^[a-z0-9_]{3,24}$/.test(handle);
    if (!nickname && (registering || !handle.includes('@'))) { message('Позывной: 3–24 латинские буквы, цифры или _.'); return; }
    if (registering && (password.length < 8 || new TextEncoder().encode(password).length > 72)) { message('Для регистрации нужен пароль от 8 символов, не длиннее 72 байт.'); return; }
    const email = nickname ? handle+'@players.citytanks.invalid' : handle;
    run(async () => {
      // Probe tab storage before creating any account. Guest storage is never overwritten.
      const auth = sdk();
      if (registering) {
        const response = await fetch(url+'/functions/v1/city-tanks-register',{method:'POST',signal:AbortSignal.timeout(15000),
          headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({handle,password})});
        if (!response.ok) throw Object.assign(Error('registration'),{status:response.status,code:response.status===409?'taken':null});
      }
      const {data,error} = await auth.signInWithPassword({email,password});
      if (error) throw error;
      form.elements.password.value = '';
      await activate(data.session);
    });
  }
  function logout() {
    run(async () => {
      const p = player; capture(); await flush(p);
      if (p.snapshot !== p.ack && !p.cached) { message('Не удалось сохранить изменения. Скачайте копию или дождитесь связи.'); return; }
      clearTimeout(syncTimer); syncTimer = 0;
      // Local scope only: logging out here must not revoke the player's other devices.
      try { await sdk().signOut({scope:'local'}); } catch { /* still close the local session offline */ }
      sessionStorage.removeItem(authKey()); client?.stopAutoRefresh(); client = null;
      player = null; loadProgress(); changedProfile(); saveProgress();
      message(p.snapshot === p.ack ? 'Вы вернулись в локальный гостевой ангар.' : 'Черновик аккаунта остался на устройстве до следующего входа. Вы играете как гость.');
    });
  }
  function downloadDraft() {
    if (!player) return;
    const a = document.createElement('a'), file = URL.createObjectURL(new Blob([progressSnapshot()],{type:'application/json'}));
    a.href = file; a.download = 'city-tanks-progress.json'; a.click(); setTimeout(() => URL.revokeObjectURL(file),1000);
  }
  function recover() {
    if (!player?.conflict || !confirm('Скачать копию текущего ангара и продолжить с облачной версией?')) return;
    run(async () => {
      const p = player, row = await readRemote(p); downloadDraft(); clearDraft(p);
      p.rev=row.rev; p.ack=row.rev ? JSON.stringify(row.data) : null; p.conflict=p.error=false;
      Object.assign(GameState,row.data); p.snapshot = null; capture(); changedProfile(); message('Загружена облачная версия.');
    });
  }
  function init() {
    el('account-form').addEventListener('submit',submit);
    el('account-modal').addEventListener('cancel',e => { if (busy) e.preventDefault(); });
    el('account-modal').addEventListener('close',() => { el('account-form').elements.password.value=''; });
    window.addEventListener('online',() => { if (player) { capture(); flush(player); } });
    window.addEventListener('focus',async () => {
      const p=player; if (!p || busy || performance.now()-timeAt < 60000) return;
      try { const ms=await readClock(p); if (p===player) { serverTime=ms; timeAt=performance.now(); WinterSeason.refresh(true); } } catch { /* keep the last server clock */ }
    });
    try {
      tab=sessionStorage.getItem(tabKey);
      if (tab && sessionStorage.getItem(authKey())) {
        open(); run(async () => {
          const {data,error}=await sdk().getSession(); if (error || !data.session) throw error || Error('session');
          await activate(data.session); if (!player.conflict) el('account-modal').close();
        });
      }
    } catch { /* An offline guest can still play with all storage disabled. */ }
  }
  return {init,open,logout,recover,downloadDraft,capture,now,get active(){return !!player;},get switching(){return busy;}};
})();
