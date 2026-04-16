from __future__ import annotations

import logging
import os

logger = logging.getLogger('hierarchical_inference')

FROM_ADDRESS = 'accounts@med-scan.app'
FROM_NAME = 'MedAI'


def send_reset_code(to_email: str, code: str) -> tuple[bool, str]:
    api_key = os.environ.get('RESEND_API_KEY', 're_c1NNdbUQ_bmntG9y1ujMio8WTzaq4NcWN').strip()
    if not api_key:
        logger.error('RESEND_API_KEY is not set — cannot send email.')
        return False, 'Email service is not configured. Please contact the administrator.'

    try:
        import resend
        resend.api_key = api_key

        html_body = f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#050b14;font-family:Inter,Arial,sans-serif;color:#f0f4f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050b14;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:#0A111E;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <span style="font-size:22px;font-weight:700;color:#00f0ff;letter-spacing:-0.5px;">
                &#9889; MedAI
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#f0f4f8;">
                Password Reset Request
              </h1>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6;">
                We received a request to reset the password for your MedAI account associated
                with <strong style="color:#f0f4f8;">{to_email}</strong>.
                Use the code below to set a new password.
              </p>
              <div style="text-align:center;margin:28px 0;">
                <div style="display:inline-block;background:rgba(0,240,255,0.08);
                            border:2px solid #00f0ff;border-radius:12px;
                            padding:20px 40px;">
                  <div style="font-size:11px;text-transform:uppercase;
                               letter-spacing:0.12em;color:#94a3b8;margin-bottom:8px;">
                    Your Reset Code
                  </div>
                  <div style="font-size:40px;font-weight:800;letter-spacing:0.25em;
                               color:#00f0ff;font-family:monospace;">
                    {code}
                  </div>
                  <div style="font-size:11px;color:#94a3b8;margin-top:8px;">
                    Valid for 15 minutes
                  </div>
                </div>
              </div>
              <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
                If you did not request a password reset, you can safely ignore this email.
                Your password will not be changed.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:12px;color:#64748b;">
                MedAI &mdash; Intelligent scan analysis powered by deep learning.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
""".strip()

        plain_body = (
            f"MedAI Password Reset\n\n"
            f"Your reset code is: {code}\n\n"
            f"This code is valid for 15 minutes.\n\n"
            f"If you did not request a password reset, please ignore this email."
        )

        params: resend.Emails.SendParams = {
            "from": f"{FROM_NAME} <{FROM_ADDRESS}>",
            "to": [to_email],
            "subject": f"Your MedAI password reset code: {code}",
            "html": html_body,
            "text": plain_body,
        }
        resend.Emails.send(params)
        return True, ''
    except Exception as exc:
        logger.error('Failed to send reset email to %s: %s', to_email, exc, exc_info=True)
        return False, 'Failed to send reset email. Please try again later.'
