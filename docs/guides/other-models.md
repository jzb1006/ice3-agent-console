# 接入其它 3D 模型

> Document ID: ICE3-AGENT-GUIDE-004
>
> Status: Active
>
> Owner: ICE3 Agent Console maintainers

## 适用范围

当前仓库的默认场景是参数化汽车制造工厂。其它合规模型应放在独立部署中，并通过公开
Scene API 接入；不要把客户模型、源 GLB 或派生纹理提交到本仓库。

## Runtime bundle

准备一个完整的 Runtime Tileset bundle：

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

`tileset.json` 中的 content URI 必须相对于它自身解析；`parts/` 和 `coarse/` 的所有文件
都必须随部署发布。`bindings.json` 中每个设备的 Selection ID 应稳定且唯一，Bounds 必须
是有限的三维范围。`equipment.json` 只保留名称、位号、工艺段、区域、连接和 Bounds 等
查询字段，并从同一版本的绑定数据确定性生成。

## 应用边界

Agent 只能发送共享协议中声明的 Scene Tool。Scene controller 负责校验设备 ID、相机命令
和取消信号；Agent 不得直接依赖 Renderer 或 GPU 内部实现。模型加载失败必须报告明确错误，
不得静默回退到默认场景。

## 部署检查

```bash
npm run verify
npm run build:demo
npm run test:e2e
```

另外检查：

- 页面部署在子路径时，Tileset、chunk 和设备清单仍使用相对 URL。
- 远距离视图先显示 coarse coverage，再按视锥加载 fine partition。
- 设备 Selection 在 LOD 替换前后保持一致。
- 首屏 loading、Scene ready 和单 tile 失败状态可见。
- 线上环境不包含 source asset、客户数据或凭据。

## 关联文档

- [Runtime Asset 交付](../reference/asset-delivery.md)
- [应用架构](../architecture.md)
- [事件和 Scene 工具协议](../reference/protocol.md)
