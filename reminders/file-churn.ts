/**
 * Remind the agent when it keeps editing the same file repeatedly.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	const editCounts = new Map<string, number>();
	let worstFile = "";
	let worstCount = 0;

	pi.on("tool_result", async (event) => {
		if (event.toolName === "edit" && !event.isError) {
			const filePath = (event.input as any)?.path;
			if (filePath) {
				editCounts.set(filePath, (editCounts.get(filePath) ?? 0) + 1);
			}
		}
	});

	return {
		on: "tool_execution_end",
		when: () => {
			const worst = [...editCounts.entries()].sort((a, b) => b[1] - a[1])[0];
			if (!worst || worst[1] < 22) return false;
			[worstFile, worstCount] = worst;
			editCounts.set(worstFile, 0);
			return true;
		},
		message: () => `You've edited ${worstFile} ${worstCount} times. Step back and consider a different approach.`,
		cooldown: 14,
	};
}
