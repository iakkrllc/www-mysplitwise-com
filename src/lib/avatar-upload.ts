import { supabase } from "./supabase";
import { compressImage } from "./image";

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*);base64/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Compress and upload a profile picture to Supabase Storage, returning its public URL. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const dataUrl = await compressImage(file, 400, 0.8);
  const blob = dataUrlToBlob(dataUrl);
  const path = `${userId}/avatar.jpg`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
