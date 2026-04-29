/**
 * Pre-run reminder for broad top-level filesystem discovery.
 *
 * Blocks the bad pattern of searching all of /Users/umang with find/xargs
 * to discover package names. The agent should first identify the relevant
 * project/subtree, then use scoped rg (or dedicated search tools) there.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

function isBroadFind(command: string) {
	const normalized = command.replace(/\s+/g, " ").trim();
	return (
		/\bfind\s+\/Users\/umang\b/.test(normalized) &&
		/(node_modules|package\.json|xargs|grep -l|\"name\"\s*:\s*\"cf\")/.test(normalized)
	);
}

export default function (pi: ExtensionAPI) {
	let lastCommand = "";
	let shouldFire = false;

	pi.on("tool_execution_start", async (event: any) => {
		if (event?.toolName !== "bash") return;
		const command = String(event?.args?.command ?? (event.input as any)?.command ?? "");
		if (isBroadFind(command)) {
			lastCommand = command;
			shouldFire = true;
		}
	});

	return {
		on: "tool_execution_start",
		when: ({ event }: any = {}) => {
			const command = String(event?.args?.command ?? (event?.input as any)?.command ?? "");
			if (event?.toolName === "bash" && isBroadFind(command)) {
				lastCommand = command;
				shouldFire = false;
				return true;
			}
			if (shouldFire) {
				shouldFire = false;
				return true;
			}
			return false;
		},
		message: () =>
			`Pre-run: do not run broad top-level find under /Users/umang for package discovery. This command is the wrong scope/format: ${lastCommand}. First go to the correct project path, then use scoped rg inside that subtree, e.g. rg '\"name\"\\s*:\\s*\"cf\"' -g package.json .`,
		cooldown: 10,
	};
}
