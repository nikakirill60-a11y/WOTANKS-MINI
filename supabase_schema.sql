-- ====================================================================
-- 🎮 CITY TANKS / WOTANKS-MINI — ПОЛНЫЙ SQL СКРИПТ ДЛЯ SUPABASE SQL EDITOR
-- ====================================================================
-- Запустите весь этот скрипт в панели: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Скрипт безопасен (идемпотентен): создаёт все таблицы, добавляет недостающие колонки,
-- настраивает RLS политики для анонимного/клиентского доступа, индексы и Realtime.
-- ====================================================================

-- 1. РАСШИРЕНИЯ
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 2. ТАБЛИЦА: users (Профиль игрока, ресурсы, инвентарь, прокачка, статистика)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    xp BIGINT DEFAULT 500,
    gold BIGINT DEFAULT 0,
    silver BIGINT DEFAULT 5000,
    charges INTEGER DEFAULT 0,
    owned_tanks JSONB DEFAULT '["T26", "PZ2", "T1CUNN", "CRUS2", "RENOTSU", "VAEB", "R35", "STRV21"]'::jsonb,
    selected_tank TEXT DEFAULT 'T26',
    used_promos JSONB DEFAULT '[]'::jsonb,
    quest_23 JSONB DEFAULT '{"active": true, "kills": 0, "target": 15, "claimed": false}'::jsonb,
    inventory JSONB DEFAULT '{}'::jsonb,
    boosters JSONB DEFAULT '{"xp": 0, "gold": 0, "silver": 0}'::jsonb,
    booster_stock JSONB DEFAULT '{"xp": 0, "gold": 0, "silver": 0}'::jsonb,
    modules JSONB DEFAULT '{}'::jsonb,
    upgrades JSONB DEFAULT '{}'::jsonb,
    upgrades_bought JSONB DEFAULT '{}'::jsonb,
    client_total_battles INTEGER DEFAULT 0,
    camos JSONB DEFAULT '{}'::jsonb,
    equipped_camo JSONB DEFAULT '{}'::jsonb,
    crew JSONB DEFAULT '{}'::jsonb,
    blueprints JSONB DEFAULT '{}'::jsonb,
    collection_bonuses_claimed JSONB DEFAULT '[]'::jsonb,
    battle_pass JSONB DEFAULT '{"season": 2, "level": 1, "xp": 0, "premium": false, "claimedFree": [], "claimedPremium": []}'::jsonb,
    referral_code TEXT DEFAULT NULL,
    referred_by TEXT DEFAULT NULL,
    referral_count INTEGER DEFAULT 0,
    news_last_seen_id INTEGER DEFAULT 0,
    tutorial_done BOOLEAN DEFAULT FALSE,
    achievements JSONB DEFAULT '{"unlocked": []}'::jsonb,
    lifetime_wins INTEGER DEFAULT 0,
    daily_quests JSONB DEFAULT NULL,
    settings JSONB DEFAULT '{"volume": 0.3, "showTracks": true, "lang": "ru"}'::jsonb,
    total_battles INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_kills INTEGER DEFAULT 0,
    total_damage BIGINT DEFAULT 0,
    ranked_rating INTEGER DEFAULT 1000,
    clan_id TEXT DEFAULT NULL,
    clan_tag TEXT DEFAULT NULL,
    is_online BOOLEAN DEFAULT FALSE,
    last_online TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Добавляем колонки, если таблица users уже существовала в более старой версии
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS charges INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ranked_rating INTEGER DEFAULT 1000;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS clan_id TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS clan_tag TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_battles INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_wins INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_kills INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_damage BIGINT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_online TIMESTAMPTZ DEFAULT NOW();

-- ====================================================================
-- 3. ТАБЛИЦА: battle_history (История боёв)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.battle_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL,
    tank_id TEXT NOT NULL,
    map TEXT DEFAULT 'city',
    mode TEXT DEFAULT '7v7',
    won BOOLEAN DEFAULT FALSE,
    kills INTEGER DEFAULT 0,
    damage INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    silver_earned INTEGER DEFAULT 0,
    gold_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 4. ТАБЛИЦА: chat_messages (Глобальный, клановый и боевой чат)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    channel TEXT DEFAULT 'global',
    clan_id TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 5. ТАБЛИЦА: clans (Кланы игроков)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.clans (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    tag TEXT UNIQUE NOT NULL,
    emblem TEXT DEFAULT '🛡️',
    leader TEXT NOT NULL,
    members JSONB DEFAULT '[]'::jsonb,
    level INTEGER DEFAULT 1,
    treasury_silver BIGINT DEFAULT 50000,
    treasury_gold BIGINT DEFAULT 500,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 6. ТАБЛИЦА: marketplace_listings (Рынок предметов и танков)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller TEXT NOT NULL,
    buyer TEXT DEFAULT NULL,
    item_type TEXT NOT NULL,      -- 'tank', 'camo', 'blueprint', 'item'
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    price_gold INTEGER DEFAULT 0,
    price_silver INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active', -- 'active', 'sold', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sold_at TIMESTAMPTZ DEFAULT NULL
);

-- ====================================================================
-- 7. ТАБЛИЦА: market_history (История сделок рынка)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.market_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_name TEXT NOT NULL,
    price_gold INTEGER DEFAULT 0,
    price_silver INTEGER DEFAULT 0,
    seller TEXT NOT NULL,
    buyer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 8. ТАБЛИЦА: news (Новости и события ангара)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.news (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    tag TEXT DEFAULT 'EVENT',
    image TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 9. ТАБЛИЦА: referrals (Реферальная программа)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer TEXT NOT NULL,
    referred TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 10. ТАБЛИЦЫ МУЛЬТИПЛЕЕРА: battle_rooms, battle_players, player_shots
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.battle_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code TEXT UNIQUE,
    host_username TEXT NOT NULL,
    mode TEXT DEFAULT '1v1',
    map TEXT DEFAULT 'city',
    status TEXT DEFAULT 'waiting', -- 'waiting', 'playing', 'finished'
    players JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.battle_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.battle_rooms(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    tank_id TEXT NOT NULL,
    team TEXT DEFAULT 'team_a',
    x DOUBLE PRECISION DEFAULT 0,
    y DOUBLE PRECISION DEFAULT 0,
    angle DOUBLE PRECISION DEFAULT 0,
    turret_angle DOUBLE PRECISION DEFAULT 0,
    hp INTEGER DEFAULT 1000,
    max_hp INTEGER DEFAULT 1000,
    is_dead BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.player_shots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.battle_rooms(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    tank_id TEXT NOT NULL,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    angle DOUBLE PRECISION NOT NULL,
    shell_type TEXT DEFAULT 'AP',
    dmg INTEGER DEFAULT 200,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 11. ТАБЛИЦА: mailbox (Почтовый ящик с наградами)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.mailbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL,
    sender TEXT DEFAULT 'Штаб Командования',
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    attachment JSONB DEFAULT '{}'::jsonb,
    claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 12. ТАБЛИЦА: world_boss (Глобальный босс сервера)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.world_boss (
    id TEXT PRIMARY KEY DEFAULT 'leviathan',
    name TEXT NOT NULL,
    max_hp BIGINT DEFAULT 10000000,
    current_hp BIGINT DEFAULT 10000000,
    is_active BOOLEAN DEFAULT TRUE,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 13. ИНДЕКСЫ ДЛЯ МАКСИМАЛЬНОЙ СКОРОСТИ (Leaderboards, Searches, Auth)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_xp ON public.users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_total_damage ON public.users(total_damage DESC);
CREATE INDEX IF NOT EXISTS idx_users_total_wins ON public.users(total_wins DESC);
CREATE INDEX IF NOT EXISTS idx_users_total_battles ON public.users(total_battles DESC);
CREATE INDEX IF NOT EXISTS idx_users_ranked_rating ON public.users(ranked_rating DESC);
CREATE INDEX IF NOT EXISTS idx_users_is_online ON public.users(is_online, last_online DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON public.marketplace_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_status ON public.battle_rooms(status);
CREATE INDEX IF NOT EXISTS idx_battle_players_room ON public.battle_players(room_id);
CREATE INDEX IF NOT EXISTS idx_player_shots_room ON public.player_shots(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mailbox_username ON public.mailbox(username, claimed);

-- ====================================================================
-- 14. ROW LEVEL SECURITY (RLS) И ПОЛИТИКИ ДОСТУПА
-- ====================================================================
-- Включаем RLS на всех таблицах
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_boss ENABLE ROW LEVEL SECURITY;

-- Создаем универсальные политики для клиентского доступа (anon / authenticated)
DROP POLICY IF EXISTS "Public select users" ON public.users;
CREATE POLICY "Public select users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert users" ON public.users;
CREATE POLICY "Public insert users" ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update users" ON public.users;
CREATE POLICY "Public update users" ON public.users FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public battle_history" ON public.battle_history;
CREATE POLICY "Public battle_history" ON public.battle_history FOR ALL USING (true);

DROP POLICY IF EXISTS "Public chat_messages" ON public.chat_messages;
CREATE POLICY "Public chat_messages" ON public.chat_messages FOR ALL USING (true);

DROP POLICY IF EXISTS "Public clans" ON public.clans;
CREATE POLICY "Public clans" ON public.clans FOR ALL USING (true);

DROP POLICY IF EXISTS "Public marketplace_listings" ON public.marketplace_listings;
CREATE POLICY "Public marketplace_listings" ON public.marketplace_listings FOR ALL USING (true);

DROP POLICY IF EXISTS "Public market_history" ON public.market_history;
CREATE POLICY "Public market_history" ON public.market_history FOR ALL USING (true);

DROP POLICY IF EXISTS "Public news" ON public.news;
CREATE POLICY "Public news" ON public.news FOR ALL USING (true);

DROP POLICY IF EXISTS "Public referrals" ON public.referrals;
CREATE POLICY "Public referrals" ON public.referrals FOR ALL USING (true);

DROP POLICY IF EXISTS "Public battle_rooms" ON public.battle_rooms;
CREATE POLICY "Public battle_rooms" ON public.battle_rooms FOR ALL USING (true);

DROP POLICY IF EXISTS "Public battle_players" ON public.battle_players;
CREATE POLICY "Public battle_players" ON public.battle_players FOR ALL USING (true);

DROP POLICY IF EXISTS "Public player_shots" ON public.player_shots;
CREATE POLICY "Public player_shots" ON public.player_shots FOR ALL USING (true);

DROP POLICY IF EXISTS "Public mailbox" ON public.mailbox;
CREATE POLICY "Public mailbox" ON public.mailbox FOR ALL USING (true);

DROP POLICY IF EXISTS "Public world_boss" ON public.world_boss;
CREATE POLICY "Public world_boss" ON public.world_boss FOR ALL USING (true);

-- ====================================================================
-- 15. НАСТРОЙКА REALTIME (Realtime Replication)
-- ====================================================================
-- Включаем репликацию для живого мультиплеера и чата
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_listings;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_rooms;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_players;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.player_shots;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ====================================================================
-- 16. СТАРТОВЫЕ ДАННЫЕ (Seed Data: Новости, Босс, Кланы)
-- ====================================================================
INSERT INTO public.news (id, title, text, tag)
VALUES 
  (1, '⚡ СОБЫТИЕ: Возрождение Ваффентрагера!', 'Бросьте вызов Blitzträger auf E 110 или сыграйте за босса против 10 Гончих Альянса! Зарабатывайте заряды и открывайте контейнеры с Blitzträger auf E 220 и Sturmtiger!', 'ВАЖНО'),
  (2, '🌐 Обновление 2.0: 100 новых фич и кланы!', 'В игре появились кланы, 30-дневный календарь наград, мировой босс Левиафан, колесо фортуны и рейтинговая лига!', 'ОБНОВЛЕНИЕ')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.world_boss (id, name, max_hp, current_hp, is_active)
VALUES ('leviathan', 'Левиафан: Разрушитель Миров', 10000000, 7850000, TRUE)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, max_hp = EXCLUDED.max_hp;

INSERT INTO public.clans (id, name, tag, emblem, leader, level, treasury_silver, treasury_gold)
VALUES 
  ('clan_steel', 'Стальной Кулак', 'STEEL', '⚔️', 'IronGeneral', 3, 150000, 3500),
  ('clan_krieger', 'Орден Ваффентрагера', 'KRIEGER', '⚡', 'VonKrieger_99', 5, 500000, 15000)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- ГОТОВО! БАЗА ДАННЫХ WOTANKS-MINI ПОЛНОСТЬЮ НАСТРОЕНА! 🚀
-- ====================================================================
