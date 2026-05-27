# N8N × Claude Skills

> 把 `~/.claude/skills/` 下的私人 skills 翻译成 n8n 能消费的格式，借助 n8n（部署在 Elestio VPS 上）做成可前端调用、可飞书触发、可多模型切换的工作流系统。

## 项目结构

```
N8N-leaning/
├── README.md                       # 本文件
├── skills-registry/                # 翻译后的 skill JSON（自动生成，不要手改）
│   ├── steve-jobs-perspective.json
│   ├── ...                         # 19 个 skill：15 个 T1 + 2 个 T2 + 2 个 T3
├── scripts/
│   └── translate.mjs               # SKILL.md → JSON 翻译器
├── workflows/                      # n8n 工作流导出（从 n8n UI 里 Save → Export 得到）
│   ├── 01-perspective-single.json
│   ├── 02-perspective-committee.json
│   ├── 03-research-to-article.json
│   └── 04-feishu-bot.json
└── docs/
    ├── skill-tiers.md              # T1/T2/T3/Skip 分级与移植笔记
    ├── providers-setup.md          # 6 家 LLM 厂商的接入配置
    ├── feishu-bot-setup.md         # （Stage 4 时再补）
    └── n8n-learning-notes.md       # n8n 学习笔记
```

## 学习路线（4 个 Stage，由易到难）

| Stage | 工作流 | n8n 知识点 | 状态 |
|---|---|---|---|
| **M0** | 仓库骨架 + skill 翻译器 | — | ✅ 完成 |
| **Stage 1** | 单 perspective 问答（Form 表单 + 多模型切换） | Trigger / Expression / Credentials / HTTP Request / Switch / Merge | ⏳ 下一步 |
| **Stage 2** | 多 perspective 委员会（并行 5 路 + 综合） | Code / Loop / Aggregate / 并行执行 | — |
| **Stage 3** | 研究 → 写作流水线（hv-analysis + khazix-writer + 落 Notion） | 多步链 / IF / Tavily / Notion API | — |
| **Stage 4** | 飞书 bot（@bot + 问题 → 在线程里回复） | Webhook / Execute Workflow / OAuth2 | — |

完整阶段设计见 `/Users/supeng/.claude/plans/skills-n8n-skills-n8n-skills-n8n-n8n-sk-woolly-flask.md`。

## Skill 翻译

### 当前状态

跑一次列出所有 skill 的归类：
```bash
node scripts/translate.mjs --list
```

把所有 T1/T2/T3 skill 翻译成 JSON：
```bash
node scripts/translate.mjs --all
```

单独翻译一个：
```bash
node scripts/translate.mjs steve-jobs-perspective
```

### 分级

- **T1（15 个）**：纯角色扮演 perspective，无副作用 → 直接抽 SKILL.md 正文当 system_prompt
- **T2（2 个）**：khazix-writer / aihot → 需要前置联网搜索
- **T3（2 个）**：hv-analysis / huashu-nuwa → 拆解工作流到多个 n8n 节点，部分功能裁剪
- **Skip（13 个）**：Claude Code 内部插件，不在 n8n 复现

详见 `docs/skill-tiers.md`。

## 多模型架构

每家 LLM 厂商一条独立 n8n credential。工作流里用 Switch 节点按 `provider` 字段分发到 6 路 HTTP Request：

| provider | 默认模型 | 当前状态 |
|---|---|---|
| deepseek | deepseek-chat | ✅ 已有 key（**默认**） |
| openai | gpt-4o | ⏳ 槽位待填 |
| anthropic | claude-opus-4-5 | ⏳ 槽位待填 |
| gemini | gemini-2.0-pro | ⏳ 槽位待填 |
| kimi | moonshot-v1-32k | ⏳ 槽位待填 |
| minimax | abab6.5-chat | ⏳ 槽位待填 |

**新增/换 key 的流程**：去 n8n credentials 面板填入新厂商的 key 即可启用，工作流不用动。

具体配置见 `docs/providers-setup.md`。

## Skill 分发

skill JSON 不直接放在 n8n VPS 上（部署在 Elestio，访问不到本地文件）。流程：

1. 本地跑 `translate.mjs` 生成 `skills-registry/*.json`
2. `git push` 到 GitHub 仓库
3. n8n 工作流里用 HTTP Request 拉 `https://raw.githubusercontent.com/<user>/<repo>/main/skills-registry/<skill>.json`
4. 改 skill 内容 → 改 SKILL.md → 重跑 translate → 推 GitHub → n8n 下次执行自动用新版本

## 下一步

跑通 Stage 1：
1. 在 n8n UI 里建工作流 `01-perspective-single`
2. 按 `docs/providers-setup.md` 配 deepseek credential
3. 跟着即将提供的"Stage 1 搭建步骤"一步步连节点
4. 跑通后从 n8n Export → 保存到 `workflows/01-perspective-single.json`

## 完整规划

参见 `/Users/supeng/.claude/plans/skills-n8n-skills-n8n-skills-n8n-n8n-sk-woolly-flask.md`。
