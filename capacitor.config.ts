import type { CapacitorConfig } from '@capacitor/cli';

// -----------------------------------------------------------------------------
// ⚙️ 环境配置中心
// -----------------------------------------------------------------------------

<<<<<<< HEAD
// 切换模式：'prod' = 生产/测试版 (热更新) | 'dev' = 本地开发 (Live Reload)
// 提示：开发时改为 'dev'，打包发布/真机测试时改为 'prod'
const MODE: 'prod' | 'dev' = 'dev';

// 🏠 本地开发地址 (请根据 ifconfig 确认本机 IP)
// 你的本机 IP: 172.20.10.10 (端口 3001)
const DEV_URL = 'http://172.20.10.10:3001';
=======
// 切换模式：'prod' = 生产 (远程 + 缓存) | 'dev' = 本地开发 (Live Reload)
const MODE: 'prod' | 'dev' = 'prod';

// 🏠 本地开发地址
const DEV_URL = 'http://192.168.31.34:3000';
>>>>>>> 5ba2b94571c595811380d6c2a103288977662d0f

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
      enabled: true,
    },
  },
};

export default config;
