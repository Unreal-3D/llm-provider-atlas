# Security Policy

## 不提交敏感信息

本仓库是公开的模型目录和配置生成器，**不允许提交任何真实凭据或账号数据**。

禁止提交：

- 真实 API Key（各厂商的 `sk-...`、`Bearer ...`）
- Cookie、Session、登录态
- 账号 ID、UIN、AppID、Project ID
- CSRF token、请求签名
- 控制台 `RequestId`、`SeqId` 等请求级数据
- 带 token 的 URL
- 本机 ZCode 配置、Edge 用户数据目录、备份文件

示例中统一使用：

```text
<YOUR_API_KEY>
<YOUR_TENCENT_TOKEN_PLAN_API_KEY>
<YOUR_PROVIDER_API_KEY>
```

## 提交前检查

```bash
# 查找常见密钥形态
grep -rnE "sk-[A-Za-z0-9]{10,}|Bearer [A-Za-z0-9._-]{10,}" . \
  --exclude-dir=.git

# 查找账号/CSRF/Cookie
grep -rniE "csrf|cookie|account.?id|uin|appid|secret|password" . \
  --exclude-dir=.git

# 查找本地配置和调试目录
find . -name "*.bak" -o -name "*.local.json" -o -name ".env*" -o -name "edge-debug-profile"
```

确认命中的只是文档中的占位符或字段名，而不是真实值。

## 如果误提交了密钥

1. 立即在对应云厂商控制台**重置/删除**该 Key。
2. 从 Git 历史中移除该文件（`git filter-repo` 或 BFG）。
3. 强制推送并通知协作者重新克隆。
4. 检查是否有异常调用记录。

仅删除文件不够，Git 历史里仍然可以恢复。

## 报告问题

如果发现仓库中包含敏感信息，请通过 GitHub Security Advisory 或私信维护者，不要开公开 Issue。
