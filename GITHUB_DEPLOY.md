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

## 方式二：GitHub Pages 静态展示

项目已经包含 `out` 静态导出目录。你可以把 `out` 目录里的内容发布到 GitHub Pages。

注意：`out/.nojekyll` 必须保留，否则 GitHub Pages 可能无法加载 `_next` 静态资源。

## 环境变量

不要上传 `.env.local`。如需接入 DeepSeek，请复制 `.env.example` 为 `.env.local` 后填写自己的密钥。

