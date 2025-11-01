import type { App, Plugin } from "@white-dragon-bevy/bevy_framework";
import { BuiltinSchedules } from "@white-dragon-bevy/bevy_framework";

import { pathCalculateSystem } from "./systems/path-calculate-system";

export class PathPlugin implements Plugin {
	/**
	 * 构建插件
	 *
	 * @param app - 应用实例
	 */
	build(app: App): void {
		app.editSchedule(BuiltinSchedules.UPDATE, (schedule) => {
			schedule.addSystem({
				name: "pathCalculateSystem",
				system: pathCalculateSystem,
			});
		});
	}

	/**
	 * 获取插件名称
	 *
	 * @returns 插件名称
	 */
	name(): string {
		return "PathPlugin";
	}

	/**
	 * 插件是否唯一
	 *
	 * @returns True 表示只能添加一次
	 */
	isUnique(): boolean {
		return true;
	}
}
