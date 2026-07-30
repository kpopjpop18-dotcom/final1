import { useState } from "react";
import {
  useAOS,
  tryAdminLogin,
  adminLogout,
  adminAddPhotocard,
  adminRemovePhotocard,
  adminSaveRarities,
  adminSetBanned,
  Rarity,
  RARITY_LABEL,
} from "@/lib/aos";

const RARITIES: Rarity[] = ["common", "rare", "ultra", "impossible"];

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const s = useAOS();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (!s.adminUnlocked) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="font-bold text-lg">Admin access</div>
          {!s.signedIn && <div className="text-sm text-destructive">Log in to your account first.</div>}
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            type="password"
            placeholder="Admin password"
            className="w-full p-2 rounded-lg border"
          />
          {err && <div className="text-destructive text-sm">{err}</div>}
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await tryAdminLogin(pw);
              setBusy(false);
              setErr(ok ? "" : "Wrong password");
            }}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-60"
          >
            {busy ? "…" : "Unlock"}
          </button>
          <button onClick={onClose} className="w-full py-1 text-muted-foreground text-sm">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return <AdminDashboard onClose={onClose} />;
}

function AdminDashboard({ onClose }: { onClose: () => void }) {
  const s = useAOS();
  const [uploadRarity, setUploadRarity] = useState<Rarity>("common");
  const [draft, setDraft] = useState<Record<string, Rarity>>({});
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "ok" | "error"; text: string }>({
    kind: "idle",
    text: "",
  });

  const dirtyCount = Object.keys(draft).length;
  const effective = (id: string, current: Rarity) => draft[id] ?? current;

  const stage = (id: string, current: Rarity, next: Rarity) => {
    setStatus({ kind: "idle", text: "" });
    setDraft((d) => {
      const copy = { ...d };
      if (next === current) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  };

  const bulkStage = (next: Rarity) => {
    setStatus({ kind: "idle", text: "" });
    const copy: Record<string, Rarity> = {};
    for (const c of s.library) if (c.rarity !== next) copy[c.id] = next;
    setDraft(copy);
  };

  const save = async () => {
    if (!dirtyCount) {
      setStatus({ kind: "error", text: "Nothing to save yet — pick a rarity first." });
      return;
    }
    setStatus({ kind: "saving", text: "Saving for everyone…" });
    const res = await adminSaveRarities(draft);
    if (res.ok) {
      setDraft({});
      setStatus({ kind: "ok", text: `Saved ${res.saved} card${res.saved === 1 ? "" : "s"} for every player.` });
    } else {
      setStatus({ kind: "error", text: res.error ?? "Could not save. Try again." });
    }
  };

  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((f) => {
      const r = new FileReader();
      r.onload = () => void adminAddPhotocard(r.result as string, uploadRarity);
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="sticky top-0 bg-white/90 backdrop-blur p-4 flex items-center justify-between border-b z-10">
        <div className="font-bold">Admin Dashboard</div>
        <div className="flex gap-3 items-center">
          <button onClick={adminLogout} className="text-sm text-muted-foreground underline">
            Lock
          </button>
          <button onClick={onClose} className="text-sm">
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Players" value={s.stats?.users ?? 0} bg="pink" />
          <Stat label="Today logins" value={s.stats?.today ?? 0} bg="blue" />
          <Stat label="Cards in library" value={s.library.length} bg="green" />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="font-bold mb-2">Add photocards to the shared library</div>
          <div className="text-xs text-muted-foreground mb-2">
            Uploaded cards are saved in the cloud and instantly available to every player. You can also drop images
            into <code>public/cards/</code> on GitHub — those appear after the next deploy.
          </div>
          <div className="flex gap-2 mb-2 flex-wrap">
            {RARITIES.map((r) => (
              <button
                key={r}
                onClick={() => setUploadRarity(r)}
                className={`px-3 py-1.5 rounded-full text-sm ${uploadRarity === r ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                {RARITY_LABEL[r]}
              </button>
            ))}
          </div>
          <label className="block">
            <input type="file" multiple accept="image/*" onChange={upload} className="hidden" />
            <div className="w-full p-6 rounded-xl border-2 border-dashed text-center cursor-pointer bg-yellow/30">
              📤 Tap to upload photocard images
            </div>
          </label>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold">Rarity editor ({s.library.length})</div>
            {dirtyCount > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-yellow/60 font-semibold">
                {dirtyCount} unsaved
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mb-3">
            Pick a rarity for each card, then press Save. Saved rarities apply to every player everywhere.
          </div>

          <div className="rounded-xl bg-muted/50 p-3 mb-3">
            <div className="text-xs font-semibold mb-1">Bulk edit — set every card to</div>
            <div className="flex flex-wrap gap-1">
              {RARITIES.map((r) => (
                <button
                  key={r}
                  onClick={() => bulkStage(r)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white border"
                >
                  {RARITY_LABEL[r]}
                </button>
              ))}
              {dirtyCount > 0 && (
                <button
                  onClick={() => {
                    setDraft({});
                    setStatus({ kind: "idle", text: "" });
                  }}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white border text-muted-foreground"
                >
                  reset changes
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {s.library.map((c) => {
              const value = effective(c.id, c.rarity);
              const changed = draft[c.id] !== undefined;
              return (
                <div key={c.id} className={`relative rounded-xl p-2 ${changed ? "bg-yellow/40 ring-2 ring-primary" : "bg-muted/40"}`}>
                  <img
                    src={c.image}
                    alt=""
                    width={300}
                    height={400}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="w-full aspect-[3/4] rounded-lg object-cover select-none"
                  />
                  {c.source === "uploaded" && (
                    <button
                      onClick={() => {
                        if (confirm("Remove this uploaded card for everyone?")) void adminRemovePhotocard(c.id);
                      }}
                      className="absolute top-3 right-3 bg-destructive text-destructive-foreground rounded-full w-6 h-6 text-xs"
                    >
                      ✕
                    </button>
                  )}
                  <div className="mt-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                      Assign rarity {changed && <span className="text-primary">· changed</span>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {RARITIES.map((r) => (
                        <button
                          key={r}
                          onClick={() => stage(c.id, c.rarity, r)}
                          className={`px-2 py-1 rounded-full text-[11px] font-medium ${value === r ? "bg-primary text-primary-foreground" : "bg-white border"}`}
                        >
                          {RARITY_LABEL[r]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            {s.library.length === 0 && (
              <div className="col-span-2 text-center text-sm text-muted-foreground py-6">
                No cards yet — upload some above.
              </div>
            )}
          </div>

          <div className="sticky bottom-2 mt-4 flex items-center gap-3">
            <button
              onClick={save}
              disabled={status.kind === "saving"}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow disabled:opacity-60"
            >
              {status.kind === "saving" ? "Saving…" : `Save rarities for everyone${dirtyCount ? ` (${dirtyCount})` : ""}`}
            </button>
          </div>
          {status.text && (
            <div
              className={`mt-2 text-sm rounded-lg px-3 py-2 ${
                status.kind === "ok"
                  ? "bg-green/60"
                  : status.kind === "error"
                    ? "bg-destructive/20 text-destructive"
                    : "bg-muted"
              }`}
            >
              {status.kind === "ok" ? "✓ " : status.kind === "error" ? "⚠ " : ""}
              {status.text}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="font-bold mb-2">Players ({s.people.length + 1})</div>
          <div className="space-y-1">
            {s.people.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm py-1">
                <div>
                  {u.username}
                  {u.banned && <span className="ml-2 text-destructive text-xs">banned</span>}
                </div>
                <button
                  onClick={() => void adminSetBanned(u.id, !u.banned)}
                  className="text-xs text-destructive underline"
                >
                  {u.banned ? "unban" : "ban"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="font-bold mb-2">Login history</div>
          <div className="text-sm space-y-0.5 max-h-40 overflow-y-auto">
            {(s.stats?.history ?? []).map((v) => (
              <div key={v.day} className="flex justify-between">
                <span>{v.day}</span>
                <span>{v.count}</span>
              </div>
            ))}
            {!s.stats?.history?.length && <div className="text-muted-foreground text-xs">No logins recorded yet.</div>}
          </div>
        </div>

        <div className="rounded-2xl bg-purple/40 p-4 text-sm">
          <b>Admin perks:</b> unlimited spins (no cooldown or chickens used while unlocked).
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, bg }: { label: string; value: number; bg: string }) {
  return (
    <div className="rounded-2xl p-3 shadow text-center" style={{ background: `var(--color-${bg})` }}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}
