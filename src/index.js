addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    let path = url.pathname.slice(1);

    if (!path) {
      return new Response('Empty URL\n', { status: 400 });
    }

    // 自动补全协议
    if (!/^https?:\/\//i.test(path)) {
      path = "https://" + path;
    }

    // 去掉首尾多余的 /
    path = path.replace(/^\/+|\/+$/g, "");

    // 发起目标请求
    const res = await fetch(path);

    // 收集 favicon
    const icons = [];
    const rewriter = new HTMLRewriter()
      .on('link[rel*="icon"]:not([rel*="mask-icon"])', {
        element(element) {
          const href = element.getAttribute('href');
          const type = element.getAttribute('type') || "";
          if (href) {
            // 自动补全相对路径
            const absoluteUrl = new URL(href, path).href;
            icons.push({ url: absoluteUrl, type });
          }
        }
      });

    await rewriter.transform(res).arrayBuffer();

    // SVG 优先，其次取第一个
    const finalIcon = icons.find(i => i.type.includes('svg') || i.url.endsWith('.svg'))?.url
                      || icons[0]?.url;

    if (!finalIcon) {
      return new Response("No favicon found", { status: 404 });
    }

    // 返回 favicon
    const iconResp = await fetch(finalIcon);
    const headers = new Headers(iconResp.headers);
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(iconResp.body, {
      status: iconResp.status,
      statusText: iconResp.statusText,
      headers
    });

  } catch (err) {
    return new Response("Failed to fetch favicon: " + err.message, { status: 502 });
  }
}