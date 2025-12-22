# 🚀 Rain Meditation 部署架构 v2.0

## 📐 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                           用户 (iOS App / 浏览器)                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ☁️ Cloudflare Pages (前端)                        │
│           https://rain-meditation.pages.dev                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 静态资源 (HTML/JS/CSS)                                          │  │
│  │ - Next.js Static Export                                       │  │
│  │ - 全球 CDN 加速 (国内可直连)                                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 🔀 Cloudflare Functions (反向代理)                               │  │
│  │ functions/api/[[catchall]].ts                                 │  │
│  │ - 拦截所有 /api/* 请求                                          │  │
│  │ - 转发至 Vercel 后端                                            │  │
│  │ - 绕过国内网络限制                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS Proxy
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       ▲ Vercel (后端 API)                            │
│  https://qiutsmoke-xxx.vercel.app                                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Node.js Runtime                                               │  │
│  │ - /api/tts-impl (EdgeTTS 语音合成)                              │  │
│  │ - /api/generate (DeepSeek AI 生成)                             │  │
│  │ - /api/meditation/* (冥想数据 CRUD)                             │  │
│  │ - /api/profile (用户资料)                                       │  │
│  │ - CRON Jobs (每日提醒)                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       🗄️ Supabase (数据库 + 认证)                     │
│              https://emgjxcqtnlkexpozmzzf.supabase.co               │
│  - PostgreSQL 数据库                                                 │
│  - Row Level Security (RLS)                                         │
│  - Supabase Auth (邮箱/OAuth 登录)                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 部署步骤

### 1️⃣ 部署后端 (Vercel)

```bash
# 登录 Vercel CLI
npx vercel login

# 链接项目
npx vercel link --yes

# 部署到生产
npx vercel deploy --prod --yes
```

**环境变量 (Vercel Dashboard > Settings > Environment Variables):**

| 变量名 | 说明 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务密钥 |
| `DEEPSEEK_API_KEY` | DeepSeek AI 密钥 |
| `VAPID_PRIVATE_KEY` | Web Push 私钥 |
| `VAPID_EMAIL` | Web Push 邮箱 |

---

### 2️⃣ 部署前端 (Cloudflare)

```bash
# 1. 构建静态资源 (排除 API 路由)
./scripts/build-cf.sh

# 2. 部署到 Cloudflare Pages
npx wrangler pages deploy out --project-name rain-meditation --commit-dirty=true
```

**⚠️ 重要**: 构建时 `NEXT_PUBLIC_API_URL` 留空，让前端使用相对路径 `/api/*`，由 Cloudflare Functions 代理。

---

### 3️⃣ 更新 iOS App

```bash
# 确保 capacitor.config.ts 中 MODE = 'prod'
# PROD_URL 指向 Cloudflare 地址

npx cap sync ios
```

然后在 Xcode 中运行。

---

## 📁 关键文件

| 文件 | 用途 |
|------|------|
| `capacitor.config.ts` | Capacitor 配置 (dev/prod 切换) |
| `next.config.mjs` | Next.js 配置 (条件静态导出) |
| `scripts/build-cf.sh` | Cloudflare 专用构建脚本 |
| `functions/api/[[catchall]].ts` | Cloudflare 反向代理 |
| `lib/config.ts` | API URL 配置 |
| `vercel.json` | Vercel 配置 (CRON 等) |

---

## 🔄 更新流程

### 前端更新 (热更新，无需重装 App)

```bash
./scripts/build-cf.sh
npx wrangler pages deploy out --project-name rain-meditation --commit-dirty=true
```

### 后端更新

```bash
npx vercel deploy --prod --yes
# 然后更新 functions/api/[[catchall]].ts 中的 VERCEL_API_HOST
npx wrangler pages deploy out --project-name rain-meditation --commit-dirty=true
```

---

## 🔐 安全注意事项

1. **Cookie 转发**: Cloudflare 代理必须转发 `cookie` 和 `authorization` 头
2. **CORS**: Vercel 在 `next.config.mjs` 中配置了 `Access-Control-Allow-Origin: *`
3. **RLS**: Supabase 表启用了行级安全策略

---

*最后更新: 2024-12-22*
