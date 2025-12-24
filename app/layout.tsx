import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppWrapper from "@/components/AppWrapper";

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
            `,
          }}
        />
      </head>
      <body
        className="antialiased"
        style={{
          background: 'transparent',
          overflowX: 'hidden',
          overscrollBehaviorY: 'none',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
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
