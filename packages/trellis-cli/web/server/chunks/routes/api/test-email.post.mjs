import { d as defineEventHandler, r as readBody, c as createError, w as getRequestURL, R as sendEmail } from '../../nitro/nitro.mjs';
import 'zod';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'better-sqlite3';
import 'crypto';
import '@google/generative-ai';
import 'node:vm';
import '@instantdb/admin';
import 'node:url';
import '@iconify/utils';
import 'consola';

const testEmail_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!(body == null ? void 0 : body.email)) {
    throw createError({ statusCode: 400, message: "email is required" });
  }
  const reqUrl = getRequestURL(event);
  const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#e5e5e5;margin:0;padding:0;">
  <div style="max-width:520px;margin:40px auto;background:#141414;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
    <div style="padding:28px 32px 20px;border-bottom:1px solid #2a2a2a;">
      <span style="font-size:18px;font-weight:700;color:#e5e5e5;">Trellis</span>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#e5e5e5;">Your email notifications are working</p>
      <p style="margin:0 0 20px;font-size:14px;color:#999;">This is a test email sent from <strong style="color:#e5e5e5;">${baseUrl}</strong>. If you received this, email delivery is configured correctly.</p>
      <div style="padding:16px;background:#1e1e1e;border-radius:8px;border-left:3px solid #7c3aed;">
        <p style="margin:0;font-size:13px;color:#aaa;">Sent to: <strong style="color:#e5e5e5;">${body.email}</strong></p>
      </div>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #2a2a2a;font-size:11px;color:#555;text-align:center;">
      Trellis notification test \u2014 you can safely ignore this email.
    </div>
  </div>
</body></html>
`;
  const result = await sendEmail({
    to: body.email,
    subject: "Trellis \u2014 email notification test",
    html
  });
  if (!result.ok) {
    throw createError({ statusCode: 500, message: result.error || "Failed to send test email" });
  }
  return { ok: true, id: result.id };
});

export { testEmail_post as default };
//# sourceMappingURL=test-email.post.mjs.map
