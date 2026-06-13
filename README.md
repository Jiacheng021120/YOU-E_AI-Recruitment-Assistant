# YOU鹅

AI 全流程招聘助手，基于 Next.js App Router、TypeScript 和 Tailwind CSS。产品通过“鸽鹅机制”辅助候选人画像判断，并重点演示一键约面改面 Agent。

## Windows 运行方式

推荐直接双击：

```text
启动-YOU鹅-dev-server.cmd
```

看到 `Ready` 后，在浏览器打开：

```text
http://localhost:3030
```

如果使用 PowerShell，请用 `npm.cmd`，不要直接用 `npm`：

```powershell
cd "C:\Users\何佳成\Documents\Codex\2026-06-11\files-mentioned-by-the-user-next\鸽鹅鸽"
npm.cmd run dev -- --hostname localhost --port 3030
```

## 常见问题

- 如果提示 `npm.ps1 cannot be loaded`，说明 PowerShell 执行策略拦截了 `npm`，改用 `npm.cmd` 或双击 `启动项目.bat`。
- 如果提示端口被占用，把命令里的 `3000` 改成 `3001`，浏览器也访问 `http://127.0.0.1:3001`。
- 运行窗口必须保持打开，关闭窗口后网站也会停止。
