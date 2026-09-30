"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type AlbumRating = {
  user_id: string;
  spotify_album_id: string;
  album_name: string;
  artist_name: string;
  album_image: string | null;
  overall_rating: number | null;
  best_song_id: string | null;
  worst_song_id: string | null;
};

type TrackRating = {
  spotify_track_id: string;
  track_name: string;
  rating: number;
};

type SpotifyTrack = {
  id: string;
  name: string;
  track_number: number;
  duration_ms: number;
};

type SpotifyAlbum = {
  id: string;
  name: string;
  release_date: string;
  total_tracks: number;
  images: {
    url: string;
  }[];
  artists: {
    name: string;
  }[];
  tracks: {
    items: SpotifyTrack[];
  };
};

function getRatingColor(rating: number) {
  if (rating >= 10) return "bg-purple-600";
  if (rating >= 8) return "bg-blue-600";
  if (rating >= 5) return "bg-green-600";
  if (rating >= 3) return "bg-orange-500";
  return "bg-red-600";
}

function formatDuration(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function FriendAlbumRatingPage() {
  const params = useParams();

  const username = params.username as string;
  const albumId = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [albumRating, setAlbumRating] = useState<AlbumRating | null>(null);
  const [trackRatings, setTrackRatings] = useState<
    Record<string, TrackRating>
  >({});
  const [album, setAlbum] = useState<SpotifyAlbum | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRatingPage() {
      try {
        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .eq("username", username)
            .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!profileData) {
          setError("User not found.");
          return;
        }

        setProfile(profileData);

        const { data: ratingData, error: ratingError } =
          await supabase
            .from("album_ratings")
            .select(
              "user_id, spotify_album_id, album_name, artist_name, album_image, overall_rating, best_song_id, worst_song_id"
            )
            .eq("user_id", profileData.id)
            .eq("spotify_album_id", albumId)
            .maybeSingle();

        if (ratingError) {
          throw ratingError;
        }

        if (!ratingData) {
          setError("This user has not rated this album.");
          return;
        }

        setAlbumRating(ratingData);

        const { data: trackData, error: trackError } =
          await supabase
            .from("track_ratings")
            .select(
              "spotify_track_id, track_name, rating"
            )
            .eq("user_id", profileData.id)
            .eq("spotify_album_id", albumId);

        if (trackError) {
          throw trackError;
        }

        const ratingMap: Record<string, TrackRating> = {};

        (trackData || []).forEach((track) => {
          ratingMap[track.spotify_track_id] = {
            ...track,
            rating: Number(track.rating),
          };
        });

        setTrackRatings(ratingMap);

        const spotifyResponse = await fetch(
          `/api/album/${albumId}`
        );

        if (!spotifyResponse.ok) {
          throw new Error("Could not load album information.");
        }

        const spotifyAlbum = await spotifyResponse.json();

        setAlbum(spotifyAlbum);
      } catch (err: any) {
        console.error("FRIEND RATING PAGE ERROR:", err);

        setError(
          err?.message ||
            "Something went wrong loading this rating."
        );
      } finally {
        setLoading(false);
      }
    }

    if (username && albumId) {
      loadRatingPage();
    }
  }, [username, albumId]);

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 md:px-8">
        <p>Loading rating...</p>
      </main>
    );
  }

  if (error || !profile || !albumRating || !album) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 md:px-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href={`/user/${username}`}
            className="text-zinc-400 hover:text-white"
          >
            ← Back to profile
          </Link>

          <p className="mt-8 text-zinc-400">
            {error || "Rating not found."}
          </p>
        </div>
      </main>
    );
  }

  const bestSong = album.tracks.items.find(
    (track) => track.id === albumRating.best_song_id
  );

  const worstSong = album.tracks.items.find(
    (track) => track.id === albumRating.worst_song_id
  );

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 md:px-8">
      <div className="max-w-5xl mx-auto">
        <Link
          href={`/user/${profile.username}`}
          className="text-zinc-400 hover:text-white inline-block mb-8"
        >
          ← Back to {profile.display_name || profile.username}
        </Link>

        <div className="y2k-card p-5 sm:p-7 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <img
              src={album.images?.[0]?.url || albumRating.album_image || ""}
              alt={album.name}
              className="w-full md:w-64 aspect-square object-cover rounded-xl"
            />

            <div className="flex-1 flex flex-col justify-end">
              <div className="flex items-center gap-3 mb-5">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-11 h-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center font-bold">
                    {profile.display_name?.[0]?.toUpperCase() ||
                      profile.username[0]?.toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="font-bold">
                    {profile.display_name || profile.username}
                  </p>

                  <p className="text-zinc-500 text-sm">
                    @{profile.username}
                  </p>
                </div>
              </div>

              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">
                Rated Album
              </p>

              <h1 className="text-4xl sm:text-5xl font-black mb-3">
                {album.name}
              </h1>

              <p className="text-zinc-300 text-lg">
                {album.artists
                  .map((artist) => artist.name)
                  .join(", ")}
              </p>

              <p className="text-zinc-500 mt-2">
                {album.release_date?.slice(0, 4)} •{" "}
                {album.total_tracks} tracks
              </p>

              {albumRating.overall_rating !== null && (
                <div className="flex items-center gap-3 mt-6">
                  <div
                    className={`
                      w-16 h-16
                      rounded-xl
                      flex items-center justify-center
                      text-2xl font-black
                      ${getRatingColor(
                        Number(albumRating.overall_rating)
                      )}
                    `}
                  >
                    {albumRating.overall_rating}
                  </div>

                  <div>
                    <p className="font-bold text-lg">
                      Overall Score
                    </p>

                    <p className="text-zinc-500">
                      / 10
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {(bestSong || worstSong) && (
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {bestSong && (
              <div className="y2k-card p-5">
                <p className="text-zinc-500 text-sm mb-1">
                  Best Song
                </p>

                <p className="font-bold text-lg">
                  {bestSong.name}
                </p>
              </div>
            )}

            {worstSong && (
              <div className="y2k-card p-5">
                <p className="text-zinc-500 text-sm mb-1">
                  Worst Song
                </p>

                <p className="font-bold text-lg">
                  {worstSong.name}
                </p>
              </div>
            )}
          </div>
        )}

        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">
            Track Ratings
          </h2>

          <div className="space-y-3">
            {album.tracks.items.map((track) => {
              const savedRating =
                trackRatings[track.id];

              return (
                <div
                  key={track.id}
                  className="y2k-card p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="text-zinc-600 w-6 shrink-0">
                        {track.track_number}
                      </span>

                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {track.name}
                        </p>

                        <p className="text-zinc-500 text-sm">
                          {formatDuration(track.duration_ms)}
                        </p>
                      </div>
                    </div>

                    {savedRating ? (
                      <div
                        className={`
                          w-12 h-12
                          rounded-xl
                          flex items-center justify-center
                          font-black text-lg
                          shrink-0
                          ${getRatingColor(savedRating.rating)}
                        `}
                      >
                        {savedRating.rating}
                      </div>
                    ) : (
                      <span className="text-zinc-600 text-sm">
                        Not rated
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
