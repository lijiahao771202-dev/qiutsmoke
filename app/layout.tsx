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
    telephone: false,
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
    <html lang="en" className="h-full">
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen h-full relative overflow-x-hidden bg-[#0a0a1a]`}
      >
        <AuthProvider>
          <SWRProvider>
            <AppWrapper>
              <div className="relative z-10 min-h-full flex flex-col">
                <NavBar />
                <UserProfile />
                <main className="flex-1 contents">
                  {children}
                </main>
              </div>
            </AppWrapper>
          </SWRProvider>
        </AuthProvider>
        {/* 移除了 dark theme 脚本以避免 Hydration 错误 */}

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
