import { Button } from "@/components/ui/Button";
import { Gotas } from "@/components/ui/Gotas";
import { PALETTES } from "@/components/ui/gotas-palettes";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { WordReveal } from "@/components/ui/WordReveal";
import { IFOOD_URL, INSTAGRAM_URL } from "@/lib/config";

export function Order() {
  return (
    <section id="pedir" className="relative grid items-center gap-12 overflow-clip bg-brand px-4 py-24 text-cream sm:px-14 md:grid-cols-[.8fr_1.2fr] md:py-32">
      <Gotas palette={PALETTES.red} maxAlpha={0.4} />
      <Reveal variant="mask" className="relative z-10 max-w-[360px]">
        <figure className="relative m-0 aspect-square border-[3px] border-cream shadow-[12px_12px_0_#4A1210]">
          <Photo name="burgerNaMao" sizes="360px" />
        </figure>
      </Reveal>
      <div className="relative z-10">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-mustard">Seu próximo favorito está a um clique</p>
        <WordReveal text="Bateu a fome?" className="mb-7 text-[clamp(34px,6vw,76px)]" />
        <div className="flex flex-wrap gap-4">
          <Button href={IFOOD_URL}>Peça no iFood</Button>
          <Button href={INSTAGRAM_URL} variant="dark">Acompanhe no Instagram</Button>
        </div>
      </div>
    </section>
  );
}
