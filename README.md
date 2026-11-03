# ICE3 Agent Console

> Document ID: ICE3-AGENT-RM-001
>
> Status: Active
>
> Owner: ICE3 Agent Console maintainers

[![ICE3 汽车制造工厂 3D Agent Console 在线演示](public/og-cover.jpg)](https://jzb1006.github.io/ice3-agent-console/)

ICE3 Agent Console 展示对话式 Agent 如何通过一组小而严格的工具接口操作工业 3D
Scene。当前版本是一座由 ICE3 前端参数化生成的虚拟汽车制造工厂。

应用支持确定性的浏览器本地 Agent；对话和 Scene 状态更新时，3D 舞台始终保持挂载。

在线演示：<https://jzb1006.github.io/ice3-agent-console/>

所有内置 autoplay、快捷操作和脚本 Agent 都针对这座虚拟汽车制造工厂。其它已获准使用的
3D 模型应按
[接入其它 3D 模型](docs/guides/other-models.md)配置为独立部署。

## 能力

| 领域 | 能力 |
|---|---|
| 对话 | 流式文本、工具调用、运行错误和取消 |
| Scene | 设备发现、选择、聚焦、高亮、相机视角和清除 |
| 渲染 | 默认使用稳定的 WebGL2；WebGPU 作为实验性能力显式启用 |
| 传输 | 浏览器本地脚本事件流 |
| 相机 | 多站点引导巡游和响应式舞台取景 |
| Selection | 鼠标选择使用稳定的黄色高亮；厂区地面、道路和未绑定业务实体不可选 |
| Asset | 当前使用前端参数化工厂几何；保留 Studio Tileset、设备绑定和按需加载接入路径 |
| 首屏 | 内联 loading，在完整 CSS 与 JavaScript 启动前稳定显示 |
| 展示 | 分组内置剧本和快捷操作 |
| 部署 | 纯前端开发模式和无凭据静态演示 |
| 搜索与统计 | 完整 TDK、结构化数据、robots/sitemap 和 GA4 线上访问统计 |

当前演示使用 ICE3 公开 engine API 在浏览器中生成参数化汽车工厂，不需要加载真实 GLB/3D Tiles
资产。后续接入真实工厂模型时，可沿用仓库已有的 Studio Tileset、设备绑定和资产交付管线。
本工程是应用层，不向 engine 或 industrial core 增加 Agent 概念。

## 界面预览

| Agent 工艺巡游 | 聚焦设备 |
|---|---|
| [![Agent 正在讲解汽车制造流水线，右侧显示对话和工位信息](docs/images/readme-agent-tour.jpg)](https://jzb1006.github.io/ice3-agent-console/) | [![收起对话面板后查看聚焦的汽车制造设备与工位信息浮层](docs/images/readme-scene-focus.jpg)](https://jzb1006.github.io/ice3-agent-console/) |

左图展示 Agent 按工艺段自动移动镜头并讲解设备；右图展示收起对话面板后的聚焦场景。
两张图均来自版本库中的虚拟汽车制造工厂示例。

## 快速开始

运行要求：

- Node.js 24.22.1 LTS
- npm 11 或更高版本
- 支持 WebGL2 的现代浏览器；WebGPU 为实验性显式选项

```bash
git clone https://github.com/ice-3d/ice3-agent-console.git
cd ice3-agent-console
nvm use
npm install
npm run dev:frontend
```

打开 `http://127.0.0.1:8110/?autoplay=0`。页面只运行浏览器本地 Agent，不需要后端服务。

## 浏览器本地演示

```bash
npm run build:demo
npx http-server dist -p 8111 -c-1
```

打开 `http://127.0.0.1:8111/`。静态演示构建使用确定性的本地 Agent，不需要 API key
或服务端。

URL 控制参数：

- `?demo=1` 选择本地传输；`?demo=0` 为未来服务端接入保留。
- `?autoplay=1` 或 `?autoplay=0` 控制开场巡游。

无效值回退到构建默认值。

## 后续接入服务端模型

当前版本默认不接入后端。未来需要真实模型时，可复用原有服务端适配层。

同时配置以下三个变量：

```bash
export ICE_AGENT_MODEL_BASE_URL='https://model.example/v1'
export ICE_AGENT_MODEL_API_KEY='replace-with-your-secret'
export ICE_AGENT_MODEL_NAME='industrial-agent'
npm run dev
```

API key 只保留在服务端。`/health` 报告运行模式和接口 host，不返回凭据。模型已经配置但
不可用时，应用返回错误，不会静默切换到脚本输出。

详见 [Real-Model 服务端](docs/guides/real-model-server.md)。

## Scene 工具

暴露给 Agent 的 Scene 工具仅为：

- `find_equipment`
- `select_equipment`
- `focus_equipment`
- `highlight_equipment`
- `set_camera_view`
- `clear_scene_focus`

未知工具会被拒绝。参数格式错误时只显示错误，不执行工具。

## 验证

```bash
npm run docs:check
npm run typecheck
npm test
npm run test:e2e
npm run verify
```

## 文档

- [文档索引](docs/README.md)
- [应用架构](docs/architecture.md)
- [本地开发](docs/guides/local-development.md)
- [静态部署](docs/guides/static-deployment.md)
- [Real-Model 服务端](docs/guides/real-model-server.md)
- [接入其它 3D 模型](docs/guides/other-models.md)
- [事件和 Scene 工具协议](docs/reference/protocol.md)
- [Runtime Asset 交付](docs/reference/asset-delivery.md)
- [架构决策](docs/decisions/README.md)

## AI 辅助开发

本项目在设计和实现过程中大量使用了 AI 辅助开发。

## 许可证

本项目采用 [MIT License](LICENSE) 许可。
