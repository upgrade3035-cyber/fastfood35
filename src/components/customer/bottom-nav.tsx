import { Link } from "@tanstack/react-router";
import { Home, ClipboardList, ReceiptText, Settings } from "lucide-react";

const items = [
  { to: "/", label: "Bosh sahifa", icon: Home },
  { to: "/buyurtmalar", label: "Buyurtmalar", icon: ClipboardList },
  { to: "/cheklar", label: "Cheklar", icon: ReceiptText },
  { to: "/sozlamalar", label: "Sozlamalar", icon: Settings },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 glass-strong border-t border-border pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {items.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-semibold press"
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
