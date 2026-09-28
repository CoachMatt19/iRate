"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SetupProfilePage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    setMessage("");

    const cleanUsername = username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    if (!cleanUsername) {
      setMessage("Enter a valid username.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        username: cleanUsername,
        display_name: displayName.trim() || cleanUsername,
      });

    if (error) {
      if (error.code === "23505") {
        setMessage("That username is already taken.");
      } else {
        setMessage(error.message);
      }

      setSaving(false);
      return;
    }

    router.push(`/user/${cleanUsername}`);
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-zinc-900 rounded-xl p-8">
        <h1 className="text-3xl font-bold mb-2">
          Create your profile
        </h1>

        <p className="text-zinc-400 mb-8">
          Choose how people will find you on iRate.
        </p>

        <label className="block mb-2 font-semibold">
          Username
        </label>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="mateen"
          className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 mb-6"
        />

        <label className="block mb-2 font-semibold">
          Display name
        </label>

        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Mateen"
          className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 mb-6"
        />

        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full bg-white text-black rounded-lg py-3 font-bold disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Profile"}
        </button>

        {message && (
          <p className="text-zinc-400 mt-4">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
