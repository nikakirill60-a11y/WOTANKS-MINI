// ========== УПРАВЛЕНИЕ ==========

function showControlModal(mode) {
    GameState.pendingBattle = mode;
    document.getElementById('control-modal').classList.add('show');
}

function selectControl(type) {
    GameState.controlMode = type;
    document.getElementById('control-modal').classList.remove('show');
    
    if (type === 'mobile') {
        document.body.classList.add('mobile-mode');
    } else {
        document.body.classList.remove('mobile-mode');
    }
    
    if (GameState.pendingBattle === 'train') {
        startTraining();
    } else {
        startBattle(GameState.pendingBattle);
    }
}

function setupPCControls() {
    window.onkeydown = e => {
        GameState.keys[e.code] = true;
        if (e.code === 'Digit1') setShell(0);
        if (e.code === 'Digit2') setShell(1);
        if (e.code === 'Digit3') setShell(2);
        if (e.code === 'Digit4') useCons(0);
        if (e.code === 'Digit5') useCons(1);
        if (e.code === 'Digit6') useCons(2);
    };
    
    window.onkeyup = e => {
        GameState.keys[e.code] = false;
    };
    
    window.onmousemove = e => {
        GameState.mouse.x = e.clientX;
        GameState.mouse.y = e.clientY;
    };
    
    window.onmousedown = () => {
        if (GameState.controlMode === 'pc') {
            GameState.mouseDown = true;
        }
    };
    
    window.onmouseup = () => {
        GameState.mouseDown = false;
    };
}

function setupMobileControls() {
    const jZone = document.getElementById('joystick-zone');
    const jStick = document.getElementById('joystick-stick');
    const jBase = document.getElementById('joystick-base');
    
    function handleJoystick(touch) {
        const rect = jBase.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        
        let dx = touch.clientX - cx;
        let dy = touch.clientY - cy;
        const dist = Math.hypot(dx, dy);
        const maxDist = rect.width * 0.4;
        
        if (dist > maxDist) {
            dx = dx / dist * maxDist;
            dy = dy / dist * maxDist;
        }
        
        jStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        
        GameState.joystickData.dx = dx / maxDist;
        GameState.joystickData.dy = dy / maxDist;
        GameState.joystickData.mag = Math.min(dist / maxDist, 1);
        GameState.joystickData.angle = Math.atan2(dy, dx);
    }
    
    jZone.addEventListener('touchstart', e => {
        e.preventDefault();
        GameState.joystickData.active = true;
        handleJoystick(e.touches[0]);
    }, { passive: false });
    
    jZone.addEventListener('touchmove', e => {
        e.preventDefault();
        if (GameState.joystickData.active) {
            handleJoystick(e.touches[0]);
        }
    }, { passive: false });
    
    jZone.addEventListener('touchend', e => {
        e.preventDefault();
        GameState.joystickData.active = false;
        GameState.joystickData.mag = 0;
        jStick.style.transform = 'translate(-50%, -50%)';
    }, { passive: false });
    
    // Кнопка огня
    const fireBtn = document.getElementById('fire-btn');
    fireBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        GameState.mobileFireActive = true;
    }, { passive: false });
    
    fireBtn.addEventListener('touchend', e => {
        e.preventDefault();
        GameState.mobileFireActive = false;
    }, { passive: false });
}