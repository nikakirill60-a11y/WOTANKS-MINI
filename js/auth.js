let currentUser=null;
function getUsers(){return JSON.parse(localStorage.getItem('ct_users')||'{}');}
function saveUsers(users){localStorage.setItem('ct_users',JSON.stringify(users));}

function saveProgress(){
  if(!currentUser)return;
  const users=getUsers();
  users[currentUser].data={
    XP:GameState.XP,GOLD:GameState.GOLD,SILVER:GameState.SILVER,
    owned:GameState.owned,selected:GameState.selected,
    usedPromos:GameState.usedPromos,quest23:GameState.quest23,
    inventory:GameState.inventory,
    boosters:GameState.boosters,boosterStock:GameState.boosterStock,
    modules:GameState.modules,
    upgrades:GameState.upgrades,
    upgradesBought:GameState.upgradesBought
  };
  saveUsers(users);
}

function loadProgress(username){
  const users=getUsers();
  if(users[username]&&users[username].data){
    const d=users[username].data;
    GameState.XP=d.XP;GameState.GOLD=d.GOLD;GameState.SILVER=d.SILVER;
    GameState.owned=d.owned;GameState.selected=d.selected;
    GameState.usedPromos=d.usedPromos||[];
    GameState.quest23=d.quest23||{active:true,kills:0,target:15,claimed:false};
    GameState.inventory=d.inventory||{};
    GameState.boosters=d.boosters||{xp:0,gold:0,silver:0};
    GameState.boosterStock=d.boosterStock||{xp:0,gold:0,silver:0};
    GameState.modules=d.modules||{};
    GameState.upgrades=d.upgrades||{};
    GameState.upgradesBought=d.upgradesBought||{};
    if(!GameState.owned.includes(GameState.selected))GameState.selected=GameState.owned[0];
  }else{
    GameState.XP=500000;GameState.GOLD=5000;GameState.SILVER=50000;
    GameState.owned=["T26","PZ2","CRUS2","VAEB","R35"];
    GameState.selected="T26";GameState.usedPromos=[];
    GameState.quest23={active:true,kills:0,target:15,claimed:false};
    GameState.inventory={};
    GameState.boosters={xp:0,gold:0,silver:0};
    GameState.boosterStock={xp:0,gold:0,silver:0};
    GameState.modules={};
    GameState.upgrades={};
    GameState.upgradesBought={};
  }
  if(typeof updateQuestUI==='function')updateQuestUI();
  if(typeof updateInvCount==='function')updateInvCount();
  if(typeof updateBoosterUI==='function')updateBoosterUI();
}

function register(){
  const u=document.getElementById('username-input').value.trim();
  const p=document.getElementById('password-input').value.trim();
  const msg=document.getElementById('login-msg');
  if(!u||!p){msg.innerText="Введите имя и пароль!";msg.style.color="#e74c3c";return;}
  const users=getUsers();
  if(users[u]){msg.innerText="Пользователь уже существует!";msg.style.color="#e74c3c";return;}
  users[u]={pass:p,data:null};saveUsers(users);performLogin(u);
}

function login(){
  const u=document.getElementById('username-input').value.trim();
  const p=document.getElementById('password-input').value.trim();
  const msg=document.getElementById('login-msg');
  const users=getUsers();
  if(!users[u]||users[u].pass!==p){msg.innerText="Неверное имя или пароль!";msg.style.color="#e74c3c";return;}
  performLogin(u);
}

function performLogin(username){
  currentUser=username;loadProgress(username);
  document.getElementById('login-screen').style.display='none';
  document.getElementById('ui').style.display='flex';
  document.getElementById('current-user').innerText=username;
  updateResources();renderTree();renderCarousel();updateInvCount();updateBoosterUI();
  setInterval(saveProgress,5000);
}

function logout(){saveProgress();currentUser=null;location.reload();}