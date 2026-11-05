import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { WordReveal } from "@/components/ui/WordReveal";
import { MAPS_DIRECTIONS_URL, MAPS_EMBED_URL, SITE } from "@/lib/config";

export function Location() {
  return (
    <section id="local" className="location-section relative mx-auto grid max-w-[1320px] scroll-mt-20 items-center gap-10 overflow-clip px-4 py-20 sm:px-10 md:grid-cols-[1.15fr_.85fr] md:gap-16 md:py-28 lg:px-14">
      <div className="relative z-10">
        <p className="section-eyebrow">Vem de perto ou de longe</p>
        <WordReveal text="Onde fica" className="section-title" />
        <address className="my-6 text-[clamp(18px,2vw,24px)] not-italic">
          {SITE.address.map((l) => <span key={l} className="block">{l}</span>)}
        </address>
        <Button href={MAPS_DIRECTIONS_URL}>Como chegar</Button>
      </div>
      <Reveal className="relative z-10 aspect-square border-[3px] border-ink bg-paper shadow-hard-lg md:aspect-[4/3]">
        <iframe
          title="Localização da Pão com Carne no Google Maps"
          src={MAPS_EMBED_URL}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className="block h-full w-full border-0"
        />
      </Reveal>
    </section>
  );
}
