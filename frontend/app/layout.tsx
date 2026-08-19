import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from './providers';
import { APP_TEXTS } from "@/app/constants/texts";
import { DevRoleSwitcher } from "@/components/auth/DevRoleSwitcher";
import { VersionFooter } from "@/components/layout/VersionFooter/VersionFooter";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_TEXTS.meta.title,
  description: APP_TEXTS.meta.description,
};

const themeBootstrapScript = `
  (function () {
    var storageKey = 'kabinett-theme-mode';
    var root = document.documentElement;
    var media = window.matchMedia('(prefers-color-scheme: dark)');
    var stored = localStorage.getItem(storageKey);
    var mode = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    var resolved = mode === 'system' ? (media.matches ? 'dark' : 'light') : mode;
    root.dataset.themeMode = mode;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {themeBootstrapScript}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-[var(--app-bg)] text-[color:var(--text-primary)] transition-colors duration-200">
        <Providers>
          {children}
          {/* Widget flotante de simulación de rol solo para desarrollo */}
          {process.env.NODE_ENV === 'development' && <DevRoleSwitcher />}
          <VersionFooter />

        </Providers>
      </body>
    </html>
  );
}