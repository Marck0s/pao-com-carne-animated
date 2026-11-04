"use client";
import { useState } from "react";
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
  const pathname = usePathname();
  const active = useActiveSection(IDS);
  const isHome = pathname === "/";

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-cream/15 bg-ink/90 text-cream shadow-[0_2px_14px_rgba(0,0,0,.2)] backdrop-blur-md">
      <nav aria-label="Principal" className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 py-2 sm:px-8 lg:px-12">
        <a href={isHome ? "#inicio" : "/"} aria-label="Pão com Carne — início" onClick={() => setMenuOpen(false)}>
          <Image src={IMG.logo.src} alt={IMG.logo.alt} width={52} height={52} priority className="h-12 w-12 rounded-full ring-2 ring-cream sm:h-[52px] sm:w-[52px]" />
        </a>
        <button
          type="button"
          className="grid h-11 w-11 place-items-center border-2 border-cream/60 text-cream sm:hidden"
          aria-expanded={menuOpen}
          aria-controls="primary-links"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" className="text-2xl leading-none">{menuOpen ? "×" : "☰"}</span>
        </button>
        <ul
          id="primary-links"
          className={cn(
            "absolute inset-x-0 top-full flex flex-col gap-1 border-b border-cream/15 bg-ink px-4 py-4 sm:static sm:flex-row sm:items-center sm:gap-7 sm:border-0 sm:bg-transparent sm:p-0 lg:gap-9",
            !menuOpen && "hidden sm:flex",
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
                  className="block py-2 font-semibold underline-offset-[6px] decoration-mustard decoration-[3px] hover:underline aria-[current=page]:text-mustard sm:py-1"
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
        <Button href={IFOOD_URL} small>Pedir agora</Button>
      </nav>
    </header>
  );
}
