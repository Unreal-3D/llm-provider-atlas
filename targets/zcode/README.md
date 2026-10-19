# ZCode Target

把 `providers/*/models.json` 转换成 ZCode 的 `provider_config.json` 结构。

## 生成

```bash
node scripts/generate-zcode-config.mjs tencent-token-plan
```

输出：

```text
targets/zcode/provider_config.example.json
```

当前生成结果：

| 顺序 | 模型 ID | 上下文 | 最大输出 |
|---:|---|---:|---:|
| 1 | `deepseek/deepseek-flash` | 1,048,576 | 393,216 |
| 2 | `glm-5.3-flash` | 1,048,576 | 131,072 |
| 3 | `hy4-preview` | 1,048,576 | 65,536 |
| 4 | `mimo-v2.6-flash` | 1,048,576 | 131,072 |
| 5 | `minimax-m3` | 1,048,576 | 1,048,576 |
| 6 | `glm-5.3` | 1,048,576 | 131,072 |
| 7 | `kimi-k3` | 1,048,576 | 1,048,576 |

## 应用

1. 备份现有配置：

```bash
cp ~/.zcode/v2/provider_config.json \
   ~/.zcode/v2/provider_config.json.bak.$(date +%Y%m%d%H%M%S)
```

2. 把 `provider_config.example.json` 里的占位符替换成真实 Key：

```text
<YOUR_TENCENT_TOKEN_PLAN_API_KEY> -> sk-tp-...
```

3. 如果现有配置里已经有其他 provider，把生成文件中的
   `providerConfigRules.providerRules` 和
   `modelConfigRules.manualProviderModelRules` 合并进去，不要直接覆盖其他 provider。

4. 写入 `~/.zcode/v2/provider_config.json`，设置权限：

```bash
chmod 600 ~/.zcode/v2/provider_config.json
```

5. 重启 ZCode，或新建会话。

## 字段说明

- `providerId`：`tencent-token-plan`
- `providerName`：腾讯云 Token Plan
- `api.type`：`anthropic-messages`
- `api.baseUrl`：`https://tokenhub.tencentmaas.com/plan/anthropic`
- `personalModelIds` / `modelOrder`：由 `models.json` 中 `zcode.selected = true` 的模型按 `zcode.order` 排序生成
- `contextWindow` / `maxOutputTokens`：来自 `models.json` 的 `zcode.*`
- `inputFormat.supportsImage/Video`：来自模型能力中的 `InputImage` / `InputVideo`
- `reasoningLevel.values`：来自 `models.json` 的 `zcode.reasoningLevels`

## 新增 Provider 到 ZCode

在 `targets/zcode/providers.json` 中增加一条：

```json
{
  "your-provider-id": {
    "providerName": "Your Provider",
    "group": "standard-personal",
    "apiType": "anthropic-messages",
    "baseUrl": "https://example.com/plan/anthropic",
    "apiKeyPlaceholder": "<YOUR_API_KEY>"
  }
}
```

然后运行：

```bash
node scripts/generate-zcode-config.mjs your-provider-id
```

## 安全

生成文件只包含占位符，不包含真实 Key。不要把替换过 Key 的配置提交到仓库。
