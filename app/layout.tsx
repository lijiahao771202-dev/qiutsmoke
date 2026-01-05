import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import AppWrapper from "@/components/AppWrapper";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Rain - 正念冥想",
  description: "帮助你戒烟与冥想的正念应用",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Rain",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="hydrating">
      <head>
        {/* 防止样式闪烁：在 JS 加载前就移除 hydrating 类 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 页面完全加载后移除 hydrating 类
              if (document.readyState === 'complete') {
                document.documentElement.classList.remove('hydrating');
              } else {
                window.addEventListener('load', function() {
                  document.documentElement.classList.remove('hydrating');
                });
              }
              
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                      // 🛑 临时：强制注销所有 SW 以解决 405 问题
                      navigator.serviceWorker.getRegistrations().then(function(registrations) {
                          for(let registration of registrations) {
                              registration.unregister();
                              console.log('SW Unregistered');
                          }
                      });
                  });
                }
            `,
          }}
        />
      </head>
      <body
        className={`${nunito.variable} antialiased`}
        style={{
          background: '#000000',
          overflowX: 'hidden',
          overscrollBehaviorY: 'none',
          fontFamily: 'var(--font-nunito), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}
      >
        <AppWrapper>
          <div className="relative z-10 font-sans">
            {children}
          </div>
        </AppWrapper>
      </body>
    </html>
  );
}
