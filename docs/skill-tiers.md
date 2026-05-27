# Skill 分级与移植笔记

> 把 `~/.claude/skills/` 下的 31 个 skill 按"在 n8n 中复现的难度"分四档。
> 这份分类是 `scripts/translate.mjs` 里 `CLASSIFICATION` 表的源说明。

## 分级原则

每个 Claude Code skill 都由三部分组成：

| 部分 | 含义 | n8n 对应物 |
|---|---|---|
| **指令** | SKILL.md 的正文——角色设定、心智模型、工作流 | LLM 的 system prompt（无损迁移） |
| **工具** | WebSearch / 读文件 / 调脚本 | n8n 的 HTTP Request / Code / Execute Command / 原生集成节点 |
| **副作用** | 写 PDF / 落 Notion / 发邮件 / 修改文件 | n8n 的 destination 节点 |

按是否依赖后两者，分四档：

- **T1**：只有"指令"，纯角色扮演——直接抽 SKILL.md 正文当 system prompt
- **T2**：指令 + 联网工具——需要前置 WebSearch 节点
- **T3**：指令 + 脚本 + 副作用——需要把 SKILL.md 里的工作流拆解成多个 n8n 节点
- **Skip**：Claude Code 专属插件，无 n8n 对应场景

---

## 分级名单

### T1 · 纯提示词（15 个）

直接 SKILL.md 正文当 system_prompt，无任何外部依赖。

| Skill | 描述 |
|---|---|
| `andrej-karpathy-perspective` | Karpathy 视角，工程现实主义 |
| `elon-musk-perspective` | 马斯克视角，第一性原理 + 白痴指数 |
| `feynman-perspective` | 费曼视角，反 cargo cult |
| `ilya-sutskever-perspective` | Ilya 视角，AI 安全与研究品味 |
| `mrbeast-perspective` | MrBeast 视角，YouTube 内容方法论 |
| `munger-perspective` | 芒格视角，逆向思考 + Lollapalooza |
| `naval-perspective` | Naval 视角，杠杆 + specific knowledge |
| `paul-graham-perspective` | PG 视角，创业与写作 |
| `steve-jobs-perspective` | 乔布斯视角，产品哲学 |
| `sun-yuchen-perspective` | 孙宇晨视角，注意力经济与碰瓷 |
| `taleb-perspective` | 塔勒布视角，反脆弱 + 杠铃 |
| `trump-perspective` | 特朗普视角，谈判与传播 |
| `x-mastery-mentor` | X/Twitter 运营导师 |
| `zhang-yiming-perspective` | 张一鸣视角，全球化 + 组织 |
| `zhangxuefeng-perspective` | 张雪峰视角，专业选择与阶层 |

**移植成本**：低。每个 skill 一行 `node scripts/translate.mjs <name>`。

---

### T2 · 提示词 + 联网（2 个）

system_prompt 仍是 SKILL.md 正文，但**调用前需要前置 WebSearch 节点**把搜索结果注入到 user message 里。

| Skill | 联网用途 | n8n 实现 |
|---|---|---|
| `khazix-writer` | 公众号长文写作。SKILL.md 中包含 WebSearch 检索素材、查证事实的流程 | 流程：用户给主题 → Tavily/Serper 搜 5-10 条 → Set 节点拼成 research context → LLM (system=khazix-writer, user=主题+context) → 输出 |
| `aihot` | 拉 `aihot.virxact.com` 公开 REST API 拿 AI 资讯 | 流程：HTTP Request GET `https://api.aihot.virxact.com/...` → JSON → LLM (system=aihot, user=资讯 JSON) 整理成中文简报 |

**功能裁剪表**：

| skill 原有功能 | n8n 是否保留 | 说明 |
|---|---|---|
| `khazix-writer`：WebSearch | ✅ 保留 | 用 Tavily API 替代 |
| `khazix-writer`：风格 DNA / 长文结构 | ✅ 保留 | 都在 system_prompt 里 |
| `khazix-writer`：分章节多轮生成 | ⚠️ 简化 | 第一版只跑一次 LLM 出整稿；后续可加 Code 节点分段 |
| `aihot`：HTTP 拉 API | ✅ 保留 | n8n HTTP Request 节点直接做 |
| `aihot`：动态分类筛选 | ✅ 保留 | n8n Set/IF 节点实现 |

---

### T3 · 提示词 + 脚本 + 副作用（2 个）

SKILL.md 里写明了多步工作流、引用了 scripts/、最终要生成文件（PDF/JSON/Markdown）。在 n8n 中**不追求完全复现**，而是抓核心方法论、舍弃格式包装。

| Skill | 复杂点 | n8n 中怎么做 |
|---|---|---|
| `hv-analysis` | 横纵分析 + 调多次 WebSearch + 最终生成排版精美的 PDF | 保留"纵轴叙事 + 横轴对比 + 交叉洞察"分析框架（system_prompt），舍弃 PDF 排版 — 改成生成 Markdown 落到 Notion；如真要 PDF，加一个 Puppeteer/Gotenberg HTTP 节点单独处理 |
| `huashu-nuwa` | 女娲造人——基于人名调研生成新 skill。涉及深度 WebSearch、多轮 LLM 调用、文件写入 | n8n 实现成本高，先不做工作流；这个 skill 留着自己手动在 Claude Code 里跑更合适 |

**功能裁剪表**：

| skill 原有功能 | n8n 是否保留 | 说明 |
|---|---|---|
| `hv-analysis`：纵轴时间线研究 | ✅ 保留 | 多轮 WebSearch + LLM 总结 |
| `hv-analysis`：横轴竞品对比 | ✅ 保留 | 多轮 WebSearch + LLM 表格化 |
| `hv-analysis`：交叉洞察 | ✅ 保留 | 第三次 LLM 调用合并前两段 |
| `hv-analysis`：精美 PDF 排版 | ❌ 第一版舍弃 | 改成 Markdown 落 Notion；要 PDF 单独搭 |
| `huashu-nuwa`：模糊需求诊断 | ⚠️ 推迟 | 涉及多轮交互，n8n 表单适配差，先不做 |
| `huashu-nuwa`：6 维度并行调研 | ⚠️ 推迟 | 复杂度太高，等先掌握基础 n8n 概念后再回头看 |

---

### Skip · 不在 n8n 中复现（13 个）

这些是 Claude Code 的内部插件（CCB 异步协作框架的一部分、外部 prompts 仓库等），与 LLM 推理无关，不应移植到 n8n。

| Skill | 为什么跳过 |
|---|---|
| `ask` / `pend` / `cping` / `mounted` | CCB 异步消息协议，跨 AI provider 通信用，n8n 没有对应场景 |
| `autonew` / `continue` / `file-op` | CCB 文件/会话操作，依赖 ccb 二进制 |
| `tp` / `tr` / `all-plan` / `review` | AutoFlow 工作流插件，依赖 Claude Code 自己的 task 系统 |
| `neat-freak` | 项目文档清理 skill，需要直接读写本地代码，n8n 无法访问 |
| `khazix-skills-repo` | 外部 prompts 仓库，没有 SKILL.md，不是 skill 本身 |

---

## 翻译后的 JSON 结构

```json
{
  "name": "steve-jobs-perspective",
  "tier": "T1",
  "version": "2026-05-28",
  "description": "...frontmatter description...",
  "system_prompt": "...SKILL.md 正文，已剥 frontmatter...",
  "tools_needed": [],                    // T1=[] / T2=["web_search"] / T3=["web_search","file_output"]
  "default_provider": "deepseek",
  "default_model": "deepseek-chat",
  "has_extras": ["references"],          // 该 skill 有哪些子目录（references/scripts）
  "source": "~/.claude/skills/steve-jobs-perspective/SKILL.md",
  "notes": "..."
}
```

---

## 维护节奏

- 在本地编辑 SKILL.md → 跑 `node scripts/translate.mjs <name>` 重新生成 JSON
- 推到 GitHub（用 `scripts/push-registry.sh`，后续补）
- n8n 的 HTTP Request 节点下次执行就会拉到新版本（GitHub raw URL 有 5 分钟左右 CDN 缓存）
- 不要直接编辑 `skills-registry/*.json`——它们是生成产物

---

## 待补充

- [ ] `scripts/push-registry.sh`：一行命令把 `skills-registry/` 推到 GitHub repo
- [ ] T2 的 khazix-writer 在 n8n 中跑通后，把实际节点配置截图回填到这里
- [ ] T3 的 hv-analysis 在 n8n 中跑通后，把"功能裁剪表"的执行情况打钩
