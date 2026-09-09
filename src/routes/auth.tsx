import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — ProgressTutors" },
      {
        name: "description",
        content: "Sign in to the shared ProgressTutors operational demo. Access is restricted to invited users.",
      },
      { property: "og:title", content: "Sign in — ProgressTutors" },
      { property: "og:description", content: "Secure access to the shared ProgressTutors demo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (!error && data.user) navigate({ to: "/admin/dashboard", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}#/auth`,
          },
        });
        if (error) throw error;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          toast.success("Account created. Please confirm your email, then sign in.");
          setMode("signin");
          return;
        }
        toast.success("Account created");
        navigate({ to: "/admin/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="hero-curve px-6 py-14">
        <div className="mx-auto max-w-md">
          <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
            Shared operational demo · Live data
          </span>
          <h1 className="mt-4 text-3xl font-extrabold">ProgressTutors</h1>
          <p className="mt-2 text-sm opacity-90">
            This demo holds real records, so access is restricted to invited users.
          </p>
        </div>
      </div>

      <main className="mx-auto -mt-8 w-full max-w-md px-6 pb-16">
        <form onSubmit={submit} className="surface space-y-4 p-6">
          <h2 className="text-lg font-extrabold">{mode === "signin" ? "Sign in" : "Create an account"}</h2>
          <label className="block text-sm font-semibold">
            Email
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-11 rounded-xl"
              autoComplete="email"
            />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 h-11 rounded-xl"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </label>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
          </Button>
          <button
            type="button"
            className="w-full text-sm font-semibold text-primary"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "No account yet? Sign up" : "Already have an account? Sign in"}
          </button>
        </form>
      </main>
    </div>
  );
}
