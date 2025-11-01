# PathPlugin 插件 数据流

## 核心公共接口 (Contracts)

**消息 (Message)**

- 无

**事件 (Event)**

- 无

**组件 (Component)**

- PathInfo: 存储实体的寻路结果，包含路径点数组、当前路径点索引、目标位置、到达状态等信息

## 数据流说明 (Data Flow Description)

**主流程 (路径计算与初始化)**

1. **[[pathCalculateSystem]]** (Update, Both): 监听 RVOAgent 组件的添加（queryChanged），过滤掉 PlayerUnit 和已销毁的实体。
2. **[[pathCalculateSystem]]** (Update, Both): 获取实体的 Transform 组件确定起始位置，配置寻路参数（AgentRadius: 6, WaypointSpacing: 10 等），调用异步寻路工具 computePathWithRetry。
3. **[[computePathWithRetry]]** (Async Task, Both): 使用 PathfindingService.ComputeAsync 进行寻路，轮询检查状态（Success/NoPath），失败时自动重试最多3次（间隔0.2秒）。
4. **[[pathCalculateSystem]]** (Update, Both): 寻路成功后调用 showPathPoints 可视化路径点，为实体插入 PathInfo 组件（包含完整路径数据），并插入 Movable 组件通知移动系统。

**流程二 (路径可视化调试)**

1. **[[showPathPoints]]** (Sync Utility, ClientOnly): 在 Workspace 中为每个路径点创建可视化 Part（起点绿色、终点红色、中间点白色），添加 BillboardGui 显示编号。
