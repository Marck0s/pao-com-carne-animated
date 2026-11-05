"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useActiveSection } from "@/hooks/useActiveSection";
import { IFOOD_URL, NAV_ITEMS } from "@/lib/config";
import { IMG } from "@/lib/images";
import { cn } from "@/lib/cn";

const IDS = NAV_ITEMS.filter((item) => item.id !== "cardapio").map((item) => item.id);

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const active = useActiveSection(IDS);
  const isHome = pathname === "/";

  useEffect(() => {
    const updateScrollState = () => setScrolled(window.scrollY > 36);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <header className={`site-header${scrolled || !isHome ? " is-scrolled" : ""}${menuOpen ? " menu-is-open" : ""}`}>
      <nav aria-label="Principal" className="site-header__nav">
        <a href={isHome ? "#inicio" : "/"} aria-label="Pão com Carne — início" className="site-header__brand" onClick={() => setMenuOpen(false)}>
          <Image src={IMG.logo.src} alt={IMG.logo.alt} width={52} height={52} priority className="h-12 w-12 rounded-full ring-2 ring-cream sm:h-[52px] sm:w-[52px]" />
          <span className="site-header__wordmark">Pão <i>com </i> Carne</span>
        </a>
        <button
          type="button"
          className="site-header__toggle"
          aria-expanded={menuOpen}
          aria-controls="primary-links"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" className="site-header__toggle-icon">{menuOpen ? "×" : "☰"}</span>
        </button>
        <ul
          id="primary-links"
          className={cn(
            "site-header__links",
            menuOpen && "is-open",
          )}
        >
          {NAV_ITEMS.map((item) => {
            const href = item.id === "cardapio"
              ? item.href
              : isHome ? `#${item.id}` : `/#${item.id}`;
            const current = item.id === "cardapio"
              ? pathname === "/cardapio"
              : isHome && active === item.id;

            return (
              <li key={item.id}>
                <a
                  href={href}
                  aria-current={current ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className="site-header__link"
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
        <Button href={IFOOD_URL} small className="site-header__order">Pedir agora</Button>
      </nav>
    </header>
  );
}
