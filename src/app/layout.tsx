import type { Metadata, Viewport } from "next";
import { Archivo, Geist, Geist_Mono, IBM_Plex_Mono, Inter, JetBrains_Mono, Mona_Sans, Newsreader } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/content/site";
import Providers from "@/components/shell/Providers";
import Nav from "@/components/shell/Nav";
import Footer from "@/components/shell/Footer";
import { THEME_BOOT_SCRIPT } from "@/content/themes";
import { FONT_BOOT_SCRIPT } from "@/content/fonts";
import IntroFilm from "@/components/intro2/IntroFilm";
import { INTRO_BOOT_SCRIPT } from "@/components/intro2/timeline";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
/* Type pairings (see content/fonts.ts). Only the DEFAULT pairing (Ledger) is preloaded;
   the others download on demand once html[data-font] points at them. */
// Ledger (default): editorial serif headlines, precise grotesk body, refined mono
const newsreader = Newsreader({ subsets: ["latin"], axes: ["opsz"], style: ["normal", "italic"], variable: "--font-newsreader", display: "swap" });
const inter = Inter({ subsets: ["latin"], axes: ["opsz"], variable: "--font-inter", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });
// Meridian: one engineered superfamily
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap", preload: false });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap", preload: false });
// Atlas: wide grotesk (wdth axis) + the original brand mono
const mona = Mona_Sans({ subsets: ["latin"], axes: ["wdth"], style: ["normal", "italic"], variable: "--font-mona", display: "swap", preload: false });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap", preload: false });
const fontVars = [archivo, newsreader, inter, plexMono, geist, geistMono, mona, jetbrains].map((f) => f.variable).join(" ");

const title = BRAND.headline.replace(/\.$/, "");
const description = BRAND.sub;

export const metadata: Metadata = {
  metadataBase: new URL("https://midearth.ai"),
  title: { default: title, template: "%s · MidEarth" },
  description,
  icons: { icon: "/favicon-32.png", apple: "/apple-touch-icon.png" },
  openGraph: { title, description, siteName: "MidEarth", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = { themeColor: "#04070b", width: "device-width", initialScale: 1, viewportFit: "cover" };

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", name: "MidEarth", url: "https://midearth.ai", logo: "https://midearth.ai/brand/logo-lockup.png", description },
    { "@type": "WebSite", name: "MidEarth", url: "https://midearth.ai" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="field" data-motion="on" suppressHydrationWarning className={fontVars}>
      <head>
        {/* apply saved / ?theme= colour theme before first paint (no flash) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {/* apply saved / ?font= type pairing before first paint */}
        <script dangerouslySetInnerHTML={{ __html: FONT_BOOT_SCRIPT }} />
        {/* opening film: decide before first paint whether it plays (no flash of site) */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT_SCRIPT }} />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-[var(--on-accent)]">
          Skip to content
        </a>
        <Providers>
          <Nav />
          <main id="main" className="relative z-10">
            {children}
          </main>
          <Footer />
          <IntroFilm />
        </Providers>
      </body>
    </html>
  );
}
