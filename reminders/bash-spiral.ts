/**
 * Remind the agent to stop and rethink after consecutive bash failures.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	let consecutiveFailures = 0;

	pi.on("tool_result", async (event) => {
		if (event.toolName === "bash") {
			consecutiveFailures = event.isError ? consecutiveFailures + 1 : 0;
		}
	});

	return {
		on: "tool_execution_end",
		when: () => {
			if (consecutiveFailures < 3) return false;
			consecutiveFailures = 0;
			return true;
		},
		message: "3 consecutive bash failures. Stop, re-read the error messages, and rethink your approach.",
		cooldown: 10,
	};
}
