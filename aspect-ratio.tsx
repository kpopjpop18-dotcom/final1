import { useState, useRef, useEffect } from "react";
import { spinWheel, canSpin, getCurrentUser, useAOS } from "@/lib/aos";
import { CardReveal } from "./CardReveal";

const SEGMENT_COLORS = ["#f9c8d9", "#c9e4ff", "#c9f5d9", "#fff2b3", "#e5c9ff", "#ffd9b3", "#f9c8d9", "#c9e4ff"];

export function Wheel() {
  useAOS();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [reveal, setReveal] = useState<null | { cardId: string; isDupe: boolean; ownedUid: string }>(null);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<number | undefined>(undefined);

  const user = getCurrentUser();

  useEffect(() => {
    const tick = () => {
      const c = canSpin();
      setCooldown(c.ok ? 0 : c.secondsLeft || 0);
    };
    tick();
    timerRef.current = window.setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [user?.lastSpin, user?.chickens]);

  const handleSpin = () => {
    if (spinning) return;
    const check = canSpin();
    if (!check.ok) return;
    setSpinning(true);
    const extra = 360 * 6 + Math.random() * 360;
    setRotation((r) => r + extra);
    const pending = spinWheel();
    window.setTimeout(() => {
      void pending.then((result) => {
        setSpinning(false);
        if (result) setReveal({ cardId: result.card.id, isDupe: result.isDupe, ownedUid: result.ownedUid });
      });
    }, 3200);
  };

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  };

  return (
    <div className="flex flex-col items-center justify-center w-full py-6">
      <div className="relative w-[300px] h-[300px] sm:w-[360px] sm:h-[360px]">
        {/* pointer */}
        <div
          className="absolute left-1/2 -top-2 -translate-x-1/2 z-20"
          style={{
            width: 0,
            height: 0,
            borderLeft: "18px solid transparent",
            borderRight: "18px solid transparent",
            borderTop: "28px solid oklch(0.55 0.2 340)",
            filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.2))",
          }}
        />
        <div
          className="relative w-full h-full rounded-full shadow-2xl"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 3.2s cubic-bezier(0.17, 0.67, 0.24, 1)" : undefined,
            background: `conic-gradient(${SEGMENT_COLORS.map(
              (c, i) => `${c} ${(i * 100) / SEGMENT_COLORS.length}% ${((i + 1) * 100) / SEGMENT_COLORS.length}%`,
            ).join(", ")})`,
            border: "8px solid white",
            boxShadow: "0 20px 60px oklch(0.7 0.15 340 / 0.4), inset 0 0 40px oklch(1 0 0 / 0.3)",
          }}
        >
          {SEGMENT_COLORS.map((_, i) => {
            const angle = (i * 360) / SEGMENT_COLORS.length + 360 / SEGMENT_COLORS.length / 2;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 text-2xl aos-float"
                style={{
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-100px)`,
                  animationDelay: `${i * 0.2}s`,
                }}
              >
                ★
              </div>
            );
          })}
        </div>
        {/* center button */}
        <button
          onClick={handleSpin}
          disabled={spinning || cooldown > 0}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-24 h-24 rounded-full bg-white shadow-xl border-4 border-primary flex items-center justify-center font-bold text-primary hover:scale-105 active:scale-95 transition disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <div className="text-center leading-tight">
            <div className="text-2xl">★</div>
            <div className="text-xs">{spinning ? "..." : "SPIN"}</div>
          </div>
        </button>
      </div>

      <div className="mt-6 text-center">
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className="px-3 py-1 rounded-full bg-yellow/50 font-semibold">🐥 {user?.chickens ?? 0}</span>
          {cooldown > 0 && user && user.chickens === 0 ? (
            <span className="px-3 py-1 rounded-full bg-white/70">next free spin: {fmtTime(cooldown)}</span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-green/60 font-semibold">Ready to spin!</span>
          )}
        </div>
      </div>

      {reveal && (
        <CardReveal
          cardId={reveal.cardId}
          isDupe={reveal.isDupe}
          ownedUid={reveal.ownedUid}
          onClose={() => setReveal(null)}
        />
      )}
    </div>
  );
}
