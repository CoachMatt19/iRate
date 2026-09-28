"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
};

export default function FollowersPage() {
  const params = useParams();
  const username = params.username as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFollowers() {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .eq("username", username)
        .maybeSingle();

      if (!profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: followData } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", profileData.id);

      const ids =
        followData?.map((follow) => follow.follower_id) || [];

      if (ids.length > 0) {
        const { data: users } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", ids);

        setFollowers(users || []);
      }

      setLoading(false);
    }

    loadFollowers();
  }, [username]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <p>Loading followers...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <p>User not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href={`/user/${username}`}
          className="text-zinc-400 hover:text-white inline-block mb-8"
        >
          ← Back to profile
        </Link>

        <h1 className="text-4xl font-bold mb-2">
          Followers
        </h1>

        <p className="text-zinc-500 mb-8">
          @{username}
        </p>

        {followers.length === 0 ? (
          <p className="text-zinc-500">
            No followers yet.
          </p>
        ) : (
          <div className="space-y-3">
            {followers.map((user) => (
              <Link
                key={user.id}
                href={`/user/${user.username}`}
                className="block bg-zinc-900 hover:bg-zinc-800 rounded-xl p-5"
              >
                <p className="font-bold">
                  {user.display_name || user.username}
                </p>

                <p className="text-zinc-400">
                  @{user.username}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
