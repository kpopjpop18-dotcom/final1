import { useState } from "react";
import { useAOS, getCurrentUser, updateProfile, getLibraryCard } from "@/lib/aos";

export function ProfileView() {
  useAOS();
  const user = getCurrentUser();
  const [editing, setEditing] = useState(false);
  if (!user) return null;
  const p = user.profile;

  const onAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => updateProfile({ avatar: r.result as string });
    r.readAsDataURL(f);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow text-center">
        <label className="cursor-pointer inline-block">
          <input type="file" accept="image/*" onChange={onAvatar} className="hidden" />
          {p.avatar ? (
            <img src={p.avatar} alt="" className="w-24 h-24 rounded-full mx-auto object-cover ring-4 ring-primary" />
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto bg-pink flex items-center justify-center text-4xl ring-4 ring-primary">
              {p.emoji || "★"}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-1">tap to change</div>
        </label>
        <div className="mt-3 text-xl font-bold">{p.username}</div>
        {p.favGroup && <div className="text-sm text-muted-foreground">💜 {p.favGroup} · {p.favMember}</div>}
        <button onClick={() => setEditing((s) => !s)} className="mt-3 px-4 py-1.5 rounded-full bg-purple/60 text-sm font-medium">
          {editing ? "Done" : "Edit profile"}
        </button>
      </div>

      {editing && (
        <div className="rounded-2xl bg-white p-4 shadow space-y-2">
          <Field label="Username" value={p.username} onChange={(v) => updateProfile({ username: v })} />
          <Field label="Emoji" value={p.emoji || ""} onChange={(v) => updateProfile({ emoji: v })} />
          <Field label="Favorite K-pop group" value={p.favGroup || ""} onChange={(v) => updateProfile({ favGroup: v })} />
          <Field label="Favorite member" value={p.favMember || ""} onChange={(v) => updateProfile({ favMember: v })} />
          <Field label="Spotify (mood song URL)" value={p.spotify || ""} onChange={(v) => updateProfile({ spotify: v })} />
          <div className="mt-3 rounded-xl p-3 bg-yellow/40 text-xs">
            <div className="font-semibold mb-1">Your recovery code — save it!</div>
            <code className="break-all">{user.recoveryCode}</code>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow">
        <div className="font-bold mb-2">★ Profile Wall (up to 5)</div>
        <div className="grid grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4].map((i) => {
            const uid = p.wall[i];
            if (!uid) return <div key={i} className="aspect-[3/4] rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xl">+</div>;
            const owned = user.cards.find((c) => c.uid === uid);
            const lib = owned ? getLibraryCard(owned.cardId) : null;
            if (!lib) return <div key={i} className="aspect-[3/4] rounded-lg bg-muted" />;
            return <img key={i} src={lib.image} alt="" width={300} height={400} loading="lazy" decoding="async" draggable={false} className="w-full aspect-[3/4] rounded-lg object-cover select-none" />;
          })}
        </div>
        <div className="text-xs text-muted-foreground mt-2">Add cards from your binder → tap a card → "Add to profile wall".</div>
      </div>

      {p.spotify && (
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="font-bold mb-2">🎵 Mood song</div>
          <a href={p.spotify} target="_blank" rel="noreferrer" className="text-primary underline text-sm break-all">
            {p.spotify}
          </a>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full p-2 rounded-lg border mt-0.5" />
    </label>
  );
}
