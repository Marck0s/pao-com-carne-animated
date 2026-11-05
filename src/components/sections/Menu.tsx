"use client";
import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { WordReveal } from "@/components/ui/WordReveal";
import { MENU, type MenuCategory } from "@/data/menu";
import { IFOOD_URL } from "@/lib/config";
import { cn } from "@/lib/cn";

function moveTabFocus(event: KeyboardEvent<HTMLButtonElement>): void {
  const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
  const currentIndex = tabs.indexOf(event.currentTarget);
  let nextIndex = currentIndex;

  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
  else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = tabs.length - 1;
  else return;

  event.preventDefault();
  tabs[nextIndex]?.focus();
  tabs[nextIndex]?.click();
}

function Pane({ cat }: { cat: MenuCategory }) {
  return (
    <div role="tabpanel" id={`pane-${cat.id}`} aria-labelledby={`tab-${cat.id}`} tabIndex={0} className="grid animate-[fadeUp_.6s_var(--ease)_both] gap-7 md:grid-cols-[.72fr_1.28fr] lg:gap-12">
      <header className="h-fit border-l-[5px] border-brand bg-mustard p-5 sm:p-7">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-brand">Pão com Carne</p>
        <h3 className="text-[clamp(25px,3vw,38px)] leading-tight text-ink">{cat.title}</h3>
        {cat.note && <p className="mb-0 mt-3 text-sm leading-relaxed text-ink/80">{cat.note}</p>}
      </header>
      <div>
        {cat.items.map((it, i) => (
          <div
            key={it.name}
            style={{ animationDelay: `${i * 70}ms` }}
            className={cn(
              "animate-[fadeUp_.6s_var(--ease)_both] grid grid-cols-[1fr_auto] items-start gap-x-4 border-b border-ink/25 py-5 transition-[padding] duration-300 hover:pl-2",
              it.photo && "grid-cols-[72px_1fr_auto] sm:grid-cols-[88px_1fr_auto]",
            )}
          >
            {it.photo && (
              <div className="relative row-span-2 aspect-square w-[72px] overflow-hidden border-2 border-ink sm:w-[88px]"><Photo name={it.photo} sizes="88px" alt={it.name} /></div>
            )}
            <h4 className="m-0 self-center text-[clamp(17px,2vw,24px)] leading-tight">{it.name}</h4>
            <span className="self-center whitespace-nowrap font-display text-lg text-brand sm:text-xl">R$ {it.price}</span>
            {it.description && <p className={cn("col-start-1 m-0 mt-1 text-sm leading-relaxed text-ink/75", it.photo && "col-start-2")}>{it.description}</p>}
          </div>
        ))}
        <Button href={IFOOD_URL} small className="mt-6">Pedir pelo iFood</Button>
      </div>
    </div>
  );
}

export function Menu() {
  const [active, setActive] = useState(MENU[0].id);
  const cat = MENU.find((c) => c.id === active) ?? MENU[0];
  return (
    <section id="cardapio" aria-labelledby="menu-title" className="menu-section relative scroll-mt-20 overflow-clip px-4 py-16 sm:px-10 md:py-24 lg:px-14">
      <div className="relative z-10 mx-auto max-w-[1200px]">
        <p className="section-eyebrow">Feito na casa, servido com vontade</p>
        <WordReveal id="menu-title" text="Cardápio completo" className="section-title" />
        <p className="mt-4 max-w-[55ch] text-ink/80">Escolha uma categoria para encontrar seu próximo favorito.</p>
        <div role="tablist" aria-label="Categorias do cardápio" className="menu-tabs my-8 flex gap-2.5 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible">
          {MENU.map((c) => (
            <button
              key={c.id}
              id={`tab-${c.id}`}
              role="tab"
              aria-selected={c.id === active}
              tabIndex={c.id === active ? 0 : -1}
              aria-controls={`pane-${c.id}`}
              onClick={() => setActive(c.id)}
              onKeyDown={moveTabFocus}
              className={cn(
                "shrink-0 cursor-pointer rounded-[4px] border-2 border-ink px-4 py-2.5 font-body text-sm font-semibold transition-colors hover:bg-mustard sm:text-base",
                c.id === active && "bg-ink text-cream hover:bg-ink",
              )}
            >
              {c.tab}
            </button>
          ))}
        </div>
        <div className="border-[3px] border-ink bg-cream p-4 shadow-hard sm:p-7 lg:p-9">
          <Pane key={cat.id} cat={cat} />
        </div>
      </div>
    </section>
  );
}
