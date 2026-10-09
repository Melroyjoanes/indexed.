import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { DataGate } from "@/components/data/data-gate";
import { DatasetProvider } from "@/components/data/dataset-provider";
import { ShellSkeleton } from "@/components/shell/shell-skeleton";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { loadDataSource } from "@/server/source";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "indexed.", template: "%s · indexed." },
  description: "How AI assistants talk about Corvane Fleet and its competitors, every week.",
};

/** Reads the data pack at request time, so a newly saved week shows without a rebuild. */
async function WithData({ children }: { children: ReactNode }) {
  await connection();
  const source = await loadDataSource();
  return (
    <DatasetProvider files={source.files}>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <DataGate origin={source.origin} problem={source.problem}>
          {children}
        </DataGate>
      </main>
      <SiteFooter origin={source.origin} />
    </DatasetProvider>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <TooltipProvider delay={150}>
          <Suspense fallback={<ShellSkeleton />}>
            <WithData>{children}</WithData>
          </Suspense>
        </TooltipProvider>
      </body>
    </html>
  );
}
