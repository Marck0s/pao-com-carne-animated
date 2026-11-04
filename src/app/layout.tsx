import type { Metadata, Viewport } from "next";
import { Bitter, Rammetto_One } from "next/font/google";
import { INSTAGRAM_URL, SITE } from "@/lib/config";
import "./globals.css";

const display = Rammetto_One({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Bitter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const socialImage = siteUrl ? new URL("/images/hero-poster.jpg", siteUrl).toString() : undefined;

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: "Pão com Carne | Hamburgueria no Itaim Bibi, São Paulo",
  description: "Hamburgueria no Itaim Bibi, São Paulo: burgers de 180g, smash e receitas de família. Conheça o cardápio, leia avaliações e peça pelo iFood.",
  keywords: [
    "Pão com Carne",
    "hamburgueria no Itaim Bibi",
    "hamburgueria em São Paulo",
    "hambúrguer no Itaim Bibi",
    "smash burger em São Paulo",
    "hambúrguer 180g",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "Pão com Carne | Hamburgueria no Itaim Bibi",
    description: "Receitas de família, burgers de 180g e bons encontros no Itaim Bibi, São Paulo.",
    siteName: SITE.name,
    ...(socialImage ? { images: [{ url: socialImage, width: 1600, height: 900, alt: "Hambúrguer da Pão com Carne" }] } : {}),
  },
  twitter: {
    card: "summary_large_image",
    title: "Pão com Carne | Hamburgueria no Itaim Bibi",
    description: "Receitas de família, burgers de 180g e bons encontros no Itaim Bibi, São Paulo.",
    ...(socialImage ? { images: [socialImage] } : {}),
  },
};

export const viewport: Viewport = { themeColor: "#B3261E", viewportFit: "cover" };

const restaurantStructuredData = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: SITE.name,
  description: "Hamburgueria de família no Itaim Bibi, em São Paulo, com burgers de 180g, smash e receitas da casa.",
  servesCuisine: "Hambúrgueres",
  telephone: "+5511945421719",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rua Bandeira Paulista, 478",
    addressLocality: "São Paulo",
    addressRegion: "SP",
    postalCode: "04532-002",
    addressCountry: "BR",
  },
  areaServed: "Itaim Bibi, São Paulo",
  sameAs: [INSTAGRAM_URL],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantStructuredData).replace(/</g, "\\u003c") }}
        />
        {children}
      </body>
    </html>
  );
}
