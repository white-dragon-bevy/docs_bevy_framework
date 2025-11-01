import { Movable } from "@bevy-plugins/move-system/contracts/components";
import { RVOAgent } from "@bevy-plugins/move-system/rvo";
import { PlayerUnit } from "@bevy-plugins/other-system/components";
import { PathfindingService, Workspace } from "@rbxts/services";
import type { Context, World } from "@white-dragon-bevy/bevy_framework";
import { Transform } from "@white-dragon-bevy/bevy_framework";

import { PathInfo } from "../contracts/components";
import { computePathWithRetry } from "../utils/pathfinding-async";
import { showPathPoints } from "../utils/show-path";

// 给RVOAgent设置PathInfo组件
export function pathCalculateSystem(world: World): void {
	for (const [entityId, rvoAgentChanged] of world.queryChanged(RVOAgent)) {
		// 检查实体是否仍然存在（防止在同一个帧中被despawn的实体）
		if (!world.contains(entityId)) {
			continue;
		}

		const playerUnitComp = world.get(entityId, PlayerUnit);
		if (playerUnitComp) {
			continue;
		}

		if (rvoAgentChanged.new !== undefined && rvoAgentChanged.old === undefined) {
			// 寻路参数 - 针对长距离寻路优化
			const params = {
				AgentCanJump: true,
				AgentHeight: 5, // 稍微降低高度
				AgentMaxSlope: 89, // 增加坡度容忍度
				AgentRadius: 6, // 进一步减小半径，提高通过性
				WaypointSpacing: 10, // 增加间距，减少路径点数量
			} as AgentParameters;

			const rvoAgentComp = rvoAgentChanged.new;

			// 获取位置组件
			const transformComp = world.get(entityId, Transform);
			if (!transformComp) {
				warn(`Entity_${entityId} 没有Transform组件`);
				continue;
			}

			// 起始位置
			const startPosition = transformComp.cframe.Position;

			// 目标位置
			// TODO: 目标位置应该是祢豆子的位置，这里还没有生成祢豆子，暂时设定一个地图上的固定位置
			const targetPosition = new Vector3(58.727, 1.5, 25.179);

			// 使用异步寻路模块
			task.spawn(() => {
				// 使用 Promise-based async 寻路
				computePathWithRetry(
					startPosition,
					targetPosition,
					params,
					3, // 最大重试3次
					0.2, // 重试延迟0.2秒
				)
					.then((result) => {
						if (result.success && result.path && result.waypoints) {
							// print(`Entity_${entityId} 寻路成功！路径点数量:
							// ${result.waypoints.size()}`)

							// 生成可视化路径点
							showPathPoints(result.waypoints, entityId);

							const currentWaypoint = 0;
							const nextWaypoint = currentWaypoint + 1;
							const goalPosition = result.waypoints[nextWaypoint].Position;
							const isArriveNextPoint = false; // 初始状态：还没有到达下一个路径点
							const isArriveGoal = nextWaypoint >= result.waypoints.size() - 1;

							world.insert(
								entityId,
								PathInfo({
									CurrentWaypoint: currentWaypoint,
									GoalPosition: goalPosition,
									IsArriveGoal: isArriveGoal,
									IsArriveNextPoint: isArriveNextPoint,
									NextWayPoint: nextWaypoint,
									Path: result.path,
								}),
							);

							// 添加Movable组件，表示可以开始移动
							world.insert(entityId, Movable({}));
						} else {
							warn(`Entity_${entityId} 寻路失败: ${result.error}`);
						}
					})
					.catch((err: unknown) => {
						warn(`Entity_${entityId} 寻路异常: ${err}`);
					});
			});
		}
	}
}
