#!/bin/bash
# 🚀 一键部署脚本 - 自动部署到 Vercel + Cloudflare

set -e

echo "🚀 === Rain Meditation 一键部署 ==="
echo ""

# 1. 部署后端到 Vercel
echo "▲ [1/3] 正在部署 Vercel (后端)..."
VERCEL_OUTPUT=$(npx vercel deploy --prod --yes 2>&1)
echo "$VERCEL_OUTPUT"

# 提取新的 Vercel URL
VERCEL_URL=$(echo "$VERCEL_OUTPUT" | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | head -1)
echo "✅ Vercel 部署完成: $VERCEL_URL"

# 2. 更新 Cloudflare 代理中的 Vercel URL
echo ""
echo "☁️ [2/3] 正在更新 Cloudflare 代理配置..."
sed -i '' "s|const VERCEL_API_HOST = '.*';|const VERCEL_API_HOST = '$VERCEL_URL';|" functions/api/\[\[catchall\]\].ts
echo "✅ 代理配置已更新"

# 3. 构建并部署前端到 Cloudflare
echo ""
echo "☁️ [3/3] 正在构建并部署 Cloudflare (前端)..."
NEXT_PUBLIC_API_URL="" ./scripts/build-cf.sh
npx wrangler pages deploy out --project-name rain-meditation --commit-dirty=true

echo ""
echo "🎉 === 部署完成 ==="
echo "前端: https://rain-meditation.pages.dev"
echo "后端: $VERCEL_URL"
