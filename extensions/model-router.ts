import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

type RouteKey = "hard_reasoning" | "fast_code" | "frontend_design";

type RouteTarget = {
	provider: string;
	modelId: string;
	thinkingLevel: ThinkingLevel;
	reason: string;
};

type RouterState = {
	autoRoutingEnabled: boolean;
	lastRoute?: RouteKey;
};

const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"] as const;

const DEFAULT_ROUTES: Record<RouteKey, RouteTarget> = {
	hard_reasoning: {
		provider: "openai-codex",
		modelId: "gpt-5.4",
		thinkingLevel: "high",
		reason: "Best for hard reasoning, debugging, architecture, and thorny implementation work.",
	},
	fast_code: {
		provider: "openai-codex",
		modelId: "gpt-5.3-codex-spark",
		thinkingLevel: "low",
		reason: "Best for fast, cheap coding passes, quick edits, and compaction-friendly iteration.",
	},
	frontend_design: {
		provider: "anthropic",
		modelId: "claude-opus-4-5",
		thinkingLevel: "medium",
		reason: "Best for frontend design, UX exploration, polished copy, and creative ideation.",
	},
};

function currentModelText(ctx: ExtensionContext) {
	const model = ctx.model;
	if (!model) return "none";
	return `${model.provider}/${model.id}`;
}

function formatModel(model: any) {
	const cost = model.cost
		? ` | cost in/out ${model.cost.input ?? 0}/${model.cost.output ?? 0}`
		: "";
	const input = Array.isArray(model.input) ? model.input.join(",") : "text";
	return [
		`${model.provider}/${model.id}`,
		model.name && model.name !== model.id ? `name=${model.name}` : undefined,
		`reasoning=${Boolean(model.reasoning)}`,
		`input=${input}`,
		`context=${model.contextWindow ?? "?"}`,
		`maxTokens=${model.maxTokens ?? "?"}`,
		cost ? cost.trim() : undefined,
	]
		.filter(Boolean)
		.join(" | ");
}

function exampleSwitchParams(model: any) {
	return JSON.stringify(
		{
			provider: model.provider,
			modelId: model.id,
			thinkingLevel: model.reasoning ? "high" : "off",
		},
		null,
		2,
	);
}

function detectRoute(prompt: string): { route: RouteKey; confidence: "high" | "medium"; matched: string[] } | undefined {
	const text = prompt.toLowerCase();

	const hardReasoning = [
		"debug",
		"root cause",
		"architecture",
		"design a system",
		"complex",
		"hard",
		"deeply",
		"reason",
		"analyze",
		"investigate",
		"tradeoff",
		"refactor",
		"migration",
		"performance",
		"optimizer",
		"concurrency",
		"distributed",
		"race condition",
		"deadlock",
	];
	const fastCode = [
		"quick fix",
		"small change",
		"fast",
		"simple",
		"tiny",
		"one-liner",
		"patch",
		"minor",
		"just update",
		"rename",
		"cleanup",
		"compaction",
		"summarize",
		"boil down",
	];
	const frontendDesign = [
		"frontend",
		"design",
		"ui",
		"ux",
		"animation",
		"copy",
		"landing page",
		"hero",
		"visual",
		"layout",
		"polish",
		"brand",
		"style",
		"interaction",
		"aesthetic",
		"creative",
	];

	const match = (phrases: string[]) => phrases.filter((phrase) => text.includes(phrase));
	const hardMatches = match(hardReasoning);
	const fastMatches = match(fastCode);
	const frontendMatches = match(frontendDesign);

	if (hardMatches.length >= 2) return { route: "hard_reasoning", confidence: "high", matched: hardMatches };
	if (frontendMatches.length >= 2) return { route: "frontend_design", confidence: "high", matched: frontendMatches };
	if (fastMatches.length >= 2) return { route: "fast_code", confidence: "high", matched: fastMatches };

	if (hardMatches.length === 1) return { route: "hard_reasoning", confidence: "medium", matched: hardMatches };
	if (frontendMatches.length === 1) return { route: "frontend_design", confidence: "medium", matched: frontendMatches };
	if (fastMatches.length === 1) return { route: "fast_code", confidence: "medium", matched: fastMatches };

	return undefined;
}

export default function modelRouterExtension(pi: ExtensionAPI) {
	const state: RouterState = {
		autoRoutingEnabled: true,
	};

	async function trySwitchModel(
		ctx: ExtensionContext,
		provider: string,
		modelId: string,
		thinkingLevel?: ThinkingLevel,
	) {
		const model = ctx.modelRegistry.find(provider, modelId);
		if (!model) {
			return {
				ok: false,
				message: `Model not found: ${provider}/${modelId}`,
			};
		}

		const ok = await pi.setModel(model);
		if (!ok) {
			return {
				ok: false,
				message: `Model exists but is not available with current auth: ${provider}/${modelId}`,
			};
		}

		if (thinkingLevel) {
			pi.setThinkingLevel(thinkingLevel);
		}

		return {
			ok: true,
			message: `Active model set to ${provider}/${modelId}${thinkingLevel ? ` with thinking=${thinkingLevel}` : ""}`,
			model,
		};
	}

	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.setStatus("model-router", `router ${state.autoRoutingEnabled ? "auto:on" : "auto:off"} | ${currentModelText(ctx)}`);
	});

	pi.on("model_select", async (event, ctx) => {
		ctx.ui.setStatus(
			"model-router",
			`router ${state.autoRoutingEnabled ? "auto:on" : "auto:off"} | ${event.model.provider}/${event.model.id}`,
		);
	});

	pi.on("before_agent_start", async (event, ctx) => {
		if (!state.autoRoutingEnabled) return;

		const detected = detectRoute(event.prompt);
		if (!detected) return;
		if (detected.confidence !== "high") return;

		const target = DEFAULT_ROUTES[detected.route];
		const current = ctx.model;
		if (current && current.provider === target.provider && current.id === target.modelId) {
			if (pi.getThinkingLevel() !== target.thinkingLevel) {
				pi.setThinkingLevel(target.thinkingLevel);
			}
			return;
		}

		const result = await trySwitchModel(ctx, target.provider, target.modelId, target.thinkingLevel);
		if (!result.ok) {
			ctx.ui.notify(`Auto-route failed: ${result.message}`, "warning");
			return;
		}

		state.lastRoute = detected.route;
		ctx.ui.notify(`Auto-routed to ${target.provider}/${target.modelId}`, "info");
		return {
			systemPrompt:
				event.systemPrompt +
				`\n\n[model-router]\nAuto-routed this turn to ${target.provider}/${target.modelId} because the prompt matched ${detected.route} (${detected.matched.join(", ")}).`,
		};
	});

	pi.registerCommand("model-router", {
		description: "Show model router status and routing presets",
		handler: async (_args, ctx) => {
			const current = ctx.model;
			const lines = [
				`current: ${current ? `${current.provider}/${current.id}` : "none"}`,
				`thinking: ${pi.getThinkingLevel()}`,
				`autoRouting: ${state.autoRoutingEnabled ? "enabled" : "disabled"}`,
				`hard_reasoning -> ${DEFAULT_ROUTES.hard_reasoning.provider}/${DEFAULT_ROUTES.hard_reasoning.modelId}`,
				`fast_code -> ${DEFAULT_ROUTES.fast_code.provider}/${DEFAULT_ROUTES.fast_code.modelId}`,
				`frontend_design -> ${DEFAULT_ROUTES.frontend_design.provider}/${DEFAULT_ROUTES.frontend_design.modelId}`,
			];
			ctx.ui.notify(lines.join("\n"), "info");
		},
	});

	pi.registerCommand("model-router-auto", {
		description: "Enable or disable model auto-routing: /model-router-auto on|off",
		handler: async (args, ctx) => {
			const value = (args || "").trim().toLowerCase();
			if (value !== "on" && value !== "off") {
				ctx.ui.notify("Usage: /model-router-auto on|off", "warning");
				return;
			}
			state.autoRoutingEnabled = value === "on";
			ctx.ui.setStatus("model-router", `router ${state.autoRoutingEnabled ? "auto:on" : "auto:off"} | ${currentModelText(ctx)}`);
			ctx.ui.notify(`Model auto-routing ${state.autoRoutingEnabled ? "enabled" : "disabled"}`, "info");
		},
	});

	pi.registerTool({
		name: "get_current_model_info",
		label: "Get Current Model Info",
		description: "Show the active pi model, thinking level, exact switch parameters, and routing presets.",
		promptSnippet: "Inspect the current active model and get exact provider/modelId parameters for switching.",
		promptGuidelines: [
			"Use this tool when you need the active model, its capabilities, or the exact params to switch models.",
		],
		parameters: Type.Object({}),
		async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
			const current = ctx.model;
			if (!current) {
				return {
					content: [{ type: "text", text: "No active model." }],
					details: { current: null, thinkingLevel: pi.getThinkingLevel(), routes: DEFAULT_ROUTES },
				};
			}

			const text = [
				`Current model: ${formatModel(current)}`,
				`Thinking level: ${pi.getThinkingLevel()}`,
				`Exact params to pass to switch_model:`,
				exampleSwitchParams(current),
				`Route presets:`,
				`- hard_reasoning -> ${DEFAULT_ROUTES.hard_reasoning.provider}/${DEFAULT_ROUTES.hard_reasoning.modelId}`,
				`- fast_code -> ${DEFAULT_ROUTES.fast_code.provider}/${DEFAULT_ROUTES.fast_code.modelId}`,
				`- frontend_design -> ${DEFAULT_ROUTES.frontend_design.provider}/${DEFAULT_ROUTES.frontend_design.modelId}`,
			].join("\n");

			return {
				content: [{ type: "text", text }],
				details: {
					current,
					thinkingLevel: pi.getThinkingLevel(),
					exampleParams: {
						provider: current.provider,
						modelId: current.id,
						thinkingLevel: current.reasoning ? "high" : "off",
					},
					routes: DEFAULT_ROUTES,
				},
			};
		},
	});

	pi.registerTool({
		name: "list_available_models",
		label: "List Available Models",
		description: "List pi models that are currently available with configured auth, including capabilities and exact switch params.",
		promptSnippet: "Inspect available models and their provider/modelId pairs before switching.",
		promptGuidelines: [
			"Use this tool before switching models if you are unsure which provider/modelId is available.",
		],
		parameters: Type.Object({
			limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200, description: "Maximum number of models to return" })),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const available = await ctx.modelRegistry.getAvailable();
			const sorted = [...available].sort((a: any, b: any) => `${a.provider}/${a.id}`.localeCompare(`${b.provider}/${b.id}`));
			const limit = params.limit ?? 100;
			const sliced = sorted.slice(0, limit);
			const lines = sliced.map((model: any) => `${formatModel(model)}\nexample switch params:\n${exampleSwitchParams(model)}`);
			return {
				content: [{ type: "text", text: lines.join("\n\n") || "No available models found." }],
				details: {
					count: available.length,
					models: sliced.map((model: any) => ({
						provider: model.provider,
						id: model.id,
						name: model.name,
						reasoning: Boolean(model.reasoning),
						input: model.input,
						contextWindow: model.contextWindow,
						maxTokens: model.maxTokens,
						cost: model.cost,
						exampleParams: {
							provider: model.provider,
							modelId: model.id,
							thinkingLevel: model.reasoning ? "high" : "off",
						},
					})),
				},
			};
		},
	});

	pi.registerTool({
		name: "switch_model",
		label: "Switch Model",
		description: "Switch pi's active model by exact provider and modelId.",
		promptSnippet: "Change the active model using exact provider and modelId values.",
		promptGuidelines: [
			"Pass exact provider and modelId strings returned by list_available_models or get_current_model_info.",
		],
		parameters: Type.Object({
			provider: Type.String({ description: "Model provider, e.g. anthropic or openai-codex" }),
			modelId: Type.String({ description: "Exact model id, e.g. claude-opus-4-5 or gpt-5.4-codex" }),
			thinkingLevel: Type.Optional(
				StringEnum(THINKING_LEVELS, {
					description: "Optional thinking level to apply after switching",
				}),
			),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const result = await trySwitchModel(ctx, params.provider, params.modelId, params.thinkingLevel as ThinkingLevel | undefined);
			return {
				content: [{ type: "text", text: result.message }],
				details: {
					ok: result.ok,
					provider: params.provider,
					modelId: params.modelId,
					thinkingLevel: params.thinkingLevel ?? pi.getThinkingLevel(),
				},
			};
		},
	});

	pi.registerTool({
		name: "recommend_model_for_task",
		label: "Recommend Model For Task",
		description: "Recommend a model route for a task and optionally switch to it.",
		promptSnippet: "Choose a model route for hard reasoning, fast coding, or frontend/design tasks.",
		promptGuidelines: [
			"Use this tool when task complexity suggests switching models before continuing.",
		],
		parameters: Type.Object({
			task: Type.String({ description: "The user task or prompt to classify" }),
			autoSwitch: Type.Optional(Type.Boolean({ description: "If true, switch immediately when a route is found" })),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const detected = detectRoute(params.task);
			if (!detected) {
				return {
					content: [{ type: "text", text: "No strong route detected. Stay on the current model unless you have a specific preference." }],
					details: { detected: null },
				};
			}

			const target = DEFAULT_ROUTES[detected.route];
			let switchMessage: string | undefined;
			if (params.autoSwitch) {
				const result = await trySwitchModel(ctx, target.provider, target.modelId, target.thinkingLevel);
				switchMessage = result.message;
			}

			const text = [
				`Recommended route: ${detected.route}`,
				`Target model: ${target.provider}/${target.modelId}`,
				`Thinking level: ${target.thinkingLevel}`,
				`Why: ${target.reason}`,
				`Matched terms: ${detected.matched.join(", ")}`,
				switchMessage,
			]
				.filter(Boolean)
				.join("\n");

			return {
				content: [{ type: "text", text }],
				details: {
					detected,
					target,
					switched: Boolean(params.autoSwitch),
				},
			};
		},
	});
}
