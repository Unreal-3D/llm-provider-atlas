# Provider Template

复制本目录为 `providers/<provider-id>/`，然后：

1. 填写 `provider.yaml`。
2. 参考 `models.example.json` 生成 `models.json`。
3. 写本 README，说明：
   - 控制台入口
   - 如何获取模型列表
   - 如何调用 API
   - 模型表
   - 注意事项
4. 如果有自动提取脚本，放在 `extract/`。
5. 更新根目录 `README.md` 的覆盖表。

模型记录请遵循 [schemas/model.schema.json](../../schemas/model.schema.json)。

提交前确认没有真实 API Key、Cookie、账号 ID。
