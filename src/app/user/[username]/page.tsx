"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<AlbumRating[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUserId, setCurrentUserId] = useState<string | null>(
    null
  );

  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

useEffect(() => {
  async function loadProfile() {
    try {
      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id, username, display_name, bio, avatar_url"
          )
          .eq("username", username)
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        setProfile(null);
        return;
      }

      setProfile(profileData);

      const { data: ratingsData, error: ratingsError } =
        await supabase
          .from("album_ratings")
          .select("*")
          .eq("user_id", profileData.id)
          .order("updated_at", { ascending: false });

      if (ratingsError) {
        throw ratingsError;
      }

      setRatings(ratingsData || []);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(userError);
      }

      setCurrentUserId(user?.id || null);

      if (user && user.id !== profileData.id) {
        const { data: followData, error: followError } =
          await supabase
            .from("follows")
            .select("id")
            .eq("follower_id", user.id)
            .eq("following_id", profileData.id)
            .maybeSingle();

        if (followError) {
          console.error(followError);
        }

        setFollowing(!!followData);
      }

      const { count: followers, error: followersError } =
        await supabase
          .from("follows")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("following_id", profileData.id);

      if (followersError) {
        console.error(followersError);
      }

      const { count: followingUsers, error: followingError } =
        await supabase
          .from("follows")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("follower_id", profileData.id);

      if (followingError) {
        console.error(followingError);
      }

      setFollowerCount(followers || 0);
      setFollowingCount(followingUsers || 0);
    } catch (error) {
      console.error("PROFILE LOAD ERROR:", error);
    } finally {
      setLoading(false);
    }
  }

  if (username) {
    loadProfile();
  }
}, [username]);


  async function toggleFollow() {
    if (!profile || !currentUserId) return;

    if (following) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", profile.id);

      if (!error) {
        setFollowing(false);
        setFollowerCount((count) =>
          Math.max(0, count - 1)
        );
      }
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({
          follower_id: currentUserId,
          following_id: profile.id,
        });

      if (!error) {
        setFollowing(true);
        setFollowerCount((count) => count + 1);
      }
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <p>Loading profile...</p>
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

  const isOwnProfile = currentUserId === profile.id;

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/"
          className="text-zinc-400 hover:text-white inline-block mb-8"
        >
          ← Back
        </Link>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-28 h-28 rounded-full object-cover"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-zinc-800 flex items-center justify-center text-4xl font-bold">
                {profile.display_name?.[0]?.toUpperCase() ||
                  profile.username[0]?.toUpperCase()}
              </div>
            )}

            <div>
              <h1 className="text-4xl font-bold">
                {profile.display_name || profile.username}
              </h1>

              <p className="text-zinc-400 mt-1">
                @{profile.username}
              </p>

              {profile.bio && (
                <p className="text-zinc-300 mt-4 max-w-xl">
                  {profile.bio}
                </p>
              )}

              <div className="flex flex-wrap gap-5 text-zinc-400 mt-5">
                <Link
                  href={`/user/${profile.username}/followers`}
                  className="hover:text-white"
                >
                  <strong className="text-white">
                    {followerCount}
                  </strong>{" "}
                  followers
                </Link>

                <Link
                  href={`/user/${profile.username}/following`}
                  className="hover:text-white"
                >
                  <strong className="text-white">
                    {followingCount}
                  </strong>{" "}
                  following
                </Link>

                <span>
                  <strong className="text-white">
                    {ratings.length}
                  </strong>{" "}
                  albums rated
                </span>
              </div>
            </div>
          </div>

          {isOwnProfile ? (
            <Link
              href="/edit-profile"
              className="bg-zinc-900 hover:bg-zinc-800 px-6 py-3 rounded-lg font-semibold"
            >
              Edit Profile
            </Link>
          ) : (
            currentUserId && (
              <button
                onClick={toggleFollow}
                className={
                  following
                    ? "bg-zinc-800 px-6 py-3 rounded-lg font-semibold"
                    : "bg-white text-black px-6 py-3 rounded-lg font-semibold"
                }
              >
                {following ? "Following" : "Follow"}
              </button>
            )
          )}
        </div>

        <h2 className="text-2xl font-bold mb-6">
          Rated Albums
        </h2>

        {ratings.length === 0 ? (
          <p className="text-zinc-500">
            No albums rated yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {ratings.map((rating) => (
              <Link
                key={rating.id}
href={`/user/${profile.username}/album/${rating.spotify_album_id}`}                className="bg-zinc-900 rounded-xl p-4 hover:bg-zinc-800 transition"
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
