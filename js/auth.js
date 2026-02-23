// === СИСТЕМА АККАУНТОВ ===

let currentUser = null;

// Загрузка пользователей из LocalStorage
function getUsers() {
    return JSON.parse(localStorage.getItem('ct_users') || '{}');
}

// Сохранение пользователей
function saveUsers(users) {
    localStorage.setItem('ct_users', JSON.stringify(users));
}

// Сохранение текущего прогресса в профиль пользователя
function saveProgress() {
    if (!currentUser) return;
    const users = getUsers();
    users[currentUser].data = {
        XP: GameState.XP,
        GOLD: GameState.GOLD,
        SILVER: GameState.SILVER,
        owned: GameState.owned,
        selected: GameState.selected,
        usedPromos: GameState.usedPromos,
        // Сохраняем прогресс квеста
        quest23: GameState.quest23
    };
    saveUsers(users);
}

// Загрузка прогресса из профиля
function loadProgress(username) {
    const users = getUsers();
    if (users[username] && users[username].data) {
        const d = users[username].data;
        GameState.XP = d.XP;
        GameState.GOLD = d.GOLD;
        GameState.SILVER = d.SILVER;
        GameState.owned = d.owned;
        GameState.selected = d.selected;
        GameState.usedPromos = d.usedPromos || [];
        // Загрузка квеста, либо дефолт если нет в сохранении
        GameState.quest23 = d.quest23 || { active: true, kills: 0, target: 15, claimed: false };
        
        if(!GameState.owned.includes(GameState.selected)) GameState.selected = GameState.owned[0];
    } else {
        // Дефолтные данные для нового аккаунта
        GameState.XP = 500000;
        GameState.GOLD = 5000;
        GameState.SILVER = 50000;
        GameState.owned = ["T26", "PZ2", "CRUS2", "VAEB", "R35"];
        GameState.selected = "T26";
        GameState.usedPromos = [];
        GameState.quest23 = { active: true, kills: 0, target: 15, claimed: false };
    }
    
    // Обновляем UI квеста после загрузки
    if(typeof updateQuestUI === 'function') updateQuestUI();
}

// Регистрация
function register() {
    const loginInput = document.getElementById('username-input');
    const passInput = document.getElementById('password-input');
    const msg = document.getElementById('login-msg');
    
    const u = loginInput.value.trim();
    const p = passInput.value.trim();
    
    if (!u || !p) {
        msg.innerText = "Введите имя и пароль!";
        msg.style.color = "#e74c3c";
        return;
    }
    
    const users = getUsers();
    if (users[u]) {
        msg.innerText = "Пользователь уже существует!";
        msg.style.color = "#e74c3c";
        return;
    }
    
    // Создаем пользователя
    users[u] = { pass: p, data: null };
    saveUsers(users);
    
    // Автоматический вход
    performLogin(u);
}

// Вход
function login() {
    const loginInput = document.getElementById('username-input');
    const passInput = document.getElementById('password-input');
    const msg = document.getElementById('login-msg');
    
    const u = loginInput.value.trim();
    const p = passInput.value.trim();
    
    const users = getUsers();
    if (!users[u] || users[u].pass !== p) {
        msg.innerText = "Неверное имя или пароль!";
        msg.style.color = "#e74c3c";
        return;
    }
    
    performLogin(u);
}

function performLogin(username) {
    currentUser = username;
    loadProgress(username);
    
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('ui').style.display = 'flex';
    document.getElementById('current-user').innerText = username;
    
    // Обновляем UI
    updateResources();
    renderTree();
    renderCarousel();
    
    // Запускаем автосохранение
    setInterval(saveProgress, 5000);
}

function logout() {
    saveProgress(); 
    currentUser = null;
    location.reload(); 
}