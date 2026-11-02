import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Eye, EyeOff, Lock, User, Loader2, ScanFace } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapDemoAdmin, resolveLoginEmail, faceLoginFn } from "@/lib/staff.functions";
import { toAuthPassword } from "@/lib/auth-password";
import { cameraSupported } from "@/lib/face-recognition";
import { FaceCapture } from "@/components/face-capture";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Kirish — Lazzat boshqaruv paneli" },
      { name: "description", content: "Restoran xodimlari uchun boshqaruv paneliga kirish." },
      { property: "og:title", content: "Lazzat boshqaruv paneli" },
      { property: "og:description", content: "Xodimlar uchun kirish sahifasi." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [faceOpen, setFaceOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
    void bootstrapDemoAdmin();
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { email } = await resolveLoginEmail({ data: { username } });
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: toAuthPassword(password) });
      if (signInError) throw new Error("Login yoki parol noto'g'ri");
      navigate({ to: "/admin", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  async function onFaceCaptured(descriptor: number[]) {
    const tokens = await faceLoginFn({ data: { descriptor } });
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
    if (sessionError) throw new Error("Kirishda xatolik");
    setFaceOpen(false);
    navigate({ to: "/admin", replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full gradient-primary opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full gradient-primary opacity-20 blur-3xl" />

      <Link
        to="/"
        className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-xs font-bold text-foreground press"
      >
        <ArrowLeft className="h-4 w-4" />
        Orqaga
      </Link>
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm rounded-[2rem] glass-strong p-7 shadow-soft"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl gradient-primary text-2xl font-black text-primary-foreground shadow-glow">
          L
        </div>
        <h1 className="mt-5 text-center font-display text-2xl font-extrabold text-foreground">
          Boshqaruv paneli
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Xodim hisobingiz bilan kiring
        </p>

        <div className="mt-6 space-y-3">
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Login"
              aria-label="Login"
              autoComplete="username"
              className="w-full rounded-2xl bg-secondary py-3.5 pl-11 pr-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parol"
              aria-label="Parol"
              autoComplete="current-password"
              className="w-full rounded-2xl bg-secondary py-3.5 pl-11 pr-12 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              aria-label={showPassword ? "Parolni yashirish" : "Parolni ko‘rsatish"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground press hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error ? <p className="mt-3 text-center text-sm text-destructive">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-3.5 text-sm font-extrabold text-primary-foreground press shadow-glow disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Kirish
        </button>

        {cameraSupported() ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setFaceOpen(true);
            }}
            disabled={loading}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-3.5 text-sm font-bold text-foreground press disabled:opacity-60"
          >
            <ScanFace className="h-4 w-4 text-primary" />
            Face ID bilan kirish
          </button>
        ) : null}
      </motion.form>

      <FaceCapture
        open={faceOpen}
        mode="login"
        onClose={() => setFaceOpen(false)}
        onCaptured={onFaceCaptured}
      />
    </div>
  );
}

