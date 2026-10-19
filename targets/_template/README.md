# Target Template

复制本目录为 `targets/<target-id>/`，然后：

1. 写一个生成脚本，读取 `providers/<provider-id>/models.json`。
2. 只使用归一化字段：
   - `primaryModelId`
   - `normalized.contextWindow`
   - `normalized.maxOutputTokens`
   - `capabilities` 中的 `InputImage` / `InputVideo`
   - `zcode.*` 仅用于 ZCode target，其他 target 应使用自己的字段
3. 生成目标 Agent 的配置，凭据一律使用占位符。
4. 写 README：
   - 生成命令
   - 输出路径
   - 如何应用
   - 如何回滚
5. 更新根目录 `README.md` 的覆盖表。

如果要新增一个 target 专属的模型提示字段，建议放在对应的 `models.json` 记录里，例如：

```json
{
  "zcode": { "selected": true, "order": 1 },
  "codebuddy": { "selected": true, "order": 1 },
  "claudeCode": { "selected": true, "order": 1 }
}
```

不要把某个 target 的字段硬编码到 provider 的通用字段里。
