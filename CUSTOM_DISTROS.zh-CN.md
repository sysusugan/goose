# goose 的自定义发行版

[English](./CUSTOM_DISTROS.md) | [简体中文](./CUSTOM_DISTROS.zh-CN.md)

> **提示：** 这类做法有时也叫作 “white labelling”，也就是基于开源项目为你的组织做一套带品牌或定制能力的版本。

> 这份中文文档旨在帮助你快速理解。如与英文版本存在差异，请以 [CUSTOM_DISTROS.md](./CUSTOM_DISTROS.md) 为准。

本文介绍如何创建适配你组织需求的 goose 自定义发行版，无论你的目标是预配置模型、集成自定义工具、定制品牌界面，还是构建全新的用户体验。

## 概览

goose 的架构天然支持扩展。组织可以创建“二次定制”的版本，用来：

- **预配置 AI provider**：内置指定模型（本地或云端）以及 API 凭证
- **打包自定义工具**：集成连接内部数据源的私有扩展
- **定制使用体验**：修改品牌、UI 和默认行为
- **面向特定人群**：为开发者、法务团队、设计团队等提供专用版本

## 架构速览

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interfaces                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  CLI        │  │  Desktop    │  │  Your Custom UI         │  │
│  │  (goose-cli)│  │  (Electron) │  │  (web, mobile, etc.)    │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    goose-server (goosed)                        │
│         REST API for all goose functionality                    │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Core (goose crate)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Providers  │  │  Extensions │  │  Config & Recipes       │  │
│  │  (AI models)│  │  (MCP tools)│  │  (behavior & defaults)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 关键定制点

| 你想做什么 | 应该看哪里 | 复杂度 |
|------------|------------|--------|
| 预配置模型/provider | `config.yaml`、`init-config.yaml`、环境变量 | 低 |
| 添加自定义 AI provider | `crates/goose/src/providers/declarative/` | 低 |
| 打包自定义 MCP 扩展 | `config.yaml` 的 extensions 部分、`ui/desktop/src/built-in-extensions.json`、`ui/desktop/src/components/settings/extensions/bundled-extensions.json` | 中 |
| 修改 system prompt | `crates/goose/src/prompts/` | 低 |
| 定制桌面端品牌 | `ui/desktop/`（图标、名称、颜色） | 中 |
| 构建新的 UI（Web、移动端） | 对接 `goose-server` REST API | 高 |
| 创建引导式工作流 | Recipes（基于 YAML 的任务定义） | 低 |
| 构建复杂多步骤工作流 | 使用带 sub-recipes 和 subagents 的 Recipes | 中 |

## 快速开始

### 1. Fork 并克隆

```bash
git clone https://github.com/YOUR_ORG/goose.git
cd goose
```

### 2. 选择你的定制策略

- **仅配置**：修改配置文件和环境变量，不改代码
- **基于扩展**：为你的工具增加自定义 MCP server，尽量少改核心
- **深度定制**：修改核心行为、UI，或者新增 provider

### 3. 构建并分发

不同平台的构建说明见 [BUILDING_LINUX.md](BUILDING_LINUX.md) 和 [ui/desktop/README.md](ui/desktop/README.md)。

## 重要注意事项

### License

goose 采用 Apache License 2.0（ASL v2）授权。自定义发行版需要：

- 包含原始许可证和版权声明
- 清晰说明你做过哪些修改
- 不要以会让人误解为官方背书的方式使用 “Goose” 商标

关于 ASL v2 合规要求的详细说明，可参考 [Apache License FAQ](https://www.apache.org/foundation/license-faq.html)。

### 回馈上游

你当然可以维护私有 fork，但把改进贡献回上游对所有人都有好处，也包括你自己的发行版。长期严重偏离上游的私有 fork 维护成本会越来越高，还会错过安全更新和新特性。比较推荐的做法是：把通用改进回馈上游，只把组织专属的定制保留在私有代码里。

### Telemetry

goose 内置了可选的 telemetry（通过 PostHog）来帮助改进项目。对于自定义发行版，你可以：

- **关闭 telemetry**：设置 `GOOSE_DISABLE_TELEMETRY=1`
- **使用自己的实例**：修改 `crates/goose/src/posthog.rs`，指向你自己的 PostHog 实例

### 跟进上游更新

为了持续获得上游改进，建议：

1. 定期把主仓库的更新同步到你的 fork
2. 尽量把定制隔离在配置文件、独立扩展仓库等位置
3. 优先用 recipes 做工作流定制，而不是直接改代码
4. 订阅 release 公告，及时关注 breaking changes

---

# 附录：自定义发行版场景

## A. 预配置本地模型的发行版

**目标**：发布一个已经配置好本地 Ollama 模型的 goose，用户不需要 API key 就能使用。

### 步骤

1. **在发行版根目录创建 `init-config.yaml`**：

```yaml
# init-config.yaml - 首次运行且本地还没有配置时会应用
GOOSE_PROVIDER: ollama
GOOSE_MODEL: qwen3-coder:latest
```

2. **在启动脚本或打包配置中设置环境默认值**：

```bash
export GOOSE_PROVIDER=ollama
export GOOSE_MODEL=qwen3-coder:latest
export OLLAMA_HOST=http://localhost:11434  # 或你的托管实例
```

3. **可选：在 UI 里隐藏 provider 选择**，修改 `ui/desktop/src/` 下对应组件。

### 技术细节

- Provider 配置：`crates/goose/src/config/base.rs`
- Ollama provider 实现：`crates/goose/src/providers/ollama.rs`
- 配置优先级：环境变量 → `config.yaml` → 默认值

---

## B. 带托管 API Key 的企业发行版

**目标**：在公司内部发放内置 API key 的 goose，默认接入某个 frontier model。

### 步骤

1. **使用 goose 的 secret 管理来存储 API key**：

```yaml
# config.yaml（随你的安装包一起分发）
GOOSE_PROVIDER: anthropic
GOOSE_MODEL: claude-sonnet-4-20250514
```

2. **在安装时注入 secret**，或通过 MDM/配置管理系统下发：

```bash
# Secrets 默认保存在系统 keyring 中；
# 如果 GOOSE_DISABLE_KEYRING=1，则保存在 ~/.config/goose/secrets.yaml
goose configure set-secret ANTHROPIC_API_KEY "your-corporate-key"
```

3. **可选：限制 provider 切换**，可以改 settings UI，或者通过 recipe 强制指定 provider。

### 技术细节

- Secret 存储：`crates/goose/src/config/base.rs`（`SecretStorage` enum）
- Keyring 集成：默认使用系统 keyring，也支持基于文件的 fallback
- 配置文件位置：`~/.config/goose/config.yaml`

---

## C. 面向内部数据源的自定义工具

**目标**：增加能够连接数据湖、内部 API 或专有系统的 MCP 扩展。

### 步骤

1. **按照 [MCP 规范](https://modelcontextprotocol.io/) 创建你的 MCP server**：

```python
# 示例：internal_data_mcp.py
from mcp.server import Server
from mcp.types import Tool

server = Server("internal-data")

@server.tool()
async def query_data_lake(query: str) -> str:
    """查询企业数据湖。"""
    # 在这里写你的实现
    return results
```

2. **作为内置扩展打包**，可添加到以下任一文件：
   - `ui/desktop/src/built-in-extensions.json`（展示在扩展 UI 中的核心内置扩展）
   - `ui/desktop/src/components/settings/extensions/bundled-extensions.json`（设置页里的 bundled extension 目录）

示例：

```json
{
  "id": "internal-data",
  "name": "Internal Data Lake",
  "description": "Query corporate data sources",
  "enabled": true,
  "type": "stdio",
  "cmd": "python",
  "args": ["/path/to/internal_data_mcp.py"],
  "env_keys": ["INTERNAL_DATA_API_KEY"],
  "timeout": 300
}
```

3. **或者以 recipe 的形式分发**，由 recipe 来启用扩展：

```yaml
# data-analyst.yaml
title: Data Analyst Assistant
description: goose configured for data analysis
instructions: |
  You have access to the corporate data lake. Help users query and analyze data.
extensions:
  - type: stdio
    name: internal-data
    cmd: python
    args: ["/opt/corp-goose/internal_data_mcp.py"]
    description: Corporate data lake access
```

### 技术细节

- 扩展类型：`crates/goose/src/agents/extension.rs`（`ExtensionConfig` enum）
- 内置 MCP servers：`crates/goose-mcp/`
- 扩展加载：`crates/goose/src/agents/extension_manager.rs`

---

## D. 自定义品牌和 UI

**目标**：将桌面应用重塑为符合你组织品牌识别的版本。

### 步骤

1. **替换视觉素材**，位置在 `ui/desktop/src/images/`：
   - `icon.png`、`icon.ico`、`icon.icns`：应用图标
   - 根据需要更新启动页和 logo

2. **修改应用元数据**，位置在 `ui/desktop/forge.config.ts`：

```typescript
// forge.config.ts
module.exports = {
  packagerConfig: {
    name: 'YourCompany AI Assistant',
    executableName: 'yourcompany-ai',
    icon: 'src/images/your-icon',
    // ...
  },
  // ...
};
```

3. **更新 system prompt**，让它体现你的品牌信息，位置在 `crates/goose/src/prompts/system.md`：

```markdown
You are an AI assistant called [YourName], created by [YourCompany].
...
```

4. **定制 `ui/desktop/src/` 下的 UI 组件**（React/TypeScript）：
   - CSS/Tailwind 中的配色
   - 组件文案和标签
   - 功能可见性

5. **在重品牌时统一打包和更新器命名**：
   - 更新 `ui/desktop/package.json`（`productName`、description）以及 Linux 桌面模板（`ui/desktop/forge.deb.desktop`、`ui/desktop/forge.rpm.desktop`）里的静态品牌信息

   - 保持构建/发布环境变量一致：
     - `GITHUB_OWNER` 和 `GITHUB_REPO` 用于 publisher 和 updater 的仓库定位
     - `GOOSE_BUNDLE_NAME` 用于 bundle/debug 脚本和 updater 资源命名（默认值为 `Goose`）

示例：

```bash
export GITHUB_OWNER="your-org"
export GITHUB_REPO="your-goose-fork"
export GOOSE_BUNDLE_NAME="InsightStream-goose"
```

6. **发布前使用这份品牌一致性检查清单**：
   - 应用元数据（`forge.config.ts`、`package.json`、`index.html`）都使用你的发行版名称
   - 发布产物名称和 updater 查找名称保持一致
   - 桌面启动器（Linux `.desktop` 模板）指向打包后实际生成的可执行文件名

### 技术细节

- Electron 配置：`ui/desktop/forge.config.ts`
- UI 入口：`ui/desktop/src/renderer.tsx`
- System prompts：`crates/goose/src/prompts/`

---

## E. 构建新界面（Web、移动端等）

**目标**：在沿用 goose 后端能力的前提下，构建全新的前端界面。

goose 提供了两种适合集成自定义 UI 的方式：

### 方案 1：REST API（goose-server）

对于基于 HTTP 的集成（Web 应用、简单客户端），可以直接使用 goose-server：

```bash
# 启动服务
./target/release/goosed

# API 地址：http://localhost:3000
```

**可用接口请参考 OpenAPI 规范**：`ui/desktop/openapi.json`

其中包括：
- Session 管理
- 消息流式返回
- Extension 控制
- 配置管理

最小集成常用的 **关键接口**：

```
POST /sessions              # 创建新 session
POST /sessions/{id}/messages # 发送消息（流式响应）
GET  /sessions/{id}         # 获取 session 状态
GET  /extensions            # 列出可用扩展
POST /extensions/{name}/enable  # 启用扩展
```

**处理流式响应**：goose 使用 Server-Sent Events（SSE）做实时响应推送。

### 方案 2：Agent Client Protocol（ACP）

如果你要做更丰富的集成（IDE、桌面应用、嵌入式 agent），可以使用 **Agent Client Protocol（ACP）**。它是一个基于 JSON-RPC 的标准协议，用于在 stdio 或其他传输通道上与 AI agent 通信。

ACP 提供：

- **双向通信**：agent 可以请求权限、流式返回更新、接收取消指令
- **丰富的工具调用处理**：每次工具调用都有详细状态、位置和内容
- **Session 管理**：创建、加载和恢复 session，并保留完整会话历史
- **MCP server 集成**：可以动态为 session 增加 MCP server

**以 ACP agent 模式启动 goose**：

```bash
# 在 stdio 上运行 goose ACP server
goose acp --with-builtin developer,memory

# 或通过 cargo 运行
cargo run -p goose-cli -- acp --with-builtin developer
```

**关键 ACP 方法**：

| 方法 | 说明 |
|------|------|
| `initialize` | 建立连接并交换能力声明 |
| `session/new` | 创建新 session，可附带 MCP servers |
| `session/load` | 按 ID 恢复已有 session |
| `session/prompt` | 发送 prompt，并接收流式响应 |
| `session/cancel` | 取消进行中的 prompt |

**示例：Python ACP client**（完整示例见 `test_acp_client.py`）：

```python
import subprocess
import json

class AcpClient:
    def __init__(self):
        self.process = subprocess.Popen(
            ['goose', 'acp', '--with-builtin', 'developer'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True
        )
    
    def send_request(self, method, params=None):
        request = {"jsonrpc": "2.0", "method": method, "id": 1}
        if params:
            request["params"] = params
        self.process.stdin.write(json.dumps(request) + "\n")
        self.process.stdin.flush()
        return json.loads(self.process.stdout.readline())

# 初始化并创建 session
client = AcpClient()
client.send_request("initialize", {"protocolVersion": "2025-01-01"})
session = client.send_request("session/new", {"cwd": "/path/to/project"})

# 发送 prompt（响应会以 notification 的形式流式返回）
client.send_request("session/prompt", {
    "sessionId": session["result"]["sessionId"],
    "prompt": [{"type": "text", "text": "List files in this directory"}]
})
```

**ACP 通知**（由 agent 发给 client）：

- `session/notification` 携带 `agentMessageChunk`：流式文本响应
- `session/notification` 携带 `toolCall`：工具调用开始
- `session/notification` 携带 `toolCallUpdate`：工具状态/结果更新
- `requestPermission`：agent 请求用户确认敏感操作

完整 ACP 规范可参考 [Agent Client Protocol documentation](https://github.com/anthropics/anthropic-cookbook/tree/main/misc/agent_client_protocol)。

### 技术细节

**REST API（goose-server）**：
- 服务端实现：`crates/goose-server/src/routes/`
- OpenAPI 生成：`just generate-openapi`
- API client 示例：`ui/desktop/src/api/`（生成的 TypeScript client）

**ACP**：
- ACP server 实现：`crates/goose-acp/src/server.rs`
- CLI 集成：`crates/goose-cli/src/cli.rs`（`Command::Acp`）
- 协议库：`sacp` crate（ACP 的 Rust 实现）
- 测试 client 示例：`test_acp_client.py`

---

## F. 面向特定受众的发行版（法务、设计等）

**目标**：为特定职业人群制作一版专用的 goose。

### 步骤

1. **创建一个定义完整体验的专用 recipe**：

```yaml
# legal-assistant.yaml
title: Legal Research Assistant
description: AI assistant for legal professionals

instructions: |
  You are a legal research assistant. You help lawyers and paralegals with:
  - Case law research
  - Document review and summarization
  - Contract analysis
  - Legal writing assistance
  
  Always cite sources. Flag when you're uncertain. Never provide actual legal advice.

extensions:
  - type: builtin
    name: developer
    description: File and document tools
  - type: stdio
    name: legal-database
    cmd: python
    args: ["/opt/legal-goose/legal_db_mcp.py"]
    description: Legal database search

activities:
  - "Research case law on..."
  - "Summarize this contract..."
  - "Find precedents for..."

settings:
  goose_provider: anthropic
  goose_model: claude-sonnet-4-20250514
```

2. **定制 UI**，只展示相关功能，并使用目标领域更自然的术语。

3. **打包领域专属扩展**，连接专门的数据源（如法律数据库、设计工具等）。

### 技术细节

- Recipe 格式：`crates/goose/src/recipe/mod.rs`
- Recipe 加载：`crates/goose/src/recipe/local_recipes.rs`
- Activity suggestions：在 UI 中显示为 quick-start prompts

---

## G. 添加自定义 AI Provider

**目标**：增加新的 AI provider，或者接入你自托管的模型端点。

### 方案 1：声明式 Provider（不改代码）

在 `~/.config/goose/custom_providers/` 下创建 JSON 文件，或者把它和你的发行版一起打包：

```json
{
  "name": "my_provider",
  "engine": "openai",
  "display_name": "My Custom Provider",
  "description": "Our internal LLM endpoint",
  "api_key_env": "MY_PROVIDER_API_KEY",
  "base_url": "https://llm.internal.company.com/v1/chat/completions",
  "models": [
    {
      "name": "company-llm-v1",
      "context_limit": 32768
    }
  ],
  "supports_streaming": true,
  "requires_auth": true
}
```

支持的 engine：`openai`、`anthropic`、`ollama`

### 方案 2：自定义 Provider（改代码）

如果你的 provider API 比较特殊，就需要实现 `Provider` trait：

1. 在 `crates/goose/src/providers/` 下创建新文件
2. 实现 `base.rs` 中定义的 `Provider` trait
3. 在 `crates/goose/src/providers/factory.rs` 中注册

### 技术细节

- 声明式 providers：`crates/goose/src/config/declarative_providers.rs`
- Provider trait：`crates/goose/src/providers/base.rs`
- Provider 注册：`crates/goose/src/providers/factory.rs`
- 示例 providers：`crates/goose/src/providers/declarative/*.json`

---

## H. 通过 Recipes 预配置工作流

**目标**：创建标准化、可重复执行、且用户几乎不需要额外配置的工作流。

Recipe 是 YAML 文件，用来定义完整的 goose 使用体验，包括 instructions、extensions、parameters 和 prompts。它们非常适合自定义发行版，因为不需要改代码，只需要分发文件。

### 基础 Recipe 结构

```yaml
version: 1.0.0
title: Daily Standup Report Generator
description: Generates standup reports from GitHub activity

# 用户运行时可自定义的参数
parameters:
  - key: github_repo
    input_type: string
    requirement: required
    description: "GitHub repository (e.g., 'owner/repo')"
  
  - key: time_period
    input_type: select
    requirement: optional
    default: "24h"
    options: ["24h", "48h", "week"]
    description: "Time period to analyze"

# 给 AI 的系统指令
instructions: |
  You are a standup report generator. Fetch PR and issue data from GitHub,
  analyze activity, and generate a formatted report.
  
  Always save reports to ./standup/standup-{date}.md

# 这个 recipe 需要的扩展
extensions:
  - type: builtin
    name: developer
    description: File operations
  - type: stdio
    name: github
    cmd: uvx
    args: ["github-mcp-server"]
    description: GitHub API access

# UI 中显示的快捷建议
activities:
  - "Generate today's standup report"
  - "Summarize this week's PRs"

# 初始 prompt，支持参数替换
prompt: |
  Generate a standup report for {{ github_repo }} covering the last {{ time_period }}.
```

### Recipe 参数类型

| 类型 | 说明 | 适用场景 |
|------|------|----------|
| `string` | 自由文本输入 | 名称、路径、查询 |
| `number` | 数字输入 | 数量、阈值 |
| `boolean` | true/false 开关 | 功能开关 |
| `date` | 日期选择器 | 时间过滤 |
| `file` | 文件路径（会导入内容） | 文档处理 |
| `select` | 下拉选项 | 预设选项 |

### 分发 Recipes 的方式

1. **随发行版一起打包**，放在约定位置
2. **通过 URL 分享**，用户可直接从链接导入 recipe
3. **建立 recipe 库**，按不同场景组织成一个目录

### 技术细节

- Recipe schema：`crates/goose/src/recipe/mod.rs`
- 参数处理：`crates/goose/src/recipe/template_recipe.rs`
- Recipe 校验：`crates/goose/src/recipe/validate_recipe.rs`

---

## I. 使用 Sub-Recipes 和 Subagents 构建复杂工作流

**目标**：构建能编排多个专用任务的复杂多阶段工作流。

对于复杂工作流，goose 提供了两种很强的组合机制：

1. **Sub-recipes**：可按名称调用的预定义 recipe 模板
2. **Subagents**：为特定任务临时拉起的独立 AI agent

### Sub-Recipes：预定义任务模板

Sub-recipes 允许你定义可复用的工作流组件，供主 recipe 调用：

```yaml
version: 1.0.0
title: Implementation Planner
description: Creates detailed implementation plans with research

instructions: |
  Create implementation plans through research and iteration.
  Use sub-recipes to delegate specialized research tasks.

# 定义可用的 sub-recipes
sub_recipes:
  - name: "find_files"
    path: "./subrecipes/codebase-locator.yaml"
    description: "Locate relevant files in the codebase"
  
  - name: "analyze_code"
    path: "./subrecipes/code-analyzer.yaml"
    description: "Analyze code structure and patterns"
  
  - name: "find_patterns"
    path: "./subrecipes/pattern-finder.yaml"
    # 预填一部分参数
    values:
      search_depth: "3"
      include_tests: "true"

extensions:
  - type: builtin
    name: developer

prompt: |
  Create an implementation plan for the requested feature.
  
  Use the available sub-recipes to research the codebase:
  - find_files: Locate relevant source files
  - analyze_code: Understand current implementation
  - find_patterns: Find similar features to model after
```

AI 随后就可以通过 `subagent` 工具调用这些 sub-recipes：

```
subagent(subrecipe: "find_files", parameters: {"search_term": "authentication"})
```

### Subagents：动态任务委派

Subagent 是带独立上下文的 AI 实例，适合以下场景：

- **并行执行**：多个任务同时推进
- **上下文隔离**：避免上下文窗口被撑爆
- **专门任务**：针对不同任务使用不同模型/配置

#### 临时 Subagent

可以即时创建带自定义 instructions 的 subagent：

```yaml
prompt: |
  To complete this task:
  
  1. Spawn a subagent to analyze the frontend code:
     subagent(instructions: "Analyze all React components in src/components/
              and list their props and state management patterns")
  
  2. Spawn another subagent for the backend:
     subagent(instructions: "Document all API endpoints in src/api/
              including their request/response schemas")
  
  3. Synthesize findings from both subagents into a unified report.
```

#### 并行执行多个 Subagent

在同一条消息里发起多个 subagent 调用时，它们会并行执行：

```yaml
prompt: |
  Run these analyses in parallel by making all subagent calls at once:
  
  subagent(instructions: "Count lines of code by language")
  subagent(instructions: "Find all TODO comments")
  subagent(instructions: "List external dependencies")
  
  Then combine the results into a codebase health report.
```

#### 覆盖 Subagent 设置

可以为每个 subagent 单独指定模型、provider 或行为：

```yaml
prompt: |
  Use a faster model for simple tasks:
  
  subagent(
    instructions: "List all files modified in the last week",
    settings: {
      model: "gpt-4o-mini",
      max_turns: 3
    }
  )
  
  Use the full model for complex analysis:
  
  subagent(
    instructions: "Review this code for security vulnerabilities",
    settings: {
      model: "claude-sonnet-4-20250514",
      temperature: 0.1
    }
  )
```

#### 限定扩展访问范围

可以限制某个 subagent 允许访问的扩展：

```yaml
prompt: |
  Create a sandboxed subagent with only file reading capabilities:
  
  subagent(
    instructions: "Analyze the README files in this project",
    extensions: ["developer"]  # 只给 developer 扩展，不允许网络访问
  )
```

### 示例：多阶段代码评审工作流

```yaml
version: 1.0.0
title: Comprehensive Code Review
description: Multi-stage code review with parallel analysis

sub_recipes:
  - name: "security_scan"
    path: "./subrecipes/security-scanner.yaml"
    sequential_when_repeated: true  # 不要并行跑多个安全扫描
  
  - name: "style_check"
    path: "./subrecipes/style-checker.yaml"
  
  - name: "test_coverage"
    path: "./subrecipes/coverage-analyzer.yaml"

parameters:
  - key: pr_number
    input_type: number
    requirement: required
    description: "Pull request number to review"
  
  - key: review_depth
    input_type: select
    requirement: optional
    default: "standard"
    options: ["quick", "standard", "thorough"]

instructions: |
  Perform a comprehensive code review using specialized sub-recipes.
  
  ## Review Process
  
  ### Phase 1: Parallel Analysis
  Run these checks simultaneously:
  - style_check: Code style and formatting
  - test_coverage: Test coverage analysis
  
  ### Phase 2: Security Review
  After initial checks pass, run security_scan (sequential to avoid conflicts).
  
  ### Phase 3: Synthesis
  Combine all findings into a unified review report with:
  - Critical issues (must fix)
  - Suggestions (should consider)
  - Positive observations (good practices found)

extensions:
  - type: builtin
    name: developer
  - type: stdio
    name: github
    cmd: uvx
    args: ["github-mcp-server"]

prompt: |
  Review PR #{{ pr_number }} with {{ review_depth }} depth.
  
  {% if review_depth == "quick" %}
  Focus only on critical issues and security concerns.
  {% elif review_depth == "thorough" %}
  Perform exhaustive analysis including performance review.
  {% endif %}
  
  Start by fetching the PR details, then orchestrate the review phases.
```

### 复杂工作流最佳实践

1. **把可复用部分做成 sub-recipes**：定义一次，多处复用
2. **并行化独立任务**：同一条消息中的多个 subagent 调用会并发执行
3. **使用 `sequential_when_repeated: true`**：用于不适合并行的任务（例如数据库迁移）
4. **合理限定扩展范围**：只给 subagent 它真正需要的工具
5. **优先使用 summary 模式（默认）**：subagent 默认返回简短总结；只有确实需要完整对话历史时再用 `summary: false`
6. **优雅处理失败**：即使某个 subagent 失败，工作流也应尽量继续推进

### 技术细节

- Subagent tool：`crates/goose/src/agents/subagent_tool.rs`
- Subagent 执行：`crates/goose/src/agents/subagent_handler.rs`
- Recipe 的 `sub_recipes` 字段：`crates/goose/src/recipe/mod.rs`（`SubRecipe` struct）
- 模板渲染：`crates/goose/src/recipe/template_recipe.rs`
