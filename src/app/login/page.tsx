"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function signInWithGoogle() {
    try {
      setLoading(true);
      setMessage("");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error(error);

      setMessage(
        error?.message || "Could not sign in with Google."
      );

      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="y2k-card w-full max-w-md p-8">
        <Link
          href="/"
          className="inline-block text-zinc-400 hover:text-white mb-8"
        >
          ← Back
        </Link>

        <h1 className="text-4xl font-black y2k-title mb-3">
          iRate
        </h1>

        <p className="text-zinc-400 mb-8">
          Sign in to rate music, follow friends, and save your scores.
        </p>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full bg-white text-black rounded-xl py-4 px-5 font-bold flex items-center justify-center gap-3 hover:bg-zinc-200 transition disabled:opacity-50"
        >
          {loading ? "Connecting..." : "Continue with Google"}
        </button>

        {message && (
          <p className="text-red-400 mt-4 text-sm">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
