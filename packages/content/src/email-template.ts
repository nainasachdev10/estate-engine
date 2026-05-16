export function wrapEmailTemplate(params: {
  bodyHtml: string;
  logoUrl?: string;
  brandName: string;
  ctaText?: string;
  ctaUrl?: string;
  projectName: string;
}): string {
  const { bodyHtml, logoUrl, brandName, ctaText, ctaUrl, projectName } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${brandName}</title>
  <style>
    body { margin: 0; padding: 0; background: #0a0a0a; font-family: 'Georgia', serif; color: #e5e5e5; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #111111; }
    .header { background: #111111; padding: 32px 40px 24px; border-bottom: 1px solid #2d2d2d; text-align: center; }
    .logo { max-height: 48px; max-width: 160px; }
    .brand { font-family: 'Georgia', serif; font-size: 22px; color: #d4af37; letter-spacing: 1px; }
    .body { padding: 40px; font-size: 16px; line-height: 1.8; color: #cccccc; }
    .body p { margin: 0 0 20px; }
    .cta-wrap { text-align: center; margin: 32px 0; }
    .cta { background: #d4af37; color: #0a0a0a; text-decoration: none; padding: 14px 36px; border-radius: 4px; font-weight: bold; font-size: 15px; letter-spacing: 0.5px; display: inline-block; }
    .footer { padding: 24px 40px; border-top: 1px solid #2d2d2d; text-align: center; font-size: 12px; color: #555555; }
    .project-name { color: #d4af37; font-style: italic; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      ${logoUrl
        ? `<img src="${logoUrl}" alt="${brandName}" class="logo" />`
        : `<div class="brand">${brandName}</div>`
      }
    </div>
    <div class="body">
      ${bodyHtml}
      ${ctaText && ctaUrl
        ? `<div class="cta-wrap"><a href="${ctaUrl}" class="cta">${ctaText}</a></div>`
        : ''
      }
    </div>
    <div class="footer">
      <p>You are receiving this because you enquired about <span class="project-name">${projectName}</span>.</p>
      <p>© ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
