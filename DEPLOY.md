# 🚀 部署指南 - Rain Meditation

## 当前架构

```
用户 (国内)
   ↓
Cloudflare Pages (rain-meditation.pages.dev) ← 主入口
   │
   ├─ 前端页面 (静态预渲染)
   ├─ Edge API (大部分 API 直接处理)
   └─ Node.js API (通过代理转发到 Vercel)
         ↓
   Vercel (qiutsmoke.vercel.app) ← 后端 API
```

---

## 线上地址

| 平台 | URL | 用途 |
|------|-----|------|
| **Cloudflare Pages** | <https://rain-meditation.pages.dev> | 主入口 (国内可访问) |
| **Vercel** | <https://qiutsmoke.vercel.app> | 后端 API (国内无法直接访问) |

---

## 一键部署命令

### 部署到 Cloudflare Pages (推荐)

```bash
# 1. 构建并部署
rm -rf .vercel/output && \
npx vercel build && \
npx @cloudflare/next-on-pages --skip-build && \
npx wrangler pages deploy .vercel/output/static --project-name=rain-meditation
```

### 部署到 Vercel (后端)

```bash
npx vercel --prod --yes
```

---

## 环境变量配置

### Cloudflare Pages 环境变量

```bash
# 设置环境变量
npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL --project-name=rain-meditation
npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --project-name=rain-meditation
npx wrangler pages secret put NEXT_PUBLIC_VAPID_PUBLIC_KEY --project-name=rain-meditation
npx wrangler pages secret put DEEPSEEK_API_KEY --project-name=rain-meditation
```

### Vercel 环境变量

在 Vercel Dashboard 或通过 CLI 设置：

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY production
npx vercel env add VAPID_PRIVATE_KEY production
npx vercel env add VAPID_EMAIL production
npx vercel env add DEEPSEEK_API_KEY production
```

---

## API 路由代理说明

以下 API 路由在 CF Pages 上作为 **Edge Runtime 代理**，转发请求到 Vercel：

| 路由 | 说明 | 代理原因 |
|------|------|----------|
| `/api/tts` | TTS 语音合成 | 需要 Node.js `fs`/`os` 模块 |
| `/api/tts/cards` | TTS 卡片 CRUD | 需要 Node.js 环境 |

代理配置文件：

- `app/api/tts/route.ts`
- `app/api/tts/cards/route.ts`

代理后端地址：`https://qiutsmoke.vercel.app`

---

## Supabase 配置

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入项目 → **Authentication** → **URL Configuration**
3. 设置：
   - **Site URL**: `https://rain-meditation.pages.dev`
   - **Redirect URLs**: `https://rain-meditation.pages.dev/**`

---

## 常见问题

### Q: TTS 没声音？

A: 检查 Vercel 是否正常部署，TTS 需要代理到 Vercel 处理。

### Q: 内容生成不完整？

A: 检查 `DEEPSEEK_API_KEY` 是否已在 CF Pages 设置。

### Q: 注册确认邮件打不开？

A: 需要在 Supabase Dashboard 设置正确的 Site URL（见上方配置）。

### Q: 国内访问慢或打不开？

A: 使用 Cloudflare Pages 地址访问，不要直接访问 Vercel 地址。

---

## 开发环境

```bash
# 本地开发
npm run dev

# 本地预览 CF Pages 构建
npm run pages:preview
```

---

## 相关文件

- `wrangler.toml` - Cloudflare 配置
- `.vercel/project.json` - Vercel 项目配置
- `functions/` - CF Pages Functions (目前未使用)
- `app/api/tts/route.ts` - TTS 代理
- `app/api/tts/cards/route.ts` - TTS Cards 代理
