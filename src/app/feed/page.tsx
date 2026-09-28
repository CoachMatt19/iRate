"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AlbumRating = {
  id: number;
  user_id: string;
  spotify_album_id: string;
  album_name: string;
  artist_name: string;
  album_image: string | null;
  overall_rating: number | null;
  updated_at: string;
};

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

function getRatingColor(rating: number) {
  if (rating >= 10) return "bg-purple-600";
  if (rating >= 8) return "bg-blue-600";
  if (rating >= 5) return "bg-green-600";
  if (rating >= 3) return "bg-orange-500";
  return "bg-red-600";
}

export default function FeedPage() {
  const router = useRouter();

  const [ratings, setRatings] = useState<AlbumRating[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeed() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const followingIds =
          follows?.map((follow) => follow.following_id) || [];

        if (followingIds.length === 0) {
          return;
        }

        const { data: ratingData, error: ratingError } =
          await supabase
            .from("album_ratings")
            .select("*")
            .in("user_id", followingIds)
            .order("updated_at", { ascending: false })
            .limit(50);

        if (ratingError) {
          throw ratingError;
        }

        setRatings(ratingData || []);

        const profileIds = [
          ...new Set(
            (ratingData || []).map(
              (rating) => rating.user_id
            )
          ),
        ];

        if (profileIds.length > 0) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select(
              "id, username, display_name, avatar_url"
            )
            .in("id", profileIds);

          const profileMap: Record<string, Profile> = {};

          profileData?.forEach((profile) => {
            profileMap[profile.id] = profile;
          });

          setProfiles(profileMap);
        }
      } catch (error) {
        console.error("FEED ERROR:", error);
      } finally {
        setLoading(false);
      }
    }

    loadFeed();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <p>Loading feed...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold">
              Activity
            </h1>

            <p className="text-zinc-500 mt-2">
              Ratings from people you follow.
            </p>
          </div>

          <Link
            href="/"
            className="bg-zinc-900 hover:bg-zinc-800 px-4 py-3 rounded-lg"
          >
            Home
          </Link>
        </div>

        {ratings.length === 0 ? (
          <div className="bg-zinc-900 rounded-xl p-8">
            <p className="text-zinc-400 mb-4">
              Your feed is empty.
            </p>

            <Link
              href="/users"
              className="underline"
            >
              Find people to follow
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {ratings.map((rating) => {
              const profile = profiles[rating.user_id];

              return (
                <div
                  key={rating.id}
                  className="bg-zinc-900 rounded-xl p-5"
                >
                  <div className="flex items-center gap-3 mb-4">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.username}
                        className="w-11 h-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-zinc-700 flex items-center justify-center font-bold">
                        {profile?.display_name?.[0]?.toUpperCase() ||
                          profile?.username?.[0]?.toUpperCase() ||
                          "?"}
                      </div>
                    )}

                    <div>
                      {profile ? (
                        <Link
                          href={`/user/${profile.username}`}
                          className="font-bold hover:underline"
                        >
                          {profile.display_name ||
                            profile.username}
                        </Link>
                      ) : (
                        <span className="font-bold">
                          iRate user
                        </span>
                      )}

                      {profile && (
                        <p className="text-zinc-500 text-sm">
                          @{profile.username}
                        </p>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/album/${rating.spotify_album_id}`}
                    className="flex gap-4"
                  >
                    {rating.album_image && (
                      <img
                        src={rating.album_image}
                        alt={rating.album_name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}

                    <div className="flex-1">
                      <p className="text-zinc-500 text-sm mb-1">
                        rated
                      </p>

                      <h2 className="text-xl font-bold">
                        {rating.album_name}
                      </h2>

                      <p className="text-zinc-400">
                        {rating.artist_name}
                      </p>

                      {rating.overall_rating !== null && (
                        <div className="mt-3 flex items-center gap-2">
                          <div
                            className={`
                              w-10 h-10
                              rounded-lg
                              flex items-center justify-center
                              font-bold
                              ${getRatingColor(
                                Number(
                                  rating.overall_rating
                                )
                              )}
                            `}
                          >
                            {rating.overall_rating}
                          </div>

                          <span className="text-zinc-500">
                            / 10
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
