# Agent 与 Scene 边界

> Document ID: ICE3-AGENT-ADR-001
>
> Status: Active
>
> Owner: ICE3 Agent Console maintainers

## 背景

Agent 需要检查和操作 Scene，但允许任意 Engine 访问会让应用耦合私有 Runtime state，
并使行为不可预测。

## 决策

共享 protocol 暴露经过校验的 Scene Tool。Scene controller 通过公开 `ice3` API
执行允许的 tool。Model output 不能访问 Renderer internals、GPU object、私有 Scene
Node 或任意应用 function。

## 备选方案

- 向 Agent 提供 Engine object 的直接访问。
- 让服务端脱离浏览器直接构造 Scene mutation。
- 将 Scene action 编码为自由形式代码。

这些方案难以校验、取消、审计并保持兼容。

## 影响

- Tool 具有明确名称和 argument shape。
- Engine 和 industrial package 保持 Agent-independent。
- 新增 capability 必须有意修改 contract。
- 格式错误和未知 tool request 可以在 mutation 前拒绝。

## 验证

```bash
npm test -- tests
npm run test:e2e
```

## 关联文档

- `ICE3-AGENT-REF-001` — [Protocol](../reference/protocol.md)
- `ICE3-DOC-ADR-004` — [通用 semantic interface](https://github.com/ice-3d/ice3-doc/blob/main/docs/decisions/0004-generic-semantic-interfaces.md)
