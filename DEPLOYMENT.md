# Vercel 部署说明

## 本地环境变量

在项目根目录创建 `.env.local`：

```env
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

不要使用 `NEXT_PUBLIC_DEEPSEEK_API_KEY`，也不要把 API Key 写入前端代码。

## Vercel 配置步骤

1. 进入 Vercel Project。
2. 打开 `Settings`。
3. 进入 `Environment Variables`。
4. 添加 `DEEPSEEK_API_KEY`。
5. 添加 `DEEPSEEK_BASE_URL`，值为 `https://api.deepseek.com`。
6. 添加 `DEEPSEEK_MODEL`，值为 `deepseek-chat`。
7. 保存后重新 `Redeploy`。

## 调用方式

前端只请求本项目接口：

```text
/api/deepseek
```

浏览器 Network 中不应出现：

```text
https://api.deepseek.com
```

DeepSeek API Key 只会在服务端 API Route 中读取：

```text
app/api/deepseek/route.ts
```

## 常见错误

- `Missing DEEPSEEK_API_KEY`：Vercel 没配置环境变量，或配置后没有重新部署。
- `401 Unauthorized`：API Key 错误或失效。
- `404 Not Found`：接口地址或模型名错误，检查 `DEEPSEEK_BASE_URL` 和 `DEEPSEEK_MODEL`。
- `CORS error`：前端直接请求了 DeepSeek，应改为请求 `/api/deepseek`。
- `localhost` 连接失败：线上代码仍在请求本地地址，检查 Network 请求地址。

## 构建检查

部署前运行：

```powershell
npm.cmd run build
```

API Route 不使用 `window`、`localStorage` 等浏览器专属对象。未配置 API Key 时，服务端接口会返回明确错误；前端会自动回退到模拟 AI 回复，不会白屏。

