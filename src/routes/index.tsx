import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search, Flame, LogIn, MapPin, Clock } from "lucide-react";
import { menuQuery } from "@/lib/menu";
import { CartProvider } from "@/lib/cart";
import { CartSheet } from "@/components/customer/cart-sheet";
import { BottomNav } from "@/components/customer/bottom-nav";
import { ProductCard } from "@/components/customer/product-card";
import { PromoSlider } from "@/components/customer/promo-slider";
import { BrandMark } from "@/components/customer/brand-mark";

import { ThemeToggle } from "@/components/theme-toggle";
import heroImage from "@/assets/burger.jpg";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(menuQuery);
  },
  head: () => ({
    meta: [
      { title: "Lazzat — Stoldan turib QR orqali buyurtma bering" },
      {
        name: "description",
        content:
          "Lavash, burger, xoddok va ichimliklar. Stoldagi QR kodni skanerlang, menyuni ko‘ring va bir necha soniyada buyurtma bering.",
      },
      { property: "og:title", content: "Lazzat — QR orqali tez buyurtma" },
      {
        property: "og:description",
        content: "Restoran menyusi, chegirmalar va aksiyalar — telefoningizdan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "preload", as: "image", href: heroImage }],
  }),
  component: () => (
    <CartProvider>
      <CustomerHome />
    </CartProvider>
  ),
});

function CustomerHome() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: menu } = useSuspenseQuery(menuQuery);

  const categories = menu.categories;
  const settings = menu.settings;

  const catSlug = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.slug));
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return menu.products.filter((p) => {
      const slug = catSlug.get(p.category_id ?? "") ?? "";
      const categoryName = categories.find((c) => c.id === p.category_id)?.name ?? "";
      const matchesSearch = term
        ? `${p.name} ${p.description ?? ""} ${categoryName} ${slug}`.toLowerCase().includes(term)
        : true;
      const matchesCat = activeCategory ? p.category_id === activeCategory : true;
      return matchesSearch && matchesCat;
    });
  }, [menu.products, categories, catSlug, search, activeCategory]);

  const isFiltering = Boolean(search.trim() || activeCategory);

  return (
    <div className="min-h-screen bg-background pb-48">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark
              logo={settings?.logo_url ?? null}
              name={settings?.restaurant_name ?? "Lazzat Fast Food"}
            />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-extrabold text-foreground">
                {settings?.restaurant_name ?? "Lazzat Fast Food"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {settings?.working_hours ?? "10:00 - 23:00"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link
              to="/auth"
              aria-label="Admin panel"
              className="grid h-11 w-11 place-items-center rounded-full glass press text-foreground"
            >
              <LogIn className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 pt-6">


        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] shadow-soft">
          <img
            src={heroImage}
            alt="Yangi tayyorlangan burger"
            width={800}
            height={600}
            fetchPriority="high"
            className="h-56 w-full object-cover sm:h-72"
          />
          <div className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <h1 className="max-w-lg font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
              Issiq, tez va <span className="text-gradient">mazali</span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Stoldan turmasdan buyurtma bering — oshxona darhol tayyorlashni boshlaydi.
            </p>
          </div>
        </section>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Taom qidirish..."
            aria-label="Taom qidirish"
            className="w-full rounded-full glass py-4 pl-14 pr-5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Promotions */}
        {menu.promotions.length > 0 ? <PromoSlider promotions={menu.promotions} /> : null}

        {/* Categories */}
        <section>
          <h2 className="mb-3 font-display text-lg font-extrabold text-foreground">Kategoriyalar</h2>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <CategoryChip
              label="Hammasi"
              emoji="✨"
              active={activeCategory === null}
              onClick={() => setActiveCategory(null)}
            />
            {categories.map((c) => (
              <CategoryChip
                key={c.id}
                label={c.name}
                emoji={c.emoji ?? "🍽️"}
                active={activeCategory === c.id}
                onClick={() => setActiveCategory(activeCategory === c.id ? null : c.id)}
              />
            ))}
          </div>
        </section>

        <Section
          title={isFiltering ? "Natijalar" : "Ommabop mahsulotlar"}
          icon={
            isFiltering ? (
              <Search className="h-4 w-4 text-primary" />
            ) : (
              <Flame className="h-4 w-4 text-primary" />
            )
          }
        >
          <Grid>
            {filtered.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                categorySlug={catSlug.get(p.category_id ?? "")}
                index={i}
              />
            ))}
          </Grid>
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Hech narsa topilmadi.</p>
          ) : null}
        </Section>

        <footer className="rounded-3xl glass p-6 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {settings?.address ?? "Toshkent"}
          </p>
          <p className="mt-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            {settings?.working_hours ?? "10:00 - 23:00"} · {settings?.phone ?? ""}
          </p>
        </footer>
      </main>

      <CartSheet />
      <BottomNav />
    </div>
  );
}

function CategoryChip({
  label,
  emoji,
  active,
  onClick,
}: {
  label: string;
  emoji: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold press ${
        active ? "gradient-primary text-primary-foreground shadow-glow" : "glass text-foreground"
      }`}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </button>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold text-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{children}</div>
  );
}
