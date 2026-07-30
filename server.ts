// Archive of Stars — cloud-backed state store.
// Progress (accounts, cards, binders, friends, trades) lives in Lovable Cloud,
// so it survives logout, browser changes and devices.
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import sharedManifest from "../../public/cards/manifest.json";

export type Rarity = "common" | "rare" | "ultra" | "impossible";

export interface Photocard {
  id: string;
  image: string;
  rarity: Rarity;
  source?: "shared" | "uploaded";
}

export interface OwnedCard {
  uid: string;
  cardId: string;
  binderId: string | null;
  isNew: boolean;
  isDupe: boolean;
  forTrade: boolean;
  forAdoption: boolean;
  ownedAt: number;
}

export interface Binder {
  id: string;
  name: string;
  color: string;
}

export interface Profile {
  username: string;
  avatar?: string;
  emoji?: string;
  favGroup?: string;
  favMember?: string;
  wall: string[];
  spotify?: string;
}

export interface UserState {
  id: string;
  profile: Profile;
  recoveryCode: string;
  chickens: number;
  lastCheckIn?: string;
  checkInStreak: number;
  lastSpin: number;
  banned: boolean;
  binders: Binder[];
  cards: OwnedCard[];
}

export interface PublicUser {
  id: string;
  username: string;
  avatar?: string;
  emoji?: string;
  favGroup?: string;
  favMember?: string;
  banned: boolean;
}

export interface FriendLink {
  id: string;
  user: PublicUser;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing";
}

export interface MarketCard {
  uid: string;
  cardId: string;
  owner: PublicUser;
  forTrade: boolean;
  forAdoption: boolean;
}

export interface TradeOffer {
  id: string;
  direction: "incoming" | "outgoing";
  other: PublicUser;
  theirCardId?: string;
  myCardId?: string;
  status: string;
}

export interface AdminStats {
  users: number;
  today: number;
  cardsOwned: number;
  history: { day: string; count: number }[];
}

export interface AOSData {
  ready: boolean;
  signedIn: boolean;
  user: UserState | null;
  library: Photocard[];
  isAdmin: boolean;
  adminUnlocked: boolean;
  friends: FriendLink[];
  requests: FriendLink[];
  market: MarketCard[];
  trades: TradeOffer[];
  people: PublicUser[];
  stats: AdminStats | null;
  syncing: boolean;
}

const SPIN_COOLDOWN_MS = 2 * 60 * 60 * 1000;

const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 70,
  rare: 50,
  ultra: 30,
  impossible: 10,
};

const PASTEL_COLORS = ["pink", "blue", "green", "yellow", "purple", "peach"];
const EMAIL_DOMAIN = "archiveofstars.app";

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "common",
  rare: "rare",
  ultra: "ultra rare",
  impossible: "impossible",
};

function emailFor(username: string) {
  return `${username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "_")}@${EMAIL_DOMAIN}`;
}

// --- shared GitHub library (bundled at build time + refetched at runtime) ---
function manifestCards(data: unknown): Photocard[] {
  const cards = (data as { cards?: Photocard[] })?.cards;
  if (!Array.isArray(cards)) return [];
  return cards
    .filter((c) => c && c.id && c.image && c.rarity)
    .map((c) => ({ id: c.id, image: c.image, rarity: c.rarity, source: "shared" as const }));
}

const BUNDLED_SHARED = manifestCards(sharedManifest);

function emptyState(): AOSData {
  return {
    ready: false,
    signedIn: false,
    user: null,
    library: BUNDLED_SHARED,
    isAdmin: false,
    adminUnlocked: false,
    friends: [],
    requests: [],
    market: [],
    trades: [],
    people: [],
    stats: null,
    syncing: false,
  };
}

let state: AOSData = emptyState();
const listeners = new Set<() => void>();

function set(patch: Partial<AOSData>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAOS(): AOSData {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export function getCurrentUser(): UserState | null {
  return state.user;
}

export function getLibraryCard(cardId: string): Photocard | undefined {
  return state.library.find((c) => c.id === cardId);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function mergeLibrary(...groups: Photocard[][]): Photocard[] {
  const byId = new Map<string, Photocard>();
  for (const g of groups) for (const c of g) byId.set(c.id, c);
  return Array.from(byId.values());
}

type Row = Record<string, unknown>;

function toPublicUser(row: Row): PublicUser {
  return {
    id: String(row.id),
    username: String(row.username ?? "star"),
    avatar: (row.avatar as string) ?? undefined,
    emoji: (row.emoji as string) ?? undefined,
    favGroup: (row.fav_group as string) ?? undefined,
    favMember: (row.fav_member as string) ?? undefined,
    banned: Boolean(row.banned),
  };
}

// ---------------------------------------------------------------- library
export async function refreshLibrary() {
  const groups: Photocard[][] = [BUNDLED_SHARED];

  // live manifest from the deployed site (GitHub-managed folder)
  try {
    const res = await fetch("/cards/manifest.json", { cache: "no-cache" });
    if (res.ok) groups.push(manifestCards(await res.json()));
  } catch {
    /* offline — bundled copy is already loaded */
  }

  // admin uploads stored in the cloud (shared with everyone)
  const { data: uploaded } = await supabase
    .from("library_cards")
    .select("id, image, rarity");
  if (uploaded) {
    groups.push(
      uploaded.map((c) => ({
        id: c.id,
        image: c.image,
        rarity: c.rarity as Rarity,
        source: "uploaded" as const,
      })),
    );
  }

  let library = mergeLibrary(...groups);

  // shared rarity table wins — an admin's saved rarity applies to everyone
  const { data: rarities } = await supabase.from("card_rarities").select("card_id, rarity");
  if (rarities?.length) {
    const map = new Map(rarities.map((r) => [r.card_id, r.rarity as Rarity]));
    library = library.map((c) => (map.has(c.id) ? { ...c, rarity: map.get(c.id)! } : c));
  }

  set({ library });
}

// ---------------------------------------------------------------- refresh
export async function refresh() {
  set({ syncing: true });
  await refreshLibrary();

  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user;
  if (!me) {
    set({ ready: true, signedIn: false, user: null, isAdmin: false, adminUnlocked: false, friends: [], requests: [], market: [], trades: [], people: [], stats: null, syncing: false });
    return;
  }

  const [profileRes, bindersRes, cardsRes, rolesRes, peopleRes, friendRes, marketRes, tradeRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", me.id).maybeSingle(),
      supabase.from("binders").select("*").eq("user_id", me.id).order("created_at"),
      supabase.from("owned_cards").select("*").eq("user_id", me.id).order("owned_at"),
      supabase.from("user_roles").select("role").eq("user_id", me.id),
      supabase.from("profiles").select("id, username, avatar, emoji, fav_group, fav_member, banned"),
      supabase.from("friendships").select("*"),
      supabase.from("owned_cards").select("id, card_id, user_id, for_trade, for_adoption").neq("user_id", me.id),
      supabase.from("trades").select("*").eq("status", "pending"),
    ]);

  const profile = profileRes.data as Row | null;
  if (!profile) {
    set({ ready: true, signedIn: true, user: null, syncing: false });
    return;
  }

  const people = (peopleRes.data ?? []).map(toPublicUser);
  const peopleById = new Map(people.map((p) => [p.id, p]));

  const user: UserState = {
    id: me.id,
    profile: {
      username: String(profile.username),
      avatar: (profile.avatar as string) ?? undefined,
      emoji: (profile.emoji as string) ?? undefined,
      favGroup: (profile.fav_group as string) ?? undefined,
      favMember: (profile.fav_member as string) ?? undefined,
      spotify: (profile.spotify as string) ?? undefined,
      wall: Array.isArray(profile.wall) ? (profile.wall as string[]) : [],
    },
    recoveryCode: String(profile.recovery_code),
    chickens: Number(profile.chickens ?? 0),
    lastCheckIn: (profile.last_check_in as string) ?? undefined,
    checkInStreak: Number(profile.check_in_streak ?? 0),
    lastSpin: profile.last_spin ? new Date(profile.last_spin as string).getTime() : 0,
    banned: Boolean(profile.banned),
    binders: (bindersRes.data ?? []).map((b) => ({ id: b.id, name: b.name, color: b.color })),
    cards: (cardsRes.data ?? []).map((c) => ({
      uid: c.id,
      cardId: c.card_id,
      binderId: c.binder_id,
      isNew: c.is_new,
      isDupe: c.is_dupe,
      forTrade: c.for_trade,
      forAdoption: c.for_adoption,
      ownedAt: new Date(c.owned_at).getTime(),
    })),
  };

  const links: FriendLink[] = (friendRes.data ?? []).map((f) => {
    const outgoing = f.requester_id === me.id;
    const otherId = outgoing ? f.addressee_id : f.requester_id;
    return {
      id: f.id,
      user: peopleById.get(otherId) ?? { id: otherId, username: "unknown", banned: false },
      status: f.status as "pending" | "accepted",
      direction: outgoing ? "outgoing" : "incoming",
    };
  });

  const market: MarketCard[] = (marketRes.data ?? [])
    .filter((c) => c.for_trade || c.for_adoption)
    .map((c) => ({
      uid: c.id,
      cardId: c.card_id,
      owner: peopleById.get(c.user_id) ?? { id: c.user_id, username: "unknown", banned: false },
      forTrade: c.for_trade,
      forAdoption: c.for_adoption,
    }));

  const marketById = new Map(market.map((m) => [m.uid, m]));
  const myCardsById = new Map(user.cards.map((c) => [c.uid, c]));
  const trades: TradeOffer[] = (tradeRes.data ?? []).map((t) => {
    const incoming = t.to_user === me.id;
    const otherId = incoming ? t.from_user : t.to_user;
    const theirCard = incoming ? t.from_card : t.to_card;
    const myCard = incoming ? t.to_card : t.from_card;
    return {
      id: t.id,
      direction: incoming ? "incoming" : "outgoing",
      other: peopleById.get(otherId) ?? { id: otherId, username: "unknown", banned: false },
      theirCardId: marketById.get(theirCard)?.cardId ?? myCardsById.get(theirCard)?.cardId,
      myCardId: myCardsById.get(myCard)?.cardId ?? marketById.get(myCard)?.cardId,
      status: t.status,
    };
  });

  const isAdmin = (rolesRes.data ?? []).some((r) => r.role === "admin");
  let stats: AdminStats | null = null;
  if (isAdmin) {
    const { data } = await supabase.rpc("admin_stats");
    const raw = data as { users?: number; today?: number; cards_owned?: number; history?: { day: string; count: number }[] } | null;
    if (raw)
      stats = {
        users: raw.users ?? 0,
        today: raw.today ?? 0,
        cardsOwned: raw.cards_owned ?? 0,
        history: raw.history ?? [],
      };
  }

  set({
    ready: true,
    signedIn: true,
    user,
    isAdmin,
    adminUnlocked: state.adminUnlocked && isAdmin,
    friends: links.filter((l) => l.status === "accepted"),
    requests: links.filter((l) => l.status === "pending"),
    market,
    trades,
    people: people.filter((p) => p.id !== me.id),
    stats,
    syncing: false,
  });
}

// ------------------------------------------------------------------ boot
let booted = false;
export function bootstrap() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      set({ ...emptyState(), ready: true, library: state.library });
      return;
    }
    void refresh().then(recordLogin);
  });
  void refresh().then(recordLogin);
}

async function recordLogin() {
  if (!state.user) return;
  await supabase.from("daily_logins").insert({ user_id: state.user.id }).select().maybeSingle();
}

// ------------------------------------------------------------------ auth
function makeRecoveryCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) out += "-";
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function registerUser(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const clean = username.trim();
  if (clean.length < 3) return { ok: false, error: "Username needs at least 3 characters" };
  if (password.length < 6) return { ok: false, error: "Password needs at least 6 characters" };

  const { data: taken } = await supabase.from("profiles").select("id").eq("username", clean).maybeSingle();
  if (taken) return { ok: false, error: "That username is taken" };

  const { error } = await supabase.auth.signUp({
    email: emailFor(clean),
    password,
    options: { data: { username: clean, recovery_code: makeRecoveryCode() } },
  });
  if (error) return { ok: false, error: error.message };
  await refresh();
  await recordLogin();
  return { ok: true };
}

export async function loginUser(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: emailFor(username),
    password,
  });
  if (error) return { ok: false, error: "Wrong username or password" };
  await refresh();
  await recordLogin();
  return { ok: true };
}

export async function loginWithRecovery(code: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("recover_account", {
    _code: code.trim(),
    _new_password: newPassword,
  });
  if (error || !data) return { ok: false, error: error?.message ?? "Invalid recovery code" };
  return loginUser(String(data), newPassword);
}

export async function logout() {
  await supabase.auth.signOut();
  set({ ...emptyState(), ready: true, library: state.library });
}

// ------------------------------------------------------------- check-in
export async function dailyCheckIn(): Promise<{ got: number; streak: number; gift?: boolean; message: string }> {
  const user = state.user;
  if (!user) return { got: 0, streak: 0, message: "Log in first" };
  const today = todayISO();
  if (user.lastCheckIn === today) return { got: 0, streak: user.checkInStreak, message: "Already checked in today!" };

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = user.lastCheckIn === yesterday ? user.checkInStreak + 1 : 1;

  await supabase
    .from("profiles")
    .update({ chickens: user.chickens + 1, last_check_in: today, check_in_streak: streak })
    .eq("id", user.id);

  let gift = false;
  if (streak % 7 === 0) {
    const rares = state.library.filter((c) => c.rarity === "rare");
    if (rares.length) {
      const chosen = rares[Math.floor(Math.random() * rares.length)];
      await grantCard(chosen.id);
      gift = true;
    }
  }

  await refresh();
  return {
    got: 1,
    streak,
    gift,
    message: `+1 🐥 · streak ${streak}${gift ? " · 🎁 7-day rare card gift!" : ""}`,
  };
}

async function grantCard(cardId: string) {
  const user = state.user;
  if (!user) return null;
  const isDupe = user.cards.some((c) => c.cardId === cardId);
  const { data } = await supabase
    .from("owned_cards")
    .insert({
      user_id: user.id,
      card_id: cardId,
      binder_id: user.binders[0]?.id ?? null,
      is_new: !isDupe,
      is_dupe: isDupe,
    })
    .select()
    .maybeSingle();
  return data ? { uid: data.id as string, isDupe } : null;
}

// ------------------------------------------------------------------ spin
export function canSpin(): { ok: boolean; reason?: string; secondsLeft?: number } {
  const user = state.user;
  if (!user) return { ok: false, reason: "Log in to spin" };
  if (user.banned) return { ok: false, reason: "Account suspended" };
  if (state.adminUnlocked) return { ok: true };
  if (user.chickens > 0) return { ok: true };
  const elapsed = Date.now() - user.lastSpin;
  if (elapsed >= SPIN_COOLDOWN_MS) return { ok: true };
  return {
    ok: false,
    reason: "Wait for cooldown or check in for chickens",
    secondsLeft: Math.ceil((SPIN_COOLDOWN_MS - elapsed) / 1000),
  };
}

export async function spinWheel(): Promise<{ card: Photocard; ownedUid: string; isDupe: boolean } | null> {
  const user = state.user;
  if (!user || !canSpin().ok) return null;

  const lib = state.library;
  if (!lib.length) return null;
  const weighted = lib.map((c) => ({ card: c, w: RARITY_WEIGHTS[c.rarity] ?? 10 }));
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  let chosen = weighted[0].card;
  for (const x of weighted) {
    r -= x.w;
    if (r <= 0) {
      chosen = x.card;
      break;
    }
  }

  const granted = await grantCard(chosen.id);
  if (!granted) return null;

  if (!state.adminUnlocked) {
    if (user.chickens > 0) {
      await supabase.from("profiles").update({ chickens: user.chickens - 1 }).eq("id", user.id);
    } else {
      await supabase.from("profiles").update({ last_spin: new Date().toISOString() }).eq("id", user.id);
    }
  }

  await refresh();
  return { card: chosen, ownedUid: granted.uid, isDupe: granted.isDupe };
}

// ---------------------------------------------------------- card actions
async function patchCard(
  cardUid: string,
  patch: { binder_id?: string | null; is_new?: boolean; for_trade?: boolean; for_adoption?: boolean },
) {
  await supabase.from("owned_cards").update(patch).eq("id", cardUid);
  await refresh();
}

export async function moveCard(cardUid: string, toBinderId: string) {
  await patchCard(cardUid, { binder_id: toBinderId, is_new: false });
}

export async function markSeen(cardUid: string) {
  await supabase.from("owned_cards").update({ is_new: false }).eq("id", cardUid);
}

export async function toggleTrade(cardUid: string) {
  const c = state.user?.cards.find((x) => x.uid === cardUid);
  if (!c) return;
  await patchCard(cardUid, { for_trade: !c.forTrade, for_adoption: false });
}

export async function toggleAdoption(cardUid: string) {
  const c = state.user?.cards.find((x) => x.uid === cardUid);
  if (!c) return;
  await patchCard(cardUid, { for_adoption: !c.forAdoption, for_trade: false });
}

export async function removeCard(cardUid: string) {
  const user = state.user;
  if (!user) return;
  await supabase.from("owned_cards").delete().eq("id", cardUid);
  if (user.profile.wall.includes(cardUid)) {
    await supabase
      .from("profiles")
      .update({ wall: user.profile.wall.filter((w) => w !== cardUid) })
      .eq("id", user.id);
  }
  await refresh();
}

export async function toggleWall(cardUid: string) {
  const user = state.user;
  if (!user) return;
  const has = user.profile.wall.includes(cardUid);
  let wall = has ? user.profile.wall.filter((w) => w !== cardUid) : [...user.profile.wall, cardUid];
  if (wall.length > 5) wall = wall.slice(0, 5);
  await supabase.from("profiles").update({ wall }).eq("id", user.id);
  await refresh();
}

// --------------------------------------------------------------- binders
export async function addBinder(name: string, color = "pink") {
  const user = state.user;
  if (!user) return;
  await supabase.from("binders").insert({ user_id: user.id, name, color });
  await refresh();
}

export async function renameBinder(id: string, name: string, color?: string) {
  await supabase.from("binders").update({ name, ...(color ? { color } : {}) }).eq("id", id);
  await refresh();
}

export async function deleteBinder(id: string) {
  const user = state.user;
  if (!user || user.binders.length <= 1) return;
  const fallback = user.binders.find((b) => b.id !== id)!.id;
  await supabase.from("owned_cards").update({ binder_id: fallback }).eq("binder_id", id);
  await supabase.from("binders").delete().eq("id", id);
  await refresh();
}

// --------------------------------------------------------------- profile
export async function updateProfile(patch: Partial<Profile>) {
  const user = state.user;
  if (!user) return;
  const row: {
    username?: string;
    avatar?: string | null;
    emoji?: string | null;
    fav_group?: string | null;
    fav_member?: string | null;
    spotify?: string | null;
    wall?: string[];
  } = {};
  if (patch.username !== undefined) row.username = patch.username;
  if (patch.avatar !== undefined) row.avatar = patch.avatar;
  if (patch.emoji !== undefined) row.emoji = patch.emoji;
  if (patch.favGroup !== undefined) row.fav_group = patch.favGroup;
  if (patch.favMember !== undefined) row.fav_member = patch.favMember;
  if (patch.spotify !== undefined) row.spotify = patch.spotify;
  if (patch.wall !== undefined) row.wall = patch.wall;
  await supabase.from("profiles").update(row).eq("id", user.id);
  await refresh();
}

// --------------------------------------------------------------- friends
export async function searchUsers(query: string): Promise<PublicUser[]> {
  const q = query.trim();
  if (!q) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar, emoji, fav_group, fav_member, banned")
    .ilike("username", `%${q}%`)
    .limit(20);
  return (data ?? []).map(toPublicUser).filter((p) => p.id !== state.user?.id);
}

export async function addFriend(userId: string) {
  const me = state.user;
  if (!me) return;
  await supabase.from("friendships").insert({ requester_id: me.id, addressee_id: userId });
  await refresh();
}

export async function respondFriend(friendshipId: string, accept: boolean) {
  if (accept) await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
  else await supabase.from("friendships").delete().eq("id", friendshipId);
  await refresh();
}

export async function removeFriend(friendshipId: string) {
  await supabase.from("friendships").delete().eq("id", friendshipId);
  await refresh();
}

export async function getFriendBinder(userId: string): Promise<{ binders: Binder[]; cards: OwnedCard[] }> {
  const [b, c] = await Promise.all([
    supabase.from("binders").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("owned_cards").select("*").eq("user_id", userId),
  ]);
  return {
    binders: (b.data ?? []).map((x) => ({ id: x.id, name: x.name, color: x.color })),
    cards: (c.data ?? []).map((x) => ({
      uid: x.id,
      cardId: x.card_id,
      binderId: x.binder_id,
      isNew: x.is_new,
      isDupe: x.is_dupe,
      forTrade: x.for_trade,
      forAdoption: x.for_adoption,
      ownedAt: new Date(x.owned_at).getTime(),
    })),
  };
}

// -------------------------------------------------------- adopt & trade
export async function adoptCard(marketCardUid: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("adopt_card", { _card: marketCardUid });
  await refresh();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function sendTrade(theirCardUid: string, myCardUid: string): Promise<{ ok: boolean; error?: string }> {
  const me = state.user;
  const target = state.market.find((m) => m.uid === theirCardUid);
  if (!me || !target) return { ok: false, error: "Card unavailable" };
  const { error } = await supabase.from("trades").insert({
    from_user: me.id,
    to_user: target.owner.id,
    from_card: myCardUid,
    to_card: theirCardUid,
  });
  await refresh();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function respondTrade(tradeId: string, accept: boolean): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("respond_trade", { _trade: tradeId, _accept: accept });
  await refresh();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function cancelTrade(tradeId: string) {
  await supabase.from("trades").delete().eq("id", tradeId);
  await refresh();
}

// ----------------------------------------------------------------- admin
export async function tryAdminLogin(password: string): Promise<boolean> {
  if (!state.user) return false;
  const { data, error } = await supabase.rpc("claim_admin", { _code: password });
  if (error || !data) return false;
  set({ adminUnlocked: true, isAdmin: true });
  await refresh();
  set({ adminUnlocked: true });
  return true;
}

export function adminLogout() {
  set({ adminUnlocked: false });
}

export async function adminAddPhotocard(image: string, rarity: Rarity) {
  const id = "up_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  await supabase.from("library_cards").insert({ id, image, rarity });
  await supabase.from("card_rarities").upsert({ card_id: id, rarity, updated_by: state.user?.id });
  await refreshLibrary();
}

export async function adminRemovePhotocard(cardId: string) {
  await supabase.from("library_cards").delete().eq("id", cardId);
  await supabase.from("card_rarities").delete().eq("card_id", cardId);
  await refreshLibrary();
}

/** Saves rarities for EVERY player at once. */
export async function adminSaveRarities(
  changes: Record<string, Rarity>,
): Promise<{ ok: boolean; saved: number; error?: string }> {
  const rows = Object.entries(changes).map(([card_id, rarity]) => ({
    card_id,
    rarity,
    updated_by: state.user?.id ?? null,
    updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return { ok: true, saved: 0 };
  const { error } = await supabase.from("card_rarities").upsert(rows, { onConflict: "card_id" });
  if (error) return { ok: false, saved: 0, error: error.message };
  await supabase.from("library_cards").select("id").limit(1);
  for (const row of rows) {
    await supabase.from("library_cards").update({ rarity: row.rarity }).eq("id", row.card_id);
  }
  await refreshLibrary();
  return { ok: true, saved: rows.length };
}

export async function adminSetBanned(userId: string, banned: boolean) {
  await supabase.from("profiles").update({ banned }).eq("id", userId);
  await refresh();
}

export { PASTEL_COLORS, RARITY_WEIGHTS, SPIN_COOLDOWN_MS };
