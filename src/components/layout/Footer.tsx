import Image from "next/image";
import { IMG } from "@/lib/images";
import { MAPS_DIRECTIONS_URL, MENU_URL, SITE } from "@/lib/config";

export function Footer() {
  return (
    <footer className="bg-ink px-4 pb-24 pt-12 text-cream sm:px-10 sm:pt-14 lg:px-14">
      <div className="mx-auto grid max-w-[1320px] gap-10 border-b border-cream/20 pb-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <a href="/" aria-label="Pão com Carne — início" className="inline-flex items-center gap-4">
            <Image src={IMG.logo.src} alt="" width={58} height={58} className="rounded-full ring-2 ring-cream/80" />
            <span className="font-display text-xl">{SITE.name}</span>
          </a>
          <p className="mb-0 mt-4 max-w-[36ch] text-sm leading-relaxed text-cream/70">{SITE.tagline}</p>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-mustard">Visite a casa</h2>
          <address className="not-italic text-sm leading-relaxed text-cream/80">
            {SITE.address.map((line) => <span key={line} className="block">{line}</span>)}
          </address>
          <a href={MAPS_DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold underline decoration-mustard underline-offset-4">
            Como chegar
          </a>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-mustard">Continue por aqui</h2>
          <ul className="m-0 list-none space-y-2 p-0 text-sm text-cream/80">
            <li><a href={MENU_URL} className="hover:text-mustard">Cardápio</a></li>
            <li><a href="/#historia" className="hover:text-mustard">Nossa história</a></li>
            <li><a href="/#avaliacoes" className="hover:text-mustard">Avaliações</a></li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mb-0 flex max-w-[1320px] flex-col items-start gap-y-3 pt-5 text-xs text-cream/55 lg:flex-row lg:items-center lg:justify-between">
        <span>{SITE.name} · Itaim Bibi, São Paulo</span>
        <a
          href="https://www.odysen.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="footer__credit-link"
        >
          Desenvolvido por <span className="footer__credit-name">Odysen</span>
        </a>
      </p>
    </footer>
  );
}
