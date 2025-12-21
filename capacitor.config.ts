import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rain.meditation',
  appName: 'Rain',
  webDir: 'out',
  // 使用线上 URL（更稳定，避免静态导出问题）
  server: {
    url: 'https://rain-meditation.pages.dev',
    cleartext: true
  },
  // iOS 后台音频配置
  ios: {
    backgroundColor: '#000000',
    allowsLinkPreview: false
  }
};

export default config;

