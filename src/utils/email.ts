import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface WelcomeEmailParams {
  to: string;
  firstName: string;
  companyName: string;
  loginUrl: string;
  tempPassword: string;
  employeeId: string;
}

export const sendWelcomeEmail = async (params: WelcomeEmailParams) => {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your-resend-api-key') {
    console.log('Email skipped — no RESEND_API_KEY configured');
    console.log('Would send to:', params.to);
    console.log('Password:', params.tempPassword);
    return false;
  }

  try {
    await resend.emails.send({
      from: 'HR System <onboarding@resend.dev>',
      to: params.to,
      subject: `Welcome to ${params.companyName} — Your Login Credentials`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 24px;">

    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:#0066CC;border-radius:14px;margin-bottom:16px;">
        <span style="font-size:22px;font-weight:800;color:white;">HR</span>
      </div>
      <h1 style="font-size:24px;font-weight:700;color:#1D1D1F;margin:0 0 6px;">Welcome to ${params.companyName}!</h1>
      <p style="font-size:15px;color:#6E6E73;margin:0;">Your HR account is ready</p>
    </div>

    <div style="background:white;border-radius:18px;padding:32px;border:1px solid rgba(0,0,0,0.08);margin-bottom:16px;">
      <p style="font-size:15px;color:#1D1D1F;margin:0 0 24px;">Hi <strong>${params.firstName}</strong>,</p>
      <p style="font-size:14px;color:#6E6E73;line-height:1.6;margin:0 0 24px;">
        Your employee account has been created. You can now login to access your profile, apply for leave, view payslips, and more.
      </p>

      <div style="background:#F5F5F7;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:600;color:#AEAEB2;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px;">Your Login Credentials</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6E6E73;width:120px;">Employee ID</td>
            <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1D1D1F;">${params.employeeId}</td>
          </tr>
          <tr style="border-top:1px solid rgba(0,0,0,0.06);">
            <td style="padding:8px 0;font-size:13px;color:#6E6E73;">Email</td>
            <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1D1D1F;">${params.to}</td>
          </tr>
          <tr style="border-top:1px solid rgba(0,0,0,0.06);">
            <td style="padding:8px 0;font-size:13px;color:#6E6E73;">Password</td>
            <td style="padding:8px 0;">
              <span style="font-size:16px;font-weight:700;color:#0066CC;font-family:monospace;background:#E8F0FF;padding:4px 10px;border-radius:6px;letter-spacing:1px;">${params.tempPassword}</span>
            </td>
          </tr>
        </table>
      </div>

      <a href="${params.loginUrl}" style="display:block;text-align:center;padding:14px 24px;background:#0066CC;color:white;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;margin-bottom:16px;">
        Login to HR Portal →
      </a>

      <div style="background:#FFF8E1;border-radius:10px;padding:14px;border:1px solid rgba(183,119,13,0.15);">
        <p style="font-size:12px;color:#B7770D;margin:0;line-height:1.5;">
          ⚠️ <strong>Important:</strong> Please change your password immediately after first login. Go to Settings → Account → Change Password.
        </p>
      </div>
    </div>

    <p style="font-size:12px;color:#AEAEB2;text-align:center;line-height:1.5;">
      This email was sent by ${params.companyName}'s HR system.<br>
      If you didn't expect this, please contact your HR department.
    </p>
  </div>
</body>
</html>
      `,
    });
    return true;
  } catch (error) {
    console.error('Email send failed:', error);
    return false;
  }
};

export const sendLeaveStatusEmail = async (to: string, firstName: string, status: string, leaveType: string, days: number) => {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your-resend-api-key') return false;

  try {
    await resend.emails.send({
      from: 'HR System <onboarding@resend.dev>',
      to,
      subject: `Leave Request ${status} — ${leaveType}`,
      html: `
<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:40px auto;padding:0 24px;">
  <div style="background:white;border-radius:16px;padding:28px;border:1px solid rgba(0,0,0,0.08);">
    <h2 style="font-size:20px;font-weight:700;color:#1D1D1F;margin:0 0 8px;">Leave Request ${status}</h2>
    <p style="font-size:14px;color:#6E6E73;line-height:1.6;margin:0 0 20px;">
      Hi <strong>${firstName}</strong>, your ${leaveType} request for <strong>${days} day(s)</strong> has been <strong style="color:${status === 'APPROVED' ? '#1D8348' : '#C0392B'}">${status.toLowerCase()}</strong>.
    </p>
    <div style="padding:14px;background:${status === 'APPROVED' ? '#F0FDF4' : '#FEF0EF'};border-radius:10px;font-size:13px;color:${status === 'APPROVED' ? '#1D8348' : '#C0392B'};">
      ${status === 'APPROVED' ? '✓ Your leave has been approved. Enjoy your time off!' : '✗ Your leave request was not approved. Please contact HR for more information.'}
    </div>
  </div>
</div>
      `,
    });
    return true;
  } catch (error) {
    return false;
  }
};
