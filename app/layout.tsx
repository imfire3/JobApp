<<<<<<< Updated upstream
import type { Metadata, Viewport } from "next";
=======
import type { Metadata } from "next";
import { Geist_Mono, Manrope, Montserrat, Syne } from "next/font/google";
>>>>>>> Stashed changes
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ResetToLandingButton } from "@/components/reset-to-landing-button";
import "./globals.css";

<<<<<<< Updated upstream
=======
const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-marketing-display",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-marketing-sans",
  subsets: ["latin"],
});

>>>>>>> Stashed changes
export const metadata: Metadata = {
  title: "JobTracker — Recherche d’offres PO/PM",
  description:
    "Tableau de bord personnel pour suivre les offres Product Owner et Product Manager, avec matching IA et lettres de motivation.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
<<<<<<< Updated upstream
      lang="fr"
      className="dark h-full overflow-hidden antialiased"
=======
      lang="en"
      className={`dark ${montserrat.variable} ${geistMono.variable} ${syne.variable} ${manrope.variable} h-full antialiased`}
>>>>>>> Stashed changes
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden bg-background font-sans text-foreground">
        <ThemeProvider>
          <TooltipProvider>
            {children}
            <ResetToLandingButton />
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
