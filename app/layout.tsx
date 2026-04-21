import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppWrapper from "@/components/AppWrapper";
import { WhiteNoiseProvider } from "@/contexts/WhiteNoiseContext";

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
    <html lang="zh-CN" className="hydrating" suppressHydrationWarning>
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
              
              // 注册 Service Worker 实现离线缓存
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('SW registered: ', registration);
                  }).catch(function(error) {
                    console.log('SW registration failed: ', error);
                  });
                });
              }
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700;900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
      </head>
      <body
        className="antialiased"
        style={{
          background: '#000000',
          overflowX: 'hidden',
          overscrollBehaviorY: 'none',
          fontFamily: '"Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}
      >
        <AppWrapper>
          <WhiteNoiseProvider>
            <div className="relative z-10 font-sans">
              {children}
            </div>
          </WhiteNoiseProvider>
        </AppWrapper>
        <div className="fixed left-3 bottom-3 z-[9999] rounded bg-black/55 px-2 py-1 text-[10px] leading-none text-white/85 pointer-events-none">
          v3.17
        </div>
      </body>
    </html>
  );
}
