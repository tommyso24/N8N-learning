#!/usr/bin/env node
/**
 * SKILL.md → skill JSON 翻译器
 *
 * 用法:
 *   node scripts/translate.mjs <skill-name>      # 翻译单个 skill
 *   node scripts/translate.mjs --all             # 翻译所有 T1 + T2 + T3 已分类的 skill
 *   node scripts/translate.mjs --list            # 列出所有 ~/.claude/skills/ 下的 skill 及其归类
 *
 * 输出: /Users/supeng/coding/N8N-leaning/skills-registry/<name>.json
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const SKILLS_DIR = path.join(os.homedir(), ".claude", "skills");
const REGISTRY_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
  "skills-registry",
);

// ----- 分级规则 ---------------------------------------------------------------
// 把 30+ skill 按"能不能在 n8n 中复现 + 复现难度"分四档。
// 这份名单就是 docs/skill-tiers.md 的源数据。
const CLASSIFICATION = {
  // T1 = 纯提示词，无脚本/无外部副作用，直接抽 SKILL.md 正文当 system_prompt
  T1: {
    skills: [
      "andrej-karpathy-perspective",
      "elon-musk-perspective",
      "feynman-perspective",
      "ilya-sutskever-perspective",
      "mrbeast-perspective",
      "munger-perspective",
      "naval-perspective",
      "paul-graham-perspective",
      "steve-jobs-perspective",
      "sun-yuchen-perspective",
      "taleb-perspective",
      "trump-perspective",
      "x-mastery-mentor",
      "zhang-yiming-perspective",
      "zhangxuefeng-perspective",
    ],
    default_model: "deepseek-v4-flash",
    default_provider: "deepseek",
    tools_needed: [],
  },

  // T2 = 提示词 + 联网工具，n8n 中需要前置 WebSearch / HTTP 节点
  T2: {
    skills: ["khazix-writer", "aihot"],
    default_model: "deepseek-v4-flash",
    default_provider: "deepseek",
    tools_needed: ["web_search"],
  },

  // T3 = 提示词 + 脚本 + 文件副作用，n8n 中需要拆解工作流
  T3: {
    skills: ["hv-analysis", "huashu-nuwa"],
    default_model: "deepseek-v4-flash",
    default_provider: "deepseek",
    tools_needed: ["web_search", "file_output"],
  },

  // Skip = Claude Code 内部插件 / 非 skill 仓库，不在 n8n 中复现
  SKIP: {
    skills: [
      "ask",
      "autonew",
      "all-plan",
      "continue",
      "cping",
      "file-op",
      "khazix-skills-repo", // 外部 prompts 仓库，无 SKILL.md
      "mounted",
      "neat-freak",
      "pend",
      "review",
      "tp",
      "tr",
    ],
  },
};

function classifySkill(name) {
  for (const [tier, info] of Object.entries(CLASSIFICATION)) {
    if (info.skills.includes(name)) return { tier, ...info };
  }
  return { tier: "UNCLASSIFIED" };
}

// ----- frontmatter parsing ---------------------------------------------------
function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) {
    return { frontmatter: {}, body: raw };
  }
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { frontmatter: {}, body: raw };

  const fmRaw = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).trimStart();

  // 极简 YAML 解析：足以应付 SKILL.md 里的 name / description 两个字段，
  // description 可能是多行（pipe 或缩进延续）。不引第三方依赖。
  const frontmatter = {};
  const lines = fmRaw.split("\n");
  let currentKey = null;
  let currentValue = [];
  let inBlockScalar = false;

  const flush = () => {
    if (currentKey) {
      const joined = currentValue.join("\n").trim();
      frontmatter[currentKey] = joined;
    }
  };

  for (const line of lines) {
    const keyMatch = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (keyMatch && !line.startsWith(" ") && !line.startsWith("\t")) {
      flush();
      currentKey = keyMatch[1];
      const rest = keyMatch[2];
      if (rest === "|" || rest === ">") {
        inBlockScalar = true;
        currentValue = [];
      } else {
        inBlockScalar = false;
        currentValue = rest ? [rest] : [];
      }
    } else if (currentKey) {
      // 块标量延续或多行 description
      currentValue.push(line.replace(/^\s{2}/, ""));
    }
  }
  flush();

  return { frontmatter, body };
}

// ----- 主流程 -----------------------------------------------------------------
function translate(skillName) {
  const skillPath = path.join(SKILLS_DIR, skillName, "SKILL.md");
  if (!fs.existsSync(skillPath)) {
    throw new Error(`SKILL.md not found: ${skillPath}`);
  }
  const raw = fs.readFileSync(skillPath, "utf8");
  const { frontmatter, body } = parseFrontmatter(raw);
  const classification = classifySkill(skillName);

  if (classification.tier === "SKIP") {
    console.log(`[skip] ${skillName} → 标记为 Claude Code 内部插件，不翻译`);
    return null;
  }
  if (classification.tier === "UNCLASSIFIED") {
    console.warn(
      `[warn] ${skillName} → 未在 CLASSIFICATION 中归类，按 T1 处理（请在 translate.mjs 中补充）`,
    );
  }

  // 检查 references / scripts 子目录，提示 T2/T3 是否有额外资源未处理
  const skillRoot = path.join(SKILLS_DIR, skillName);
  const extras = fs
    .readdirSync(skillRoot)
    .filter((n) => {
      try {
        return fs.statSync(path.join(skillRoot, n)).isDirectory();
      } catch {
        return false;
      }
    });

  const skill = {
    name: skillName,
    tier: classification.tier === "UNCLASSIFIED" ? "T1" : classification.tier,
    version: new Date().toISOString().slice(0, 10),
    description: (frontmatter.description || "").replace(/\s+/g, " ").trim(),
    system_prompt: body.trim(),
    tools_needed: classification.tools_needed || [],
    default_provider: classification.default_provider || "deepseek",
    default_model: classification.default_model || "deepseek-v4-flash",
    has_extras: extras.length > 0 ? extras : undefined,
    source: `~/.claude/skills/${skillName}/SKILL.md`,
    notes: extras.length
      ? `子目录: ${extras.join(", ")} —— 这些资源未自动转译，需要在 n8n 工作流中手动映射`
      : "纯提示词，无外部资源",
  };

  const outPath = path.join(REGISTRY_DIR, `${skillName}.json`);
  fs.writeFileSync(outPath, JSON.stringify(skill, null, 2) + "\n", "utf8");
  console.log(
    `[${skill.tier}] ${skillName} → skills-registry/${skillName}.json (prompt ${skill.system_prompt.length} chars)`,
  );
  return skill;
}

// ----- CLI -------------------------------------------------------------------
const arg = process.argv[2];

if (!arg || arg === "--help" || arg === "-h") {
  console.log(`Usage:
  node scripts/translate.mjs <skill-name>   翻译单个 skill
  node scripts/translate.mjs --all          翻译所有 T1/T2/T3 已分级的 skill
  node scripts/translate.mjs --list         列出 ~/.claude/skills/ 下的 skill 归类
`);
  process.exit(0);
}

if (arg === "--list") {
  const all = fs
    .readdirSync(SKILLS_DIR)
    .filter((name) => {
      try {
        // 跟随符号链接（有些 skill 是 symlink 到 ~/.agents/skills/）
        return fs.statSync(path.join(SKILLS_DIR, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();

  console.log(`所有 ~/.claude/skills/ 下的 skill (${all.length} 个)：\n`);
  for (const n of all) {
    const c = classifySkill(n);
    console.log(`  [${c.tier.padEnd(13)}] ${n}`);
  }
  process.exit(0);
}

if (arg === "--all") {
  const targets = [
    ...CLASSIFICATION.T1.skills,
    ...CLASSIFICATION.T2.skills,
    ...CLASSIFICATION.T3.skills,
  ];
  let ok = 0;
  let fail = 0;
  for (const n of targets) {
    try {
      const r = translate(n);
      if (r) ok++;
    } catch (e) {
      console.error(`[fail] ${n}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n完成：${ok} 个翻译成功，${fail} 个失败。`);
  process.exit(fail ? 1 : 0);
}

translate(arg);
