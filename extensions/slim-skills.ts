/**
 * slim-skills — shrinks the <available_skills> block in the system prompt.
 *
 * The default prompt dumps every skill's full multi-line description + absolute
 * path, which balloons the prompt by ~71 KB for 163 skills.
 *
 * This extension rewrites it to a compact list:
 *   - name [scope]: one-line trigger hint
 *
 * It keeps enough path information for the model to resolve skill files:
 *   - project-local skills: .pi/skills/<name>/SKILL.md
 *   - global skills: ~/.agents/skills/<name>/SKILL.md
 *   - nonstandard skills: explicit compact path
 *
 * Saves most of the prompt bloat without hiding where skills live.
 */
import { homedir } from "node:os";
import { relative } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type SkillEntry = {
  name: string;
  hint: string;
  pathHint: string;
};

function normalizeSkillFile(location: string) {
  const trimmed = location.trim().replace(/\\/g, "/");
  if (!trimmed) return trimmed;
  return trimmed.endsWith("/SKILL.md") ? trimmed : `${trimmed}/SKILL.md`;
}

function getPathHint(skillFile: string, name: string) {
  const home = homedir().replace(/\\/g, "/");
  const globalSkill = `${home}/.agents/skills/${name}/SKILL.md`;

  if (skillFile === globalSkill) return "global @ ~/.agents/skills/<name>/SKILL.md";

  const localSuffix = `/.pi/skills/${name}/SKILL.md`;
  if (skillFile.endsWith(localSuffix)) return "project @ .pi/skills/<name>/SKILL.md";

  if (skillFile.startsWith(home + "/")) return `read ${skillFile.replace(home, "~")}`;

  return `read ${relative(process.cwd(), skillFile) || skillFile}`;
}

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event, _ctx) => {
    const prompt = event.systemPrompt;
    if (!prompt) return;

    const startTag = "<available_skills>";
    const endTag = "</available_skills>";
    const startIdx = prompt.indexOf(startTag);
    const endIdx = prompt.indexOf(endTag);
    if (startIdx === -1 || endIdx === -1) return;

    const skillsXml = prompt.slice(startIdx, endIdx + endTag.length);

    // Extract name + first sentence of description (capped at 100 chars)
    const skills: SkillEntry[] = [];
    const skillRegex =
      /<skill>\s*<name>(.*?)<\/name>\s*<description>([\s\S]*?)<\/description>\s*<location>(.*?)<\/location>\s*<\/skill>/g;

    let match;
    while ((match = skillRegex.exec(skillsXml)) !== null) {
      const name = match[1].trim();
      const rawDesc = match[2]
        .trim()
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#0?39;/g, "'");
      const firstSentence = rawDesc.split(/\.\s/)[0].replace(/\n/g, " ").trim();
      const hint =
        firstSentence.length > 100
          ? firstSentence.slice(0, 97) + "..."
          : firstSentence;
      const skillFile = normalizeSkillFile(match[3]);
      const pathHint = getPathHint(skillFile, name);
      skills.push({ name, hint, pathHint });
    }

    if (skills.length === 0) return;

    const lines = skills.map((s) => `- ${s.name} [${s.pathHint}]: ${s.hint}`);
    const compact = [
      "<available_skills>",
      "Skills provide specialized instructions for specific tasks.",
      "Use the read tool to load a skill's file when the task matches its description.",
      "Project-local skills live at .pi/skills/<name>/SKILL.md. Global skills live at ~/.agents/skills/<name>/SKILL.md.",
      "Prefer the project-local skill when both exist. When a skill file references a relative path, resolve it against the skill directory.",
      "",
      ...lines,
      "</available_skills>",
    ].join("\n");

    const newPrompt =
      prompt.slice(0, startIdx) + compact + prompt.slice(endIdx + endTag.length);

    const saved = prompt.length - newPrompt.length;
    console.error(
      `[slim-skills] ${skills.length} skills: ${(prompt.length / 1024).toFixed(1)} KB → ${(newPrompt.length / 1024).toFixed(1)} KB (saved ${(saved / 1024).toFixed(1)} KB)`
    );

    return { systemPrompt: newPrompt };
  });
}
