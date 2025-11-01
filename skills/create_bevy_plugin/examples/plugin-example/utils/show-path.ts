import { Workspace } from "@rbxts/services";
import type { AnyEntity } from "@white-dragon-bevy/bevy_framework";

export function showPathPoints(waypoints: PathWaypoint[], entityId: AnyEntity): void {
	// 计算实际终点（最后一个路径点）
	const actualEndIndex = waypoints.size() - 1;

	// 可视化路径点
	for (let i = 0; i < waypoints.size(); i++) {
		const waypoint = waypoints[i];
		const part = new Instance("Part");
		part.Name = `PathPoint_${entityId}_${i}`;
		part.Size = new Vector3(0.5, 0.5, 0.5); // 小一点的路径点
		part.Position = waypoint.Position;
		part.Anchored = true;
		part.CanCollide = false;
		part.Material = Enum.Material.Neon;

		// 根据路径点类型设置不同颜色
		if (i === 0) {
			part.Color = Color3.fromRGB(0, 255, 0); // 起点 - 绿色
		} else if (i === actualEndIndex) {
			part.Color = Color3.fromRGB(255, 0, 0); // 终点 - 红色
		} else {
			part.Color = Color3.fromRGB(255, 255, 255); // 中间点 - 蓝色
		}

		let pathFolder = Workspace.FindFirstChild("PathPointsFolder");
		if (!pathFolder) {
			pathFolder = new Instance("Folder");
			pathFolder.Name = "PathPointsFolder";
			pathFolder.Parent = Workspace;
		}

		part.Parent = pathFolder;

		// 添加标签显示路径点编号
		const billboardGui = new Instance("BillboardGui");
		billboardGui.Size = new UDim2(0, 50, 0, 20);
		billboardGui.StudsOffset = new Vector3(0, 1, 0);
		billboardGui.Parent = part;

		const textLabel = new Instance("TextLabel");
		textLabel.Size = new UDim2(1, 0, 1, 0);
		textLabel.BackgroundTransparency = 1;
		textLabel.Text = tostring(i);
		textLabel.TextColor3 = Color3.fromRGB(255, 255, 255);
		textLabel.TextScaled = true;
		textLabel.Font = Enum.Font.SourceSansBold;
		textLabel.Parent = billboardGui;

		// 10秒后删除路径点
		// task.delay(10, () => {
		//     if (part && part.Parent) {
		//         part.Destroy()
		//     }
		// })
	}
}
