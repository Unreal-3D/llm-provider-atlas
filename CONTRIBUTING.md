# Contributing

## 新增 Provider

1. 复制模板：

```bash
cp -R providers/_template providers/<provider-id>
```

2. 填写 `provider.yaml`：
   - `id`、`name`、`vendor`
   - Anthropic / OpenAI 的 Base URL 和完整端点
   - 控制台入口、模型详情页模板
   - 鉴权方式和请求头
   - 当前启用/排除的模型

3. 生成 `models.json`：
   - 参考 [schemas/model.schema.json](schemas/model.schema.json)
   - 至少包含：`primaryModelId`、`modelIds`、`displayName`、`normalized.contextWindow`
   - 建议保留原始 `spec` 字符串，便于追溯
   - 价格统一为「元/百万 tokens」或标注币种
   - 上下文窗口统一按 1024 进制归一化

4. 写 `README.md`：
   - 如何从控制台获取模型信息
   - 如何调用 API
   - 模型表
   - 注意事项

5. 如果支持自动提取，把脚本放在 `extract/` 下，并说明依赖和登录态要求。

6. 更新根目录 `README.md` 的覆盖表。

## 新增 Target

1. 复制模板：

```bash
cp -R targets/_template targets/<target-id>
```

2. 读取 `providers/*/models.json`，生成目标 Agent 的配置。
3. 写 `README.md`：生成命令、输出路径、如何应用、如何回滚。
4. 如果需要在生成的配置里写入凭据，只使用占位符。
5. 更新根目录 `README.md` 的覆盖表。

## 模型记录约定

- `primaryModelId` 是实际调用时使用的 ID。
- `modelIds` 包含主 ID 和所有别名。
- `normalized.contextWindow` 是 ZCode 等 target 使用的整数值。
- `spec` 保留控制台原始字符串（如 `1024k`、`1M`）。
- `zcode.selected` 表示是否进入 ZCode 配置；未选中的模型也要保留资料。
- `zcode.order` 从 1 开始，按性价比/产品策略排序。
- `zcode.excludedReason` 说明为什么没有进入当前配置。

## 单位换算

统一按 1024 进制：

| 控制台 | 整数 |
|---|---:|
| 200k | 204800 |
| 256k | 262144 |
| 384k | 393216 |
| 1024k / 1M | 1048576 |
| 128k | 131072 |
| 64k | 65536 |

## 提交前

```bash
node scripts/generate-zcode-config.mjs
python3 -m json.tool targets/zcode/provider_config.example.json > /dev/null
grep -rnE "sk-[A-Za-z0-9]{10,}|Bearer [A-Za-z0-9._-]{10,}" . --exclude-dir=.git
```

确保：

- 生成文件中的 Key 是占位符
- 没有 `.env`、`.bak`、本机配置、Edge 用户数据
- JSON 能正常解析

## Commit 约定

```text
feat(provider): add volcengine-ark model catalog
feat(target): add codebuddy config generator
fix(tencent-token-plan): correct kimi-k3 max output
docs: update zcode setup guide
```
