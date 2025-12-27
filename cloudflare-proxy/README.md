# Cloudflare Workers 反向代理部署指南

## 项目结构

```
cloudflare-proxy/
├── src/
│   └── index.ts      # Worker 主程序
├── package.json
├── tsconfig.json
└── wrangler.toml     # Cloudflare 配置
```

## 部署步骤

### 1. 登录 Cloudflare

```bash
cd cloudflare-proxy
npx wrangler login
```

这会打开浏览器让你登录 Cloudflare 账号。

### 2. 部署 Worker

```bash
npx wrangler deploy
```

部署成功后，你会得到一个类似 `qiutsmoke-proxy.<你的账号>.workers.dev` 的域名。

### 3. 绑定自定义域名（可选但推荐）

如果你有自己的域名托管在 Cloudflare：

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → 选择 `qiutsmoke-proxy`
3. 点击 **Settings** → **Triggers** → **Add Custom Domain**
4. 输入你想要使用的域名（如 `app.yourdomain.com`）

## 本地测试

```bash
npx wrangler dev
```

这会在本地启动一个开发服务器（默认 http://localhost:8787）

## 注意事项

- Workers 免费版每天有 100,000 次请求限制
- 如果需要更多请求，可以升级到 $5/月的付费计划
- 自定义域名需要域名已经托管在 Cloudflare

## iOS 应用配置

部署完成后，需要更新 `capacitor.config.ts` 中的 `PROD_URL`：

```typescript
const PROD_URL = 'https://你的CF域名';
```

然后重新同步：

```bash
npx cap sync ios
```
