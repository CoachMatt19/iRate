"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

type AlbumRating = {
  id: number;
  spotify_album_id: string;
  album_name: string;
  artist_name: string;
  album_image: string | null;
  overall_rating: number | null;
  updated_at: string;
};

function getRatingColor(rating: number) {
  if (rating >= 10) return "bg-purple-600";
  if (rating >= 8) return "bg-blue-600";
  if (rating >= 5) return "bg-green-600";
  if (rating >= 3) return "bg-orange-500";
  return "bg-red-600";
}

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<AlbumRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(profileData);

      const { data: ratingData } = await supabase
        .from("album_ratings")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      setRatings(ratingData || []);
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function logOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <p>Loading profile...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">

        <div className="flex justify-between items-start mb-12">
          <div className="flex items-center gap-6">

            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile picture"
                className="w-28 h-28 rounded-full object-cover"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-zinc-800 flex items-center justify-center text-4xl font-bold">
                {profile?.display_name?.[0]?.toUpperCase() ||
                  profile?.username?.[0]?.toUpperCase() ||
                  "?"}
              </div>
            )}

            <div>
              <h1 className="text-4xl font-bold">
                {profile?.display_name ||
                  profile?.username ||
                  "My Profile"}
              </h1>

              {profile?.username && (
                <p className="text-zinc-400 mt-1">
                  @{profile.username}
                </p>
              )}

              {profile?.bio && (
                <p className="text-zinc-300 mt-4 max-w-xl">
                  {profile.bio}
                </p>
              )}

              <p className="text-zinc-500 mt-4">
                {ratings.length} album
                {ratings.length === 1 ? "" : "s"} rated
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/edit-profile"
              className="bg-zinc-900 hover:bg-zinc-800 px-4 py-3 rounded-lg"
            >
              Edit Profile
            </Link>

            <Link
              href="/"
              className="bg-zinc-900 hover:bg-zinc-800 px-4 py-3 rounded-lg"
            >
              Search Albums
            </Link>

            <button
              onClick={logOut}
              className="bg-white text-black px-4 py-3 rounded-lg font-semibold"
            >
              Log Out
            </button>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6">
          Rated Albums
        </h2>

        {ratings.length === 0 ? (
          <p className="text-zinc-500">
            You haven&apos;t rated any albums yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

            {ratings.map((rating) => (
              <Link
                key={rating.id}
                href={`/album/${rating.spotify_album_id}`}
                className="bg-zinc-900 rounded-xl p-4 hover:bg-zinc-800 transition"
              >
                {rating.album_image && (
                  <img
                    src={rating.album_image}
                    alt={rating.album_name}
                    className="w-full aspect-square object-cover rounded-lg mb-4"
                  />
                )}

                <h3 className="font-bold text-lg">
                  {rating.album_name}
                </h3>

                <p className="text-zinc-400">
                  {rating.artist_name}
                </p>

                {rating.overall_rating !== null && (
                  <div className="mt-4 flex items-center gap-3">
                    <div
                      className={`
                        w-12 h-12
                        ${getRatingColor(
                          Number(rating.overall_rating)
                        )}
                        rounded-lg
                        flex items-center justify-center
                        font-bold text-xl text-white
                      `}
                    >
                      {rating.overall_rating}
                    </div>

                    <span className="text-zinc-500 text-sm">
                      / 10
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}