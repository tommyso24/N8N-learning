# LLM Providers Setup（在 n8n 中接入多家大模型）

> 设计原则：**每家厂商一条独立 credential**，工作流用 Switch 节点按 `provider` 字段分发。当前默认 = Deepseek（已有 key）。其余厂商把分支搭好、credential 槽位留好；将来买了 key 直接填入即可启用，工作流零改动。

---

## 6 个 provider 槽位总表

| provider | 默认模型 ID | endpoint | API 文档 | body 格式 | 当前状态 |
|---|---|---|---|---|---|
| **deepseek** | `deepseek-chat` | `https://api.deepseek.com/v1/chat/completions` | https://api-docs.deepseek.com/ | OpenAI 兼容 | ✅ **已有 key（默认）** |
| **openai** | `gpt-4o` | `https://api.openai.com/v1/chat/completions` | https://platform.openai.com/docs/api-reference | OpenAI 原生 | ⏳ 槽位待填 |
| **anthropic** | `claude-opus-4-5`（或更新版本） | `https://api.anthropic.com/v1/messages` | https://docs.anthropic.com/en/api/messages | Anthropic 专用（`system` 独立字段） | ⏳ 槽位待填 |
| **gemini** | `gemini-2.0-pro` | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | https://ai.google.dev/api/rest | Google 专用（`contents` 数组） | ⏳ 槽位待填 |
| **kimi** (moonshot) | `moonshot-v1-32k` | `https://api.moonshot.cn/v1/chat/completions` | https://platform.moonshot.cn/docs/api/chat | OpenAI 兼容 | ⏳ 槽位待填 |
| **minimax** | `abab6.5-chat` | `https://api.minimax.chat/v1/text/chatcompletion_v2` | https://platform.minimaxi.com/document/ChatCompletion | MiniMax 专用 | ⏳ 槽位待填 |

> **注意**：模型 ID 会随厂商发布而变化。这里写的是 2026 上半年的合理默认值，n8n 工作流里建议把 `model` 字段做成可填，由用户在表单里覆盖。

---

## 每家的 n8n credential 配置步骤

### 通用流程

1. 在 n8n 顶部菜单 → **Credentials** → **Add Credential**
2. 选 **Header Auth** 类型（除非该厂商已有原生节点）
3. 命名规范：`llm-<provider>`（例：`llm-deepseek`、`llm-anthropic`）
4. 配置 header（见下文每家具体值）

---

### 1. Deepseek（默认，已有 key）

- credential 类型：**Header Auth**
- credential 名：`llm-deepseek`
- Header Name：`Authorization`
- Header Value：`Bearer YOUR_DEEPSEEK_API_KEY`
- 注册：https://platform.deepseek.com/

**Body 模板（OpenAI 兼容）**：
```json
{
  "model": "{{ $json.model || 'deepseek-chat' }}",
  "messages": [
    { "role": "system", "content": "{{ $json.system_prompt }}" },
    { "role": "user",   "content": "{{ $json.question }}" }
  ],
  "stream": false
}
```

**回答抽取路径**：`{{ $json.choices[0].message.content }}`

---

### 2. OpenAI

- credential 类型：**Header Auth**（或用 n8n 原生 OpenAI 节点）
- credential 名：`llm-openai`
- Header Name：`Authorization`
- Header Value：`Bearer YOUR_OPENAI_API_KEY`
- 注册：https://platform.openai.com/

**Body 模板**：同 Deepseek（OpenAI 兼容）

**回答抽取路径**：`{{ $json.choices[0].message.content }}`

---

### 3. Anthropic（Claude）

- credential 类型：**Header Auth**
- credential 名：`llm-anthropic`
- **两个 header**：
  - `x-api-key`: `YOUR_ANTHROPIC_API_KEY`
  - `anthropic-version`: `2023-06-01`
- 注册：https://console.anthropic.com/

**Body 模板（注意 system 是独立字段，不是 messages 中的 role）**：
```json
{
  "model": "{{ $json.model || 'claude-opus-4-5' }}",
  "max_tokens": 4096,
  "system": "{{ $json.system_prompt }}",
  "messages": [
    { "role": "user", "content": "{{ $json.question }}" }
  ]
}
```

**回答抽取路径**：`{{ $json.content[0].text }}`

---

### 4. Google Gemini

- credential 类型：**Query Auth**（API key 通过 URL 参数传）
- credential 名：`llm-gemini`
- Query Param Name：`key`
- Query Param Value：`YOUR_GEMINI_API_KEY`
- 注册：https://aistudio.google.com/apikey

**URL 模板**（model 在路径里）：
```
https://generativelanguage.googleapis.com/v1beta/models/{{ $json.model || 'gemini-2.0-pro' }}:generateContent
```

**Body 模板（Gemini 用 contents 数组，没有 system 角色——把 system_prompt 拼在第一条 user 内容里）**：
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        { "text": "{{ $json.system_prompt }}\n\n---\n\n{{ $json.question }}" }
      ]
    }
  ],
  "generationConfig": {
    "maxOutputTokens": 4096
  }
}
```

**回答抽取路径**：`{{ $json.candidates[0].content.parts[0].text }}`

---

### 5. Kimi（Moonshot）

- credential 类型：**Header Auth**
- credential 名：`llm-kimi`
- Header Name：`Authorization`
- Header Value：`Bearer YOUR_MOONSHOT_API_KEY`
- 注册：https://platform.moonshot.cn/

**Body 模板**：同 Deepseek（OpenAI 兼容）
**回答抽取路径**：`{{ $json.choices[0].message.content }}`

---

### 6. MiniMax

- credential 类型：**Header Auth**
- credential 名：`llm-minimax`
- Header Name：`Authorization`
- Header Value：`Bearer YOUR_MINIMAX_API_KEY`
- 注册：https://www.minimaxi.com/

**Body 模板（MiniMax v2 接口，OpenAI 风格但字段名略不同）**：
```json
{
  "model": "{{ $json.model || 'abab6.5-chat' }}",
  "messages": [
    { "role": "system", "content": "{{ $json.system_prompt }}" },
    { "role": "user",   "content": "{{ $json.question }}" }
  ],
  "max_tokens": 4096
}
```

**回答抽取路径**：`{{ $json.choices[0].message.content }}`

> 注：MiniMax 历史上有过 v1/v2 不同接口，v2 比较贴近 OpenAI 风格。如果连不通，去 https://platform.minimaxi.com 查最新文档。

---

## 在 n8n 工作流里怎么用

### Switch 节点配置

n8n 的 **Switch** 节点按字段值分发：
- **Mode**：Expression
- **Output**：String
- **Value to switch on**：`{{ $json.provider }}`
- **Rules**：6 条 equals 规则 → deepseek / openai / anthropic / gemini / kimi / minimax 各一路

每路连一个 HTTP Request 节点（用对应 credential + endpoint + body 模板）。

6 路最终汇到一个 **Merge** 节点（Mode: `Combine` → `Merge by Position`），后接一个 **Set** 节点统一抽取回答字段（按 provider 走不同 JSON path），最后 **Respond to Webhook**。

### Set 节点（统一抽取回答）

| provider | 答案字段表达式 |
|---|---|
| deepseek / openai / kimi / minimax | `{{ $json.choices[0].message.content }}` |
| anthropic | `{{ $json.content[0].text }}` |
| gemini | `{{ $json.candidates[0].content.parts[0].text }}` |

为减少分支复杂度，可以在 Set 节点用一个三元表达式：
```
{{
  $json.choices ? $json.choices[0].message.content
  : $json.content ? $json.content[0].text
  : $json.candidates[0].content.parts[0].text
}}
```

---

## 验证清单

每加一家厂商，验证三件事：

1. credential 在 n8n 测试 → 200 OK（n8n credential 面板有个 "Test" 按钮）
2. 用最小输入跑一次 HTTP Request：system="你是一个测试助手"、user="说 hello" → 收到回答
3. 接到 Stage 1 工作流的 Switch 分支里，从表单选这个 provider → 端到端跑通

---

## 后续可能的优化（暂不做）

- **流式输出**：现在都用 non-streaming 模式。流式需要 n8n 的 SSE 支持，复杂度高。
- **重试与降级**：某家挂了自动切到 deepseek 兜底。要加 Error Trigger 子工作流。
- **token 计费打点**：把每次调用的 usage 字段记到一个数据库或 Sheet。
- **本地模型**（Ollama）：再加一路指向 `http://localhost:11434/api/chat`，但 Elestio 上的 n8n 访问不到本地 Ollama，需要 ngrok 或类似。
