import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ReceiptText,
  UtensilsCrossed,
  Tag,
  PlusCircle,
  ChefHat,
  Users,
  Settings as SettingsIcon,
  MessageSquareHeart,
  LogOut,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, hasAny, ROLE_LABELS, type StaffRole } from "@/lib/roles";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV: { to: string; label: string; icon: typeof Menu; roles: StaffRole[] }[] = [
  {
    to: "/admin",
    label: "Boshqaruv",
    icon: LayoutDashboard,
    roles: ["super_admin", "manager", "cashier"],
  },
  {
    to: "/admin/orders",
    label: "Buyurtmalar",
    icon: ReceiptText,
    roles: ["super_admin", "manager", "cashier"],
  },
  {
    to: "/admin/kitchen",
    label: "Oshxona",
    icon: ChefHat,
    roles: ["super_admin", "manager", "kitchen"],
  },
  {
    to: "/admin/manual",
    label: "Qo‘lda buyurtma",
    icon: PlusCircle,
    roles: ["super_admin", "manager", "waiter", "kitchen"],
  },
  {
    to: "/admin/products",
    label: "Mahsulotlar",
    icon: UtensilsCrossed,
    roles: ["super_admin", "manager", "cashier", "waiter", "kitchen"],
  },
  { to: "/admin/promotions", label: "Aksiyalar", icon: Tag, roles: ["super_admin", "manager"] },
  { to: "/admin/staff", label: "Xodimlar", icon: Users, roles: ["super_admin"] },
  {
    to: "/admin/feedback",
    label: "Fikrlar",
    icon: MessageSquareHeart,
    roles: ["super_admin", "manager"],
  },
  {
    to: "/admin/settings",
    label: "Sozlamalar",
    icon: SettingsIcon,
    roles: ["super_admin", "manager"],
  },
];

function AdminLayout() {
  const session = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const roles = session.data?.roles;
  const items = NAV.filter((n) => hasAny(roles, n.roles));

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl gap-6 px-3 py-4 sm:px-5">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 overflow-y-auto glass-strong p-4 transition-transform duration-300 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:translate-x-0 lg:rounded-3xl ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-primary font-black text-primary-foreground">
              L
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-foreground">Lazzat Admin</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {roles?.length ? ROLE_LABELS[roles[0]!] : "Xodim"}
              </p>
            </div>
          </div>

          <nav className="mt-6 space-y-1">
            {items.map((item) => {
              const active = item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? "gradient-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <button
            onClick={signOut}
            className="mt-6 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Chiqish
          </button>
        </aside>

        {open ? (
          <button
            aria-label="Menyuni yopish"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        ) : null}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <header className="mb-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl glass px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <button
              aria-label="Menyu"
              onClick={() => setOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="truncate text-sm font-bold text-foreground">
              Salom, {session.data?.fullName ?? session.data?.username ?? "xodim"}
            </p>
            <ThemeToggle />
          </header>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
