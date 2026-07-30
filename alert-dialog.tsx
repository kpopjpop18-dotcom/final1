import { useState } from "react";
import { useAOS, getCurrentUser, dailyCheckIn, todayISO, logout } from "@/lib/aos";

export function SettingsView() {
  const s = useAOS();
  const user = getCurrentUser();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const checkedInToday = user.lastCheckIn === todayISO();
  const days = [1, 2, 3, 4, 5, 6, 7];
  const progress = user.checkInStreak % 7 === 0 && user.checkInStreak > 0 ? 7 : user.checkInStreak % 7;

  const check = async () => {
    setBusy(true);
    const r = await dailyCheckIn();
    setBusy(false);
    setMsg(r.message);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow">
        <div className="font-bold mb-2">Daily Check-in</div>
        <div className="text-sm text-muted-foreground mb-3">7 days in a row = a free rare card 🎁</div>

        <div className="flex gap-1.5 mb-3">
          {days.map((d) => (
            <div
              key={d}
              className={`flex-1 aspect-square rounded-xl flex items-center justify-center text-xs font-bold ${
                d <= progress ? "bg-green" : "bg-muted"
              }`}
            >
              {d === 7 ? "🎁" : d}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div>
            Streak: <b>{user.checkInStreak}</b> days
          </div>
          <button
            onClick={check}
            disabled={checkedInToday || busy}
            className="px-4 py-2 rounded-full bg-green font-medium disabled:opacity-50"
          >
            {checkedInToday ? "✓ Checked in" : busy ? "…" : "Check in +🐥"}
          </button>
        </div>
        {msg && <div className="mt-2 text-sm">{msg}</div>}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow">
        <div className="font-bold mb-2">Account</div>
        <div className="text-sm mb-2">
          Logged in as <b>{user.profile.username}</b>
          {s.isAdmin && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple/60">admin</span>}
        </div>
        <div className="text-xs mb-3 rounded-lg bg-yellow/40 p-2">
          <div className="font-semibold">Recovery code — save this somewhere safe:</div>
          <code className="break-all">{user.recoveryCode}</code>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(user.recoveryCode);
              setMsg("Recovery code copied!");
            }}
            className="ml-2 underline"
          >
            copy
          </button>
        </div>
        <div className="text-xs text-muted-foreground mb-3">
          Your progress is saved to your account automatically — log out and back in on any device and your binder
          will be there.
        </div>
        <button
          onClick={() => void logout()}
          className="px-3 py-1.5 rounded-full bg-destructive/70 text-destructive-foreground text-sm"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
