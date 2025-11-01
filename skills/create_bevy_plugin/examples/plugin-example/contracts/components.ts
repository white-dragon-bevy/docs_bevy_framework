import { component } from "@white-dragon-bevy/bevy_framework";

export interface PathInfoData {
	CurrentWaypoint: number;
	GoalPosition: Vector3;
	IsArriveGoal: boolean;
	IsArriveNextPoint: boolean;
	NextWayPoint: number;
	Path: Path;
}

export const PathInfo = component<PathInfoData>("PathInfo", {
	CurrentWaypoint: 0,
	GoalPosition: new Vector3(0, 0, 0),
	IsArriveGoal: false,
	IsArriveNextPoint: false,
	NextWayPoint: 0,
	Path: undefined as unknown as Path, // 将在运行时设置
});
