#!/usr/bin/env node
/**
 * Read the rendered text of a page from a CDP-enabled Edge/Chrome.
 *
 * Usage:
 *   node read-page.mjs [port] [urlPattern] [expression]
 *
 * Examples:
 *   node read-page.mjs 9222 tokenhub/tokenplan
 *   node read-page.mjs 9222 tokenhub/models/detail document.body.innerText.slice(-4000)
 *
 * Requires Node.js 20+ (global WebSocket/fetch).
 */

const port = process.argv[2] ?? '9222';
const urlPattern = process.argv[3] ?? 'tokenhub/tokenplan';
const expression = process.argv[4] ?? 'document.body.innerText';

const base = `http://127.0.0.1:${port}`;

async function main() {
  const list = await (await fetch(`${base}/json/list`)).json();
  const page = list.find((t) => t.type === 'page' && t.url.includes(urlPattern));
  if (!page) {
    console.error(`No page matching "${urlPattern}" on port ${port}`);
    process.exit(1);
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };

  const cmd = (method, params = {}) =>
    new Promise((resolve) => {
      const requestId = ++id;
      pending.set(requestId, resolve);
      ws.send(JSON.stringify({ id: requestId, method, params }));
    });

  await cmd('Runtime.enable');
  const result = await cmd('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });

  const value = result.result?.result?.value;
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  ws.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
