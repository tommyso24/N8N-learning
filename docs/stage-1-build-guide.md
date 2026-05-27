# Stage 1 搭建指南：单 perspective 问答（Hello n8n）

> 目标：在 Elestio 上的 n8n UI 里搭出 `01-perspective-single` 工作流，能从 Form 表单选 skill + provider，调 LLM，返回回答。
>
> 预计耗时：2-3 小时（含配 credential、调试）

---

## 0. 前置准备（5 分钟）

### 0.1 把 skills-registry 推到 GitHub

n8n 在 VPS 上拿不到本地文件，必须通过 HTTPS 拉。

```bash
cd /Users/supeng/coding/N8N-leaning
git init
git add .
git commit -m "init: skills registry M0"

# 在 GitHub 上建一个仓库（建议私有也行，但 n8n 拉 raw 需要 token；建议公开）
# 假设叫 N8N-leaning，用户名是 yourname
git remote add origin git@github.com:yourname/N8N-leaning.git
git push -u origin main
```

推完之后，记下 raw URL 模板：
```
https://raw.githubusercontent.com/<yourname>/N8N-leaning/main/skills-registry/<skill>.json
```

如果是**私有仓库**，要么改成 GitHub PAT 认证，要么改用一个公开的 gist/repo。最简单是用公开仓库（skill 内容本身就是用来分享的）。

### 0.2 拿到 Deepseek API key

去 https://platform.deepseek.com/ → 注册 → API Keys → Create new secret key。复制下来。

---

## 1. 在 n8n 里加 Deepseek credential（5 分钟）

1. 登录 Elestio 上的 n8n UI
2. 左侧菜单 → **Credentials** → 右上角 **Add Credential**
3. 搜索并选 **Header Auth**
4. 填：
   - **Name**：`llm-deepseek`
   - **Header Name**：`Authorization`
   - **Header Value**：`Bearer YOUR_DEEPSEEK_KEY`
5. 点 **Save**

> 其他 5 家厂商先不配，等 Stage 1 跑通且你有 key 之后再补。配置方式见 `docs/providers-setup.md`。

---

## 2. 新建工作流（2 分钟）

1. 左侧菜单 → **Workflows** → **+ Add Workflow**
2. 顶部命名为 `01-perspective-single`
3. 进入空白画布

---

## 3. 加节点：Form Trigger（10 分钟）

### 3.1 加节点

1. 点画布中央的 **+** → 选 **On form submission**（Form Trigger）

### 3.2 配置字段

在右侧面板：

- **Form Title**：`Perspective 问答`
- **Form Description**：`选一个 skill 和模型，问一个问题`
- **Form Fields**（点 **Add Form Field** 加 4 个）：

| Field Label | Field Name | Field Type | Required | Field Options |
|---|---|---|---|---|
| 问题 | `question` | Textarea | ✅ | — |
| Skill | `skill` | Dropdown | ✅ | 选项列表见下 |
| Provider | `provider` | Dropdown | ✅ | `deepseek`（默认）/ `openai` / `anthropic` / `gemini` / `kimi` / `minimax` |
| Model（可选覆盖） | `model` | Text | ❌ | 留空时用 provider 默认模型 |

**Skill 下拉的 15 个 T1 选项**（复制粘贴）：
```
steve-jobs-perspective
elon-musk-perspective
munger-perspective
naval-perspective
taleb-perspective
feynman-perspective
paul-graham-perspective
andrej-karpathy-perspective
ilya-sutskever-perspective
mrbeast-perspective
zhang-yiming-perspective
zhangxuefeng-perspective
sun-yuchen-perspective
trump-perspective
x-mastery-mentor
```

### 3.3 保存 + 测试触发器

- 点节点右上角 **Listen for Test Event**
- n8n 会给一个测试 URL，复制到浏览器打开
- 填一个测试输入 → 点 Submit
- 回到 n8n，看节点底部能不能看到提交的数据

---

## 4. 加节点：HTTP Request 拉 skill JSON（10 分钟）

### 4.1 加节点

在 Form Trigger 右侧点 **+** → 搜 **HTTP Request** → 选第一个

### 4.2 配置

- **Method**：`GET`
- **URL**：把 `<yourname>` 替换成你的 GitHub 用户名
  ```
  https://raw.githubusercontent.com/<yourname>/N8N-leaning/main/skills-registry/{{ $json.skill }}.json
  ```
- **Authentication**：`None`
- **Response Format**：`JSON`（n8n 会自动 parse）

### 4.3 测试

- 点 **Execute Step**（节点上方播放图标）
- 应该看到下方输出有 `system_prompt`、`description`、`tier` 等字段

> 如果报 404，检查：repo 是否 public、文件路径是否正确、分支是否叫 main。

---

## 5. 加节点：Switch 按 provider 分发（10 分钟）

### 5.1 加节点

HTTP Request 右侧 **+** → 搜 **Switch**

### 5.2 配置

- **Mode**：`Rules`
- **Data Type**：`String`
- **Value 1**（上面这条是用于比较的源值）：`{{ $('Form Trigger').item.json.provider }}`
- 添加 6 条 **Routing Rules**（每条 Operation = `is equal to`）：

| Output | Value 2 |
|---|---|
| 0 | `deepseek` |
| 1 | `openai` |
| 2 | `anthropic` |
| 3 | `gemini` |
| 4 | `kimi` |
| 5 | `minimax` |

> **Fall Back Output**：选 `Output 0`（默认走 deepseek，避免拼错字时整个流崩）

---

## 6. 加节点：HTTP Request 调 Deepseek（输出 0）（15 分钟）

### 6.1 加节点

Switch 节点的 **Output 0** 接出来 → 加 **HTTP Request**

### 6.2 配置

- **Method**：`POST`
- **URL**：`https://api.deepseek.com/v1/chat/completions`
- **Authentication**：`Generic Credential Type` → **Header Auth** → 选 `llm-deepseek`
- **Send Body**：✅
- **Body Content Type**：`JSON`
- **Specify Body**：`Using JSON`
- **JSON Body**：
  ```
  ={
    "model": {{ $('Form Trigger').item.json.model ? JSON.stringify($('Form Trigger').item.json.model) : '"deepseek-chat"' }},
    "messages": [
      { "role": "system", "content": {{ JSON.stringify($json.system_prompt) }} },
      { "role": "user",   "content": {{ JSON.stringify($('Form Trigger').item.json.question) }} }
    ],
    "stream": false
  }
  ```

> **关键技巧**：用 `JSON.stringify()` 包裹长文本，自动转义引号和换行。否则 skill 的 system_prompt 里有 `"` 会把 JSON 弄崩。

### 6.3 给节点改名

右键节点 → Rename → `Call Deepseek`（后面 5 路同理，便于辨认）

---

## 7. 其余 5 路（先不接，留出 stub）

Stage 1 的目标是先跑通默认 Deepseek 一路。其余 5 个 provider 等你买了 key 之后再补：

1. 从 Switch 的 Output 1-5 各接一个 HTTP Request
2. 命名 `Call OpenAI` / `Call Anthropic` / ...
3. 按 `docs/providers-setup.md` 里每家的 endpoint、credential、body 模板填
4. 现在可以先**全部留空**，或者只放一个占位 Set 节点输出 `{"error": "未配置"}`

---

## 8. 加节点：Set 统一抽取回答（10 分钟）

### 8.1 加节点

在 Deepseek HTTP 节点后 **+** → 搜 **Edit Fields**（旧名 Set）

### 8.2 配置

- **Mode**：`Manual Mapping`
- 添加一个 Field：
  - **Name**：`answer`
  - **Type**：`String`
  - **Value**：
    ```
    ={{
      $json.choices ? $json.choices[0].message.content
      : $json.content ? $json.content[0].text
      : $json.candidates ? $json.candidates[0].content.parts[0].text
      : 'No answer field found'
    }}
    ```
- **Include Other Input Fields**：❌（不要带其他字段，保持输出干净）

### 8.3 让其他 provider 也连到这个 Set 节点

n8n 节点可以"多入一出"——其余 5 路 HTTP Request 也连到同一个 Set 节点，自动多路汇合。

---

## 9. 加节点：Respond to Webhook（5 分钟）

Set 节点后 **+** → 搜 **Respond to Webhook**（如果是 Form Trigger 就是 "Form Trigger Response" 或者直接展示）

### 配置

- **Respond With**：`Text`
- **Response Body**：`{{ $json.answer }}`

> **Form Trigger 特殊处理**：n8n 的 Form Trigger 默认会自动展示工作流执行结果（不需要单独 Respond 节点）。你可以先不加，看默认效果。如果想自定义返回格式，再加 Respond 节点。

---

## 10. 端到端测试（10 分钟）

1. 工作流右上角 → **Save**
2. 切换 **Active**（右上角开关）打开
3. 回到 Form Trigger 节点 → 复制 **Production URL**（不是 Test URL）
4. 浏览器打开，填：
   - 问题：`我该不该 30 岁回老家考公？`
   - Skill：`steve-jobs-perspective`
   - Provider：`deepseek`
   - Model：留空
5. 提交 → 等 5-15 秒 → 应该看到一段 Jobs 语气的中文回答

### 调试 checklist

如果出错，按这个顺序排查：

| 现象 | 可能原因 |
|---|---|
| 拉 skill 报 404 | GitHub URL 错 / repo 没公开 / 文件名拼错 |
| Deepseek 报 401 | credential header 格式错（应该是 `Bearer xxx` 不是裸 key） |
| Deepseek 报 400 | body JSON 不合法——大概率 system_prompt 里有未转义字符。**确保用了 `JSON.stringify()`** |
| 表单提交无响应 | 工作流没 Active / Form URL 用错（Test vs Production） |
| 回答字段是 undefined | Set 节点的表达式路径错——去看 HTTP Request 输出的实际 JSON 结构 |

---

## 11. 导出工作流 JSON 到仓库

跑通后：

1. n8n UI 工作流右上角 ⋯ → **Download**
2. 把得到的 `01-perspective-single.json` 放到本地仓库 `workflows/` 下
3. `git commit && push`

这样你的工作流就版本控制了，下次坏了能还原。

---

## 12. 验收清单

✅ 跑通后应该满足：
- [ ] Form 表单能正常打开
- [ ] 切不同 skill → 收到的回答语气不同
- [ ] Provider=deepseek（默认）能跑通
- [ ] 切到其他没配置的 provider → 报清晰错误而不是工作流崩溃
- [ ] 工作流 JSON 导出并 commit 到 `workflows/`

---

## 然后呢？

跑通 Stage 1 后我们再开 Stage 2：多 perspective 委员会。
那个会用 **Code 节点** 把 perspectives 数组拆成多个 item 并行调 LLM，再用 **Aggregate** 合并。
