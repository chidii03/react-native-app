import nodemailer from "nodemailer";

type Payload = {
  name?: string;
  email?: string;
  message?: string;
};

const getTransport = () => {
  // Support both correct env keys and mistakenly prefixed keys.
  const user = process.env.EMAIL_USER || process.env["process.env.EMAIL_USER"];
  const pass = process.env.EMAIL_PASS || process.env["process.env.EMAIL_PASS"];
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
};

const htmlTemplate = (p: Required<Payload>) => `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#0b0b12;font-family:Inter,Arial,sans-serif;color:#f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b0b12;padding:24px 12px;">
    <tr>
      <td align="center" style="text-align:center;">
        <table role="presentation" width="680" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;margin:0 auto;background:#111122;border:1px solid #26263a;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(90deg,#7c3aed,#ab8bff);padding:18px 22px;">
              <div style="font-size:22px;font-weight:900;letter-spacing:.4px;">MOVIETIME</div>
              <div style="margin-top:2px;font-size:12px;opacity:.9;">New support ticket received</div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px;">
              <div style="font-size:18px;font-weight:800;margin-bottom:6px;">Support Request</div>
              <div style="font-size:13px;color:#a1a1aa;margin-bottom:16px;">Submitted from the in-app contact form</div>

              <table width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #2f2f46;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:12px 14px;width:140px;color:#ab8bff;background:#161628;font-size:12px;font-weight:700;">Name</td>
                  <td style="padding:12px 14px;background:#131322;font-size:14px;">${p.name}</td>
                </tr>
                <tr>
                  <td style="padding:12px 14px;width:140px;color:#ab8bff;background:#161628;font-size:12px;font-weight:700;">Email</td>
                  <td style="padding:12px 14px;background:#131322;font-size:14px;">${p.email}</td>
                </tr>
                <tr>
                  <td style="padding:12px 14px;width:140px;color:#ab8bff;background:#161628;font-size:12px;font-weight:700;vertical-align:top;">Message</td>
                  <td style="padding:12px 14px;background:#131322;font-size:14px;line-height:1.6;white-space:pre-line;">${p.message}</td>
                </tr>
              </table>

              <div style="margin-top:16px;font-size:12px;color:#9ca3af;">
                Reply directly to this email to contact the user.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Payload;
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!name || !email || !message) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const transporter = getTransport();
    if (!transporter) {
      return Response.json(
        {
          error:
            "Server email is not configured. Set EMAIL_USER and EMAIL_PASS in .env then restart Expo.",
        },
        { status: 500 }
      );
    }

    const to = "chidiokwu795@gmail.com";
    const fromUser = process.env.EMAIL_USER || process.env["process.env.EMAIL_USER"];
    await transporter.sendMail({
      from: `"MovieTime Support Form" <${fromUser}>`,
      to,
      replyTo: email,
      subject: `Support request from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: htmlTemplate({ name, email, message }),
    });

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "Unable to send support message" }, { status: 500 });
  }
}
