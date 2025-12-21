import type { CapacitorConfig } from '@capacitor/cli';

// -----------------------------------------------------------------------------
// ⚙️ 环境配置中心
// -----------------------------------------------------------------------------

// 切换模式：'prod' = 生产/测试版 (热更新) | 'dev' = 本地开发 (Live Reload)
// 提示：开发时改为 'dev'，打包发布/真机测试时改为 'prod'
const MODE: 'prod' | 'dev' = 'prod';

// 🏠 本地开发地址 (请根据 ifconfig 确认本机 IP)
// 你的本机 IP: 192.168.31.34 (端口 3001)
const DEV_URL = 'http://192.168.31.34:3001';

// ☁️ 线上生产地址 (实现"云端热更新"的关键)
// App 将直接加载此 URL，只要 Cloudflare 部署了新代码，用户打开 App 即刻生效
const PROD_URL = 'https://rain-meditation.pages.dev';

// -----------------------------------------------------------------------------

const config: CapacitorConfig = {
  appId: 'com.rain.meditation',
  appName: 'Rain',
  webDir: 'out',
  server: {
    // 决定 App 加载本地文件还是远程 URL
    url: MODE === 'dev' ? DEV_URL : PROD_URL,
    // 允许 http 请求 (仅用于开发环境连本地 serve)
    cleartext: MODE === 'dev',
  },
  ios: {
    // 优化 iOS 状态栏和全屏体验
    contentInset: 'never',
    backgroundColor: '#000000',
    allowsLinkPreview: false,
    // 关闭 WebView 回弹 (防止壁纸跟着动)
    scrollEnabled: false,
  },
};

export default config;

