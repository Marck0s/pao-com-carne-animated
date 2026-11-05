import { Button } from "@/components/ui/Button";
import { WordReveal } from "@/components/ui/WordReveal";
import { IFOOD_URL, MAPS_DIRECTIONS_URL, SITE } from "@/lib/config";

export function Order() {
  return (
    <section id="pedir" className="order-section relative overflow-clip px-4 py-20 text-cream sm:px-14 md:py-28">
      <div className="relative z-10 mx-auto max-w-[900px] text-center">
        <p className="section-eyebrow">Seu próximo favorito está a um clique</p>
        <WordReveal text="Bateu a fome?" className="section-title section-title--light mb-7" />
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
