import { useAOS, getCurrentUser, getLibraryCard, moveCard, toggleAdoption, toggleTrade, removeCard, toggleWall, markSeen } from "@/lib/aos";
import { useEffect, useState } from "react";

export function CardModal({ ownedUid, onClose }: { ownedUid: string; onClose: () => void }) {
  useAOS();
  const user = getCurrentUser();
  const owned = user?.cards.find((c) => c.uid === ownedUid);
  const card = owned ? getLibraryCard(owned.cardId) : null;
  const [showMove, setShowMove] = useState(false);

  useEffect(() => {
    if (owned?.isNew) markSeen(ownedUid);
  }, [ownedUid]);

  if (!owned || !card || !user) return null;
  const onWall = user.profile.wall.includes(ownedUid);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col" onClick={onClose}>
      <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        <div className={`rounded-3xl overflow-hidden ${owned.isNew ? "aos-gold-frame" : ""}`}>
          <img
            src={card.image}
            alt=""
            width={600}
            height={800}
            decoding="async"
            loading="eager"
            draggable={false}
            className="block w-auto h-auto max-h-[60vh] max-w-[85vw] aspect-[3/4] object-cover select-none"
          />
        </div>
      </div>
      <div className="bg-white rounded-t-3xl p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold capitalize px-3 py-1 rounded-full bg-muted">{card.rarity}</div>
          <button onClick={onClose} className="text-muted-foreground">✕</button>
        </div>

        {showMove ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Move to binder:</div>
            <div className="grid grid-cols-2 gap-2">
              {user.binders.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    moveCard(ownedUid, b.id);
                    setShowMove(false);
                  }}
                  className={`p-3 rounded-xl bg-${b.color} font-medium text-sm ${b.id === owned.binderId ? "opacity-50" : ""}`}
                  style={{ background: `var(--color-${b.color})` }}
                >
                  {b.name}
                </button>
              ))}
            </div>
            <button onClick={() => setShowMove(false)} className="w-full py-2 text-sm text-muted-foreground">Cancel</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowMove(true)} className="p-3 rounded-xl bg-blue/60 font-medium text-sm">
              📁 Move binder
            </button>
            <button onClick={() => toggleAdoption(ownedUid)} className={`p-3 rounded-xl font-medium text-sm ${owned.forAdoption ? "bg-green" : "bg-green/40"}`}>
              {owned.forAdoption ? "✓ Up for adoption" : "🤝 Adopt out"}
            </button>
            <button onClick={() => toggleTrade(ownedUid)} className={`p-3 rounded-xl font-medium text-sm ${owned.forTrade ? "bg-purple" : "bg-purple/40"}`}>
              {owned.forTrade ? "✓ For trade" : "🔄 Trade"}
            </button>
            <button onClick={() => { if (confirm("Remove this card?")) { removeCard(ownedUid); onClose(); } }} className="p-3 rounded-xl bg-destructive/70 text-destructive-foreground font-medium text-sm">
              🗑️ Remove
            </button>
            <button onClick={() => toggleWall(ownedUid)} className={`col-span-2 p-3 rounded-xl font-medium text-sm ${onWall ? "bg-yellow" : "bg-yellow/40"}`}>
              {onWall ? "★ On profile wall" : "☆ Add to profile wall"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
