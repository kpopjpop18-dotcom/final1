import { useEffect, useState } from "react";
import {
  useAOS,
  getLibraryCard,
  searchUsers,
  addFriend,
  respondFriend,
  removeFriend,
  getFriendBinder,
  adoptCard,
  sendTrade,
  respondTrade,
  cancelTrade,
  PublicUser,
  Binder,
  OwnedCard,
} from "@/lib/aos";

type Pane = "friends" | "market" | "trades";

export function SocialView() {
  const s = useAOS();
  const [pane, setPane] = useState<Pane>("friends");
  const pending = s.requests.filter((r) => r.direction === "incoming").length;
  const incomingTrades = s.trades.filter((t) => t.direction === "incoming").length;

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-3 gap-1 bg-muted rounded-full p-1 text-xs font-semibold">
        <Seg active={pane === "friends"} onClick={() => setPane("friends")} label="Friends" badge={pending} />
        <Seg active={pane === "market"} onClick={() => setPane("market")} label="Adopt / Trade" />
        <Seg active={pane === "trades"} onClick={() => setPane("trades")} label="Requests" badge={incomingTrades} />
      </div>

      {pane === "friends" && <FriendsPane />}
      {pane === "market" && <MarketPane />}
      {pane === "trades" && <TradesPane />}
    </div>
  );
}

function Seg({ active, onClick, label, badge }: { active: boolean; onClick: () => void; label: string; badge?: number }) {
  return (
    <button onClick={onClick} className={`py-2 rounded-full transition relative ${active ? "bg-primary text-primary-foreground" : ""}`}>
      {label}
      {!!badge && (
        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full text-[10px] w-4 h-4 flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

function FriendsPane() {
  const s = useAOS();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PublicUser[]>([]);
  const [viewing, setViewing] = useState<PublicUser | null>(null);

  const search = async () => setResults(await searchUsers(q));
  const friendIds = new Set(s.friends.map((f) => f.user.id));
  const pendingIds = new Set(s.requests.map((f) => f.user.id));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow space-y-2">
        <div className="font-bold">Find friends</div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void search()}
            placeholder="Search username"
            className="flex-1 p-2 rounded-lg border"
          />
          <button onClick={() => void search()} className="px-4 rounded-lg bg-primary text-primary-foreground text-sm">
            Search
          </button>
        </div>
        {results.map((u) => (
          <div key={u.id} className="flex items-center justify-between text-sm py-1">
            <span>
              {u.emoji ?? "★"} {u.username}
            </span>
            {friendIds.has(u.id) ? (
              <span className="text-xs text-muted-foreground">friends</span>
            ) : pendingIds.has(u.id) ? (
              <span className="text-xs text-muted-foreground">pending</span>
            ) : (
              <button onClick={() => void addFriend(u.id)} className="text-xs px-3 py-1 rounded-full bg-pink font-medium">
                + Add friend
              </button>
            )}
          </div>
        ))}
      </div>

      {s.requests.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow space-y-2">
          <div className="font-bold">Friend requests</div>
          {s.requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm py-1">
              <span>
                {r.user.username}
                <span className="text-xs text-muted-foreground ml-1">{r.direction === "outgoing" ? "(sent)" : ""}</span>
              </span>
              {r.direction === "incoming" ? (
                <div className="flex gap-2">
                  <button onClick={() => void respondFriend(r.id, true)} className="text-xs px-3 py-1 rounded-full bg-green font-medium">
                    Accept
                  </button>
                  <button onClick={() => void respondFriend(r.id, false)} className="text-xs px-3 py-1 rounded-full bg-muted">
                    Decline
                  </button>
                </div>
              ) : (
                <button onClick={() => void removeFriend(r.id)} className="text-xs underline text-muted-foreground">
                  cancel
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow space-y-2">
        <div className="font-bold">My friends ({s.friends.length})</div>
        {s.friends.length === 0 && <div className="text-sm text-muted-foreground">No friends yet — search above!</div>}
        {s.friends.map((f) => (
          <div key={f.id} className="flex items-center justify-between text-sm py-1">
            <button onClick={() => setViewing(f.user)} className="underline">
              {f.user.emoji ?? "★"} {f.user.username}
            </button>
            <div className="flex gap-3">
              <button onClick={() => setViewing(f.user)} className="text-xs px-3 py-1 rounded-full bg-blue/60">
                View binders
              </button>
              <button onClick={() => void removeFriend(f.id)} className="text-xs text-destructive underline">
                remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {viewing && <FriendBinderModal user={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function FriendBinderModal({ user, onClose }: { user: PublicUser; onClose: () => void }) {
  const [data, setData] = useState<{ binders: Binder[]; cards: OwnedCard[] } | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    void getFriendBinder(user.id).then(setData);
  }, [user.id]);

  const binderId = active ?? data?.binders[0]?.id ?? null;
  const cards = (data?.cards ?? []).filter((c) => c.binderId === binderId);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="sticky top-0 bg-white/90 backdrop-blur p-4 flex items-center justify-between border-b">
        <div className="font-bold">
          {user.emoji ?? "★"} {user.username}
        </div>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(data?.binders ?? []).map((b) => (
            <button
              key={b.id}
              onClick={() => setActive(b.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm shadow ${binderId === b.id ? "ring-2 ring-primary" : ""}`}
              style={{ background: `var(--color-${b.color})` }}
            >
              {b.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {cards.map((c) => {
            const lib = getLibraryCard(c.cardId);
            if (!lib) return null;
            return (
              <button key={c.uid} onClick={() => setZoom(lib.image)} className="rounded-xl overflow-hidden bg-white shadow relative">
                <img src={lib.image} alt="" width={300} height={400} loading="lazy" decoding="async" draggable={false} className="w-full aspect-[3/4] object-cover select-none" />
                {(c.forAdoption || c.forTrade) && (
                  <span className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full bg-white/90 font-semibold">
                    {c.forAdoption ? "adopt" : "trade"}
                  </span>
                )}
              </button>
            );
          })}
          {!cards.length && <div className="col-span-3 text-center text-muted-foreground py-10 text-sm">Nothing in this binder.</div>}
        </div>
      </div>
      {zoom && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setZoom(null)}>
          <img src={zoom} alt="" className="max-h-[80vh] max-w-[90vw] rounded-2xl" />
        </div>
      )}
    </div>
  );
}

function MarketPane() {
  const s = useAOS();
  const [tradeFor, setTradeFor] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const myTradeable = s.user?.cards ?? [];

  return (
    <div className="space-y-4">
      {msg && <div className="rounded-xl bg-green/50 p-3 text-sm">{msg}</div>}
      <div className="rounded-2xl bg-white p-4 shadow">
        <div className="font-bold mb-1">Cards from other players</div>
        <div className="text-xs text-muted-foreground mb-3">
          Adopt a card to add it straight to your binder, or offer one of yours for a trade.
        </div>
        <div className="grid grid-cols-2 gap-3">
          {s.market.map((m) => {
            const lib = getLibraryCard(m.cardId);
            if (!lib) return null;
            return (
              <div key={m.uid} className="rounded-xl bg-muted/40 p-2">
                <img src={lib.image} alt="" width={300} height={400} loading="lazy" decoding="async" draggable={false} className="w-full aspect-[3/4] rounded-lg object-cover select-none" />
                <div className="text-xs mt-1 font-medium truncate">{m.owner.username}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{lib.rarity}</div>
                {m.forAdoption ? (
                  <button
                    onClick={async () => {
                      const r = await adoptCard(m.uid);
                      setMsg(r.ok ? "Adopted! It's in your first binder." : (r.error ?? "Could not adopt"));
                    }}
                    className="mt-1 w-full py-1.5 rounded-full bg-green text-xs font-semibold"
                  >
                    🤝 Adopt
                  </button>
                ) : (
                  <button onClick={() => setTradeFor(m.uid)} className="mt-1 w-full py-1.5 rounded-full bg-purple text-xs font-semibold">
                    🔄 Offer trade
                  </button>
                )}
              </div>
            );
          })}
          {!s.market.length && (
            <div className="col-span-2 text-center text-sm text-muted-foreground py-8">
              Nobody has listed cards yet.
            </div>
          )}
        </div>
      </div>

      {tradeFor && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center" onClick={() => setTradeFor(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-4 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold mb-2">Pick one of your cards to offer</div>
            <div className="grid grid-cols-3 gap-2">
              {myTradeable.map((c) => {
                const lib = getLibraryCard(c.cardId);
                if (!lib) return null;
                return (
                  <button
                    key={c.uid}
                    onClick={async () => {
                      const r = await sendTrade(tradeFor, c.uid);
                      setTradeFor(null);
                      setMsg(r.ok ? "Trade request sent!" : (r.error ?? "Could not send"));
                    }}
                    className="rounded-lg overflow-hidden"
                  >
                    <img src={lib.image} alt="" width={300} height={400} loading="lazy" decoding="async" draggable={false} className="w-full aspect-[3/4] object-cover select-none" />
                  </button>
                );
              })}
            </div>
            <button onClick={() => setTradeFor(null)} className="w-full py-2 mt-3 text-sm text-muted-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TradesPane() {
  const s = useAOS();
  const [msg, setMsg] = useState("");

  return (
    <div className="space-y-4">
      {msg && <div className="rounded-xl bg-green/50 p-3 text-sm">{msg}</div>}
      <div className="rounded-2xl bg-white p-4 shadow space-y-3">
        <div className="font-bold">Trade requests</div>
        {!s.trades.length && <div className="text-sm text-muted-foreground">No pending trades.</div>}
        {s.trades.map((t) => {
          const theirs = t.theirCardId ? getLibraryCard(t.theirCardId) : undefined;
          const mine = t.myCardId ? getLibraryCard(t.myCardId) : undefined;
          return (
            <div key={t.id} className="rounded-xl bg-muted/40 p-3">
              <div className="text-sm font-medium mb-2">
                {t.direction === "incoming" ? `${t.other.username} wants to trade` : `You offered ${t.other.username}`}
              </div>
              <div className="flex items-center gap-3">
                <CardThumb image={theirs?.image} label={t.direction === "incoming" ? "they give" : "you get"} />
                <span className="text-xl">🔄</span>
                <CardThumb image={mine?.image} label={t.direction === "incoming" ? "you give" : "you give"} />
              </div>
              <div className="flex gap-2 mt-3">
                {t.direction === "incoming" ? (
                  <>
                    <button
                      onClick={async () => {
                        const r = await respondTrade(t.id, true);
                        setMsg(r.ok ? "Trade complete — cards swapped!" : (r.error ?? "Could not accept"));
                      }}
                      className="flex-1 py-2 rounded-lg bg-green font-medium text-sm"
                    >
                      Accept
                    </button>
                    <button
                      onClick={async () => {
                        await respondTrade(t.id, false);
                        setMsg("Trade declined.");
                      }}
                      className="flex-1 py-2 rounded-lg bg-muted text-sm"
                    >
                      Decline
                    </button>
                  </>
                ) : (
                  <button onClick={() => void cancelTrade(t.id)} className="flex-1 py-2 rounded-lg bg-muted text-sm">
                    Cancel request
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardThumb({ image, label }: { image?: string; label: string }) {
  return (
    <div className="text-center">
      {image ? (
        <img src={image} alt="" width={150} height={200} loading="lazy" decoding="async" draggable={false} className="w-16 aspect-[3/4] rounded-lg object-cover select-none" />
      ) : (
        <div className="w-16 aspect-[3/4] rounded-lg bg-muted flex items-center justify-center text-xs">?</div>
      )}
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
