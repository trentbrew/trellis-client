const o="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";function n(e){return e.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<link\b[^>]*>/gi,"").replace(/<iframe\b[\s\S]*?<\/iframe>/gi,"").replace(/<iframe\b[^>]*\/?>/gi,"").replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh[^>]*>/gi,"").replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,"").replace(/(href|src|action)\s*=\s*(["'])\s*javascript:[^"']*\2/gi,'$1="#"').replace(/(src)\s*=\s*(["'])\s*cid:[^"']*\2/gi,`$1=$2${o}$2`)}function p(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function r(e){return`<pre style="white-space:pre-wrap;font-family:ui-sans-serif,system-ui,sans-serif;margin:0;">${p(e)}</pre>`}const l=`
  html, body { margin: 0; padding: 0; background: #ffffff; color: #111111; }
  body {
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
  a { color: #2563eb; }
  pre, code { white-space: pre-wrap; word-break: break-word; }
  blockquote { margin: 1em 0; padding-left: 1em; border-left: 3px solid #e5e7eb; color: #555; }
`;function c(e,a={}){const t=e.bodyHtml||"",i=t?n(t):e.bodyText?r(e.bodyText):e.snippet?r(e.snippet):"",s=a.thumbnail?`
      body { padding: 12px; pointer-events: none; user-select: none; }
      a { pointer-events: none; }
    `:"";return`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<base target="_blank">
<style>${l}${s}</style>
</head>
<body>${i}</body>
</html>`}export{c as b};
