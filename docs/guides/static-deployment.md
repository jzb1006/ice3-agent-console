# ICE3 Agent Console 静态部署

> Document ID: ICE3-AGENT-GUIDE-002
>
> Status: Active
>
> Owner: ICE3 Agent Console maintainers

## 目标结果

发布无需凭据的演示，其中包含应用、Runtime Asset 和确定性本地 Agent。

## 构建

```bash
nvm use
npm install
npm run build:demo
```

本地预览：

```bash
npx http-server dist -p 8111 -c-1
```

预期：`http://127.0.0.1:8111/` 无需 Agent service 或 model credential 即可运行。

## GitHub Pages

线上演示地址：

```text
https://ice-3d.github.io/ice3-agent-console/
```

仓库使用 [Deploy demo to Pages](../../.github/workflows/deploy-pages.yml) 在 `main`
更新后自动构建并发布。Workflow 只检出 Agent Console，并从 npm registry 安装锁定
版本的公开 `ice3` package；汽车制造演示的参数化场景代码已包含在本仓库中。

发布流程：

1. 检出 Agent Console。
2. 使用 `.nvmrc` 指定的 Node.js 24.22.1。
3. 使用 lockfile 安装 Agent Console 依赖和公开 `ice3` package。
4. 运行文档门禁、类型检查和单元测试。
5. 执行 `npm run build:demo`。构建前仍会校验并生成遗留 Runtime Asset 的
   `equipment.json`；当前汽车场景的 Bounds、Selection ID 和静态剧本来自共享的
   `shared/factory.ts`，不依赖该 Tileset。
6. 将 `dist/` 作为 Pages artifact 发布。

仓库 Settings 中的 Pages Source 必须保持为 `GitHub Actions`。不要把 151 MiB 左右的
完整 `dist/` 提交到 `main`，也不要改用普通 `npm run build`，因为普通构建默认选择
server transport。

GitHub Pages 只提供静态文件，没有 `8099` Agent service。线上应使用默认地址或
`?demo=1`；`?demo=0` 会尝试连接不存在的后端。

## 搜索与访问统计

静态页面包含：

- 面向搜索结果的 title、description、keywords 和 canonical URL。
- Open Graph、Twitter Card 与 `1200×630` 社交分享图。
- `WebSite` 和 `SoftwareApplication` JSON-LD。
- 视觉隐藏但可访问的页面文字摘要，为不执行 WebGL 的爬虫说明场景内容。
- 指向 ICE3 家族仓库的可抓取链接。
- `robots.txt` 和 `sitemap.xml`。

canonical 与 sitemap 的正式地址均为：

```text
https://ice-3d.github.io/ice3-agent-console/
```

访问统计沿用 2D Agent Console 的 GA4 Measurement ID：

```text
G-5M03M076TL
```

`gtag.js` 只在非本地主机注入。`localhost`、`*.localhost`、`127.0.0.1`、`::1` 和
`file:` 页面不会发送统计请求，避免开发调试和 E2E 污染生产数据。

## 发布文件

Static build 包含：

- HTML、CSS、JavaScript 和 source map。
- 包含静态页面和本地 Agent；遗留 Runtime `tiled/` Asset tree 仅用于兼容资产管线。
- 不包含 source GLB、prepared monolithic GLB、客户数据或凭据。

## URL 参数

- `?autoplay=0` 关闭开场巡游。
- `?demo=1` 明确选择 browser-local transport。
- `?demo=0` 选择 server transport，并要求 service 可达。

## 预期结果

无后端部署路径可以打开并加载参数化汽车制造工厂，并通过 local event stream 执行所有
内置场景。

默认 static build 不包含其它演示 Asset。需要发布其它合规 3D 模型时，必须保留完整的
Prepared Tileset 和设备清单，并按 [接入其它 3D 模型](other-models.md)调整 custom
deployment。

## 关联文档

- `ICE3-AGENT-RM-001` — [README](../../README.md)
- `ICE3-AGENT-ARC-001` — [架构](../architecture.md)
- `ICE3-AGENT-GUIDE-004` — [接入其它 3D 模型](other-models.md)
- `ICE3-AGENT-ADR-002` — [Transport policy](../decisions/0002-scripted-and-real-model-transport.md)
