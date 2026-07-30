import { getLibraryCard } from "@/lib/aos";
import { useEffect, useState } from "react";

export function CardReveal({
  cardId,
  isDupe,
  onClose,
}: {
  cardId: string;
  isDupe: boolean;
  ownedUid: string;
  onClose: () => void;
}) {
  const card = getLibraryCard(cardId);
  const [sparkles] = useState(() =>
    Array.from({ length: 20 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      d: Math.random() * 1.2,
    })),
  );
  useEffect(() => {
    const t = window.setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);
  if (!card) return null;

  const rarityLabel: Record<string, string> = {
    common: "Common",
    rare: "Rare",
    ultra: "Ultra Rare",
    impossible: "Impossible!",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {sparkles.map((s, i) => (
        <div
          key={i}
          className="absolute text-yellow-200 aos-sparkle text-2xl pointer-events-none"
          style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${s.d}s` }}
        >
          ✨
        </div>
      ))}
      <div className="aos-reveal text-center px-4 w-full max-w-sm">
        <div className="text-white text-lg font-semibold mb-3 drop-shadow-lg">
          {isDupe ? "Duplicate!" : "New card!"}
        </div>
        <div
          className={`inline-block rounded-3xl overflow-hidden ${isDupe ? "aos-dupe-frame" : "aos-gold-frame"}`}
        >
          <img
            src={card.image}
            alt="card"
            width={600}
            height={800}
            decoding="sync"
            loading="eager"
            draggable={false}
            className="block w-[min(70vw,18rem)] h-auto aspect-[3/4] object-cover select-none"
          />
        </div>
        <div className="mt-4 text-white text-2xl font-bold drop-shadow-lg">{rarityLabel[card.rarity]}</div>
        <button
          onClick={onClose}
          className="mt-4 px-6 py-2 rounded-full bg-white text-primary font-semibold shadow"
        >
          Save to binder
        </button>
      </div>
    </div>
  );
}
