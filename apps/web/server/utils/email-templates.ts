/**
 * Email HTML templates for transactional notifications.
 *
 * All templates return a complete HTML string ready to pass to sendEmail().
 * Styling is inline for maximum email client compatibility.
 */

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0a0a0a;
  color: #e5e5e5;
  margin: 0;
  padding: 0;
`

const CARD_STYLE = `
  max-width: 520px;
  margin: 40px auto;
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  overflow: hidden;
`

const HEADER_STYLE = `
  padding: 28px 32px 20px;
  border-bottom: 1px solid #2a2a2a;
`

const BODY_STYLE = `
  padding: 28px 32px;
`

const FOOTER_STYLE = `
  padding: 16px 32px;
  border-top: 1px solid #2a2a2a;
  font-size: 11px;
  color: #555;
  text-align: center;
`

const BTN_STYLE = `
  display: inline-block;
  margin-top: 20px;
  padding: 10px 20px;
  background: #7c3aed;
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
`

function wrap(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="${HEADER_STYLE}">
      <span style="font-size:18px;font-weight:700;color:#e5e5e5;">Trellis</span>
    </div>
    <div style="${BODY_STYLE}">${content}</div>
    <div style="${FOOTER_STYLE}">You're receiving this because you're a member of a Trellis workspace. <a href="{{{unsubscribeUrl}}}" style="color:#555;">Unsubscribe</a></div>
  </div>
</body></html>`
}

export function inviteEmailHtml(opts: {
  inviterName: string
  orgName: string
  inviteUrl: string
}): string {
  return wrap(`
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#e5e5e5;">You've been invited to ${opts.orgName}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#999;">${opts.inviterName} invited you to join <strong style="color:#e5e5e5;">${opts.orgName}</strong> on Trellis.</p>
    <a href="${opts.inviteUrl}" style="${BTN_STYLE}">Accept invitation</a>
    <p style="margin:24px 0 0;font-size:12px;color:#555;">Or copy this link: <a href="${opts.inviteUrl}" style="color:#7c3aed;">${opts.inviteUrl}</a></p>
  `)
}

export function mentionEmailHtml(opts: {
  actorName: string
  entityTitle: string
  actionUrl: string
}): string {
  return wrap(`
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#e5e5e5;">You were mentioned</p>
    <p style="margin:0 0 20px;font-size:14px;color:#999;"><strong style="color:#e5e5e5;">${opts.actorName}</strong> mentioned you in <strong style="color:#e5e5e5;">${opts.entityTitle}</strong>.</p>
    <a href="${opts.actionUrl}" style="${BTN_STYLE}">View</a>
  `)
}

export function commentEmailHtml(opts: {
  actorName: string
  entityTitle: string
  commentSnippet: string
  actionUrl: string
}): string {
  return wrap(`
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#e5e5e5;">New comment on "${opts.entityTitle}"</p>
    <p style="margin:0 0 12px;font-size:14px;color:#999;"><strong style="color:#e5e5e5;">${opts.actorName}</strong> commented:</p>
    <blockquote style="margin:0 0 20px;padding:12px 16px;background:#1e1e1e;border-left:3px solid #7c3aed;border-radius:4px;font-size:14px;color:#ccc;">${opts.commentSnippet}</blockquote>
    <a href="${opts.actionUrl}" style="${BTN_STYLE}">View comment</a>
  `)
}

export function assignedEmailHtml(opts: {
  actorName: string
  taskTitle: string
  actionUrl: string
}): string {
  return wrap(`
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#e5e5e5;">Task assigned to you</p>
    <p style="margin:0 0 20px;font-size:14px;color:#999;"><strong style="color:#e5e5e5;">${opts.actorName}</strong> assigned <strong style="color:#e5e5e5;">"${opts.taskTitle}"</strong> to you.</p>
    <a href="${opts.actionUrl}" style="${BTN_STYLE}">View task</a>
  `)
}
