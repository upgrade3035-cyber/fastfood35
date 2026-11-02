import { useMediaUrl } from "@/lib/media";

/** Sozlamalardagi logo bo‘lsa uni, bo‘lmasa brend harfini ko‘rsatadi */
export function BrandMark({ logo, name }: { logo: string | null; name: string }) {
  const url = useMediaUrl(logo);

  if (url) {
    return (
      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary shadow-glow">
        <img src={url} alt={`${name} logotipi`} className="h-full w-full object-contain" />
      </div>
    );
  }

  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-primary text-lg font-black text-primary-foreground shadow-glow">
      {name.trim().charAt(0).toUpperCase() || "L"}
    </div>
  );
}
