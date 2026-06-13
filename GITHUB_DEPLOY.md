# GitHub 上传与打开说明

## 方式一：上传完整源码

1. 解压 ZIP。
2. 把项目内容上传到 GitHub 仓库。
3. 本地运行：

```powershell
npm.cmd install
npm.cmd run build
node you-e-dev-server.js
```

然后打开：

```text
http://127.0.0.1:3030
```

## 方式二：Vercel 在线部署

推荐使用 Vercel 部署，因为项目包含服务端 API Route：

```text
app/api/deepseek/route.ts
app/api/parse-resume/route.ts
```

部署后请在 Vercel Project 的 `Settings -> Environment Variables` 中配置：

```env
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

具体步骤见 `DEPLOYMENT.md`。

## 环境变量

不要上传 `.env.local`。如需接入 DeepSeek，请复制 `.env.example` 为 `.env.local` 后填写自己的密钥。
