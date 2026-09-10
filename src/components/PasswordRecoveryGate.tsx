import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { PROGRESS_TUTORS_AUTH_URL } from "@/lib/app-url";

function hasRecoveryToken() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type") === "recovery";
}

export function PasswordRecoveryGate({ children }: { children: ReactNode }) {
  const [recovering, setRecovering] = useState(hasRecoveryToken);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!recovering) return <>{children}</>;

  return <NewPasswordScreen />;
}

function NewPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      toast.error("The passwords do not match");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Password updated. You can now sign in.");
      window.location.replace(PROGRESS_TUTORS_AUTH_URL);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update your password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="hero-curve px-6 py-14">
        <div className="mx-auto max-w-md">
          <h1 className="text-3xl font-extrabold">ProgressTutors</h1>
          <p className="mt-2 text-sm opacity-90">Choose a new password for your account.</p>
        </div>
      </div>
      <main className="mx-auto -mt-8 w-full max-w-md px-6 pb-16">
        <form onSubmit={submit} className="surface space-y-4 p-6">
          <h2 className="text-lg font-extrabold">Set a new password</h2>
          <p className="text-sm text-muted-foreground">
            Use at least 8 characters and avoid a password used on another website.
          </p>
          <label className="block text-sm font-semibold">
            New password
            <Input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 h-11 rounded-xl" autoComplete="new-password" />
          </label>
          <label className="block text-sm font-semibold">
            Confirm new password
            <Input type="password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 h-11 rounded-xl" autoComplete="new-password" />
          </label>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
      </main>
    </div>
  );
}
