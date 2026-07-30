import { useState } from "react";
import { useAOS, getCurrentUser, getLibraryCard, addBinder, renameBinder, deleteBinder, PASTEL_COLORS } from "@/lib/aos";
import { CardModal } from "./CardModal";

export function BinderView() {
  useAOS();
  const user = getCurrentUser();
  const [activeBinder, setActiveBinder] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("pink");

  if (!user) return null;
  const currentBinderId = activeBinder ?? user.binders[0]?.id;
  const currentBinder = user.binders.find((b) => b.id === currentBinderId);
  const cards = user.cards.filter((c) => c.binderId === currentBinderId);

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {user.binders.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveBinder(b.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm shadow ${currentBinderId === b.id ? "ring-2 ring-primary" : ""}`}
            style={{ background: `var(--color-${b.color})` }}
          >
            {b.name}
          </button>
        ))}
        <button onClick={() => setShowNew(true)} className="px-4 py-2 rounded-full bg-white shadow font-medium text-sm">
          + New
        </button>
      </div>

      {currentBinder && (
        <div className="flex items-center justify-between text-sm">
          <button onClick={() => setEditing(currentBinder.id)} className="text-muted-foreground underline">Edit binder</button>
          <span className="text-muted-foreground">{cards.length} cards</span>
        </div>
      )}

      {showNew && (
        <div className="p-4 rounded-2xl bg-white shadow space-y-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Binder name" className="w-full p-2 rounded-lg border" />
          <div className="flex gap-2 flex-wrap">
            {PASTEL_COLORS.map((c) => (
              <button key={c} onClick={() => setNewColor(c)} className={`w-8 h-8 rounded-full ${newColor === c ? "ring-2 ring-black" : ""}`} style={{ background: `var(--color-${c})` }} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { if (newName) { addBinder(newName, newColor); setNewName(""); setShowNew(false); } }} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground">Create</button>
            <button onClick={() => setShowNew(false)} className="flex-1 py-2 rounded-lg bg-muted">Cancel</button>
          </div>
        </div>
      )}

      {editing && currentBinder && (
        <BinderEditor binder={currentBinder} onClose={() => setEditing(null)} canDelete={user.binders.length > 1} />
      )}

      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => {
          const lib = getLibraryCard(c.cardId);
          if (!lib) return null;
          return (
            <button
              key={c.uid}
              onClick={() => setSelectedCard(c.uid)}
              className={`rounded-xl overflow-hidden bg-white shadow ${c.isNew ? "aos-gold-frame" : c.isDupe ? "aos-dupe-frame" : ""}`}
            >
              <img src={lib.image} alt="" width={300} height={400} loading="lazy" decoding="async" draggable={false} className="w-full h-auto aspect-[3/4] object-cover select-none" />
            </button>
          );
        })}
        {cards.length === 0 && (
          <div className="col-span-3 text-center text-muted-foreground py-12">
            No cards here yet. Spin the wheel!
          </div>
        )}
      </div>

      {selectedCard && <CardModal ownedUid={selectedCard} onClose={() => setSelectedCard(null)} />}
    </div>
  );
}

function BinderEditor({ binder, onClose, canDelete }: { binder: { id: string; name: string; color: string }; onClose: () => void; canDelete: boolean }) {
  const [name, setName] = useState(binder.name);
  const [color, setColor] = useState(binder.color);
  return (
    <div className="p-4 rounded-2xl bg-white shadow space-y-2">
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 rounded-lg border" />
      <div className="flex gap-2 flex-wrap">
        {PASTEL_COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full ${color === c ? "ring-2 ring-black" : ""}`} style={{ background: `var(--color-${c})` }} />
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => { renameBinder(binder.id, name, color); onClose(); }} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground">Save</button>
        {canDelete && (
          <button onClick={() => { if (confirm("Delete binder? Cards move to another binder.")) { deleteBinder(binder.id); onClose(); } }} className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground">Delete</button>
        )}
        <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-muted">Cancel</button>
      </div>
    </div>
  );
}
