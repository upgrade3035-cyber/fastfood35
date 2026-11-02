import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const MEDIA_BUCKET = "media";

const cache = new Map<string, Promise<string | null>>();

function isAbsolute(value: string) {
  return /^(https?:|data:|blob:|\/)/.test(value);
}

/** Fayl yuklaydi va saqlanadigan yo‘lni qaytaradi */
export async function uploadMedia(file: File, folder: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

/** Saqlangan yo‘lni ko‘rsatish uchun havolaga aylantiradi */
export async function resolveMediaUrl(value: string | null | undefined) {
  if (!value) return null;
  if (isAbsolute(value)) return value;
  const cached = cache.get(value);
  if (cached) return cached;
  const promise = supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(value, 60 * 60 * 24 * 7)
    .then((res) => res.data?.signedUrl ?? null)
    .catch(() => null);
  cache.set(value, promise);
  return promise;
}

export function useMediaUrl(value: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(() =>
    value && isAbsolute(value) ? value : null,
  );

  useEffect(() => {
    let active = true;
    if (!value) {
      setUrl(null);
      return;
    }
    if (isAbsolute(value)) {
      setUrl(value);
      return;
    }
    void resolveMediaUrl(value).then((resolved) => {
      if (active) setUrl(resolved);
    });
    return () => {
      active = false;
    };
  }, [value]);

  return url;
}
