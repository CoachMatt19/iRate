"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Album = {
  id: string;
  name: string;
  release_date: string;
  images: {
    url: string;
  }[];
  artists: {
    name: string;
  }[];
};

type RecentRating = {
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

export default function Home() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const [recentRatings, setRecentRatings] = useState<RecentRating[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    async function loadHome() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("USER ERROR:", userError);
        }

        setLoggedIn(!!user);

        if (!user) {
          setRecentRatings([]);
          setProfiles({});
          return;
        }

        // Check whether this Google/Supabase user
        // has already created an iRate profile.
        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error(
            "PROFILE CHECK ERROR:",
            profileError
          );
        }

        // Brand-new Google users go here first.
        if (!profile?.username) {
          router.push("/setup-profile");
          return;
        }

        // Find everybody this user follows.
        const {
          data: follows,
          error: followsError,
        } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        if (followsError) {
          console.error(
            "FOLLOWS ERROR:",
            followsError
          );
          return;
        }

        const followingIds =
          follows?.map(
            (follow) => follow.following_id
          ) || [];

        if (followingIds.length === 0) {
          setRecentRatings([]);
          setProfiles({});
          return;
        }

        // Load recent album ratings only from
        // people the current user follows.
        const {
          data: ratingData,
          error: ratingError,
        } = await supabase
          .from("album_ratings")
          .select(
            "id, user_id, spotify_album_id, album_name, artist_name, album_image, overall_rating, updated_at"
          )
          .in("user_id", followingIds)
          .not("overall_rating", "is", null)
          .order("updated_at", {
            ascending: false,
          })
          .limit(8);

        if (ratingError) {
          console.error(
            "RECENT RATINGS ERROR:",
            ratingError
          );
          return;
        }

        setRecentRatings(ratingData || []);

        const userIds = [
          ...new Set(
            (ratingData || []).map(
              (rating) => rating.user_id
            )
          ),
        ];

        if (userIds.length === 0) {
          setProfiles({});
          return;
        }

        // Load names / avatars for those users.
        const {
          data: profileData,
          error: profilesError,
        } = await supabase
          .from("profiles")
          .select(
            "id, username, display_name, avatar_url"
          )
          .in("id", userIds);

        if (profilesError) {
          console.error(
            "RECENT PROFILE ERROR:",
            profilesError
          );
          return;
        }

        const profileMap: Record<
          string,
          Profile
        > = {};

        profileData?.forEach((profile) => {
          profileMap[profile.id] = profile;
        });

        setProfiles(profileMap);
      } catch (err) {
        console.error(
          "HOME LOAD ERROR:",
          err
        );
      }
    }

    loadHome();
  }, [router]);

  async function searchAlbums() {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/search?q=${encodeURIComponent(
          query
        )}`
      );

      if (!response.ok) {
        throw new Error("Search failed.");
      }

      const data = await response.json();

      setAlbums(
        data.albums?.items || []
      );
    } catch (err) {
      console.error(err);

      setError(
        "Something went wrong while searching."
      );

      setAlbums([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 md:px-8">
      <div className="max-w-6xl mx-auto">

        {/* NAVIGATION */}

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-12">
          <Link
            href="/"
            className="text-3xl sm:text-4xl font-black y2k-title tracking-tight"
          >
            iRate
          </Link>

          <div className="grid grid-cols-3 sm:flex gap-2 w-full sm:w-auto">
            {loggedIn && (
              <>
                <Link
                  href="/feed"
                  className="y2k-card px-3 sm:px-5 py-3 font-semibold text-center text-sm sm:text-base"
                >
                  Feed
                </Link>

                <Link
                  href="/users"
                  className="y2k-card px-3 sm:px-5 py-3 font-semibold text-center text-sm sm:text-base"
                >
                  People
                </Link>
              </>
            )}

            {loggedIn ? (
              <Link
                href="/profile"
                className="y2k-card px-3 sm:px-5 py-3 font-semibold text-center text-sm sm:text-base"
              >
                Profile
              </Link>
            ) : (
              <Link
                href="/login"
                className="y2k-button px-5 py-3 text-center"
              >
                Log In
              </Link>
            )}
          </div>
        </header>

        {/* HERO / SEARCH */}

        <section className="mb-14">
          <div className="y2k-card p-6 sm:p-8">
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-cyan-300 mb-3">
              Your music. Your score.
            </p>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black leading-tight mb-4">
              Rate the music you listen to.
            </h1>

            <p className="text-zinc-400 text-base sm:text-lg mb-7 max-w-2xl">
              Search albums, rate every song,
              and keep your ratings saved.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search for an album..."
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    searchAlbums();
                  }
                }}
                className="y2k-input w-full flex-1 px-4 py-4 text-base"
              />

              <button
                onClick={searchAlbums}
                disabled={loading}
                className="y2k-button w-full sm:w-auto px-7 py-4 disabled:opacity-50"
              >
                {loading
                  ? "Searching..."
                  : "Search"}
              </button>
            </div>
          </div>
        </section>

        {/* SEARCH ERRORS */}

        {error && (
          <p className="text-red-400 mb-6">
            {error}
          </p>
        )}

        {!loading &&
          albums.length === 0 &&
          query &&
          !error && (
            <p className="text-zinc-500 mb-6">
              No albums found.
            </p>
          )}

        {/* SEARCH RESULTS */}

        {albums.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold">
                Search Results
              </h2>

              <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Spotify Catalog
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {albums.map((album) => (
                <Link
                  key={album.id}
                  href={`/album/${album.id}`}
                  className="y2k-card p-3 sm:p-4"
                >
                  {album.images?.[0]?.url && (
                    <img
                      src={
                        album.images[0].url
                      }
                      alt={album.name}
                      className="w-full aspect-square object-cover rounded-xl mb-3"
                    />
                  )}

                  <h3 className="font-bold text-sm sm:text-lg leading-tight">
                    {album.name}
                  </h3>

                  <p className="text-zinc-400 text-xs sm:text-base mt-1">
                    {album.artists
                      .map(
                        (artist) =>
                          artist.name
                      )
                      .join(", ")}
                  </p>

                  <p className="text-zinc-500 text-xs sm:text-sm mt-1">
                    {album.release_date?.slice(
                      0,
                      4
                    )}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FRIENDS RECENTLY RATED */}

        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-pink-300 mb-2">
                Social Feed
              </p>

              <h2 className="text-2xl sm:text-3xl font-bold">
                Friends Recently Rated
              </h2>

              <p className="text-zinc-500 mt-1">
                Latest ratings from people you
                follow.
              </p>
            </div>
          </div>

          {recentRatings.length === 0 ? (
            <div className="y2k-card p-6">
              <p className="text-zinc-400 mb-4">
                No recent ratings from people
                you follow.
              </p>

              {loggedIn && (
                <Link
                  href="/users"
                  className="inline-block y2k-button px-5 py-3"
                >
                  Find People
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentRatings.map(
                (rating) => {
                  const profile =
                    profiles[
                      rating.user_id
                    ];

                  return (
                    <div
                      key={rating.id}
                      className="y2k-card p-4"
                    >
                      <Link
                        href={`/album/${rating.spotify_album_id}`}
                        className="block"
                      >
                        {rating.album_image && (
                          <img
                            src={
                              rating.album_image
                            }
                            alt={
                              rating.album_name
                            }
                            className="w-full aspect-square object-cover rounded-xl mb-4"
                          />
                        )}

                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-bold text-lg truncate">
                              {
                                rating.album_name
                              }
                            </h3>

                            <p className="text-zinc-400 text-sm truncate">
                              {
                                rating.artist_name
                              }
                            </p>
                          </div>

                          {rating.overall_rating !==
                            null && (
                            <div
                              className={`
                                min-w-11
                                h-11
                                px-2
                                rounded-xl
                                flex
                                items-center
                                justify-center
                                font-black
                                text-white
                                ${getRatingColor(
                                  Number(
                                    rating.overall_rating
                                  )
                                )}
                              `}
                            >
                              {
                                rating.overall_rating
                              }
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="mt-4 pt-4 border-t border-white/10">
                        {profile ? (
                          <Link
                            href={`/user/${profile.username}`}
                            className="flex items-center gap-3 group"
                          >
                            {profile.avatar_url ? (
                              <img
                                src={
                                  profile.avatar_url
                                }
                                alt={
                                  profile.username
                                }
                                className="w-9 h-9 rounded-full object-cover border border-white/10"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">
                                {profile.display_name?.[0]?.toUpperCase() ||
                                  profile.username?.[0]?.toUpperCase() ||
                                  "?"}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="text-sm font-semibold group-hover:underline truncate">
                                {profile.display_name ||
                                  profile.username}
                              </p>

                              <p className="text-xs text-zinc-500 truncate">
                                @{profile.username}
                              </p>
                            </div>
                          </Link>
                        ) : (
                          <p className="text-zinc-500 text-sm">
                            iRate user
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
