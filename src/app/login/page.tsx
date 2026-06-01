"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const userId = data.user?.id;

      if (!userId) {
        setError("Unable to verify the signed-in user.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError || profile?.role !== "admin") {
        await supabase.auth.signOut();
        setError("This account is not authorized for admin access.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to sign in right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-6 py-10 text-[#25161d]">
      <section className="mx-auto max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a83f62]">
          Login
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Admin Sign In</h1>
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Email
            <input
              className="rounded-md border border-[#e8bfce] bg-white px-4 py-3 text-base outline-none transition focus:border-[#a83f62]"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Password
            <input
              className="rounded-md border border-[#e8bfce] bg-white px-4 py-3 text-base outline-none transition focus:border-[#a83f62]"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? (
            <p className="rounded-md border border-[#e8bfce] bg-white px-4 py-3 text-sm text-[#9b274e]">
              {error}
            </p>
          ) : null}
          <button
            className="rounded-md bg-[#a83f62] px-4 py-3 font-semibold text-white transition hover:bg-[#8c3150] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
