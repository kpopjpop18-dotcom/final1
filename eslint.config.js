-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  avatar text,
  emoji text,
  fav_group text,
  fav_member text,
  spotify text,
  wall jsonb NOT NULL DEFAULT '[]'::jsonb,
  chickens integer NOT NULL DEFAULT 3,
  last_check_in date,
  check_in_streak integer NOT NULL DEFAULT 0,
  last_spin timestamptz NOT NULL DEFAULT to_timestamp(0),
  recovery_code text NOT NULL,
  banned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles readable by signed in" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- prevent non-admins flipping the banned flag
CREATE OR REPLACE FUNCTION public.guard_profile_ban()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.banned IS DISTINCT FROM OLD.banned AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can change ban status';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER guard_profile_ban BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_ban();

-- BINDERS
CREATE TABLE public.binders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'pink',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.binders TO authenticated;
GRANT ALL ON public.binders TO service_role;
ALTER TABLE public.binders ENABLE ROW LEVEL SECURITY;

-- FRIENDSHIPS
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = _a AND addressee_id = _b) OR (requester_id = _b AND addressee_id = _a))
  )
$$;

CREATE POLICY "see own friendships" ON public.friendships FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "send friend request" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND addressee_id <> auth.uid());
CREATE POLICY "respond to friend request" ON public.friendships FOR UPDATE TO authenticated
  USING (addressee_id = auth.uid() OR requester_id = auth.uid())
  WITH CHECK (addressee_id = auth.uid() OR requester_id = auth.uid());
CREATE POLICY "remove friendship" ON public.friendships FOR DELETE TO authenticated
  USING (addressee_id = auth.uid() OR requester_id = auth.uid());

CREATE POLICY "binders visible to owner and friends" ON public.binders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.are_friends(auth.uid(), user_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "manage own binders" ON public.binders FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- OWNED CARDS
CREATE TABLE public.owned_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id text NOT NULL,
  binder_id uuid REFERENCES public.binders(id) ON DELETE SET NULL,
  is_new boolean NOT NULL DEFAULT true,
  is_dupe boolean NOT NULL DEFAULT false,
  for_trade boolean NOT NULL DEFAULT false,
  for_adoption boolean NOT NULL DEFAULT false,
  owned_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owned_cards TO authenticated;
GRANT ALL ON public.owned_cards TO service_role;
ALTER TABLE public.owned_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cards visible to owner friends and market" ON public.owned_cards FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR for_trade OR for_adoption
    OR public.are_friends(auth.uid(), user_id)
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "manage own cards" ON public.owned_cards FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- SHARED RARITIES
CREATE TABLE public.card_rarities (
  card_id text PRIMARY KEY,
  rarity text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.card_rarities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_rarities TO authenticated;
GRANT ALL ON public.card_rarities TO service_role;
ALTER TABLE public.card_rarities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rarities public read" ON public.card_rarities FOR SELECT USING (true);
CREATE POLICY "admins write rarities" ON public.card_rarities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ADMIN UPLOADED LIBRARY CARDS
CREATE TABLE public.library_cards (
  id text PRIMARY KEY,
  image text NOT NULL,
  rarity text NOT NULL DEFAULT 'common',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.library_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_cards TO authenticated;
GRANT ALL ON public.library_cards TO service_role;
ALTER TABLE public.library_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "library public read" ON public.library_cards FOR SELECT USING (true);
CREATE POLICY "admins write library" ON public.library_cards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- TRADES
CREATE TABLE public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_card uuid NOT NULL REFERENCES public.owned_cards(id) ON DELETE CASCADE,
  to_card uuid NOT NULL REFERENCES public.owned_cards(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trades TO authenticated;
GRANT ALL ON public.trades TO service_role;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own trades" ON public.trades FOR SELECT TO authenticated
  USING (from_user = auth.uid() OR to_user = auth.uid());
CREATE POLICY "create own trades" ON public.trades FOR INSERT TO authenticated
  WITH CHECK (from_user = auth.uid());
CREATE POLICY "cancel own trades" ON public.trades FOR DELETE TO authenticated
  USING (from_user = auth.uid());

-- DAILY LOGINS
CREATE TABLE public.daily_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  UNIQUE (user_id, day)
);
GRANT SELECT, INSERT ON public.daily_logins TO authenticated;
GRANT ALL ON public.daily_logins TO service_role;
ALTER TABLE public.daily_logins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logins" ON public.daily_logins FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "record own login" ON public.daily_logins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- NEW USER BOOTSTRAP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uname text;
  rcode text;
BEGIN
  uname := COALESCE(NEW.raw_user_meta_data->>'username', 'star_' || substr(NEW.id::text,1,6));
  rcode := COALESCE(NEW.raw_user_meta_data->>'recovery_code', upper(substr(md5(random()::text),1,16)));
  INSERT INTO public.profiles (id, username, recovery_code)
  VALUES (NEW.id, uname, rcode)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.binders (user_id, name, color) VALUES (NEW.id, 'My First Binder', 'pink');
  INSERT INTO public.binders (user_id, name, color) VALUES (NEW.id, 'Favorites', 'purple');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ADMIN UNLOCK
CREATE OR REPLACE FUNCTION public.claim_admin(_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF _code <> 'atiny-admin' THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END; $$;
GRANT EXECUTE ON FUNCTION public.claim_admin(text) TO authenticated;

-- ADOPT A CARD
CREATE OR REPLACE FUNCTION public.adopt_card(_card uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  rec public.owned_cards%ROWTYPE;
  target_binder uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO rec FROM public.owned_cards WHERE id = _card FOR UPDATE;
  IF NOT FOUND OR NOT rec.for_adoption THEN RAISE EXCEPTION 'Card is not up for adoption'; END IF;
  IF rec.user_id = me THEN RAISE EXCEPTION 'That is already your card'; END IF;
  SELECT id INTO target_binder FROM public.binders WHERE user_id = me ORDER BY created_at LIMIT 1;
  UPDATE public.owned_cards
    SET user_id = me, binder_id = target_binder, for_adoption = false, for_trade = false,
        is_new = true, is_dupe = EXISTS (SELECT 1 FROM public.owned_cards o WHERE o.user_id = me AND o.card_id = rec.card_id),
        owned_at = now()
    WHERE id = _card;
  RETURN _card;
END; $$;
GRANT EXECUTE ON FUNCTION public.adopt_card(uuid) TO authenticated;

-- RESPOND TO A TRADE
CREATE OR REPLACE FUNCTION public.respond_trade(_trade uuid, _accept boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  t public.trades%ROWTYPE;
  binder_from uuid;
  binder_to uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO t FROM public.trades WHERE id = _trade FOR UPDATE;
  IF NOT FOUND OR t.to_user <> me OR t.status <> 'pending' THEN RAISE EXCEPTION 'Trade not available'; END IF;

  IF NOT _accept THEN
    UPDATE public.trades SET status = 'declined' WHERE id = _trade;
    RETURN false;
  END IF;

  SELECT id INTO binder_from FROM public.binders WHERE user_id = t.from_user ORDER BY created_at LIMIT 1;
  SELECT id INTO binder_to FROM public.binders WHERE user_id = t.to_user ORDER BY created_at LIMIT 1;

  UPDATE public.owned_cards SET user_id = t.to_user, binder_id = binder_to,
    for_trade = false, for_adoption = false, is_new = true, owned_at = now()
    WHERE id = t.from_card AND user_id = t.from_user;
  UPDATE public.owned_cards SET user_id = t.from_user, binder_id = binder_from,
    for_trade = false, for_adoption = false, is_new = true, owned_at = now()
    WHERE id = t.to_card AND user_id = t.to_user;

  UPDATE public.trades SET status = 'accepted' WHERE id = _trade;
  UPDATE public.trades SET status = 'cancelled'
    WHERE status = 'pending' AND id <> _trade AND (from_card IN (t.from_card, t.to_card) OR to_card IN (t.from_card, t.to_card));
  RETURN true;
END; $$;
GRANT EXECUTE ON FUNCTION public.respond_trade(uuid, boolean) TO authenticated;

-- RECOVERY CODE LOOKUP (returns the username so the app can guide recovery)
CREATE OR REPLACE FUNCTION public.username_for_recovery(_code text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT username FROM public.profiles WHERE recovery_code = _code LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.username_for_recovery(text) TO anon, authenticated;

-- ADMIN STATS
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM public.profiles),
    'today', (SELECT count(*) FROM public.daily_logins WHERE day = (now() AT TIME ZONE 'utc')::date),
    'cards_owned', (SELECT count(*) FROM public.owned_cards),
    'history', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
        SELECT day, count(*) AS count FROM public.daily_logins GROUP BY day ORDER BY day DESC LIMIT 30
      ) x)
  ) INTO result;
  RETURN result;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;