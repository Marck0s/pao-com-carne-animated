import { Button } from "@/components/ui/Button";
import { Gotas } from "@/components/ui/Gotas";
import { PALETTES } from "@/components/ui/gotas-palettes";
import { WordReveal } from "@/components/ui/WordReveal";
import { IFOOD_URL, MAPS_DIRECTIONS_URL, SITE } from "@/lib/config";

export function Order() {
  return (
    <section id="pedir" className="relative overflow-clip bg-brand px-4 py-20 text-cream sm:px-14 md:py-28">
      <Gotas palette={PALETTES.red} maxAlpha={0.4} />
      <div className="relative z-10 mx-auto max-w-[900px] text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-mustard">Seu próximo favorito está a um clique</p>
        <WordReveal text="Bateu a fome?" className="mb-7 text-[clamp(34px,6vw,76px)]" />
        <p className="mx-auto mb-7 max-w-[52ch] text-cream/85">
          Peça para receber ou venha viver a experiência na {SITE.name}, no Itaim Bibi.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button href={IFOOD_URL}>Peça no iFood</Button>
          <Button href={MAPS_DIRECTIONS_URL} variant="dark">Como chegar</Button>
        </div>
      </div>
    </section>
  );
}
