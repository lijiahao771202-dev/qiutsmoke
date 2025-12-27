import type { CapacitorConfig } from '@capacitor/cli';

// -----------------------------------------------------------------------------
// ⚙️ 环境配置中心
// -----------------------------------------------------------------------------

// 切换模式：'prod' = 生产 (远程 + 缓存) | 'dev' = 本地开发 (Live Reload)
const MODE: 'prod' | 'dev' = 'prod';

// 🏠 本地开发地址 (请根据 ifconfig 确认本机 IP)
const DEV_URL = 'http://192.168.31.35:3002';

// ☁️ 线上生产地址 (通过 Cloudflare Pages 反向代理，解决国内访问问题)
const PROD_URL = 'https://qiutsmoke-39l.pages.dev';

// -----------------------------------------------------------------------------

const config: CapacitorConfig = {
  appId: 'com.rain.meditation',
  appName: 'Rain',
  webDir: 'out',

  server: {
    url: MODE === 'dev' ? DEV_URL : PROD_URL,
    cleartext: MODE === 'dev',
    // 允许 WebView 缓存资源
    allowNavigation: ['qiutsmoke-39l.pages.dev', '*.pages.dev', 'qiutsmoke.vercel.app'],
  },

  ios: {
    contentInset: 'never',
    backgroundColor: '#000000',
    allowsLinkPreview: false,
    scrollEnabled: true,
    // 启用 WebView 预热和缓存
    preferredContentMode: 'mobile',
  },

  plugins: {
    CapacitorHttp: {
      enabled: false, // 🔥 禁用以避免拦截 TTS API 请求导致解码错误
    },
  },
};

export default config;
