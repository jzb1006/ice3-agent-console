# Agent Console Runtime Asset 交付

> Document ID: ICE3-AGENT-REF-002
>
> Status: Active
>
> Owner: ICE3 Agent Console maintainers

## 当前默认场景

仓库内置演示使用 `shared/factory.ts` 和 `src/scene/factory-browser.ts` 生成参数化汽车制造
工厂，不读取外部模型文件，也不在构建产物中打包 Runtime Asset。

## 接入其它模型

需要接入其它合规 3D 模型时，应在独立部署中提供完整的 Runtime Tileset bundle：

```text
assets/<asset-id>/
├── equipment.json
└── tiled/
    ├── tileset.json
    ├── bindings.json
    ├── export.json
    ├── parts/
    └── coarse/
```

- `tileset.json` 定义层级和相对 content URI。
- `parts/` 和 `coarse/` 提供不同 LOD 的 Runtime 内容。
- `bindings.json` 保存业务实体、Selection 和 world Bounds。
- `equipment.json` 只保留设备查询和信息卡所需字段，并且必须由同一版本的绑定数据确定性生成。
- 不得提交 source GLB、客户数据、提取纹理或凭据。

应用层只依赖公开的 Scene API；对话和 Agent 行为不进入 Engine 或资产处理管线。资产加载
失败时必须显示明确错误，不得静默切换到其它场景。

## 验证

```bash
npm run verify
npm run build:demo
npm run test:e2e
```

自定义模型部署还应验证相对 URL、设备 Selection、LOD 切换、首屏 loading 和所有 content URI
均能从同源路径访问。

## 关联文档

- `ICE3-AGENT-ARC-001` — [应用架构](../architecture.md)
- `ICE3-AGENT-GUIDE-004` — [接入其它 3D 模型](../guides/other-models.md)
