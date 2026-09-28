"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function UsersPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function searchUsers() {
    const cleanQuery = query.trim();

    if (!cleanQuery) return;

    setLoading(true);
    setSearched(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(
        `username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`
      )
      .limit(20);

    if (error) {
      console.error(error);
      setUsers([]);
    } else {
      setUsers(data || []);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold">Find People</h1>

            <p className="text-zinc-500 mt-2">
              Search iRate users by username or name.
            </p>
          </div>

          <Link
            href="/"
            className="bg-zinc-900 hover:bg-zinc-800 px-4 py-3 rounded-lg"
          >
            Home
          </Link>
        </div>

        <div className="flex gap-3 mb-10">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                searchUsers();
              }
            }}
            placeholder="Search username..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 outline-none focus:border-zinc-500"
          />

          <button
            onClick={searchUsers}
            disabled={loading}
            className="bg-white text-black px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {searched && !loading && users.length === 0 && (
          <p className="text-zinc-500">
            No users found.
          </p>
        )}

        <div className="space-y-3">
          {users.map((user) => (
            <Link
              key={user.id}
              href={`/user/${user.username}`}
              className="flex items-center justify-between bg-zinc-900 hover:bg-zinc-800 rounded-xl p-5 transition"
            >
              <div className="flex items-center gap-4">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-zinc-700 flex items-center justify-center font-bold text-xl">
                    {user.display_name?.[0]?.toUpperCase() ||
                      user.username[0]?.toUpperCase()}
                  </div>
                )}

                <div>
                  <h2 className="font-bold text-lg">
                    {user.display_name || user.username}
                  </h2>

                  <p className="text-zinc-400">
                    @{user.username}
                  </p>
                </div>
              </div>

              <span className="text-zinc-500">
                View Profile →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
