import type { Metadata, Viewport } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ResetToLandingButton } from "@/components/reset-to-landing-button";
import "./globals.css";

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
      lang="fr"
      className="dark h-full overflow-hidden antialiased"
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
