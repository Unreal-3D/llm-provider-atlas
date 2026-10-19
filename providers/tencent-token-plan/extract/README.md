# 提取方法

腾讯云 TokenHub 控制台需要登录态，模型详情页的内容也不是静态 HTML。推荐用浏览器 CDP 读取已登录页面。

## 1. 准备调试用 Edge

先退出所有 Edge 实例，再复制一份用户数据目录（保留登录态）：

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

启动带远程调试端口的 Edge：

```bash
open -na "Microsoft Edge" --args \
  --user-data-dir="$HOME/.zcode/edge-debug-profile" \
  --remote-debugging-port=9222 \
  --no-first-run \
  --restore-last-session
```

验证：

```bash
curl -sS http://127.0.0.1:9222/json/version
```

## 2. 读取页面正文

```bash
node read-page.mjs 9222 tokenhub/tokenplan
```

`read-page.mjs` 会连接 9222 端口，找到 URL 包含指定片段的标签页，输出 `document.body.innerText`。

## 3. 读取单个模型的参数

打开模型详情页：

```text
https://console.cloud.tencent.com/tokenhub/models/detail?modelId=glm-5.3&regionId=1&from=all
```

然后从页面正文中截取「模型限制」到「调用协议」之间的内容：

```text
模型限制
最大输入 Tokens
1024k
最大输出 Tokens
128k
上下文窗口
1024k
最大 TPM
1000000
最大 RPM
60
```

## 4. 通过控制台 CGI 获取完整元数据（进阶）

在已登录的控制台页面上下文中，复用任意一个成功的 `cgi/capi` 请求 URL（带 `csrfCode` 和 `uin`），把 `cmd` 换成 `DescribeModelList`：

```js
const base = performance.getEntriesByType('resource')
  .map(r => r.name)
  .find(u => /cgi\/capi\?/.test(u) && /serviceType=tokenhub/.test(u) && /csrfCode=/.test(u));

const url = new URL(base);
url.searchParams.set('cmd', 'DescribeModelList');
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

关键字段：

- `ModelSet[].ModelId`
- `ModelSet[].ModelSpec.ContextLength`
- `ModelSet[].ModelSpec.MaxInputToken`
- `ModelSet[].ModelSpec.MaxOutputToken`
- `ModelSet[].ModelChargingInfo`
- `ModelSet[].FreeTrialInfo`
- `ModelSet[].ModelAPIInfo.Reference`

能力列表用 `DescribeModelCapabilityList`，关注 `InputImage`、`InputVideo`、`DeepThink`、`FunctionCall`、`StructOutput`、`Cache`。

## 5. 脱敏

提交前确认：

- 不包含真实 API Key、Cookie、账号 UIN、CSRF token
- 不包含 `RequestId` / `SeqId` 等请求级数据
- 示例中的 Key 一律使用 `<YOUR_API_KEY>`

详细说明见仓库根目录的 [SECURITY.md](../../../SECURITY.md)。
