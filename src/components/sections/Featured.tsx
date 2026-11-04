import { Button } from "@/components/ui/Button";
import { Gotas } from "@/components/ui/Gotas";
import { PALETTES } from "@/components/ui/gotas-palettes";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { WordReveal } from "@/components/ui/WordReveal";
import { FEATURED_NAMES, findItem } from "@/data/menu";
import type { ImgKey } from "@/lib/images";
import { MENU_URL } from "@/lib/config";

export function Featured() {
  const items = FEATURED_NAMES
    .map((name) => findItem(name))
    .filter((item): item is NonNullable<typeof item> & { photo: ImgKey } => Boolean(item?.photo));
  return (
    <section id="destaques" aria-labelledby="featured-title" className="relative overflow-clip px-4 py-20 sm:px-10 md:py-28 lg:px-14">
      <Gotas palette={PALETTES.light} maxAlpha={0.14} />
      <div className="relative z-10 mx-auto max-w-[1320px]">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-brand">Da chapa para a mesa</p>
        <WordReveal id="featured-title" text="Favoritos da casa" className="text-[clamp(34px,6vw,76px)]" />
        <p className="mt-4 max-w-[52ch] text-ink/80">Receitas diretas, ingredientes de verdade e aquele capricho que faz voltar.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {items.map((it, i) => (
            <Reveal key={it.name} as="article" delay={(i % 3) * 120} className="group flex flex-col border-[3px] border-ink bg-paper shadow-hard transition-shadow hover:shadow-[8px_14px_0_#B3261E]">
              <figure className="relative m-0 aspect-[4/3] overflow-hidden border-b-[3px] border-ink">
                <Photo name={it.photo} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="transition-transform duration-700 group-hover:scale-105" />
              </figure>
              <div className="flex flex-1 flex-col items-start gap-3 p-5 sm:p-6">
                <div className="flex w-full items-start justify-between gap-4">
                  <h3 className="text-[clamp(23px,2.4vw,32px)] text-brand">{it.name}</h3>
                  <span className="shrink-0 -rotate-2 bg-mustard px-2.5 py-1 font-display text-lg">R$ {it.price}</span>
                </div>
                <p className="m-0 flex-1 text-[15px] leading-relaxed text-ink/85">{it.description}</p>
                <a href={MENU_URL} className="mt-1 inline-flex items-center gap-2 font-semibold text-brand underline decoration-mustard decoration-2 underline-offset-4 hover:decoration-brand">
                  Ver cardápio completo <span aria-hidden="true">→</span>
                </a>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-9 flex justify-center">
          <Button href={MENU_URL} variant="dark">Explorar o cardápio</Button>
        </div>
      </div>
    </section>
  );
}
