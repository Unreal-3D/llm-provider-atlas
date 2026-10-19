# 腾讯云 Token Plan

腾讯云 TokenHub 的 Token Plan 个人版套餐，支持 Anthropic Messages 和 OpenAI Chat Completions 两种兼容协议。

- 控制台：<https://console.cloud.tencent.com/tokenhub/tokenplan>
- 模型广场：<https://console.cloud.tencent.com/tokenhub/models>
- 套餐支持模型：13 个
- 当前 ZCode 启用：7 个

## 获取模型信息

### 控制台入口

1. 打开 Token Plan 个人版页面。
2. 点击「接入指引：查看模型列表和ID」。
3. 弹窗中查看：
   - 模型名称、Model Name、Model ID、别名
   - Anthropic / OpenAI 的 Base URL
   - 完整 URL 和 cURL 验证命令

注意：这里的模型列表才是套餐实际支持的模型，模型广场的 122 个模型并不都属于 Token Plan。

### 模型详情

模型广场点击卡片进入详情页：

```text
https://console.cloud.tencent.com/tokenhub/models/detail?modelId=<MODEL_ID>&regionId=1&from=all
```

详情页包含：

- 模型 ID
- 模型价格（输入 / 输出 / 缓存命中，元/百万 tokens）
- 模型能力（深度思考、Function Calling、结构化输出、缓存、视觉理解等）
- 输入输出类型（文本 / 图片 / 视频 / 文件）
- 模型限制（最大输入、最大输出、上下文窗口、TPM、RPM）
- 调用协议和示例代码

### 通过 API 获取模型 ID

旧域名提供一个 OpenAI 兼容的模型列表接口：

```bash
curl -sS https://api.lkeap.cloud.tencent.com/plan/v3/models \
  -H "Authorization: Bearer ${TENCENT_TOKEN_PLAN_API_KEY}"
```

这个接口只返回模型 ID，不返回上下文窗口和价格。新域名 `tokenhub.tencentmaas.com` 目前没有暴露对应路径。

### 通过浏览器 CDP 提取

控制台页面需要登录态，推荐用 CDP 连接已登录的 Edge：

```bash
"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  --user-data-dir="$HOME/.zcode/edge-debug-profile" \
  --remote-debugging-port=9222 \
  --no-first-run \
  --restore-last-session
```

然后用 `chrome-devtools-mcp` 或原始 CDP 读取页面。详细步骤见 [docs/tencent-token-plan-zcode.md](../../docs/tencent-token-plan-zcode.md) 第 2.5 节。

## 接入

### Anthropic Messages

```bash
curl -sS -X POST \
  "https://tokenhub.tencentmaas.com/plan/anthropic/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${TENCENT_TOKEN_PLAN_API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "deepseek/deepseek-flash",
    "max_tokens": 1024,
    "messages": [
      { "role": "user", "content": "你好" }
    ]
  }'
```

### OpenAI Chat Completions

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

## 模型清单

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

ZCode 当前启用的 7 个模型按性价比排序：

1. `deepseek/deepseek-flash`
2. `glm-5.3-flash`
3. `hy4-preview`
4. `mimo-v2.6-flash`
5. `minimax-m3`
6. `glm-5.3`
7. `kimi-k3`

完整模型资料见 [models.json](models.json)。

## 配置文件

- [provider.yaml](provider.yaml)：控制台入口、Base URL、协议、鉴权方式
- [models.json](models.json)：归一化后的 13 个模型资料
- [extract/README.md](extract/README.md)：提取脚本/方法说明

## 注意事项

- 旧域名 `api.lkeap.cloud.tencent.com` 控制台标注「即将下线」，新接入优先使用 `tokenhub.tencentmaas.com`。
- 上下文窗口按 1024 进制换算：`1024k → 1048576`、`200k → 204800`、`256k → 262144`。
- `auto` 是路由模型，没有独立上下文窗口；当前未纳入 ZCode 配置。
- 推理模型的思考内容占用输出 token，`max_tokens` 要留足。
- 图片/视频输入只对支持视觉的模型有效。
