function showControlModal(mode) {
  if (!GameState.owned.includes(GameState.selected)) return;
  GameState.pendingBattle = mode;
  document.getElementById('control-modal').classList.add('show');
}
function selectControl(type) {
  GameState.controlMode = type;
  document.getElementById('control-modal').classList.remove('show');
  document.body.classList.toggle('mobile-mode', type === 'mobile');
  if (GameState.pendingBattle === 'train') return startTraining();
  return startBattle(GameState.pendingBattle);
}

// One controller for both capture APIs. Listeners are installed once; the WebGL
// canvas itself is replaced between sorties. No running input is saved to disk.
const BattleInput = (() => {
  const el = (id) => document.getElementById(id),
    g = GameState;
  let state = 'off',
    request = 0,
    timer = 0,
    stick = null,
    look = null,
    fire = null,
    lastSignal = -Infinity,
    rosterTick = -1,
    rosterRows = [],
    dx = 0,
    dy = 0,
    freshLock = false;
  const running = () => state === 'locked' || state === 'relative' || state === 'touch';
  function resetStick() {
    g.joystickData = { active: false, dx: 0, dy: 0, mag: 0 };
    const z = el('joystick-zone');
    z.classList.remove('floating');
    z.style.left = z.style.top = '';
    el('joystick-stick').style.transform = '';
  }
  function consumeLook() {
    if (dx || dy) BattleView.rotate(dx, dy);
    dx = dy = 0;
  }
  function clear() {
    dx = dy = 0;
    freshLock = false;
    const fingers = [stick, look, fire];
    stick = look = fire = null;
    for (const f of fingers) if (f?.target.hasPointerCapture(f.id)) f.target.releasePointerCapture(f.id);
    g.keys = {};
    g.mouseDown = g.mobileFireActive = g.holdTurret = false;
    resetStick();
    document.body.classList.remove('rest-mouse');
    showSignals(false);
    showRoster(false);
  }
  function setState(s) {
    state = s;
    document.body.dataset.battleInput = s;
    document.body.classList.toggle('input-gated', ['waiting', 'requesting', 'paused'].includes(s));
    el('hud').inert = el('mobile-controls').inert = !running();
    const gate = el('input-menu'),
      paused = s === 'paused',
      waiting = s === 'waiting' || s === 'requesting';
    gate.hidden = !(paused || waiting);
    gate.classList.toggle('waiting', waiting);
    el('input-title').textContent = paused ? (g.platoon ? 'Меню · бой взвода продолжается' : 'Бой на паузе') : 'Готовы к выезду';
    el('resume-input').textContent = paused
      ? 'Продолжить'
      : s === 'requesting'
        ? 'Подключение…'
        : 'Взять управление';
    el('resume-input').disabled = s === 'requesting';
    el('relative-hint').hidden = s !== 'relative';
    if (running() && g.gameActive) AudioSystem.enter(); else AudioSystem.stop();
    if (s === 'off') return;
    if (running()) {
      BattleClock.resume();
      resetFrameTime();
    } else if (!g.platoon) BattleClock.pause();
  }
  function invalidate() {
    request++;
    clearTimeout(timer);
  }
  function unlock() {
    if (document.pointerLockElement?.id === 'game') document.exitPointerLock?.();
  }
  function end() {
    invalidate();
    setState('off');
    clear();
    unlock();
    BattleClock.reset();
  }
  function begin() {
    invalidate();
    clear();
    lastSignal = -Infinity;
    const strike = el('strike-btn');
    strike.hidden = strike.disabled = !CONFIG.ARTILLERY_SUPPORT;
    setState(g.controlMode === 'mobile' ? 'touch' : 'waiting');
    el(running() ? 'game' : 'resume-input').focus({ preventScroll: true });
  }
  function pause() {
    if (!g.gameActive || state === 'off' || state === 'paused') return;
    invalidate();
    clear();
    setState('paused');
    unlock();
    el('resume-input').focus({ preventScroll: true });
  }
  function acquire() {
    if (!g.gameActive || (state !== 'waiting' && state !== 'paused')) return;
    AudioSystem.unlock();
    const canvas = el('game');
    canvas.focus({ preventScroll: true });
    if (g.controlMode === 'mobile') {
      setState('touch');
      return;
    }
    const token = ++request;
    setState('requesting');
    const fallback = () => {
      if (token === request && state === 'requesting') {
        clearTimeout(timer);
        setState('relative');
      }
    };
    // file:// browsers and embedded previews may deny pointer lock. Keep relative
    // mouse look usable there; Alt lets the player recenter the physical cursor.
    if (!canvas.requestPointerLock) {
      fallback();
      return;
    }
    timer = setTimeout(fallback, 1500);
    try {
      canvas.requestPointerLock()?.catch(fallback);
    } catch {
      fallback();
    }
  }
  function lockChanged() {
    const own = document.pointerLockElement === el('game');
    if (own) {
      if (!g.gameActive || !['requesting', 'relative', 'locked'].includes(state)) {
        unlock();
        return;
      }
      clearTimeout(timer);
      freshLock = state !== 'locked';
      setState('locked');
    } else if (state === 'locked') pause();
  }
  function showRoster(on) {
    const box = el('battle-roster');
    box.hidden = !on;
    rosterTick = -1;
    el('score-toggle').setAttribute('aria-expanded', String(on));
    if (on) refreshRoster();
    else {
      rosterRows = [];
      el('roster-allies').replaceChildren();
      el('roster-enemies').replaceChildren();
    }
  }
  function refreshRoster() {
    if (el('battle-roster').hidden || (rosterTick >= 0 && ticks - rosterTick < 12 && ticks >= rosterTick))
      return;
    rosterTick = ticks;
    // Keep the same images and DOM nodes while the scoreboard is held open;
    // only health/knock-out state changes. The roster never reveals unspotted HP.
    if (!rosterRows.length) {
      rosterRows = g.units.map((u) => {
        const row = document.createElement('li'),
          icon = vehicleThumbnail(DB[u.id]),
          name = document.createElement('span'),
          hp = document.createElement('b');
        name.className = 'roster-name';
        name.textContent = (u === g.player ? '★ ' : '') + (u.callsign ? u.callsign + ' · ' : '') + u.name;
        row.append(icon, name, hp);
        el(u.team === 'enemy' ? 'roster-enemies' : 'roster-allies').append(row);
        return { u, row, hp };
      });
    }
    for (const { u, row, hp } of rosterRows) {
      row.classList.toggle('out', u.dead);
      hp.textContent = u.dead ? '—' : u.team === 'enemy' && !u.visible ? '?' : Math.ceil(u.hp) + ' HP';
    }
  }

  const signals = {
    KeyZ: 'Атакую!',
    KeyX: 'Нужна помощь!',
    KeyC: 'Защищаем базу!',
    KeyV: 'Так точно',
    KeyB: 'Никак нет'
  };
  function showSignals(open) {
    el('touch-signals').hidden = !open;
    el('signal-btn').setAttribute('aria-expanded', String(open));
  }
  function signal(code) {
    showSignals(false);
    if (!running() || BattleClock.now() - lastSignal < 2000) return;
    lastSignal = BattleClock.now();
    if (g.platoon) g.platoon.signal(code);
    else combatMessage(g.player.name + ' · ' + signals[code], '#bce4d3');
  }
  function toggleSight() {
    if (g.player.isSPG) consumeLook();
    BattleView.toggleScope();
  }
  function calibrate() {
    if (!running() || !g.gameActive || !g.player?.calibration) return;
    if (g.platoon && !g.platoon.host) g.platoon.action('calibrate');
    else if (g.player.toggleCalibration()) ShellUI.status(g.player, BattleClock.now());
  }
  function autoAim() {
    consumeLook();
    BattleView.toggleAutoAim();
  }
  const consumables = { Digit4: 1, Digit5: 0, KeyQ: 0, Digit6: 3, KeyF: 3, KeyR: 2, Digit9: 4, Digit0: 5 };
  function keyDown(e) {
    if (!g.gameActive || e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))
      return;
    if (e.code === 'Escape') {
      if (!e.repeat) pause();
      return;
    }
    if (!running() || e.metaKey || e.ctrlKey) return;
    if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow') || e.code.startsWith('Alt'))
      e.preventDefault();
    g.keys[e.code] = true;
    if (e.repeat) return;
    if (state === 'relative' && e.code.startsWith('Alt')) document.body.classList.add('rest-mouse');
    if (e.code === 'Tab') showRoster(true);
    else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') toggleSight();
    else if (e.code === 'KeyE') autoAim();
    else if (e.code === 'KeyG') calibrate();
    else if (Object.hasOwn(signals, e.code)) signal(e.code);
    else if (/^Digit[1-3]$/.test(e.code)) setShell(Number(e.code.slice(-1)) - 1);
    else if (Object.hasOwn(consumables, e.code)) useCons(consumables[e.code]);
    else if (e.code === 'Digit7') CombatMechanics.deploySmokeScreen(g.player);
    else if (e.code === 'Digit8' && CONFIG.ARTILLERY_SUPPORT) CombatMechanics.callArtilleryStrike(g.aim.x, g.aim.y);
    else if (e.code === 'KeyP') el('hud').classList.toggle('photo-mode');
    else if (e.code === 'KeyH') {
      snd('signal',.65);
      combatMessage('Сигнал!', '#ffd49c');
    }
  }
  const finger = (e) => ({ id: e.pointerId, x: e.clientX, y: e.clientY, target: e.target });
  function touchDown(e) {
    if (state !== 'touch' || (e.target.id !== 'game' && e.target.id !== 'fire-btn')) return;
    e.preventDefault();
    if (e.target.id === 'fire-btn') {
      if (fire) return;
      fire = finger(e);
      g.mobileFireActive = true;
      firePlayer();
    } else if (!stick && e.clientX < innerWidth * 0.42 && e.clientY > innerHeight * 0.3) {
      stick = finger(e);
      g.joystickData.active = true;
      const z = el('joystick-zone');
      z.classList.add('floating');
      z.style.left = stick.x + 'px';
      z.style.top = stick.y + 'px';
    } else if (!look) look = finger(e);
    else return;
    e.target.setPointerCapture(e.pointerId);
  }
  function touchMove(e) {
    if (state !== 'touch') return;
    if (stick?.id === e.pointerId) {
      const v = ArcadeLook.stick(e.clientX - stick.x, e.clientY - stick.y);
      g.joystickData = { active: true, dx: v.dx, dy: v.dy, mag: Math.hypot(v.dx, v.dy) };
      el('joystick-stick').style.transform = `translate(calc(-50% + ${v.x}px),calc(-50% + ${v.y}px))`;
    } else {
      const f = look?.id === e.pointerId ? look : fire?.id === e.pointerId ? fire : null;
      if (f) {
        dx += 1.4 * (e.clientX - f.x);
        dy += 1.4 * (e.clientY - f.y);
        f.x = e.clientX;
        f.y = e.clientY;
      }
    }
  }
  function touchUp(e) {
    if (stick?.id === e.pointerId) {
      stick = null;
      resetStick();
    }
    if (look?.id === e.pointerId) look = null;
    if (fire?.id === e.pointerId) {
      fire = null;
      g.mobileFireActive = false;
    }
  }
  // pointerdown also works for a second/third finger while the stick is held.
  // Keep keyboard/assistive click activation without firing twice on touch-up.
  function tap(button, action) {
    button.addEventListener('pointerdown', (e) => {
      if (e.button === 0) {
        e.preventDefault();
        action();
      }
    });
    button.addEventListener('click', (e) => {
      // A real touch can ALSO synthesize a zero-detail click on release. Only
      // activate here for keyboard / assistive input, never for that same finger.
      if (!e.pointerType && !e.detail && !e.sourceCapabilities?.firesTouchEvents) action();
    });
  }
  function init() {
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', (e) => {
      delete g.keys[e.code];
      if (e.code.startsWith('Alt')) document.body.classList.remove('rest-mouse');
      if (e.code === 'Tab' && running()) showRoster(false);
    });
    document.addEventListener('pointerlockchange', lockChanged);
    document.addEventListener('mousedown', (e) => {
      if (g.controlMode !== 'pc' || !g.gameActive || e.target.id !== 'game') return;
      if (state === 'waiting' && e.button === 0) {
        acquire();
        return;
      }
      if (!running()) return;
      if (e.button === 2) g.holdTurret = true;
      if (e.button === 0) {
        g.mouseDown = true;
        firePlayer();
      }
    });
    document.addEventListener('mousemove', (e) => {
      if (state !== 'locked' && !(state === 'relative' && e.target.id === 'game' && !e.altKey)) return;
      // Some browsers report a one-off cursor warp on entering pointer lock.
      if (freshLock) {
        freshLock = false;
        if (Math.abs(e.movementX + e.clientX) < 1 && Math.abs(e.movementY + e.clientY) < 1) return;
      }
      dx += e.movementX;
      dy += e.movementY;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) g.mouseDown = false;
      if (e.button === 2) g.holdTurret = false;
    });
    document.addEventListener('contextmenu', (e) => {
      if (g.gameActive && e.target.id === 'game') e.preventDefault();
    });
    document.addEventListener(
      'wheel',
      (e) => {
        if (running() && (state === 'locked' || e.target.id === 'game')) {
          e.preventDefault();
          BattleView.focusDistance(e.deltaY);
        }
      },
      { passive: false }
    );
    el('minimap').addEventListener('pointerdown', e => {
      const sight = BattleView.artillery;
      if (!sight || !running() || e.button !== 0) return;
      e.preventDefault(); consumeLook();
      const q = MapChart.boardPoint(e.currentTarget, e.clientX, e.clientY);
      sight.moveTo(q.x, q.y); // jump the camera, never fire or teleport the vehicle
    });
    document.addEventListener('pointerdown', touchDown);
    window.addEventListener('pointermove', touchMove);
    window.addEventListener('pointerup', touchUp);
    window.addEventListener('pointercancel', touchUp);
    document.addEventListener('lostpointercapture', touchUp);
    window.addEventListener('blur', () => {
      if (running() || state === 'requesting') pause();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pause();
    });
    el('resume-input').addEventListener('click', acquire);
    for (const [id, action] of [
      ['scope-btn', toggleSight],
      ['zoom-btn', BattleView.cycleZoom],
      ['autoaim-btn', autoAim],
      ['signal-btn', () => showSignals(el('touch-signals').hidden)]
    ])
      tap(el(id), () => {
        if (state === 'touch') action();
      });
    for (const [code, text] of Object.entries(signals)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      el('touch-signals').appendChild(button);
      tap(button, () => signal(code));
    }
    tap(el('score-toggle'), () => {
      if (running()) showRoster(el('battle-roster').hidden);
    });
    tap(el('calibrate-btn'), calibrate);
    tap(el('battle-exit'), pause);
  }
  return {
    init,
    begin,
    end,
    pause,
    refreshRoster,
    consumeLook,
    get running() {
      return running();
    },
    get state() {
      return state;
    }
  };
})();
