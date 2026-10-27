import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { Toaster } from "sonner";
import { DemoBanner } from "@/components/demo-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { demoMode } from "@/lib/env";
import { NotConfiguredError } from "@/lib/server/backend";
import { getViewer } from "@/lib/server/session";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", display: "swap" });

export const metadata: Metadata = {
  title: { default: "EDU ClassRepo", template: "%s · EDU ClassRepo" },
  description: "Find and share course materials for East Delta University — organised by department, course and instructor.",
};

export const viewport: Viewport = { themeColor: "#faf7f2" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let viewer = null;
  let configured = true;
  try {
    viewer = await getViewer();
  } catch (error) {
    if (!(error instanceof NotConfiguredError)) throw error;
    configured = false;
  }

  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        {demoMode && <DemoBanner />}
        <SiteHeader viewer={viewer} />
        <main id="main" className="flex-1">
          {configured ? (
            children
          ) : (
            <div className="container-page py-16">
              <h1 className="text-2xl font-semibold">Site not configured</h1>
              <p className="mt-2 max-w-xl text-ink-muted">
                This deployment has no database connection. Set NEXT_PUBLIC_SUPABASE_URL and
                NEXT_PUBLIC_SUPABASE_ANON_KEY (see the README), then redeploy.
              </p>
            </div>
          )}
        </main>
        <SiteFooter />
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
