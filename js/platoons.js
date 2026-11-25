// Registered accounts only. SQL serializes seats/readiness and the loading barrier;
// the high-frequency game stream has its own lifetime and never touches cloud saves.
const Platoons = (() => {
  const el = id=>document.getElementById('platoon-'+id), desk=el('desk');
  let session=null;
  const errors={missing:'Взвод закрыт или код не найден.', full:'Во взводе уже три игрока.',
    occupied:'Этот аккаунт уже во взводе. Выйдите на другом устройстве. После потери связи место освободится автоматически.',
    tank:'Этой машины нет в облачном ангаре. Проверьте сохранение.', not_ready:'Для выезда нужен хотя бы один готовый союзник.',
    state:'Состав или состояние взвода изменилось.', invalid:'Не удалось подтвердить данные взвода.'};
  const status=text=>{ if (el('status').textContent!==text) el('status').textContent=text; };
  function paint(s) {
    const r=s?.room;
    el('guest').hidden=!!s; el('setup').hidden=!s||!!r; el('room').hidden=!r;
    el('back').textContent=r?'Покинуть взвод':'В ангар';
    el('create').disabled=el('join').querySelector('button').disabled=!!s?.working || !GameState.owned.includes(GameState.selected);
    if (!r) return;
    el('code').value=r.code; el('map').textContent='Сектор: '+BattleMaps.specs[r.map].name+' · 7×7';
    const list=JSON.stringify(r.members);
    if (s.list!==list) {
      s.list=list; el('members').replaceChildren(...r.members.map(m=>{
        const row=document.createElement('li'), name=document.createElement('b'), vehicle=document.createElement('small'), state=document.createElement('em');
        name.textContent=m.nick+(m.seat===r.me?' · вы':''); vehicle.textContent=DB[m.tank]?.n || m.tank;
        state.textContent=m.seat===0?'Командир':m.ready?'Готов':'Не готов'; row.append(name,vehicle,state); return row;
      }));
    }
    const own=r.members.find(m=>m.seat===r.me), host=r.me===0, ready=r.members.length>=2 && r.members.every(m=>m.ready);
    el('deploy').textContent=host?'В бой взводом':own?.ready?'Снять готовность':'Готов к бою';
    el('deploy').disabled=!!s.working || r.phase!=='lobby' || (host && !ready);
    el('device').disabled=r.phase!=='lobby' || (!host && !!own?.ready);
  }
  function lease() {
    if (crypto.randomUUID) return crypto.randomUUID();
    // Non-TLS LAN static servers may lack randomUUID but still have getRandomValues.
    const b=crypto.getRandomValues(new Uint8Array(16)); b[6]=(b[6]&15)|64; b[8]=(b[8]&63)|128;
    return [...b].map((v,i)=>([4,6,8,10].includes(i)?'-':'')+v.toString(16).padStart(2,'0')).join('');
  }
  function open() {
    if (session || GameState.gameActive || battleLaunch || Accounts.switching) return;
    const conn=Accounts.platoonConnection(), map=document.getElementById('map-select').value;
    if (conn) session={conn,ticket:lease(),lastOK:performance.now(),chain:Promise.resolve(),room:null};
    el('vehicle').textContent=(DB[GameState.selected]?.n || 'Выберите машину в ангаре')+' · ваша карта: '+BattleMaps.specs[map].name;
    el('device').value=matchMedia('(pointer: coarse)').matches?'mobile':'pc'; el('key').value='';
    paint(session); status(''); desk.showModal();
  }
  function detach() {
    const s=session; session=null;
    if (desk.open) desk.close(); if (!s) return;
    clearTimeout(s.timer); s.net?.stop();
    // A late create/join response must not strand a seat. Use the same lease, AFTER
    // pending mutations; an old tab can never remove a newer session's seat.
    if (s.requested) s.chain.catch(()=>{}).then(()=>s.conn.rpc('leave',s.ticket)).catch(()=>{});
  }
  function fail(s,text) {
    if (session!==s) return;
    if (s.net) { backToGarage(); battleNotice('Выезд взвода отменён',text+' Награда за незавершённый бой не начислена.'); }
    else { detach(); battleNotice('Связь со взводом',text); }
  }
  function later(s) {
    if (session!==s || !s.room) return;
    clearTimeout(s.timer);
    const ms=s.room.phase==='live' && !s.net?.result ? 3800 : 1200;
    s.timer=setTimeout(()=>{
      if (session!==s) return;
      if (s.prepAt && !s.net?.live && performance.now()-s.prepAt>85000) { fail(s,'Не все участники успели загрузить карту.'); return; }
      const op=s.net?.result?'finish':s.prepared && s.room.phase==='loading'?'loaded':'poll';
      request(s,op,op==='finish'?{result:s.net.result}:{});
    },ms);
  }
  function request(s,op,args={}) {
    // Polls and button actions cannot overwrite a newer phase with an older reply.
    clearTimeout(s.timer);
    const work=s.chain.catch(()=>{}).then(async()=>{
      if (s!==session) return;
      const r=await s.conn.rpc(op,s.ticket,args);
      if (s!==session) return;
      if (r.error) {
        if (s.room && (r.error==='missing' || r.error==='occupied')) fail(s,r.error==='missing'?'Командир или союзник покинул взвод.':errors.occupied);
        else status(errors[r.error] || errors.invalid);
        return;
      }
      s.lastOK=performance.now(); s.room=r;
      if (r.relay && s.net) s.net.useHttp();
      if (r.phase==='lobby') {
        paint(s); status(r.me===0 ? r.members.length===1?'Передайте код другу, который вошёл в аккаунт.':r.members.every(m=>m.ready)?'Все готовы к выезду.':'Дождитесь готовности союзников.' : r.members.find(m=>m.seat===r.me)?.ready?'Ждём команды на выезд.':'Проверьте управление и подтвердите готовность.');
      } else if (r.phase==='loading' && !s.net) prepare(s);
      else if (r.phase==='live' && s.prepared && !s.net.live) s.net.start();
      else if (r.phase==='done' && s.prepared && !s.settled) {
        s.settled=true;
        if (!s.net.live) s.net.start();
        const [damage,kills,bonus]=r.result.scores[r.me]; GameState.battleDmg=damage; GameState.battleKills=kills; GameState.XP+=bonus;
        endBattle(r.result.won); detach(); GameState.platoon=null;
      }
    }).catch(()=>{
      if (s!==session) return;
      if (s.room && performance.now()-s.lastOK>26000) fail(s,'Связь с сервером потеряна.');
      else status('Нет ответа сервера взводов. Проверьте интернет и повторите попытку.');
    }).finally(()=>later(s));
    s.chain=work; return work;
  }
  async function prepare(s) {
    try {
      s.prepAt=performance.now();
      s.net=new PlatoonMatch(s.room,{
        finish:result=>request(s,'finish',{result}), lost:()=>fail(s,'Потеряна связь между участниками.'),
        fallback:()=>request(s,'relay'), frame:packet=>s.conn.frame(s.ticket,packet)
      });
      GameState.controlMode=el('device').value; document.body.classList.toggle('mobile-mode',GameState.controlMode==='mobile');
      desk.close(); battleNotice('Сбор взвода','Подключаем участников к общему полю боя…');
      if (s.room.relay) s.net.useHttp();
      else try { await s.net.connect(s.conn); }
      catch {
        if (session!==s) return;
        if (!s.net.http) await request(s,'relay');
        if (!s.net.http) throw Error('relay');
      }
      if (session!==s) return;
      if (!await launchBattle(7,s.net)) { if (session===s) fail(s,'Не удалось загрузить поле боя.'); return; }
      if (session!==s) return;
      s.prepared=true; request(s,'loaded');
    } catch { fail(s,'Не удалось подключить защищённый канал взвода.'); }
  }
  async function button(op) {
    const s=session; if (!s || s.working || !Accounts.active) return;
    s.working=true; paint(s);
    try {
      const args={};
      if (op==='create' || op==='join') {
        args.tank=GameState.selected;
        if (op==='create') args.map=document.getElementById('map-select').value;
        else args.code=el('key').value.trim().toUpperCase();
        status('Проверяем машину и подключаемся…'); await s.conn.sync(); if (s!==session) return;
      } else if (op==='ready') args.ready=!s.room.members.find(m=>m.seat===s.room.me).ready;
      s.requested=true; await request(s,op,args);
    } catch { if (s===session) status('Сначала синхронизируйте ангар с облаком в профиле игрока.'); }
    finally { s.working=false; if (s===session) paint(s); }
  }
  el('create').onclick=()=>button('create'); el('join').onsubmit=e=>{e.preventDefault(); button('join');};
  el('deploy').onclick=()=>{ if (session?.room) button(session.room.me===0?'start':'ready'); };
  el('copy').onclick=()=>{
    const s=session, field=el('code'); field.focus(); field.select(); status('Код выделен: его можно скопировать вручную.');
    navigator.clipboard?.writeText(field.value).then(()=>{if(s===session) status('Код скопирован. Передайте его союзнику.');}).catch(()=>{});
  };
  el('login').onclick=()=>{detach(); Accounts.open('login');}; el('back').onclick=detach;
  desk.addEventListener('cancel',e=>{e.preventDefault(); detach();});
  window.addEventListener('pagehide',e=>{
    if (!session) return;
    // A back/forward cached page may return with its old JS heap. Never resume a
    // disconnected battlefield or charge a second sortie on restoration.
    if (e.persisted && session.net) fail(session,'Вкладка с боем была закрыта.');
    else detach();
  });
  return {open,detach};
})();
