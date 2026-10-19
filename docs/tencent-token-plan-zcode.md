# 腾讯云 Token Plan 接入与 ZCode 模型配置指南

本文记录如何从腾讯云 TokenHub 控制台获取 Token Plan 的模型信息、如何调用模型 API，以及如何在 ZCode 中配置这些模型。文中的配置已经按性价比排序，并移除了过期的旧版本模型。

- 适用套餐：Token Plan 个人版（通用 Token Plan，Pro）
- 套餐支持模型：13 个
- ZCode 当前启用：7 个模型；已移除 6 个模型（含 Auto 及其别名）
- 调用协议：Anthropic Messages 兼容、OpenAI Chat Completions 兼容
- 当前控制台入口：<https://console.cloud.tencent.com/tokenhub/tokenplan>

> 安全提示：API Key 只保存在本机的 ZCode 配置中，不要提交到 Git，也不要贴到公开渠道。本文所有示例都用 `<YOUR_API_KEY>` 占位。

## 目录

1. [前置条件](#1-前置条件)
2. [获取腾讯云模型信息](#2-获取腾讯云模型信息)
3. [接入腾讯云模型 API](#3-接入腾讯云模型-api)
4. [ZCode 配置模型](#4-zcode-配置模型)
5. [在 ZCode 中配置 chrome-devtools-mcp](#5-在-zcode-中配置-chrome-devtools-mcp)
6. [完整模型资料](#6-完整模型资料)
7. [故障排查](#7-故障排查)
8. [参考链接](#8-参考链接)

---

## 1. 前置条件

1. 已开通腾讯云 Token Plan 个人版，并且套餐处于生效状态。
2. 在控制台拿到 API Key：
   - 打开 <https://console.cloud.tencent.com/tokenhub/tokenplan>
   - 在「API KEY」区域复制 `sk-tp-...` 开头的 Key
   - 所有 Token Plan 个人版套餐共享同一个 API Key
3. 本机安装 Node.js（使用 Edge/CDP 自动化时需要）。`chrome-devtools-mcp` 要求 Node.js 20.19+ 或 22.12+。
4. 如果要自动读取控制台页面，需要一个已登录腾讯云控制台的 Edge/Chrome 浏览器。

---

## 2. 获取腾讯云模型信息

### 2.1 控制台里的模型清单入口

Token Plan 个人版页面上有一个「接入指引：查看模型列表和ID」链接。点击后会打开一个抽屉，里面有三个部分：

1. **模型与参数**：当前套餐支持的模型列表，包含「模型」「Model Name」「Model ID」三列，以及同一模型的多个可用 ID。
2. **配置龙虾或编程工具**：不同编程工具的配置说明。
3. **模型列表与 ID**：模型 ID、Base URL、完整 URL 和 cURL 验证命令。

这个页面能拿到：

- 当前套餐实际支持的模型（不是模型广场的全部模型）
- 每个模型的主 ID 和别名 ID
- Anthropic / OpenAI 两种协议的 Base URL
- 推荐 URL 与即将下线的旧 URL

### 2.2 模型广场里的详细参数

模型广场：<https://console.cloud.tencent.com/tokenhub/models>

点击任意模型卡片，会进入模型详情页：

```text
https://console.cloud.tencent.com/tokenhub/models/detail?modelId=<MODEL_ID>&regionId=1&from=all
```

详情页包含：

- **模型 ID**：实际的 `model` 参数
- **模型介绍**
- **模型价格**：输入、输出、缓存命中，单位是「元/百万 tokens」
- **模型能力**：深度思考、Function Calling、结构化输出、cache 缓存、视觉理解等
- **输入输出类型**：文本、图片、视频、文件
- **模型限制**：
  - 最大输入 Tokens
  - 最大输出 Tokens
  - 上下文窗口
  - 最大 TPM
  - 最大 RPM
- **调用协议**：Chat Completions、Responses、Anthropic
- **调用示例**：cURL、Python、Node.js

例如 `glm-5.3` 的详情页显示：

```text
模型 ID：glm-5.3
最大输入 Tokens：1024k
最大输出 Tokens：128k
上下文窗口：1024k
最大 TPM：1000000
最大 RPM：60
```

### 2.3 通过 OpenAI 兼容接口获取模型 ID 列表

在旧域名上可以用 OpenAI 兼容的模型列表接口拿到模型 ID（注意：这个接口只返回 ID，不返回上下文窗口等参数）：

```bash
export TENCENT_TOKEN_PLAN_API_KEY="sk-tp-xxxxxxxx"

curl -sS https://api.lkeap.cloud.tencent.com/plan/v3/models \
  -H "Authorization: Bearer ${TENCENT_TOKEN_PLAN_API_KEY}"
```

返回示例：

```json
{
  "data": [
    { "id": "deepseek-v4-pro-202606", "object": "model", "owned_by": "system" },
    { "id": "deepseek/deepseek-flash", "object": "model", "owned_by": "system" }
  ]
}
```

注意：

- 新域名 `tokenhub.tencentmaas.com` 目前没有暴露 `/plan/v3/models`（会返回 404），所以模型清单以控制台为准。
- 这个列表可能包含套餐未包含的旧模型，不要直接当成 Token Plan 的可用模型列表。

### 2.4 通过控制台 CGI 接口获取完整元数据（进阶）

控制台模型详情页实际调用的是腾讯云控制台的 `DescribeModelList` 和 `DescribeModelCapabilityList` 接口。它们需要控制台登录态和 CSRF，因此只适合在本机自动化提取，不适合服务端生产调用。

请求格式（在已登录的控制台页面上下文中执行）。先从任意一个已成功的 `cgi/capi` 请求里取出 `csrfCode` 和 `uin`，再复用同一个 URL：

```js
const base = performance.getEntriesByType('resource')
  .map(r => r.name)
  .find(u => /cgi\/capi\?/.test(u) && /serviceType=tokenhub/.test(u) && /csrfCode=/.test(u));

const url = new URL(base);
url.searchParams.set('cmd', 'DescribeModelList');
url.searchParams.set('action', 'delegate');
url.searchParams.set('serviceType', 'tokenhub');
url.searchParams.set('secure', '1');
url.searchParams.set('version', '3');
url.searchParams.set('json', '1');
url.searchParams.set('dictId', '3216');
url.searchParams.set('sts', '1');
url.searchParams.set('t', String(Date.now()));

const resp = await fetch(url, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    regionId: 1,
    serviceType: 'tokenhub',
    cmd: 'DescribeModelList',
    data: {
      Version: '2026-03-22',
      Offset: 0,
      Limit: 20,
      Source: 'Model',
      ModelIds: ['glm-5.3', 'deepseek/deepseek-flash'],
      Language: 'zh-CN',
    },
  }),
});
const json = await resp.json();
```

响应里的关键字段：

```json
{
  "ModelSet": [
    {
      "DisplayName": "GLM-5.3",
      "ModelId": "glm-5.3",
      "ModelName": "GLM-5.3",
      "ModelSpec": {
        "TPM": "1000000",
        "QPM": "60",
        "MaxInputToken": "1024k",
        "MaxOutputToken": "128k",
        "ContextLength": "1024k"
      },
      "ModelChargingInfo": [
        {
          "ChargingItems": [
            { "DisplayName": "输入", "Price": "8", "PriceUnit": "元/百万tokens" },
            { "DisplayName": "输出", "Price": "28", "PriceUnit": "元/百万tokens" },
            { "DisplayName": "缓存命中", "Price": "2", "PriceUnit": "元/百万tokens" }
          ]
        }
      ],
      "FreeTrialInfo": { "CapacitySize": 1000000, "Unit": "token", "ValidityDays": 365 },
      "ModelAPIInfo": { "Reference": "https://cloud.tencent.com/document/product/1823/132061" }
    }
  ]
}
```

`DescribeModelCapabilityList` 返回模型能力，例如：

```json
{
  "CapabilitySet": [
    { "CapabilityName": "InputImage", "CapabilityValue": "true" },
    { "CapabilityName": "InputVideo", "CapabilityValue": "true" },
    { "CapabilityName": "DeepThink", "CapabilityValue": "true" },
    { "CapabilityName": "FunctionCall", "CapabilityValue": "true" },
    { "CapabilityName": "StructOutput", "CapabilityValue": "true" },
    { "CapabilityName": "Cache", "CapabilityValue": "true" }
  ]
}
```

### 2.5 用浏览器 CDP / chrome-devtools-mcp 自动读取控制台

控制台页面需要登录，直接 `curl` 页面拿不到渲染后的内容。推荐用 Chrome DevTools Protocol（CDP）连接一个已登录的 Edge：

1. 退出所有 Edge 实例。
2. 用独立的用户数据目录启动 Edge，并打开远程调试端口（目录准备见 5.2 节）：

```bash
"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  --user-data-dir="$HOME/.zcode/edge-debug-profile" \
  --remote-debugging-port=9222 \
  --no-first-run \
  --restore-last-session
```

3. 验证端口：

```bash
curl -sS http://127.0.0.1:9222/json/version
```

4. 用 `chrome-devtools-mcp` 连接：

```bash
npx -y chrome-devtools-mcp@latest \
  --browserUrl http://127.0.0.1:9222 \
  --no-usage-statistics
```

然后在 MCP 客户端里：

- `list_pages`：列出所有标签页，拿到 `pageId`
- `evaluate_script`：在指定页面执行脚本，例如读取 `document.body.innerText`
- `navigate_page`：打开模型详情页

示例：读取 Token Plan 页面正文

```json
{
  "name": "evaluate_script",
  "arguments": {
    "pageId": 3,
    "function": "() => ({ title: document.title, url: location.href, text: document.body.innerText })"
  }
}
```

示例：读取某个模型的「模型限制」

```text
1. navigate_page -> https://console.cloud.tencent.com/tokenhub/models/detail?modelId=glm-5.3&regionId=1&from=all
2. evaluate_script -> 取 document.body.innerText 中「模型限制」到「调用协议」之间的内容
```

注意：

- `chrome-devtools-mcp` **不是 Chrome 插件**，不需要在 Edge 中安装扩展。它是一个通过 CDP 控制浏览器的 MCP 服务器。
- 9222 端口只监听本机，不要暴露到公网。
- 调试用的用户数据目录是原配置的副本，里面的 Cookie 和登录态与原配置相互独立。

---

## 3. 接入腾讯云模型 API

### 3.1 Base URL

控制台当前给出两套域名：

| 协议 | 推荐域名（新） | 即将下线（旧） |
|---|---|---|
| Anthropic | `https://tokenhub.tencentmaas.com/plan/anthropic` | `https://api.lkeap.cloud.tencent.com/plan/anthropic` |
| OpenAI | `https://tokenhub.tencentmaas.com/plan/v3` | `https://api.lkeap.cloud.tencent.com/plan/v3` |

推荐使用新域名 `tokenhub.tencentmaas.com`。旧域名目前仍可用，但控制台标注「即将下线」。

完整端点：

| 协议 | 完整 URL |
|---|---|
| Anthropic Messages | `https://tokenhub.tencentmaas.com/plan/anthropic/v1/messages` |
| OpenAI Chat Completions | `https://tokenhub.tencentmaas.com/plan/v3/chat/completions` |

### 3.2 Anthropic Messages 兼容调用

请求头：

```text
Content-Type: application/json
x-api-key: <YOUR_API_KEY>
anthropic-version: 2023-06-01
```

示例：

```bash
export TENCENT_TOKEN_PLAN_API_KEY="sk-tp-xxxxxxxx"

curl -sS -X POST \
  "https://tokenhub.tencentmaas.com/plan/anthropic/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${TENCENT_TOKEN_PLAN_API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "deepseek/deepseek-flash",
    "max_tokens": 1024,
    "messages": [
      { "role": "user", "content": "用三句话解释什么是 MoE 模型" }
    ]
  }'
```

响应示例（推理模型会先返回 `thinking` 块，再返回 `text` 块）：

```json
{
  "id": "msg_xxx",
  "type": "message",
  "role": "assistant",
  "model": "deepseek/deepseek-flash",
  "content": [
    { "type": "thinking", "thinking": "..." },
    { "type": "text", "text": "..." }
  ],
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 31,
    "output_tokens": 128
  }
}
```

要点：

- `max_tokens` 是本次请求的最大输出 token 数，包含思考内容。
- 不同模型的最大输出不同，见第 5 节的模型表。
- 多模态模型可以传图片/视频内容块；不支持视觉的模型只接受文本。
- 支持 cache 的模型会在 `usage` 中返回缓存命中相关字段。

### 3.3 OpenAI Chat Completions 兼容调用

```bash
curl -sS -X POST \
  "https://tokenhub.tencentmaas.com/plan/v3/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TENCENT_TOKEN_PLAN_API_KEY}" \
  -d '{
    "model": "deepseek/deepseek-flash",
    "messages": [
      { "role": "user", "content": "你好" }
    ],
    "stream": false
  }'
```

### 3.4 模型 ID 与别名

模型 ID 有主 ID 和别名两种写法，调用时二者都可以使用。配置 ZCode 时建议使用主 ID，避免重复。

例如：

```text
主 ID: deepseek-v4-flash-202605
别名: deepseek/deepseek-v4-flash
别名: deepseek/deepseek-v4-flash-0731
```

### 3.5 常见错误

| 现象 | 原因 | 处理 |
|---|---|---|
| `401 not_authorized` | API Key 错误、已删除，或不是 Token Plan 的 Key | 到 Token Plan 页面重新复制 Key |
| `404 page not found` | Base URL 少了 `/plan/anthropic` 或 `/plan/v3`，或用了新域名上不存在的 `/models` | 使用第 3.1 节的完整端点 |
| 模型不存在 | 用了套餐未包含的旧模型 ID | 以控制台模型列表为准 |
| 上下文超限 | 输入 + 输出超过模型上下文窗口 | 降低输入长度或改用更大窗口的模型 |
| 输出被截断 | `max_tokens` 太小 | 提高 `max_tokens`，不要超过模型最大输出 |
| 图片/视频报错 | 模型不支持视觉输入，或用了错误的 content block | 改用支持图片/视频的模型 |

---

## 4. ZCode 配置模型

### 4.1 相关文件

| 文件 | 作用 |
|---|---|
| `~/.zcode/v2/provider_config.json` | ZCode 的 provider 和模型配置 |
| `~/.zcode/cli/config.json` | MCP 服务器配置（本文用于 chrome-devtools-mcp） |
| `~/.zcode/bin/edge-devtools-mcp.sh` | 启动/连接 Edge 的 MCP 包装脚本 |
| `~/.zcode/edge-debug-profile/` | 调试用 Edge 用户数据目录（原配置副本） |
| `providers/tencent-token-plan/models.json` | 本文配套的完整模型资料 |

修改前先备份：

```bash
cp ~/.zcode/v2/provider_config.json \
   ~/.zcode/v2/provider_config.json.bak.$(date +%Y%m%d%H%M%S)
chmod 600 ~/.zcode/v2/provider_config.json
```

### 4.2 providerRules：注册 provider

在 `~/.zcode/v2/provider_config.json` 的 `config.providerConfigRules.providerRules` 中添加或修改：

```json
{
  "providerId": "tencent-token-plan",
  "providerName": "腾讯云 Token Plan",
  "enabled": true,
  "config": {
    "group": "standard-personal",
    "access": {
      "type": "api-key",
      "apiKey": "<YOUR_TENCENT_TOKEN_PLAN_API_KEY>"
    },
    "api": {
      "type": "anthropic-messages",
      "baseUrl": "https://tokenhub.tencentmaas.com/plan/anthropic"
    },
    "personalModelIds": [
      "deepseek/deepseek-flash",
      "glm-5.3-flash",
      "hy4-preview",
      "mimo-v2.6-flash",
      "minimax-m3",
      "glm-5.3",
      "kimi-k3"
    ],
    "modelOrder": [
      "deepseek/deepseek-flash",
      "glm-5.3-flash",
      "hy4-preview",
      "mimo-v2.6-flash",
      "minimax-m3",
      "glm-5.3",
      "kimi-k3"
    ],
    "visibility": "visible"
  }
}
```

字段说明：

- `providerId`：唯一标识，本文使用 `tencent-token-plan`。
- `providerName`：ZCode 模型选择器里显示的名称。
- `access.type`：`api-key`。
- `api.type`：`anthropic-messages`，对应 Anthropic Messages 兼容协议。
- `api.baseUrl`：推荐使用新域名。
- `personalModelIds`：provider 下可用的模型 ID 列表。
- `modelOrder`：模型选择器的显示顺序，需要和 `personalModelIds` 保持一致。
- `visibility`：`visible` 表示在模型选择器中显示。

本文默认使用 `anthropic-messages`。如果改用 OpenAI 兼容协议，把 `api.type` 改为 `openai-chat-completions`，`baseUrl` 改为 `https://tokenhub.tencentmaas.com/plan/v3`。

> `apiKey` 在配置文件中是明文，ZCode 的 provider 配置不对 `${...}` 做环境变量展开，必须写入真实的 Key。请把文件权限设为 `600`，不要把该文件提交到版本库。

### 4.3 manualProviderModelRules：每个模型的参数

每个模型都需要一条规则，放在 `config.modelConfigRules.manualProviderModelRules` 中。示例：

```json
{
  "modelId": "glm-5.3",
  "providerId": "tencent-token-plan",
  "config": {
    "enabled": true,
    "properties": {
      "contextWindow": 1048576,
      "supportsJsonSchemaOutput": false,
      "supportsNativeWebSearch": false,
      "supportsMidConversationSystem": false,
      "inputFormat": {
        "supportsImage": false,
        "supportsVideo": false,
        "supportsPdf": false
      }
    },
    "optionSpecs": {
      "reasoningLevel": {
        "values": ["low", "high", "max"],
        "map": "{}"
      },
      "maxOutputTokens": {
        "max": 131072
      }
    }
  }
}
```

字段说明：

| 字段 | 说明 |
|---|---|
| `contextWindow` | 上下文窗口，单位 token。用于 ZCode 判断何时压缩上下文 |
| `supportsJsonSchemaOutput` | 是否支持 JSON Schema 输出；腾讯云 Token Plan 当前配置为 `false` |
| `supportsNativeWebSearch` | 是否支持原生联网搜索；当前配置为 `false` |
| `supportsMidConversationSystem` | 是否支持对话中途插入 system 消息；当前配置为 `false` |
| `inputFormat.supportsImage` | 是否接受图片输入 |
| `inputFormat.supportsVideo` | 是否接受视频输入 |
| `inputFormat.supportsPdf` | 是否接受 PDF；当前配置为 `false` |
| `optionSpecs.reasoningLevel.values` | ZCode UI 中可选的思考强度 |
| `optionSpecs.reasoningLevel.map` | 思考强度到请求参数的映射；当前为 `"{}"` |
| `optionSpecs.maxOutputTokens.max` | 该模型允许的最大输出 token 数 |

### 4.4 增删改模型

**新增模型**：

1. 在 `personalModelIds` 和 `modelOrder` 中加入模型 ID。
2. 在 `manualProviderModelRules` 中加入对应的规则。
3. 重启 ZCode 或新建会话。

**删除模型**：

1. 从 `personalModelIds` 和 `modelOrder` 中移除模型 ID。
2. 从 `manualProviderModelRules` 中删除对应规则。
3. 重启 ZCode。

**调整顺序**：

只改 `modelOrder` 即可；为了保持一致，建议同时改 `personalModelIds`。ZCode 以 `modelOrder` 为准。

### 4.5 数字单位的换算

控制台上的规格使用 `k` 和 `M` 表示。ZCode 配置需要整数，本文按 1024 进制换算：

| 控制台显示 | ZCode 配置值 |
|---|---:|
| 200k | 204800 |
| 256k | 262144 |
| 384k | 393216 |
| 1024k / 1M | 1048576 |
| 128k | 131072 |
| 64k | 65536 |
| 960k | 983040 |

例如：

- `1024k` → `1024 × 1024 = 1048576`
- `1M` → `1 × 1024 × 1024 = 1048576`
- `128k` → `128 × 1024 = 131072`

> Auto 未纳入当前 ZCode 配置。如果以后启用 Auto，它是路由模型，没有独立上下文窗口；建议按可路由模型的下限保守设置为 `204800`，最大输出保守设置为 `32768`。

### 4.6 当前 ZCode 配置（按性价比排序）

| 顺序 | 模型 ID | 上下文 | 最大输出 | 输入/输出价格（元/百万 tokens） | 图片/视频 |
|---:|---|---:|---:|---:|---|
| 1 | `deepseek/deepseek-flash` | 1,048,576 | 393,216 | 1 / 4 | 图片 / - |
| 2 | `glm-5.3-flash` | 1,048,576 | 131,072 | 0.8 / 2.8 | 图片 / 视频 |
| 3 | `hy4-preview` | 1,048,576 | 65,536 | 6 / 18 | - / - |
| 4 | `mimo-v2.6-flash` | 1,048,576 | 131,072 | 1 / 2 | 图片 / 视频 |
| 5 | `minimax-m3` | 1,048,576 | 1,048,576 | 2.1 / 8.4 | 图片 / 视频 |
| 6 | `glm-5.3` | 1,048,576 | 131,072 | 8 / 28 | - / - |
| 7 | `kimi-k3` | 1,048,576 | 1,048,576 | 20 / 100 | 图片 / 视频 |

排序原则：

- 高性价比模型靠前：`deepseek/deepseek-flash`、`glm-5.3-flash`、`hy4-preview`、`mimo-v2.6-flash`。
- `minimax-m3` 兼具 1M 上下文和视觉输入，放在 `glm-5.3` 前面。
- 高价模型靠后：`glm-5.3`、`kimi-k3`。

已从 ZCode 模型选择器中移除的模型：

- `deepseek-v4-flash-202605`（旧版 V4 Flash）
- `deepseek-v4-pro-202606`（旧版 V4 Pro）
- `glm-5.2`
- `glm-5.1`（更早已移除）
- `minimax-m2.7`
- `kimi-k2.7-code`
- `auto` 及其别名 `tc-code-latest`

保留的是新版 `deepseek/deepseek-flash`（DeepSeek-V4.1-Flash）。

### 4.7 应用配置

1. 保存 `~/.zcode/v2/provider_config.json`。
2. 重启 ZCode，或至少新建一个会话。
3. 打开模型选择器，确认：
   - provider 显示为「腾讯云 Token Plan」
   - 模型顺序与 4.6 节一致
   - 旧模型不再出现
4. 选择一个模型发一条短消息，确认 API 调用成功。

> ZCode 在会话启动时读取 provider 配置。只改文件、不重启的话，当前会话仍使用内存中的旧配置。

---

## 5. 在 ZCode 中配置 chrome-devtools-mcp

### 5.1 它是什么

`chrome-devtools-mcp` 是 Google 提供的 MCP 服务器，不是 Chrome 扩展。它通过 CDP 控制 Chromium 内核浏览器（Chrome、Edge），提供页面导航、点击、填表、截图、执行脚本、网络请求查看、性能分析等 30+ 个工具。

Edge 与 Chrome 同源，可以直接使用，不需要在 Edge 里安装任何插件。

### 5.2 启动脚本

创建 `~/.zcode/bin/edge-devtools-mcp.sh`：

```bash
#!/bin/bash
set -euo pipefail

export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

PORT="${EDGE_DEBUG_PORT:-9222}"
URL="http://127.0.0.1:${PORT}"
PROFILE="$HOME/.zcode/edge-debug-profile"
EDGE_APP="/Applications/Microsoft Edge.app"

if ! curl -sf -m 1 "${URL}/json/version" >/dev/null 2>&1; then
  open -na "${EDGE_APP}" --args \
    --user-data-dir="${PROFILE}" \
    --remote-debugging-port="${PORT}" \
    --no-first-run \
    --restore-last-session
  for _ in $(seq 1 30); do
    if curl -sf -m 1 "${URL}/json/version" >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
fi

exec /usr/local/bin/npx -y chrome-devtools-mcp@latest \
  --browserUrl "${URL}" \
  --no-usage-statistics
```

赋予执行权限：

```bash
chmod 700 ~/.zcode/bin/edge-devtools-mcp.sh
```

首次使用前，需要准备调试用的 Edge 用户数据目录。先把 Edge 完全退出，再把原配置复制一份（保留登录态）：

```bash
osascript -e 'tell application "Microsoft Edge" to quit'
sleep 3
mkdir -p ~/.zcode/edge-debug-profile
ditto "$HOME/Library/Application Support/Microsoft Edge/Default" \
      "$HOME/.zcode/edge-debug-profile/Default"
cp -f "$HOME/Library/Application Support/Microsoft Edge/Local State" \
      "$HOME/.zcode/edge-debug-profile/" 2>/dev/null || true
chmod -R go-rwx ~/.zcode/edge-debug-profile
```

### 5.3 MCP 配置

在 `~/.zcode/cli/config.json` 中写入：

```json
{
  "mcp": {
    "servers": {
      "chrome-devtools": {
        "type": "stdio",
        "command": "/bin/bash",
        "args": [
          "/Users/<YOUR_USER>/.zcode/bin/edge-devtools-mcp.sh"
        ],
        "timeoutMs": 120000,
        "enabled": true
      }
    }
  }
}
```

注意：

- `command` 必须是字符串，`args` 必须是字符串数组。
- 配置里的路径必须是绝对路径。
- `timeoutMs` 建议不低于 120000，因为首次 `npx` 下载包可能超过 30 秒。
- 修改后重启 ZCode 或新建会话，`mcp__chrome-devtools__*` 工具才会出现。

### 5.4 验证

先确认 Edge 的调试端口已经就绪：

```bash
curl -sS http://127.0.0.1:9222/json/version
```

然后在 ZCode 新会话中调用：

```text
list_pages
```

如果返回了 Edge 当前打开的标签页列表，说明 MCP 已经连通。也可以继续用 `evaluate_script` 读取页面内容。

如果 Edge 没有启动，脚本会自动拉起调试实例；如果已经启动，则直接连接 `http://127.0.0.1:9222`。

### 5.5 安全注意事项

- 9222 端口只监听本机，不要用 `--remote-debugging-address=0.0.0.0` 暴露到公网。
- 调试用户数据目录包含 Cookie 和登录态，权限应为 `700`。
- 不需要时退出调试用 Edge；下次 MCP 调用会按需重新启动。
- `--no-usage-statistics` 关闭 Google 的使用统计上报。
- 如果只想临时读取一次页面，可以不用常驻 MCP，直接用 CDP 脚本。

---

## 6. 完整模型资料

完整模型资料保存在：

[models.json](../providers/tencent-token-plan/models.json)

其中包含每个模型的：

- 显示名、Model Name、主 ID、别名 ID
- 描述、品牌、系列、标签、发布时间
- `ModelSpec` 原始规格（ContextLength、MaxInputToken、MaxOutputToken、TPM、QPM）
- 归一化后的 `contextWindow`、`maxOutputTokens`
- 输入/输出/缓存命中价格
- 免费体验包信息
- 能力列表（AnthropicAPI、CompletionsAPI、DeepThink、FunctionCall、StructOutput、Cache、InputImage、InputVideo 等）
- 官方文档链接
- 是否进入 ZCode 选择器、排序、排除原因

### 6.1 13 个模型的完整清单

| 模型 | 主 ID | 别名 | 上下文 | 最大输出 | 输入 | 输出 | 缓存命中 | ZCode |
|---|---|---|---:|---:|---:|---:|---:|---|
| Auto | `auto` | `tc-code-latest` | 200k | 32k | - | - | - | — |
| MiniMax-M3 | `minimax-m3` | `minimax-m-3-0` | 1M | 1M | 2.1 | 8.4 | 0.42 | ✓ |
| MiniMax-M2.7 | `minimax-m2.7` | `minimax-m-2-7` | 200k | 128k | 2.1 | 8.4 | 0.42 | — |
| GLM-5.2 | `glm-5.2` | `glm-5-2` | 1M | 128k | 8 | 28 | 2 | — |
| GLM-5.3 | `glm-5.3` | `glm-5-3` | 1024k | 128k | 8 | 28 | 2 | ✓ |
| GLM-5.3-Flash | `glm-5.3-flash` | - | 1024K | 128k | 0.8 | 2.8 | 0.23 | ✓ |
| Kimi K2.7 Code | `kimi-k2.7-code` | - | 256k | 256k | 6.5 | 27 | 1.3 | — |
| Kimi K3 | `kimi-k3` | - | 1M | 1M | 20 | 100 | 2 | ✓ |
| DeepSeek-V4 Flash 正式版 | `deepseek-v4-flash-202605` | `deepseek/deepseek-v4-flash`、`deepseek/deepseek-v4-flash-0731` | 1024k | 384k | 1 | 4 | 0.02 | — |
| DeepSeek-V4.1-Flash | `deepseek/deepseek-flash` | - | 1024K | 384k | 1 | 4 | 0.02 | ✓ |
| DeepSeek-V4-Pro 正式版 | `deepseek-v4-pro-202606` | `deepseek/deepseek-v4-pro`、`deepseek/deepseek-v4-pro-0813` | 1024k | 384k | 4.5 | 13.5 | 0.15 | — |
| Hy4 preview | `hy4-preview` | - | 1024k | 64k | 6 | 18 | 0.3 | ✓ |
| MiMo-V2.6-Flash | `mimo-v2.6-flash` | - | 1024K | 128k | 1 | 2 | 0.02 | ✓ |

价格单位：元/百万 tokens。

> 「ZCode」列为 — 的模型不在当前 ZCode 配置中；完整资料仍保留在 JSON 中以便查阅。当前启用 7 个：`deepseek/deepseek-flash`、`glm-5.3-flash`、`hy4-preview`、`mimo-v2.6-flash`、`minimax-m3`、`glm-5.3`、`kimi-k3`。

---

## 7. 故障排查

### 7.1 模型选择器里看不到新模型

1. 检查 `personalModelIds` 和 `modelOrder` 是否都包含该模型 ID。
2. 检查 `manualProviderModelRules` 是否有对应规则，`providerId` 是否为 `tencent-token-plan`。
3. 确认 JSON 语法正确：

```bash
python3 -m json.tool ~/.zcode/v2/provider_config.json > /dev/null && echo OK
```

4. 重启 ZCode 或新建会话。

### 7.2 模型调用返回 401

- API Key 是否从 Token Plan 页面复制，而不是从其他腾讯云产品复制。
- Key 是否被重置或删除。
- `apiKey` 字段是否有多余空格。

### 7.3 模型调用返回 404

- Base URL 是否正确：`https://tokenhub.tencentmaas.com/plan/anthropic`。
- 是否误用了 `/plan/v3/models` 之类新域名上不存在的路径。
- 模型 ID 是否属于当前套餐。

### 7.4 上下文超限

- `contextWindow` 不要大于官方值。
- 推理模型的思考内容也占输出 token。
- 每个模型的 `contextWindow` 不要超过官方值；如果以后启用 Auto，建议按可路由模型的下限保守设置。

### 7.5 MCP 连接失败

```bash
curl -sS http://127.0.0.1:9222/json/version
```

- 没有输出：手动运行 `~/.zcode/bin/edge-devtools-mcp.sh`，检查 Edge 是否启动。
- 端口被占用：检查是否有其他 Edge 实例使用了 9222。
- 配置文件名错误：MCP 配置在 `~/.zcode/cli/config.json` 的 `mcp.servers` 下。
- 超时：把 `timeoutMs` 调到 120000 或更高。

### 7.6 如何回到普通 Edge 配置

调试用的 Edge 使用的是 `~/.zcode/edge-debug-profile`，不影响原配置。要回到原来的浏览器配置：

```bash
osascript -e 'tell application "Microsoft Edge" to quit'
open -a "Microsoft Edge"
```

原配置和标签页会在正常启动时恢复。调试副本会保留，供 MCP 下次使用。

---

## 8. 参考链接

- Token Plan 个人版控制台：<https://console.cloud.tencent.com/tokenhub/tokenplan>
- 模型广场：<https://console.cloud.tencent.com/tokenhub/models>
- Chrome DevTools MCP：<https://github.com/ChromeDevTools/chrome-devtools-mcp>
- 腾讯云 TokenHub 文档：<https://cloud.tencent.com/document/product/1823>

---

## 附录：最小配置清单

如果你只想快速复现，按以下顺序操作：

1. 从控制台复制 API Key。
2. 备份 `~/.zcode/v2/provider_config.json`。
3. 在 `providerRules` 中写入 provider（第 4.2 节）。
4. 在 `manualProviderModelRules` 中为每个模型写入规则（第 4.3 节）。
5. 用第 4.6 节的顺序更新 `personalModelIds` 和 `modelOrder`。
6. 重启 ZCode / 新建会话。
7. 如果需要自动读取控制台页面，按第 5 节配置 chrome-devtools-mcp。

配套文件：

- `providers/tencent-token-plan/models.json`：完整模型资料
- `~/.zcode/v2/provider_config.json`：ZCode provider 配置
- `~/.zcode/cli/config.json`：MCP 配置
- `~/.zcode/bin/edge-devtools-mcp.sh`：Edge MCP 启动脚本
- `~/.zcode/edge-debug-profile/`：调试用 Edge 用户数据目录
