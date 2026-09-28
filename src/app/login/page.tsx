"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function signUp() {
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Account created. Check your email if confirmation is required."
    );
  }

  async function signIn() {
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/");
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-zinc-900 p-8 rounded-xl">
        <h1 className="text-3xl font-bold mb-6">
          iRate
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 bg-black border border-zinc-700 rounded-lg px-4 py-3"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 bg-black border border-zinc-700 rounded-lg px-4 py-3"
        />

        <div className="flex gap-3">
          <button
            onClick={signIn}
            className="flex-1 bg-white text-black py-3 rounded-lg font-semibold"
          >
            Log In
          </button>

          <button
            onClick={signUp}
            className="flex-1 bg-zinc-700 py-3 rounded-lg font-semibold"
          >
            Sign Up
          </button>
        </div>

        {message && (
          <p className="mt-4 text-sm text-zinc-400">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}