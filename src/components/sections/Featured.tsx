import { Button } from "@/components/ui/Button";
import { Gotas } from "@/components/ui/Gotas";
import { PALETTES } from "@/components/ui/gotas-palettes";
import { Reveal } from "@/components/ui/Reveal";
import { WordReveal } from "@/components/ui/WordReveal";
import { MAPS_DIRECTIONS_URL } from "@/lib/config";

const REASONS = [
  {
    number: "01",
    title: "Uma história de família",
    text: "Receitas que vieram da família de Pedro Valsassina e seguem encontrando lugar à mesa.",
  },
  {
    number: "02",
    title: "Sem frescura. Com qualidade.",
    text: "Pão, carne e boas combinações. O essencial bem-feito, do nosso jeito.",
  },
  {
    number: "03",
    title: "Um endereço para voltar",
    text: "Estamos na Rua Bandeira Paulista, 478, no Itaim Bibi. Venha conhecer a casa.",
  },
] as const;

export function Featured() {
  return (
    <section id="destaques" aria-labelledby="featured-title" className="relative overflow-clip bg-paper px-4 py-20 sm:px-10 md:py-28 lg:px-14">
      <Gotas palette={PALETTES.light} maxAlpha={0.14} />
      <div className="relative z-10 mx-auto max-w-[1320px]">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-brand">Mais do que um hambúrguer</p>
        <WordReveal id="featured-title" text="Feita para reunir." className="text-[clamp(34px,6vw,76px)]" />
        <p className="mt-4 max-w-[52ch] text-ink/80">Uma casa de família, bons encontros e comida feita para dar vontade de voltar.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3 md:gap-6">
          {REASONS.map((reason, i) => (
            <Reveal key={reason.number} as="article" delay={i * 100} className="group flex min-h-56 flex-col border-t-2 border-brand bg-cream p-6 shadow-hard transition-transform duration-300 hover:-translate-y-1 sm:p-7">
              <span className="font-display text-sm text-brand">{reason.number}</span>
              <h3 className="mt-8 text-[clamp(22px,2.2vw,30px)] leading-tight text-ink">{reason.title}</h3>
              <p className="mb-0 mt-3 text-[15px] leading-relaxed text-ink/80">{reason.text}</p>
            </Reveal>
          ))}
        </div>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button href="#historia" variant="dark">Conheça nossa história</Button>
          <Button href={MAPS_DIRECTIONS_URL}>Venha conhecer a casa</Button>
        </div>
      </div>
    </section>
  );
}
