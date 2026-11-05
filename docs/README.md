# ICE3 Agent Console 文档索引

> Document ID: ICE3-AGENT-IDX-001
>
> Status: Active
>
> Owner: ICE3 Agent Console maintainers

## 从这里开始

| ID | 标题 | Status | 用途 |
|---|---|---|---|
| `ICE3-AGENT-RM-001` | [ICE3 Agent Console](../README.md) | Active | 能力、模式、快速开始和工具列表 |
| `ICE3-AGENT-ARC-001` | [应用架构](architecture.md) | Active | event、Scene、传输和相机流程 |
| `ICE3-AGENT-IDX-002` | [架构决策](decisions/README.md) | Active | 应用决策索引 |
| `ICE3-AGENT-POL-001` | [仓库规则](../AGENTS.md) | Active | 架构和交付规则 |

## 指南

| ID | 标题 | Status | 用途 |
|---|---|---|---|
| `ICE3-AGENT-GUIDE-001` | [本地开发](guides/local-development.md) | Active | 运行和调试服务端模式 |
| `ICE3-AGENT-GUIDE-002` | [静态部署](guides/static-deployment.md) | Active | 构建并托管无凭据演示 |
| `ICE3-AGENT-GUIDE-003` | [Real-Model 服务端](guides/real-model-server.md) | Active | 配置兼容的 Agent endpoint |
| `ICE3-AGENT-GUIDE-004` | [接入其它 3D 模型](guides/other-models.md) | Active | 将已预处理的另一个 Scene 与设备清单接入应用 |

## 协议与决策

| ID | 标题 | Status | 用途 |
|---|---|---|---|
| `ICE3-AGENT-REF-001` | [Event 和 Scene Tool 协议](reference/protocol.md) | Active | event stream、tool、payload 和失败行为 |
| `ICE3-AGENT-REF-002` | [Runtime Asset 交付](reference/asset-delivery.md) | Active | Tileset 分块、粗模/细模、业务绑定、首屏 loading 和发布验证 |
| `ICE3-AGENT-REF-003` | [ICE3 引擎能力与引擎类别比较](research/ice3-engine-capability-comparison.md) | Historical | 能力边界、优势和引擎类别比较记录 |
| `ICE3-AGENT-ADR-001` | [Agent 和 Scene 边界](decisions/0001-agent-scene-boundary.md) | Active | 让编排逻辑留在 engine 内部实现之外 |
| `ICE3-AGENT-ADR-002` | [脚本与 Real-Model 传输](decisions/0002-scripted-and-real-model-transport.md) | Active | 明确 runtime 模式和失败行为 |

## 设计历史

| ID | 标题 | Status | 用途 |
|---|---|---|---|
| `ICE3-AGENT-SPEC-001` | [Console 设计](specs/2026-10-28-ice3-agent-console-design.md) | Historical | 保留初始界面和行为设计；当前 Asset 链路见 REF-002 |
| `ICE3-AGENT-PLAN-001` | [Console 实施计划](plans/2026-10-28-ice3-agent-console.md) | Historical | 初始实施和验证的审计记录 |
| `ICE3-AGENT-PLAN-002` | [污水处理厂专属演示改造](plans/2026-10-29-wastewater-only-agent-demo.md) | Historical | 固定演示资产的历史记录；当前接入见 GUIDE-004 和 REF-002 |
