import { useState } from "react";
import { registerUser, loginUser, loginWithRecovery } from "@/lib/aos";

type Mode = "login" | "register" | "recover";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      let res: { ok: boolean; error?: string };
      if (mode === "register") res = await registerUser(username, password);
      else if (mode === "login") res = await loginUser(username, password);
      else res = await loginWithRecovery(code, password);
      if (!res.ok) setError(res.error ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-5">
      <div className="text-center">
        <div className="text-5xl mb-2 aos-float">🌟</div>
        <h1 className="text-3xl font-black tracking-tight">
          <span className="text-primary">Archive</span> of Stars
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Spin, collect and trade photocards. Your binder saves to your account.
        </p>
      </div>

      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow space-y-3">
        <div className="grid grid-cols-3 gap-1 bg-muted rounded-full p-1 text-xs font-semibold">
          {(["login", "register", "recover"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`py-2 rounded-full transition ${mode === m ? "bg-primary text-primary-foreground" : ""}`}
            >
              {m === "login" ? "Log in" : m === "register" ? "Sign up" : "Recover"}
            </button>
          ))}
        </div>

        {mode === "recover" ? (
          <>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Recovery code"
              className="w-full p-3 rounded-xl border"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="New password"
              className="w-full p-3 rounded-xl border"
            />
            <p className="text-xs text-muted-foreground">
              Enter the recovery code you saved and pick a new password.
            </p>
          </>
        ) : (
          <>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoCapitalize="none"
              className="w-full p-3 rounded-xl border"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              className="w-full p-3 rounded-xl border"
            />
          </>
        )}

        {error && <div className="text-sm text-destructive">{error}</div>}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60"
        >
          {busy ? "…" : mode === "register" ? "Create my account" : mode === "login" ? "Log in" : "Recover account"}
        </button>

        <p className="text-[11px] text-center text-muted-foreground">
          No email needed — just a username and password. You&apos;ll get a recovery code after signing up.
        </p>
      </div>
    </div>
  );
}
