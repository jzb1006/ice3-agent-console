# ICE3 Agent Console Real-Model 服务端

> Document ID: ICE3-AGENT-GUIDE-003
>
> Status: Active
>
> Owner: ICE3 Agent Console maintainers

## 目标结果

将 Console 连接到兼容 model endpoint，同时不向浏览器暴露凭据。

## 配置

同时设置以下三个变量：

```bash
export ICE_AGENT_MODEL_BASE_URL='https://model.example/v1'
export ICE_AGENT_MODEL_API_KEY='replace-with-your-secret'
export ICE_AGENT_MODEL_NAME='industrial-agent'
npm run dev
```

可选服务端设置：

- `ICE_AGENT_PORT`，默认值为 `8099`。
- `ICE_AGENT_PACE`，脚本输出节奏，默认值为 `18` 毫秒。

## 请求路径

服务端发送兼容 chat-completion 的请求，其中包含批准的 Scene Tool 定义。它将兼容
text 和 tool-call response 转换为共享 event stream。

## 凭据规则

- API key 只保存在服务端 environment variable。
- 不得将凭据放入 URL parameter、build asset、log 或 browser event。
- `/health` 只暴露 mode、model name 和 endpoint host。

## 失败行为

部分 model variable 存在而其他缺失时，service 以无效状态启动并报告缺失名称。已配置
endpoint 失败时，Console 报告 error，不静默运行 scripted Agent。

## 关联文档

- `ICE3-AGENT-REF-001` — [Protocol](../reference/protocol.md)
- `ICE3-AGENT-ADR-002` — [Transport policy](../decisions/0002-scripted-and-real-model-transport.md)
- `ICE3-AGENT-GUIDE-001` — [本地开发](local-development.md)
