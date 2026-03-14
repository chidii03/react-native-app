// app/api/support+api.ts

type Payload = {
  name?: string;
  email?: string;
  message?: string;
};

const htmlTemplate = (name: string, email: string, message: string) => `
<!doctype html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0b0b12;font-family:Inter,Arial,sans-serif;color:#f4f4f5;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#0b0b12;padding:24px 12px;">
    <tr><td align="center">
      <table width="600" cellspacing="0" cellpadding="0"
        style="max-width:600px;background:#111122;border:1px solid #26263a;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(90deg,#7c3aed,#ab8bff);padding:18px 22px;">
            <div style="font-size:22px;font-weight:900;">MOVIETIME</div>
            <div style="font-size:12px;opacity:.85;margin-top:2px;">New support ticket received</div>
          </td>
        </tr>
        <tr><td style="padding:22px;">
          <div style="font-size:18px;font-weight:800;margin-bottom:4px;">Support Request</div>
          <div style="font-size:13px;color:#a1a1aa;margin-bottom:18px;">Submitted via in-app contact form</div>
          <table width="100%" cellspacing="0" cellpadding="0"
            style="border:1px solid #2f2f46;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:11px 14px;width:110px;color:#ab8bff;background:#161628;font-size:12px;font-weight:700;">Name</td>
              <td style="padding:11px 14px;background:#131322;font-size:14px;">${name}</td>
            </tr>
            <tr>
              <td style="padding:11px 14px;color:#ab8bff;background:#161628;font-size:12px;font-weight:700;">Email</td>
              <td style="padding:11px 14px;background:#131322;font-size:14px;">${email}</td>
            </tr>
            <tr>
              <td style="padding:11px 14px;color:#ab8bff;background:#161628;font-size:12px;font-weight:700;vertical-align:top;">Message</td>
              <td style="padding:11px 14px;background:#131322;font-size:14px;line-height:1.6;white-space:pre-line;">${message}</td>
            </tr>
          </table>
          <div style="margin-top:14px;font-size:12px;color:#9ca3af;">
            Reply to this email to respond to the user.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export async function POST(request: Request): Promise<Response> {
  try {
    const body    = (await request.json()) as Payload;
    const name    = String(body.name    ?? "").trim();
    const email   = String(body.email   ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!name || !email || !message) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Email service not configured. Add RESEND_API_KEY to Vercel Environment Variables." },
        { status: 500 }
      );
    }

    // Send email via Resend REST API — plain fetch, no native modules
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        // Use Resend's free test address OR your verified domain address
        from:     "MovieTime Support <onboarding@resend.dev>",
        to:       ["chidiokwu795@gmail.com"],
        reply_to: email,
        subject:  `Support request from ${name}`,
        html:     htmlTemplate(name, email, message),
        text:     `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err as any)?.message ?? `Resend error ${res.status}`;
      return Response.json({ error: msg }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json(
      { error: e?.message ?? "Unable to send support message" },
      { status: 500 }
    );
  }
}