import type { CapacitorConfig } from '@capacitor/cli';

// -----------------------------------------------------------------------------
// ⚙️ 环境配置中心
// -----------------------------------------------------------------------------

// 切换模式：'prod' = 生产 (远程 + 缓存) | 'dev' = 本地开发 (Live Reload)
const MODE: 'prod' | 'dev' = 'prod';

// 🏠 本地开发地址 (请根据 ifconfig 确认本机 IP)
const DEV_URL = 'http://172.20.10.10:3001';

// ☁️ 线上生产地址
const PROD_URL = 'https://qiutsmoke.vercel.app';

// -----------------------------------------------------------------------------

const config: CapacitorConfig = {
  appId: 'com.rain.meditation',
  appName: 'Rain',
  webDir: 'out',

  server: {
    url: MODE === 'dev' ? DEV_URL : PROD_URL,
    cleartext: MODE === 'dev',
    // 允许 WebView 缓存资源
    allowNavigation: ['qiutsmoke.vercel.app', '*.vercel.app'],
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
