function showControlModal(mode){GameState.pendingBattle=mode;document.getElementById('control-modal').classList.add('show');}
function selectControl(type){
    GameState.controlMode=type;document.getElementById('control-modal').classList.remove('show');
    if(type==='mobile')document.body.classList.add('mobile-mode');else document.body.classList.remove('mobile-mode');
    if(GameState.pendingBattle==='train')startTraining();else startBattle(GameState.pendingBattle);
}
function setupPCControls(){
    window.onkeydown=e=>{GameState.keys[e.code]=true;if(e.code==='Digit1')setShell(0);if(e.code==='Digit2')setShell(1);if(e.code==='Digit3')setShell(2);if(e.code==='Digit4')useCons(0);if(e.code==='Digit5')useCons(1);if(e.code==='Digit6')useCons(2);};
    window.onkeyup=e=>{GameState.keys[e.code]=false;};
    window.onmousemove=e=>{GameState.mouse.x=e.clientX;GameState.mouse.y=e.clientY;};
    window.onmousedown=()=>{if(GameState.controlMode==='pc')GameState.mouseDown=true;};
    window.onmouseup=()=>{GameState.mouseDown=false;};
}
function setupMobileControls(){
    const jZ=document.getElementById('joystick-zone'),jS=document.getElementById('joystick-stick'),jB=document.getElementById('joystick-base');
    function hJ(touch){const r=jB.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=touch.clientX-cx,dy=touch.clientY-cy;const dist=Math.hypot(dx,dy),max=r.width*.4;if(dist>max){dx=dx/dist*max;dy=dy/dist*max;}jS.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;GameState.joystickData.dx=dx/max;GameState.joystickData.dy=dy/max;GameState.joystickData.mag=Math.min(dist/max,1);GameState.joystickData.angle=Math.atan2(dy,dx);}
    jZ.addEventListener('touchstart',e=>{e.preventDefault();GameState.joystickData.active=true;hJ(e.touches[0]);},{passive:false});
    jZ.addEventListener('touchmove',e=>{e.preventDefault();if(GameState.joystickData.active)hJ(e.touches[0]);},{passive:false});
    jZ.addEventListener('touchend',e=>{e.preventDefault();GameState.joystickData.active=false;GameState.joystickData.mag=0;jS.style.transform='translate(-50%,-50%)';},{passive:false});
    const fb=document.getElementById('fire-btn');
    fb.addEventListener('touchstart',e=>{e.preventDefault();GameState.mobileFireActive=true;},{passive:false});
    fb.addEventListener('touchend',e=>{e.preventDefault();GameState.mobileFireActive=false;},{passive:false});
}