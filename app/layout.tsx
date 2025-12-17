import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import NavBar from "@/components/NavBar";
import UserProfile from "@/components/UserProfile";
import { SWRProvider } from "@/components/SWRProvider";
import { AuthProvider } from "@/components/AuthProvider";
import AppWrapper from '@/components/AppWrapper';
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Rain - Meditation App",
  description: "Quit smoking and find peace with AI-guided meditation.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Rain",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false, // matches telephone=no
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen relative overflow-x-hidden`}
      >
        <AuthProvider>
          <SWRProvider>
            <AppWrapper>
              <NavBar />
              <UserProfile />
              {children}
            </AppWrapper>
          </SWRProvider>
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />

        {process.env.NODE_ENV === 'production' && (
          <script
            id="pwa-register"
            dangerouslySetInnerHTML={{
              __html: `if ('serviceWorker' in navigator) {window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}`,
            }}
          />
        )}
      </body>
    </html>
  );
}
