import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { Menu } from "@/components/sections/Menu";
import { Photo } from "@/components/ui/Photo";
import { Button } from "@/components/ui/Button";
import { IFOOD_URL } from "@/lib/config";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const metadata: Metadata = {
  ...(siteUrl ? { alternates: { canonical: new URL("/cardapio", siteUrl) } } : {}),
  title: "Cardápio de burgers e smash | Pão com Carne no Itaim Bibi",
  description: "Veja o cardápio da Pão com Carne no Itaim Bibi, São Paulo: burgers de 180g, smashs, família Chimichurri, entradas e extras.",
};

export default function MenuPage() {
  return (
    <>
      <Header />
      <main className="pt-[72px]">
        <section className="relative isolate overflow-hidden bg-ink text-cream">
          <div className="absolute inset-0 -z-10 opacity-35">
            <Photo name="burgersDeCima" sizes="100vw" alt="" priority />
          </div>
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/90 to-ink/35" />
          <div className="mx-auto grid min-h-[330px] max-w-[1320px] items-center gap-8 px-4 py-14 sm:px-10 md:grid-cols-[1fr_auto] md:px-14 md:py-20">
            <div className="max-w-[680px]">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-mustard">Itaim Bibi · feito na casa</p>
              <h1 className="font-display text-[clamp(38px,7vw,78px)] leading-[0.98]">O cardápio</h1>
              <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-cream/85 sm:text-lg">
                Do smash na chapa aos clássicos da casa: escolha seu favorito e peça para receber.
              </p>
            </div>
            <Button href={IFOOD_URL} className="w-fit">Pedir pelo iFood</Button>
          </div>
        </section>
        <Menu />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
