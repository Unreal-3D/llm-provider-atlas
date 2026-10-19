# LLM Provider Atlas

跨云厂商的 LLM 模型目录与编码 Agent 配置生成器。

Provider-agnostic LLM model catalog and coding-agent config generator.

---

## 这个仓库解决什么问题

不同云厂商的模型列表、上下文窗口、最大输出、价格、能力、模型 ID 别名和 API 协议各不相同，而不同编码 Agent（ZCode、CodeBuddy、Claude Code 等）又各自需要不同格式的配置。

本项目把这些信息拆成两个维度：

- **providers/**：从厂商控制台/API 获取模型元数据，归一化成统一的 `ModelRecord`
- **targets/**：把归一化后的模型数据转换成具体 Agent 的配置

新增一个厂商或一个 Agent，只需要增加一个目录，不需要改核心数据结构。

## 当前覆盖

| Provider | 模型数 | 状态 | 说明 |
|---|---:|---|---|
| 腾讯云 Token Plan | 13 | ✅ 已完成 | Anthropic / OpenAI 兼容协议；ZCode target 已提供 |
| 火山方舟（Volcengine Ark） | - | 🚧 计划中 | - |
| 阿里百炼（Alibaba Bailian） | - | 🚧 计划中 | - |

| Target | 状态 | 说明 |
|---|---|---|
| ZCode | ✅ 已完成 | 生成 `provider_config.json` 片段 |
| CodeBuddy | 🚧 计划中 | - |
| Claude Code | 🚧 计划中 | - |

## 目录结构

```text
.
├── providers/
│   ├── tencent-token-plan/
│   │   ├── provider.yaml          # 控制台入口、Base URL、协议、鉴权方式
│   │   ├── models.json            # 归一化后的完整模型资料
│   │   ├── README.md              # 该厂商的接入说明
│   │   └── extract/               # 提取方法说明
│   └── _template/                 # 新增 provider 的模板
├── targets/
│   ├── zcode/
│   │   ├── provider_config.example.json
│   │   └── README.md
│   └── _template/                 # 新增 target 的模板
├── schemas/
│   └── model.schema.json          # 统一模型记录 schema
├── scripts/
│   └── generate-zcode-config.mjs  # 从 models.json 生成 ZCode 配置
├── docs/
│   └── tencent-token-plan-zcode.md
├── SECURITY.md
├── CONTRIBUTING.md
└── LICENSE
```

## 快速开始

### 1. 浏览模型资料

```bash
cat providers/tencent-token-plan/models.json
```

每个模型包含：

- 主 ID、别名 ID、显示名
- 上下文窗口、最大输入/输出 token
- 输入/输出/缓存命中价格
- 能力（文本、图片、视频、深度思考、Function Calling、结构化输出、缓存）
- 官方文档链接
- 是否进入 ZCode 配置、排序、排除原因

### 2. 生成 ZCode 配置

```bash
node scripts/generate-zcode-config.mjs
```

输出：`targets/zcode/provider_config.example.json`

把生成文件里的 `<YOUR_TENCENT_TOKEN_PLAN_API_KEY>` 替换成真实 Key，再按 `targets/zcode/README.md` 的说明放到 ZCode 配置目录。

### 3. 查看完整接入文档

见 [docs/tencent-token-plan-zcode.md](docs/tencent-token-plan-zcode.md)。

## 统一模型记录

所有 provider 最终都归一化成同一种结构，target 生成器只依赖这个结构：

```json
{
  "provider": "tencent-token-plan",
  "primaryModelId": "deepseek/deepseek-flash",
  "modelIds": ["deepseek/deepseek-flash"],
  "displayName": "DeepSeek-V4.1-Flash",
  "spec": {
    "ContextLength": "1024K",
    "MaxOutputToken": "384k"
  },
  "normalized": {
    "contextWindow": 1048576,
    "maxOutputTokens": 393216
  },
  "charging": [],
  "capabilities": [],
  "zcode": {
    "selected": true,
    "order": 1,
    "contextWindow": 1048576,
    "maxOutputTokens": 393216,
    "reasoningLevels": ["low", "high", "max"]
  }
}
```

详细的 JSON Schema 见 [schemas/model.schema.json](schemas/model.schema.json)。

## 新增 Provider

1. 复制 `providers/_template/` 为 `providers/<provider-id>/`
2. 按模板填写 `provider.yaml`
3. 按 `schemas/model.schema.json` 生成 `models.json`
4. 在 `README.md` 的覆盖表中登记

Provider 的提取方式可以是：

- 官方模型列表 API
- 控制台 CGI / BFF 接口
- 已登录控制台页面的 DOM/文本提取
- 浏览器 CDP（适合需要登录态的页面）

## 新增 Target

1. 复制 `targets/_template/` 为 `targets/<target-id>/`
2. 读取 `providers/*/models.json`
3. 生成目标 Agent 需要的配置文件
4. 在 `README.md` 的覆盖表中登记

## 安全与脱敏

- 仓库中**不包含任何真实 API Key、Cookie、账号 ID、CSRF token**。
- 所有示例统一使用 `<YOUR_API_KEY>`、`<YOUR_TENCENT_TOKEN_PLAN_API_KEY>` 等占位符。
- 各厂商控制台的登录态、账号信息、请求 ID 不进入仓库。
- 提交前请运行 `grep -rnE "sk-|apiKey|token" .` 做一次人工复核；详见 [SECURITY.md](SECURITY.md)。

## Roadmap

- [ ] 火山方舟（Volcengine Ark）provider
- [ ] 阿里百炼（Alibaba Bailian）provider
- [ ] CodeBuddy target
- [ ] Claude Code target
- [ ] 统一的模型对比/性价比排序工具
- [ ] 自动检查上游模型变更

## License

MIT，见 [LICENSE](LICENSE)。
