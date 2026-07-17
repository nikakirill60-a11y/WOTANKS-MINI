// js/referral.js
// ========== РЕФЕРАЛЬНАЯ ПРОГРАММА ==========
console.log('🔗 referral.js загружен');

function getReferralCode() {
  if (!GameState.referralCode) GameState.referralCode = currentUser;
  return GameState.referralCode;
}

function getReferralLink() {
  return location.origin + location.pathname + '?ref=' + encodeURIComponent(getReferralCode());
}

function copyReferralLink() {
  var link = getReferralLink();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(function () {
      var el = document.getElementById('referral-copy-msg');
      if (el) { el.innerText = '✅ Ссылка скопирована!'; setTimeout(function () { el.innerText = ''; }, 2000); }
    });
  }
  return link;
}

// ========== ПРИМЕНЕНИЕ REF-ПАРАМЕТРА ПРИ РЕГИСТРАЦИИ ==========
// Вызывать из auth.js внутри register() ДО первого сохранения прогресса.
function applyReferralFromURL(newUsername) {
  var params = new URLSearchParams(location.search);
  var ref = params.get('ref');
  if (!ref || ref === newUsername) return;

  GameState.referredBy = ref;
  GameState.SILVER += CONFIG.REFERRAL.bonusForNewbie.silver;

  recordReferral(ref, newUsername);
}

// ========== ЗАПИСЬ РЕФЕРАЛА В SUPABASE + БОНУС ПРИГЛАСИВШЕМУ ==========
async function recordReferral(referrerUsername, newUsername) {
  if (!supabaseClient || !supabaseClient.from) return;
  try {
    await supabaseClient.from('referrals').insert([{
      referrer: referrerUsername,
      referred: newUsername,
      created_at: new Date().toISOString()
    }]);

    const { data: referrer } = await supabaseClient
      .from('users')
      .select('referral_count, silver, gold')
      .eq('username', referrerUsername)
      .single();

    if (referrer) {
      const newCount = (referrer.referral_count || 0) + 1;
      const bonus = CONFIG.REFERRAL.bonusForInviter;
      const update = {
        referral_count: newCount,
        silver: (referrer.silver || 0) + bonus.silver,
        gold: (referrer.gold || 0) + bonus.gold
      };
      const milestone = CONFIG.REFERRAL.milestoneRewards[newCount];
      if (milestone && milestone.gold) update.gold += milestone.gold;

      await supabaseClient.from('users').update(update).eq('username', referrerUsername);
    }
  } catch (error) {
    console.error('⚠️ Ошибка записи реферала:', error);
  }
}

// ========== СОБСТВЕННАЯ СТАТИСТИКА (для владельца ссылки) ==========
async function loadReferralStats() {
  if (!supabaseClient || !supabaseClient.from || !currentUser) return { count: 0 };
  try {
    const { data } = await supabaseClient.from('users').select('referral_count').eq('username', currentUser).single();
    GameState.referralCount = (data && data.referral_count) || 0;
    return { count: GameState.referralCount };
  } catch (e) {
    return { count: GameState.referralCount || 0 };
  }
}

// ========== РЕНДЕР ПАНЕЛИ ==========
// Ожидает <div id="referral-panel"></div> с полями внутри (см. HTML-блок)
async function renderReferralPanel() {
  var linkEl = document.getElementById('referral-link-input');
  if (linkEl) linkEl.value = getReferralLink();

  await loadReferralStats();
  var countEl = document.getElementById('referral-count');
  if (countEl) countEl.innerText = GameState.referralCount || 0;
}

window.getReferralCode = getReferralCode;
window.getReferralLink = getReferralLink;
window.copyReferralLink = copyReferralLink;
window.applyReferralFromURL = applyReferralFromURL;
window.recordReferral = recordReferral;
window.loadReferralStats = loadReferralStats;
window.renderReferralPanel = renderReferralPanel;
