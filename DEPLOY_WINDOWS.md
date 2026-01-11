# 🚀 Windows 本地部署指南

本指南帮助你在 Windows 电脑上部署 Rain 冥想应用，并通过 Cloudflare Tunnel 实现外网访问。

---

## 📋 前置要求

- Windows 10/11
- Node.js 18+ ([下载地址](https://nodejs.org/))
- Git ([下载地址](https://git-scm.com/))
- Cloudflare 账户（已有 qiutsmoke.com 域名）

---

## 🔧 第一步：环境准备

### 1.1 安装 Node.js

1. 下载 Node.js LTS 版本：<https://nodejs.org/>
2. 安装时勾选 "Add to PATH"
3. 验证安装：

```powershell
node --version   # 应显示 v18.x 或更高
npm --version    # 应显示 9.x 或更高
```

### 1.2 克隆项目

```powershell
# 进入你想存放项目的目录
cd C:\Projects

# 克隆仓库
git clone https://github.com/lijiahao771202-dev/qiutsmoke.git

# 进入项目目录
cd qiutsmoke
```

### 1.3 安装依赖

```powershell
npm install
```

---

## 🔐 第二步：配置环境变量

在项目根目录创建 `.env.local` 文件：

```env
# AI 生成冥想脚本
DEEPSEEK_API_KEY=sk-73192bee9fba42af9afc84dab39c06c4

# Supabase 数据库
NEXT_PUBLIC_SUPABASE_URL=https://emgjxcqtnlkexpozmzzf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZ2p4Y3F0bmxrZXhwb3ptenpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjEwMjksImV4cCI6MjA3OTg5NzAyOX0.9hcE0n7UEZHvkR5rqcQIVXtQVKPdPOqAcdklDrjnmIg

# API URL（本地部署留空）
NEXT_PUBLIC_API_URL=
```

---

## 🏗️ 第三步：构建与启动

### 3.1 构建生产版本

```powershell
npm run build
```

> ⏱️ 首次构建可能需要 2-5 分钟

### 3.2 启动服务器

```powershell
npm run start
```

服务启动后，访问 <http://localhost:3000> 验证是否正常。

---

## 🌐 第四步：Cloudflare Tunnel 内网穿透

### 4.1 安装 cloudflared

**方法 A：使用 winget（推荐）**

```powershell
winget install Cloudflare.cloudflared
```

**方法 B：手动下载**

1. 下载：<https://github.com/cloudflare/cloudflared/releases/latest>
2. 选择 `cloudflared-windows-amd64.exe`
3. 重命名为 `cloudflared.exe`
4. 放到 `C:\cloudflared\` 目录
5. 添加到系统 PATH

### 4.2 登录 Cloudflare

```powershell
cloudflared tunnel login
```

浏览器会自动打开，登录你的 Cloudflare 账户并授权。

### 4.3 创建隧道

```powershell
# 创建名为 qiutsmoke 的隧道
cloudflared tunnel create qiutsmoke

# 记下返回的隧道 ID（类似：a1b2c3d4-e5f6-...）
```

### 4.4 配置 DNS 路由

```powershell
# 将 qiutsmoke.com 指向隧道
cloudflared tunnel route dns qiutsmoke qiutsmoke.com
```

### 4.5 创建配置文件

在 `C:\Users\你的用户名\.cloudflared\` 目录下创建 `config.yml`：

```yaml
tunnel: qiutsmoke
credentials-file: C:\Users\你的用户名\.cloudflared\<隧道ID>.json

ingress:
  - hostname: qiutsmoke.com
    service: http://localhost:3000
  - service: http_status:404
```

> ⚠️ 将 `<隧道ID>` 替换为步骤 4.3 中获得的实际 ID

### 4.6 启动隧道

```powershell
cloudflared tunnel run qiutsmoke
```

---

## 🔄 第五步：设置开机自启（可选）

### 使用 Windows 服务

```powershell
# 以管理员身份运行 PowerShell
cloudflared service install
```

### 使用 PM2（Node.js 进程管理）

```powershell
# 安装 PM2
npm install -g pm2 pm2-windows-startup

# 启动应用
pm2 start npm --name "rain-meditation" -- start

# 设置开机自启
pm2-startup install
pm2 save
```

---

## ✅ 验证部署

1. [ ] `npm run build` 无报错
2. [ ] `npm run start` 本地 <http://localhost:3000> 可访问
3. [ ] TTS 语音合成正常（播放冥想脚本）
4. [ ] AI 生成冥想脚本正常
5. [ ] Cloudflare Tunnel 运行中
6. [ ] <https://qiutsmoke.com> 可从手机访问

---

## 🔧 常见问题

### Q: 端口 3000 被占用

```powershell
# 查找占用进程
netstat -ano | findstr :3000

# 杀死进程（替换 PID）
taskkill /PID <PID> /F
```

### Q: TTS 生成失败

检查 node-edge-tts 是否正常：

```powershell
npm rebuild
```

### Q: Cloudflare Tunnel 连接失败

1. 检查 config.yml 中的隧道 ID 是否正确
2. 确保 credentials-file 路径存在
3. 检查防火墙是否阻止 cloudflared

---

## 📞 技术支持

如有问题，请查看项目 Issues 或联系开发者。
