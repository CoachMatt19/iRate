"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export default function EditProfilePage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
      }

      if (data) {
        const profile = data as Profile;

        setUsername(profile.username || "");
        setDisplayName(profile.display_name || "");
        setBio(profile.bio || "");
        setAvatarUrl(profile.avatar_url || null);
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    try {
      setMessage("");

      const file = event.target.files?.[0];

      if (!file || !userId) return;

      if (!file.type.startsWith("image/")) {
        setMessage("Please choose an image file.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setMessage("Profile pictures must be under 5 MB.");
        return;
      }

      setUploading(true);

      const extension = file.name.split(".").pop() || "jpg";
      const filePath = `${userId}/avatar.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      setMessage("Profile picture uploaded.");
    } catch (error: any) {
      console.error(error);

      setMessage(
        error?.message || "Could not upload profile picture."
      );
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile() {
    try {
      setMessage("");

      if (!userId) return;

      const cleanUsername = username
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");

      if (!cleanUsername) {
        setMessage("Please enter a valid username.");
        return;
      }

      setSaving(true);

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          username: cleanUsername,
          display_name: displayName.trim() || cleanUsername,
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
        });

      if (error) {
        if (error.code === "23505") {
          setMessage("That username is already taken.");
        } else {
          setMessage(error.message);
        }

        return;
      }

      setUsername(cleanUsername);
      setMessage("Profile saved successfully.");
    } catch (error: any) {
      console.error(error);

      setMessage(
        error?.message || "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
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
      <div className="max-w-2xl mx-auto">
        <Link
          href="/profile"
          className="text-zinc-400 hover:text-white inline-block mb-8"
        >
          ← Back to profile
        </Link>

        <h1 className="text-4xl font-bold mb-2">
          Edit Profile
        </h1>

        <p className="text-zinc-500 mb-10">
          Customize how your iRate profile looks.
        </p>

        <div className="bg-zinc-900 rounded-2xl p-8">
          <div className="flex items-center gap-6 mb-8">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile picture"
                className="w-28 h-28 rounded-full object-cover"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-zinc-800 flex items-center justify-center text-3xl font-bold">
                {displayName?.[0]?.toUpperCase() ||
                  username?.[0]?.toUpperCase() ||
                  "?"}
              </div>
            )}

            <div>
              <label className="inline-block bg-white text-black px-4 py-3 rounded-lg font-semibold cursor-pointer">
                {uploading
                  ? "Uploading..."
                  : "Change Picture"}

                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              <p className="text-zinc-500 text-sm mt-3">
                JPG, PNG, or WEBP. Max 5 MB.
              </p>
            </div>
          </div>

          <label className="block font-semibold mb-2">
            Username
          </label>

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="mateen"
            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 mb-6 outline-none focus:border-zinc-500"
          />

          <label className="block font-semibold mb-2">
            Display Name
          </label>

          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Mateen"
            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 mb-6 outline-none focus:border-zinc-500"
          />

          <label className="block font-semibold mb-2">
            Bio
          </label>

          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people a little about yourself..."
            maxLength={160}
            rows={4}
            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 resize-none outline-none focus:border-zinc-500"
          />

          <p className="text-zinc-600 text-sm mt-2 mb-8 text-right">
            {bio.length}/160
          </p>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full bg-white text-black rounded-lg py-3 font-bold disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>

          {message && (
            <p className="text-zinc-400 mt-4">
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
