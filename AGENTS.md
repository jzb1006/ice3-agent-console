# ICE3 Agent Console 仓库规则

> Document ID: ICE3-AGENT-POL-001
>
> Status: Active
>
> Owner: ICE3 Agent Console maintainers

## 架构

- 3D 舞台是主要界面，在对话更新期间保持挂载。
- 浏览器 Scene 集成只使用公开的 `ice3` exports。
- 对话与 Agent 行为留在本应用中，不进入 engine 或 industrial core。
- Agent 实现只发送 protocol event，不导入 renderer 或 GPU 内部实现。
- 共享 tool 和 event 名称放在 `shared/`，不得在多个模块中重复定义。
- 脚本 Agent 必须无需凭据即可运行。
- 模型已经配置但运行失败时必须报错，不得静默切换为脚本 Agent。
- Agent 只可使用受控的六个 Scene Tool：`find_equipment`、`select_equipment`、
  `focus_equipment`、`highlight_equipment`、`set_camera_view` 和
  `clear_scene_focus`。

## 演示资产

- 版本库中的演示使用前端参数化生成的虚拟汽车制造工厂。
- 默认演示不依赖外部 Runtime Asset；设备 Bounds、Selection ID 和内置剧本目标来自
  `shared/factory.ts`。
- 不得加入真实客户模型、派生模型、截图或提取纹理。
- 静态构建无需后端或凭据即可工作。
- 完成 Asset 相关工作前，检查 Git status、tracked files、ignore rules 和 staged content。

## 交付

- 在功能分支开发，完整验证通过后才可合入 `main`。
- 每项行为变化遵循 RED-GREEN-REFACTOR。
- 使用 `.nvmrc` 指定的 Node.js 24.22.1 LTS。
- 不得引入已被 ICE3 决策排除的开发工具。
- event、tool、Asset 或 protocol 变更跨仓库时，在 `ice3-doc` 更新权威定义并验证消费方。

## 提交身份

- 本仓库所有 Git author 和 committer 名称必须为 `damoqiongqiu`。
- 提交、合并或推送前核对配置名称与提交记录。

## 命名与法律边界

- 产品文档、源码标识、注释、示例、Diagnostic 和 commit 中不得出现竞品、厂商或第三方产品名称。
- 技术比较使用中性类别描述。
- 不得链接会暴露禁止名称的外部调研资料。

## 验证

```bash
npm run verify
npm run build:demo
npm run test:e2e
```

## 关联文档

- `ICE3-AGENT-IDX-001` — [文档索引](docs/README.md)
- `ICE3-AGENT-ARC-001` — [应用架构](docs/architecture.md)
