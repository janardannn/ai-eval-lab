import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@ai-eval-lab.com";

export async function sendCompletionEmail(
  to: string,
  name: string | null,
  assessmentTitle: string,
  sessionId: string,
  verdict?: string
) {
  if (!resend) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const greeting = name ? `Hi ${name}` : "Hi";
  const verdictLine = verdict
    ? `<p style="font-size:18px;font-weight:bold;margin:16px 0">Result: ${verdict.replace(/_/g, " ").toUpperCase()}</p>`
    : "";

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Assessment Complete: ${assessmentTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <p>${greeting},</p>
        <p>Your assessment <strong>${assessmentTitle}</strong> has been graded.</p>
        ${verdictLine}
        <p><a href="${appUrl}/session/${sessionId}/verdict">View your full report</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">AI Eval Lab</p>
      </div>
    `,
  });
}
