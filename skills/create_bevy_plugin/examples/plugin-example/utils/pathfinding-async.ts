import { PathfindingService } from "@rbxts/services";

export interface PathfindingResult {
	error?: string;
	path?: Path;
	success: boolean;
	waypoints?: PathWaypoint[];
}

/**
 * 异步寻路函数，等待寻路完成后再返回结果
 *
 * @param startPosition - 起始位置
 * @param targetPosition - 目标位置
 * @param params - 寻路参数
 * @param timeout - 超时时间（秒），默认5秒
 * @returns Promise<PathfindingResult>
 */
export async function computePathAsync(
	startPosition: Vector3,
	targetPosition: Vector3,
	params: AgentParameters,
	timeout = 5,
): Promise<PathfindingResult> {
	return new Promise<PathfindingResult>((resolve) => {
		const path = PathfindingService.CreatePath(params) as Path;

		// 启动异步寻路
		path.ComputeAsync(startPosition, targetPosition);

		// 设置超时
		const timeoutId = task.delay(timeout, () => {
			resolve({
				error: `寻路超时 (${timeout}秒)`,
				success: false,
			});
		});

		// 轮询检查寻路状态
		const checkStatus = () => {
			if (path.Status === Enum.PathStatus.Success) {
				task.cancel(timeoutId);
				const waypoints = path.GetWaypoints();
				resolve({
					path,
					success: true,
					waypoints,
				});
			} else if (path.Status === Enum.PathStatus.NoPath) {
				// 继续等待
				task.wait(0.01);
				checkStatus();
			} else {
				// 寻路失败
				task.cancel(timeoutId);
				resolve({
					error: `寻路失败，状态: ${path.Status}`,
					success: false,
				});
			}
		};

		// 开始检查状态
		checkStatus();
	});
}

/**
 * 带重试的异步寻路函数
 *
 * @param startPosition - 起始位置
 * @param targetPosition - 目标位置
 * @param params - 寻路参数
 * @param maxRetries - 最大重试次数，默认3次
 * @param retryDelay - 重试延迟（秒），默认0.5秒
 * @returns Promise<PathfindingResult>
 */
export async function computePathWithRetry(
	startPosition: Vector3,
	targetPosition: Vector3,
	params: AgentParameters,
	maxRetries = 3,
	retryDelay = 0.2,
): Promise<PathfindingResult> {
	let lastError = "";

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		const result = await computePathAsync(startPosition, targetPosition, params);

		if (result.success) {
			return result;
		}

		lastError = result.error || "未知错误";

		if (attempt < maxRetries) {
			task.wait(retryDelay);
		}
	}

	// 所有重试都失败了
	return {
		error: `寻路失败，已重试 ${maxRetries} 次。最后错误: ${lastError}`,
		success: false,
	};
}
