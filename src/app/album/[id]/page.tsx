"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Track = {
  id: string;
  name: string;
  track_number: number;
  duration_ms: number;
  artists: {
    name: string;
  }[];
};

type Album = {
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
    items: Track[];
  };
};

type Rating = number | null;

const ratingOptions = [
  { value: 1, className: "bg-red-600" },
  { value: 2, className: "bg-red-600" },
  { value: 3, className: "bg-orange-500" },
  { value: 4, className: "bg-orange-500" },
  { value: 5, className: "bg-green-600" },
  { value: 6, className: "bg-green-600" },
  { value: 7, className: "bg-green-600" },
  { value: 8, className: "bg-blue-600" },
  { value: 9, className: "bg-blue-600" },
  { value: 10, className: "bg-purple-600" },
];

function formatDuration(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getRatingColor(rating: number | null) {
  const option = ratingOptions.find(
    (item) => item.value === rating
  );

  return option?.className || "bg-zinc-700";
}

export default function AlbumPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [album, setAlbum] = useState<Album | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [trackRatings, setTrackRatings] = useState<
    Record<string, number>
  >({});

  const [overallRating, setOverallRating] =
    useState<Rating>(null);

  const [bestSong, setBestSong] = useState("");
  const [worstSong, setWorstSong] = useState("");
  const [review, setReview] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [communityAverage, setCommunityAverage] =
    useState<number | null>(null);

  const [communityTotal, setCommunityTotal] = useState(0);

  useEffect(() => {
    async function loadAlbumAndRatings() {
      try {
        const response = await fetch(`/api/album/${id}`);

        if (!response.ok) {
          throw new Error("Album could not be loaded.");
        }

        const albumData = await response.json();

        setAlbum(albumData);

        // COMMUNITY RATINGS
        const {
          data: allRatings,
          error: communityError,
        } = await supabase
          .from("album_ratings")
          .select("overall_rating")
          .eq("spotify_album_id", id)
          .not("overall_rating", "is", null);

        if (!communityError && allRatings) {
          const numericRatings = allRatings
            .map((item) => Number(item.overall_rating))
            .filter(
              (rating) =>
                !Number.isNaN(rating) &&
                rating >= 1 &&
                rating <= 10
            );

          setCommunityTotal(numericRatings.length);

          if (numericRatings.length > 0) {
            const total = numericRatings.reduce(
              (sum, rating) => sum + rating,
              0
            );

            const average =
              total / numericRatings.length;

            setCommunityAverage(
              Math.round(average * 10) / 10
            );
          } else {
            setCommunityAverage(null);
          }
        }

        // CURRENT USER
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        // LOAD SAVED ALBUM RATING
        const { data: albumRating } = await supabase
          .from("album_ratings")
          .select("*")
          .eq("user_id", user.id)
          .eq("spotify_album_id", id)
          .maybeSingle();

        if (albumRating) {
          setOverallRating(
            albumRating.overall_rating !== null
              ? Number(albumRating.overall_rating)
              : null
          );

          setBestSong(
            albumRating.best_song_id || ""
          );

          setWorstSong(
            albumRating.worst_song_id || ""
          );

          setReview(
            albumRating.review || ""
          );
        }

        // LOAD SAVED TRACK RATINGS
        const { data: savedTracks } = await supabase
          .from("track_ratings")
          .select("spotify_track_id, rating")
          .eq("user_id", user.id)
          .eq("spotify_album_id", id);

        if (savedTracks) {
          const loadedRatings: Record<
            string,
            number
          > = {};

          savedTracks.forEach((track) => {
            loadedRatings[
              track.spotify_track_id
            ] = Number(track.rating);
          });

          setTrackRatings(loadedRatings);
        }
      } catch (err) {
        console.error(err);

        setError(
          "Could not load this album."
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadAlbumAndRatings();
    }
  }, [id]);

  function rateTrack(
    trackId: string,
    rating: number
  ) {
    setTrackRatings((previous) => ({
      ...previous,
      [trackId]: rating,
    }));
  }

  async function saveRating() {
    if (!album) return;

    setSaving(true);
    setSaveMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const artistName = album.artists
        .map((artist) => artist.name)
        .join(", ");

      const albumImage =
        album.images?.[0]?.url || null;

      const { error: albumError } =
        await supabase
          .from("album_ratings")
          .upsert(
            {
              user_id: user.id,

              spotify_album_id:
                album.id,

              album_name:
                album.name,

              artist_name:
                artistName,

              album_image:
                albumImage,

              overall_rating:
                overallRating,

              best_song_id:
                bestSong || null,

              worst_song_id:
                worstSong || null,

              review:
                review.trim() || null,

              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                "user_id,spotify_album_id",
            }
          );

      if (albumError) {
        throw albumError;
      }

      const selectedTrackRatings =
        album.tracks.items
          .filter(
            (track) =>
              trackRatings[track.id] !== undefined
          )
          .map((track) => ({
            user_id: user.id,

            spotify_album_id:
              album.id,

            spotify_track_id:
              track.id,

            track_name:
              track.name,

            rating:
              trackRatings[track.id],
          }));

      if (selectedTrackRatings.length > 0) {
        const { error: trackError } =
          await supabase
            .from("track_ratings")
            .upsert(
              selectedTrackRatings,
              {
                onConflict:
                  "user_id,spotify_track_id",
              }
            );

        if (trackError) {
          throw trackError;
        }
      }

      setSaveMessage(
        "Rating saved successfully."
      );

      // Refresh community score after saving
      const {
        data: refreshedRatings,
      } = await supabase
        .from("album_ratings")
        .select("overall_rating")
        .eq("spotify_album_id", id)
        .not("overall_rating", "is", null);

      if (refreshedRatings) {
        const numericRatings =
          refreshedRatings
            .map((item) =>
              Number(item.overall_rating)
            )
            .filter(
              (rating) =>
                !Number.isNaN(rating) &&
                rating >= 1 &&
                rating <= 10
            );

        setCommunityTotal(
          numericRatings.length
        );

        if (numericRatings.length > 0) {
          const total =
            numericRatings.reduce(
              (sum, rating) =>
                sum + rating,
              0
            );

          setCommunityAverage(
            Math.round(
              (total /
                numericRatings.length) *
                10
            ) / 10
          );
        }
      }
    } catch (err: any) {
      console.error(
        "SAVE ERROR:",
        err
      );

      setSaveMessage(
        err?.message ||
          err?.details ||
          "Something went wrong while saving."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <p>Loading album...</p>
      </main>
    );
  }

  if (error || !album) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <p>
          {error || "Album not found."}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/"
          className="text-zinc-400 hover:text-white mb-8 inline-block"
        >
          ← Back to search
        </Link>

        {/* ALBUM HEADER */}

        <div className="flex flex-col md:flex-row gap-8 mb-12">
          <img
            src={album.images?.[0]?.url}
            alt={album.name}
            className="w-full md:w-80 aspect-square object-cover rounded-xl"
          />

          <div className="flex flex-col justify-end">
            <p className="text-zinc-500 mb-2">
              Album
            </p>

            <h1 className="text-5xl font-bold mb-4">
              {album.name}
            </h1>

            <p className="text-xl text-zinc-300">
              {album.artists
                .map(
                  (artist) =>
                    artist.name
                )
                .join(", ")}
            </p>

            <p className="text-zinc-500 mt-2">
              {album.release_date?.slice(
                0,
                4
              )}{" "}
              • {album.total_tracks} tracks
            </p>
          </div>
        </div>

        {/* COMMUNITY RATING */}

        <div className="bg-zinc-900 rounded-xl p-6 mb-12">
          <h2 className="text-xl font-bold mb-3">
            Community Rating
          </h2>

          {communityAverage !== null ? (
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold ${getRatingColor(
                  Math.round(
                    communityAverage
                  )
                )}`}
              >
                {communityAverage}
              </div>

              <div>
                <p className="text-xl font-semibold">
                  {communityAverage}/10
                </p>

                <p className="text-zinc-500">
                  Based on{" "}
                  {communityTotal}{" "}
                  rating
                  {communityTotal === 1
                    ? ""
                    : "s"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-zinc-500">
              No community ratings yet.
            </p>
          )}
        </div>

        {/* OVERALL RATING */}

        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">
            Your Album Rating
          </h2>

          <div className="flex flex-wrap gap-2">
            {ratingOptions.map(
              (option) => (
                <button
                  key={
                    option.value
                  }
                  onClick={() =>
                    setOverallRating(
                      option.value
                    )
                  }
                  className={`
                    w-12 h-12
                    rounded-lg
                    font-bold
                    transition

                    ${
                      overallRating ===
                      option.value
                        ? `${option.className} ring-2 ring-white`
                        : "bg-zinc-900 hover:bg-zinc-800"
                    }
                  `}
                >
                  {option.value}
                </button>
              )
            )}
          </div>

          {overallRating !== null && (
            <p className="text-zinc-400 mt-4">
              Your rating:{" "}
              <strong className="text-white">
                {overallRating}/10
              </strong>
            </p>
          )}
        </div>

        {/* TRACKLIST */}

        <h2 className="text-2xl font-bold mb-4">
          Tracklist
        </h2>

        <div className="divide-y divide-zinc-800 mb-12">
          {album.tracks.items.map(
            (track) => (
              <div
                key={track.id}
                className="py-5 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-zinc-500 w-6">
                      {
                        track.track_number
                      }
                    </span>

                    <div>
                      <p className="font-medium">
                        {track.name}
                      </p>

                      <p className="text-sm text-zinc-500">
                        {track.artists
                          .map(
                            (
                              artist
                            ) =>
                              artist.name
                          )
                          .join(", ")}
                      </p>
                    </div>
                  </div>

                  <span className="text-zinc-500">
                    {formatDuration(
                      track.duration_ms
                    )}
                  </span>
                </div>

                {/* TRACK RATING */}

                <div className="flex flex-wrap gap-2 ml-10">
                  {ratingOptions.map(
                    (option) => (
                      <button
                        key={
                          option.value
                        }
                        onClick={() =>
                          rateTrack(
                            track.id,
                            option.value
                          )
                        }
                        className={`
                          w-10 h-10
                          rounded-md
                          text-sm
                          font-bold
                          transition

                          ${
                            trackRatings[
                              track.id
                            ] ===
                            option.value
                              ? `${option.className} ring-2 ring-white`
                              : "bg-zinc-900 hover:bg-zinc-800"
                          }
                        `}
                      >
                        {
                          option.value
                        }
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          )}
        </div>

        {/* BEST / WORST SONG */}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-lg font-semibold mb-2">
              Best Song
            </label>

            <select
              value={bestSong}
              onChange={(e) =>
                setBestSong(
                  e.target.value
                )
              }
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3"
            >
              <option value="">
                Choose a song
              </option>

              {album.tracks.items.map(
                (track) => (
                  <option
                    key={track.id}
                    value={track.id}
                  >
                    {track.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="block text-lg font-semibold mb-2">
              Worst Song
            </label>

            <select
              value={worstSong}
              onChange={(e) =>
                setWorstSong(
                  e.target.value
                )
              }
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3"
            >
              <option value="">
                Choose a song
              </option>

              {album.tracks.items.map(
                (track) => (
                  <option
                    key={track.id}
                    value={track.id}
                  >
                    {track.name}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* REVIEW */}

        <div className="mb-8">
          <label className="block text-lg font-semibold mb-2">
            Review
          </label>

          <textarea
            value={review}
            onChange={(e) =>
              setReview(
                e.target.value
              )
            }
            placeholder="What did you think of the album?"
            rows={6}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 resize-none"
          />
        </div>

        {/* SAVE */}

        <button
          onClick={saveRating}
          disabled={saving}
          className="bg-white text-black px-8 py-4 rounded-lg font-bold text-lg disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save Rating"}
        </button>

        {saveMessage && (
          <p className="mt-4 text-zinc-400">
            {saveMessage}
          </p>
        )}
      </div>
    </main>
  );
}