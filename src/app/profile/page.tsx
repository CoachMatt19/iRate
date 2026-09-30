"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  username: string;
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

  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("USER ERROR:", userError);
        }

        if (!user) {
          router.push("/login");
          return;
        }

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, username, display_name, bio, avatar_url"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error(
            "PROFILE ERROR:",
            profileError
          );
        }

        if (!profileData) {
          router.push("/setup-profile");
          return;
        }

        setProfile(profileData);

        const {
          count: followers,
          error: followersError,
        } = await supabase
          .from("follows")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("following_id", user.id);

        if (followersError) {
          console.error(
            "FOLLOWERS COUNT ERROR:",
            followersError
          );
        }

        const {
          count: following,
          error: followingError,
        } = await supabase
          .from("follows")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("follower_id", user.id);

        if (followingError) {
          console.error(
            "FOLLOWING COUNT ERROR:",
            followingError
          );
        }

        setFollowerCount(followers || 0);
        setFollowingCount(following || 0);

        const {
          data: ratingData,
          error: ratingError,
        } = await supabase
          .from("album_ratings")
          .select(
            "id, spotify_album_id, album_name, artist_name, album_image, overall_rating, updated_at"
          )
          .eq("user_id", user.id)
          .order("updated_at", {
            ascending: false,
          });

        if (ratingError) {
          console.error(
            "RATINGS ERROR:",
            ratingError
          );
        }

        setRatings(ratingData || []);
      } catch (err) {
        console.error(
          "PROFILE LOAD ERROR:",
          err
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 md:px-8">
        <div className="max-w-5xl mx-auto">
          <p>Loading profile...</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 md:px-8">
        <div className="max-w-5xl mx-auto">
          <p>Profile not found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 md:px-8">
      <div className="max-w-5xl mx-auto">

        {/* TOP NAV */}

        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="text-zinc-400 hover:text-white"
          >
            ← Home
          </Link>

          <button
            onClick={logout}
            className="text-zinc-400 hover:text-white"
          >
            Log Out
          </button>
        </div>

        {/* PROFILE HEADER */}

        <section className="y2k-card p-6 sm:p-8 mb-10">
          <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-28 h-28 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-white/10 flex items-center justify-center text-4xl font-black">
                {profile.display_name?.[0]?.toUpperCase() ||
                  profile.username?.[0]?.toUpperCase() ||
                  "?"}
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-black">
                {profile.display_name ||
                  profile.username}
              </h1>

              <p className="text-zinc-500 mt-1">
                @{profile.username}
              </p>

              {profile.bio && (
                <p className="text-zinc-300 mt-4 max-w-2xl">
                  {profile.bio}
                </p>
              )}

              {/* FOLLOWERS / FOLLOWING */}

              <div className="flex flex-wrap gap-6 mt-5">
                <Link
                  href={`/user/${profile.username}/followers`}
                  className="hover:text-white"
                >
                  <span className="font-black">
                    {followerCount}
                  </span>{" "}
                  <span className="text-zinc-400">
                    Followers
                  </span>
                </Link>

                <Link
                  href={`/user/${profile.username}/following`}
                  className="hover:text-white"
                >
                  <span className="font-black">
                    {followingCount}
                  </span>{" "}
                  <span className="text-zinc-400">
                    Following
                  </span>
                </Link>

                <div>
                  <span className="font-black">
                    {ratings.length}
                  </span>{" "}
                  <span className="text-zinc-400">
                    Albums Rated
                  </span>
                </div>
              </div>

              {/* BUTTONS */}

              <div className="flex flex-wrap gap-3 mt-6">
                <Link
                  href="/edit-profile"
                  className="y2k-button px-5 py-3"
                >
                  Edit Profile
                </Link>

                <Link
                  href="/"
                  className="y2k-card px-5 py-3 font-semibold"
                >
                  Search Albums
                </Link>

                <Link
                  href={`/user/${profile.username}`}
                  className="y2k-card px-5 py-3 font-semibold"
                >
                  View Public Profile
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* RATINGS */}

        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-purple-300 mb-2">
                Your Music
              </p>

              <h2 className="text-2xl sm:text-3xl font-bold">
                Rated Albums
              </h2>
            </div>
          </div>

          {ratings.length === 0 ? (
            <div className="y2k-card p-6">
              <p className="text-zinc-400 mb-4">
                You haven&apos;t rated any albums yet.
              </p>

              <Link
                href="/"
                className="inline-block y2k-button px-5 py-3"
              >
                Find an Album
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {ratings.map((rating) => (
                <Link
                  key={rating.id}
                  href={`/user/${profile.username}/album/${rating.spotify_album_id}`}
                  className="y2k-card p-3 sm:p-4"
                >
                  {rating.album_image && (
                    <img
                      src={rating.album_image}
                      alt={rating.album_name}
                      className="w-full aspect-square object-cover rounded-xl mb-3"
                    />
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-lg leading-tight truncate">
                        {rating.album_name}
                      </h3>

                      <p className="text-zinc-400 text-xs sm:text-sm mt-1 truncate">
                        {rating.artist_name}
                      </p>
                    </div>

                    {rating.overall_rating !== null && (
                      <div
                        className={`
                          min-w-10
                          h-10
                          px-2
                          rounded-xl
                          flex
                          items-center
                          justify-center
                          font-black
                          text-white
                          shrink-0
                          ${getRatingColor(
                            Number(
                              rating.overall_rating
                            )
                          )}
                        `}
                      >
                        {rating.overall_rating}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
