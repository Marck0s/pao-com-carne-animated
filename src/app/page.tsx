
import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { Featured } from "@/components/sections/Featured";
import { Hero } from "@/components/sections/Hero";
import { History } from "@/components/sections/History";
import { Location } from "@/components/sections/Location";
import { Order } from "@/components/sections/Order";
import { Reviews } from "@/components/sections/Reviews";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const metadata: Metadata = siteUrl
  ? { alternates: { canonical: new URL("/", siteUrl) } }
  : {};

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Featured />
        <History />
        <Reviews />
        <Order />
        <Location />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
