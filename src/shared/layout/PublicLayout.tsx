import { Button } from "@/shared/ui";
import { MapPin, MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

type PublicNavItem = {
  to: string;
  label: string;
};

const navItems: PublicNavItem[] = [
  { to: "/our-story", label: "Our Story" },
  { to: "/", label: "Wishlist" },
  { to: "/event-details", label: "Event Details" },
];

function navLinkClassName({
  isActive,
  isPending,
}: {
  isActive: boolean;
  isPending: boolean;
}) {
  if (isPending) return "text-text-secondary";
  if (isActive)
    return "text-text-primary font-semibold underline underline-offset-4";
  return "text-text-secondary hover:text-text-primary";
}

function mobileNavLinkClassName({ isActive }: { isActive: boolean }) {
  if (isActive)
    return "block px-4 py-3 text-sm font-semibold text-text-primary bg-surface-muted";
  return "block px-4 py-3 text-sm text-text-primary hover:bg-surface-muted";
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (!mobileMenuRef.current?.contains(target)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-muted">
      <nav className="bg-surface border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavLink
            to="/"
            className="flex items-center gap-2 font-display font-bold text-lg"
          >
            Rainbow Cloud House
          </NavLink>
          <div className="hidden sm:flex items-center gap-6 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={navLinkClassName}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="sm:hidden relative" ref={mobileMenuRef}>
            <Button
              variant="ghost"
              size="sm"
              icon={<MoreVertical size={18} className="text-text-primary" />}
              aria-haspopup="menu"
              aria-expanded={mobileMenuOpen}
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="px-3 py-2"
            >
              <span className="sr-only">Open menu</span>
            </Button>
            {mobileMenuOpen && (
              <div
                role="menu"
                aria-label="Mobile navigation"
                className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-surface shadow-lg overflow-hidden"
              >
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    role="menuitem"
                    to={item.to}
                    className={mobileNavLinkClassName}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-secondary">
          <div className="flex items-center gap-1">
            <MapPin size={14} className="text-olive" />
            Rainbow Cloud House 2026
          </div>
          <p className="italic">Made with love for our friends and family.</p>
        </div>
      </footer>
    </div>
  );
}

