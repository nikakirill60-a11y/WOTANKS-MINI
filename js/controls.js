function showControlModal(mode) {
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
// Track each physical pointer independently. A lifted aim finger must never release
// another finger's throttle or trigger, including on capture loss / app switching.
let fieldPointer = null,
  stickFinger = null,
  triggerFinger = null;
function resetBattleInput() {
  fieldPointer = stickFinger = triggerFinger = null;
  GameState.keys = {};
  GameState.mouseDown = GameState.mobileFireActive = false;
  GameState.joystickData = { active: false, dx: 0, dy: 0, mag: 0 };
  document.getElementById('joystick-stick').style.transform = 'translate(-50%,-50%)';
}
function setupPCControls() {
  window.addEventListener('keydown', (e) => {
    if (
      !GameState.gameActive ||
      e.target.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)
    )
      return;
    if (e.code === 'Space') e.preventDefault();
    GameState.keys[e.code] = true;
    if (e.repeat) return;
    if (e.code === 'KeyX') CombatMechanics.deploySmokeScreen(GameState.player);
    if (e.code === 'KeyC') CombatMechanics.callArtilleryStrike(GameState.aim.x, GameState.aim.y);
    if (e.code === 'KeyF') document.getElementById('hud').classList.toggle('photo-mode');
    if (e.code === 'KeyH') {
      snd('hit');
      combatMessage('Сигнал!', '#ffd49c');
    }
    if (e.code === 'Escape') leaveBattle();
    if (/^Digit[1-3]$/.test(e.code)) setShell(Number(e.code.slice(-1)) - 1);
    if (/^Digit[4-9]$/.test(e.code)) useCons(Number(e.code.slice(-1)) - 4);
  });
  window.addEventListener('keyup', (e) => {
    GameState.keys[e.code] = false;
  });
  // Listen on the document: the canvas is replaced after context disposal. Clicking HUD
  // buttons never fires the cannon; release/cancel/blur never leaves a trigger held.
  document.addEventListener('contextmenu', (e) => {
    if (GameState.gameActive && e.target.id === 'game') e.preventDefault();
  });
  document.addEventListener('pointermove', (e) => {
    if (!GameState.gameActive || e.target.id !== 'game') return;
    if (fieldPointer !== null && e.pointerId !== fieldPointer) return;
    if (e.pointerType === 'mouse' || e.pointerId === fieldPointer) BattleView.pointAt(e.clientX, e.clientY);
    // Chord changes can be reported as pointermove rather than pointerup.
    if (e.pointerType === 'mouse' && e.pointerId === fieldPointer && GameState.controlMode === 'pc')
      GameState.mouseDown = !!(e.buttons & 1);
  });
  document.addEventListener('pointerdown', (e) => {
    if (!GameState.gameActive || e.target.id !== 'game' || e.button !== 0 || fieldPointer !== null) return;
    fieldPointer = e.pointerId;
    e.target.setPointerCapture(fieldPointer);
    BattleView.pointAt(e.clientX, e.clientY);
    if (GameState.controlMode === 'pc') {
      GameState.mouseDown = true;
      firePlayer();
    }
  });
  function releaseField(e) {
    if (e.pointerId !== fieldPointer) return;
    fieldPointer = null;
    GameState.mouseDown = false;
  }
  window.addEventListener('pointerup', releaseField);
  window.addEventListener('pointercancel', releaseField);
  document.addEventListener('lostpointercapture', releaseField);
  window.addEventListener('blur', resetBattleInput);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetBattleInput();
  });
  document.addEventListener(
    'wheel',
    (e) => {
      if (GameState.gameActive && e.target.id === 'game') {
        e.preventDefault();
        BattleView.focusDistance(e.deltaY);
      }
    },
    { passive: false }
  );
}
function setupMobileControls() {
  const zone = document.getElementById('joystick-zone'),
    stick = document.getElementById('joystick-stick'),
    fire = document.getElementById('fire-btn');
  function steer(e) {
    const r = zone.getBoundingClientRect(),
      dx = e.clientX - r.left - r.width / 2,
      dy = e.clientY - r.top - r.height / 2;
    const length = Math.hypot(dx, dy),
      radius = r.width * 0.38,
      divisor = Math.max(radius, length);
    const j = GameState.joystickData;
    j.active = true;
    j.dx = dx / divisor;
    j.dy = dy / divisor;
    j.mag = Math.min(1, length / radius);
    stick.style.transform = `translate(calc(-50% + ${j.dx * radius}px),calc(-50% + ${j.dy * radius}px))`;
  }
  zone.onpointerdown = (e) => {
    if (!GameState.gameActive || stickFinger !== null) return;
    stickFinger = e.pointerId;
    zone.setPointerCapture(stickFinger);
    steer(e);
  };
  zone.onpointermove = (e) => {
    if (stickFinger === e.pointerId) steer(e);
  };
  zone.onlostpointercapture = (e) => {
    if (stickFinger !== e.pointerId) return;
    stickFinger = null;
    GameState.joystickData = { active: false, mag: 0, dx: 0, dy: 0 };
    stick.style.transform = 'translate(-50%,-50%)';
  };
  fire.onpointerdown = (e) => {
    if (!GameState.gameActive || triggerFinger !== null) return;
    triggerFinger = e.pointerId;
    fire.setPointerCapture(e.pointerId);
    GameState.mobileFireActive = true;
    firePlayer();
  };
  fire.onlostpointercapture = (e) => {
    if (triggerFinger !== e.pointerId) return;
    triggerFinger = null;
    GameState.mobileFireActive = false;
  };
}
