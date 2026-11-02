import lavash from "@/assets/lavash.jpg";
import tandir from "@/assets/tandir.jpg";
import xoddok from "@/assets/xoddok.jpg";
import burger from "@/assets/burger.jpg";
import hotdog from "@/assets/hotdog.jpg";
import drinks from "@/assets/drinks.jpg";
import fries from "@/assets/fries.jpg";
import sauces from "@/assets/sauces.jpg";

const bySlug: Record<string, string> = {
  lavash,
  "tandir-lavash": tandir,
  "katta-xoddok": xoddok,
  "kichik-xoddok": xoddok,
  burger,
  "hot-dog": hotdog,
  ichimliklar: drinks,
  fries,
  souslar: sauces,
};

export const fallbackImages = [lavash, burger, fries, drinks];

export function productImage(imageUrl?: string | null, slug?: string | null, seed = 0) {
  if (imageUrl) return imageUrl;
  if (slug && bySlug[slug]) return bySlug[slug]!;
  return fallbackImages[seed % fallbackImages.length]!;
}

export { lavash, burger, fries, drinks, tandir, xoddok, hotdog, sauces };
