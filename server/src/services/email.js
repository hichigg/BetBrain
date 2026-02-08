import { Resend } from 'resend';

let resend;
function getClient() {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function sendOTP(email, code) {
  const { error } = await getClient().emails.send({
    from: 'BetBrain <onboarding@resend.dev>',
    to: email,
    subject: 'Your BetBrain login code',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a2e; margin-bottom: 8px;">BetBrain Login Code</h2>
        <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Enter this code to sign in to your account:</p>
        <div style="background: #f4f4f8; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #4f46e5;">${code}</span>
        </div>
        <p style="color: #999; font-size: 12px;">This code expires in 5 minutes. If you didn't request this, you can safely ignore it.</p>
      </div>
    `,
  });

  if (error) {
    console.error('Resend error:', error);
    throw new Error('Failed to send verification email');
  }
}
