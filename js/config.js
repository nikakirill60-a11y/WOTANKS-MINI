const CONFIG = {
    TIER_ROMAN: ["","I","II","III","IV","V","VI","VII","VIII","IX","X"],
    SHELLS: [
        {name:'ББ',sMul:1,dMul:1,color:'#f1c40f',rico:true},
        {name:'ОФ',sMul:.6,dMul:1.5,color:'#e74c3c',rico:false},
        {name:'Подкал',sMul:1.6,dMul:.75,color:'#3498db',rico:true}
    ],
    CREW_MESSAGES: {
        HIT:["Есть пробитие!","Цель поражена!","Попали!"],
        RICO:["Рикошет!","Не пробили!"],
        KILL:["Враг уничтожен!","Цель уничтожена!"]
    },
    NATIONS:{ussr:'СССР',germany:'Германия',uk:'Британия',china:'Китай',japan:'Япония'},
    TANK_CLASSES:{lt:'ЛТ',mt:'СТ',ht:'ТТ',td:'ПТ'}
};

const GameState = {
    XP:500000, GOLD:5000, SILVER:50000,
    owned:["T26","PZ2","CRUS2","VAEB"],
    selected:"T26", curNat:"ussr",
    gameActive:false, controlMode:'pc', pendingBattle:null,
    player:null, units:[], bullets:[], walls:[], particles:[], tracks:[],
    cam:{x:0,y:0}, shakeTimer:0, shakeIntensity:0,
    curShell:0, curMap:'city', battleDmg:0, battleKills:0,
    consumables:[false,false,false], adrenalineActive:false, adrenalineTimer:0,
    keys:{}, mouse:{x:0,y:0}, mouseDown:false,
    joystickData:{active:false,dx:0,dy:0,angle:0,mag:0}, mobileFireActive:false
};

let nodeScale = 1;

function updateScale(){
    const w = window.innerWidth;
    nodeScale = w<400?.65:w<600?.75:w<900?.85:w<1200?.95:1;
    const mm = document.getElementById('minimap');
    if(mm){const sz=Math.min(Math.max(w*.12,80),180);mm.width=sz;mm.height=sz;mm.style.width=sz+'px';mm.style.height=sz+'px'}
    const tc = document.getElementById('tree-canvas');
    if(tc){tc.width=2200*nodeScale;tc.height=1100*nodeScale}
}
window.addEventListener('resize',updateScale);