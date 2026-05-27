# N8N 学习笔记

> 在这个项目里逐步积累的 n8n 知识点。每跑通一个 Stage 就在对应章节补充。

## 核心概念速查

### 工作流（Workflow）
一组节点（Nodes）的有向连接。最左侧是 **Trigger 节点**（启动器），后面是处理节点。一个工作流只能有一个 Trigger。

### Trigger 类型
| Trigger | 用途 | 公网可达？ |
|---|---|---|
| **Manual Trigger** | 在 UI 里点"Execute Workflow"调试用 | 否 |
| **Form Trigger** | 自带表单 UI（文本/下拉/多选），生成可分享 URL | 是 |
| **Chat Trigger** | 聊天式 UI，类 ChatGPT | 是 |
| **Webhook** | 通用 HTTP POST 接收 | 是 |
| **Schedule** | Cron 定时 | — |
| **第三方触发器** | Gmail/Slack/Notion/飞书 事件 | 取决于平台 |

### 表达式语法

n8n 表达式用 `{{ ... }}` 包起来：

```
{{ $json.fieldName }}          # 当前节点输入数据的字段
{{ $('Node Name').item.json.x }}  # 指定上游节点的字段
{{ $now.toISO() }}             # 当前时间
{{ $env.MY_VAR }}              # 环境变量
{{ items.map(i => i.json.x).join(',') }}  # JS 表达式
```

### 凭证（Credentials）
所有 API key/token 都放 Credentials 面板，**不在工作流 JSON 里出现**。导出工作流分享给别人时，凭证不会一起导出（这是好事）。

常用类型：
- **Header Auth**：往请求头加 `Authorization: Bearer xxx`
- **Query Auth**：往 URL 加 `?key=xxx`
- **Generic Credential Type**：完全自定义
- **OAuth2**：标准三方授权

### HTTP Request 节点
最通用的"调外部 API"节点。关键字段：
- **Method**：GET / POST / PUT / DELETE
- **URL**：可以用表达式动态拼
- **Authentication**：选 Predefined / Generic（用上面的 Credential）
- **Send Headers** / **Send Body**：手动配 header / body
- **Body Content Type**：JSON / Form / Raw

### Set 节点
重命名/裁剪/计算字段。新手最容易忽略但极有用——可以把上游不同结构的 JSON 统一成一个干净的形状再传下去。

### Switch / IF 节点
- **IF**：只有 true/false 两路
- **Switch**：多路分发（按字符串 / 数字 / 表达式）

### Merge 节点
把多路输入合并成一路。Mode 决定合并策略：
- **Append**：所有 item 拼起来
- **Combine**：按字段 join
- **Merge by Position**：按顺序对齐合并

### Loop / Split In Batches
处理数组：把一个 item 里的数组字段拆成多个 item 逐个处理。注意 n8n 默认就是 item-wise 执行的——大多数节点接收 N 个 item 会自动跑 N 次。

### Execute Workflow 节点
调子工作流——把别的 workflow 当函数用。Stage 4 飞书 bot 会复用 Stage 1 的 perspective 子工作流。

---

## 调试技巧

1. **点 trigger 节点右上角 "Execute Workflow"**：跑一次完整流，每个节点的输入/输出在节点底部可点开看
2. **单节点跑**：在节点上右键 → "Execute Step"，只跑这个节点（用上游的最近一次输入）
3. **Pin Data**：节点右键 → "Pin Data"，把输入固定下来，反复改下游不用每次重新跑上游
4. **Edit Output**：手动编辑某个节点的输出 JSON 来测试下游对各种输入的反应
5. **Executions 列表**：左侧菜单 → Executions，看历次执行记录（含失败）

---

## 常见坑（边踩边记）

### TODO（跑通 Stage 1 后回填）

- [ ] 表达式里嵌套引号怎么处理
- [ ] HTTP Request body 里换行符的处理
- [ ] Switch 节点 default 分支怎么配
- [ ] 用 Form Trigger 时，多行文本字段长度限制
- [ ] 飞书事件订阅的 URL 验证（n8n Webhook 默认不会回响应给飞书的 challenge）

---

## 每个 Stage 学到了什么

### Stage 1（待跑通）
预期学到：Trigger / Expression / Credentials / HTTP Request / Switch / Merge / Respond

### Stage 2（待跑通）
预期学到：Code 节点 / Loop / 并行 / Aggregate / Merge 模式

### Stage 3（待跑通）
预期学到：多步链 / IF 条件 / 第三方 SaaS 集成 / Set 节点变量整理

### Stage 4（待跑通）
预期学到：Webhook / Execute Workflow / OAuth2 / 复杂 payload 解析

---

## 推荐资源

- 官方文档：https://docs.n8n.io/
- 社区模板：https://n8n.io/workflows/（看别人的工作流是最好的学习方式）
- YouTube：搜 "n8n tutorial 2025"
- 中文社区：https://n8nchina.com/
