# ICE3 引擎能力与引擎类别比较

> Document ID: ICE3-AGENT-REF-003
>
> Status: Historical
>
> Owner: ICE3 Agent Console maintainers

> 研究日期：2026-11-04
>
> 研究范围：公开 `ice3` Runtime、配套 Studio 文档，以及当前 `ice3-agent-console` 的实际调用。
>
> 说明：本记录只按能力类别比较，不做未经基准测试的品牌排名。`ice3` 当前仍是 pre-release；版本、浏览器兼容性和资产 Profile 变化时，应重新核对。

## 结论摘要

`ice3` 能生成和渲染的核心对象包括：带层级和变换的 Scene/Node、Mesh、基础 Geometry、基础 Material、相机、2D/3D layer，以及通过 Prepared GLB 和 OGC 3D Tiles 1.1 接入的工业模型。它的优势不在“电影级画面”或通用游戏功能，而在工业场景所需的稳定设备身份、可控资产生命周期、Tileset 流式加载、LOD、拾取和资源有界性。

当前项目已经使用了 Scene、Box Geometry、Mesh、基础 Material、Perspective Camera、Orbit Controller、WebGL2 渲染和设备 Selection；另一条 Scene adapter 还使用 `ICETilesetLoader` 读取 Tileset，但当前演示路径主要是前端参数化几何，不能把所有 Runtime 能力都视为当前首屏已启用。

## 能生成或承载的图形

### Runtime 公开能力

官方 Engine README 将公开能力归纳为 Scene、Geometry、Camera、Asset 和 Tileset API；架构文档进一步列出类型化场景树、变换、序列化与释放，WebGL2/WebGPU 后端，Selection Mask、Render Bundle、alpha blending、基础材质、Canvas2D layer、输入路由、picking、Prepared GLB reader、3D Tiles 流式加载、屏幕空间误差 LOD、静态 batch、instancing 和诊断数据。

来源：

- [Engine README](https://github.com/ice-3d/ice3-engine/blob/main/README.md#1-能力)
- [Runtime 架构](https://github.com/ice-3d/ice3-engine/blob/main/docs/architecture.md#2-package-职责)

### 几何与材质

当前公开 M0 示例明确展示 `ICEBoxGeometry`、`ICEMesh`、`ICEBasicMaterial`，支持颜色和 edge color；仓库中的当前演示也使用这些 Box Mesh 组合出厂房、输送线、设备和车辆。Studio 的组件部件定义则包含 group、box、plane、cylinder、sphere、customMesh、sweep、extrude，并支持有限的布尔减法。这一部分是“配套建模/资产准备能力”，不应误解为 Runtime 在浏览器中支持任意 source 格式或任意运行时建模。

来源：

- [ICE3 M0 API](https://github.com/ice-3d/ice3-engine/blob/main/docs/api/m0.md#1-完整示例)
- [当前项目的 Box/Mesh 生成](../../src/scene/factory-browser.ts#L61-L89)
- [Studio 能力清单](https://github.com/ice-3d/ice3-studio/blob/main/docs/reference/capabilities.md#3-operation-类型)

### 工业模型与大场景

Runtime 接受通过 Profile 校验的 Prepared GLB，并支持 OGC 3D Tiles 1.1 Tileset；Tileset API 负责相机工作集、分区加载、预取、空闲等待和释放。3D Tiles 标准本身使用层级空间结构和 HLOD，以便流式传输和渲染大规模三维内容。配套 Studio 负责从多种 source format 做离线转换、切分、LOD、batch 和 Tileset 发布，Engine 不在浏览器里执行这些 source parsing 工作。

来源：

- [Asset 加载指南](https://github.com/ice-3d/ice3-engine/blob/main/docs/guides/asset-loading.md#1-目标结果)
- [M1 Asset API](https://github.com/ice-3d/ice3-engine/blob/main/docs/api/m1.md#1-完整示例)
- [Engine README 的 Asset 工作流](https://github.com/ice-3d/ice3-engine/blob/main/README.md#5-asset-工作流)
- [OGC 3D Tiles 规范](https://docs.ogc.org/cs/22-025r4/22-025r4.html)

## 与不同引擎类别的比较

| 引擎类别 | 强项 | 与 `ice3` 的差异 | 适合的选择 |
|---|---|---|---|
| 低层浏览器 GPU API | 控制力和后端能力最直接 | 需要自行补齐 Scene graph、资产格式、拾取、LOD、资源回收、设备身份和诊断 | 需要自研渲染器、特殊 shader 或极限底层控制时 |
| 通用 Web 3D 渲染库 | 上手快、生态广、程序化几何和常见材质丰富 | 工业资产身份、Tileset 调度、稳定选择语义和资源有界策略通常要由应用或插件补齐 | 轻量展示、产品可视化、交互原型和通用 3D 页面 |
| 全功能实时/游戏引擎 | 编辑器、动画、物理、脚本、后处理和内容工具完整 | 体量和运行时边界更大；嵌入已有业务前端时需要适配其生命周期和资源模型 | 仿真、交互培训、复杂动画、游戏化体验 |
| 工业/地理空间流式 Runtime | 大场景分块、LOD、空间索引和 3D Tiles 生态成熟 | 往往更偏地图/地理空间或既有平台；是否能提供本项目需要的稳定业务设备 Selection，要看具体产品 | 城市级、园区级、BIM/工厂大场景和在线流式浏览 |
| `ice3` | 工业优先、公开 facade 小、Scene identity 和生命周期明确，并把 Prepared GLB/3D Tiles、LOD、picking、Selection 和诊断放在同一 Runtime 边界内 | 当前 Profile 明确不支持 animation、skins、morph targets、textures 或复杂 Material；WebGPU 仍是实验性后端；生态和成熟度需要单独评估 | 工业设备浏览、数字孪生控制台、Agent 驱动的可解释场景操作 |

低层 API 的能力边界可由浏览器标准侧面印证：WebGL 是在 canvas 中执行 GPU 2D/3D 绘制的 API；WebGPU 提供更现代的 GPU 计算与绘制能力，但浏览器支持仍有限。`ice3` 的价值在于把这些底层能力封装成面向工业应用的可消费对象，而不是替代底层 API 的全部可能性。

来源：

- [MDN WebGL API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)
- [MDN WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)
- [Engine README 的边界](https://github.com/ice-3d/ice3-engine/blob/main/README.md#8-边界)

## 主要优势

1. **工业语义优先。** Selection、Node identity、metadata、设备绑定和稳定的 Scene 命令边界，比较适合“点选设备、聚焦设备、让 Agent 解释设备”的业务，而不是只关心画面。
2. **大场景路径明确。** Prepared GLB、3D Tiles、相机工作集、预取、驱逐和 LOD 形成完整的资产交付路径；这比在普通渲染库上从零实现流式大场景更直接。
3. **应用集成面小。** 应用只从 `ice3` facade 导入，不需要依赖内部 renderer/runtime 包；资源销毁和诊断也有明确的 Engine 生命周期与稳定错误码。
4. **浏览器部署简单。** 默认 WebGL2，WebGPU 可显式启用；当前项目可以静态构建和无需凭据运行。
5. **可解释的性能控制。** batch、instancing、LOD、GPU residency 和 Tileset 统计都对应可观测对象，利于工业控制台做容量和故障诊断。

## 需要正视的限制

- `ice3` 不是 DCC/建模器，也不是通用 source-format 运行时；模型需先经过配套准备流程。
- 当前 Prepared Profile 不支持 animation、skins、morph targets、textures 和复杂 Material，电影级材质、角色动画和复杂后处理不能默认视为可用。
- WebGPU 是显式实验性后端，不能据此承诺所有浏览器和设备都获得收益；项目默认 WebGL2。
- 公开 npm 包版本为 `0.2.1`，仓库文档明确标记项目为 pre-release。缺少跨硬件、跨浏览器和同规模场景的独立基准时，不应声称其性能一定优于其它引擎。
- 当前项目的“前端参数化工厂”只直接使用 Box Geometry；如果目标是高保真真实工厂，需要完成 Prepared GLB/3D Tiles 资产管线、绑定清单和浏览器端验收。

## 对当前项目的建议

- 如果产品目标是工业设备浏览、Agent 驱动的场景操作和可解释 Selection，继续使用 `ice3` 是合理的；它和现有 `src/scene` 的边界已经匹配。
- 如果下一步目标是高保真材质、纹理、角色/机械动画、复杂后处理或游戏式物理，应先做能力验证，不要只依据“能渲染 Mesh”推断支持。
- 在正式选型前补一组同场景基准：首屏时间、可见三角形、网络字节、GPU 显存、拾取延迟、Tileset 抖动/空洞、Context/Device Lost 恢复和移动端兼容性。没有这些数据，只能做架构适配比较，不能做性能结论。
