let twilioClient: any;
let twilioReady = false;
function isTwilioEnabled(): boolean {
  return (process.env.TWILIO_ENABLED ?? 'true').toLowerCase() !== 'false';
}
function getClient() {
  if (twilioReady) return twilioClient;
  // Lazy import para evitar fallo si no está instalado o configurado
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Twilio = require('twilio');
  const cfg = envTwilio();
  twilioClient = Twilio(cfg.accountSid, cfg.authToken);
  twilioReady = true;
  return twilioClient;
}

function envTwilio() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!accountSid || !authToken || !verifyServiceSid) {
    throw new Error('Missing Twilio env vars');
  }
  return { accountSid, authToken, verifyServiceSid } as const;
}

export async function sendVerification(phone: string): Promise<void> {
  if (!isTwilioEnabled()) return; // modo dev: no enviar SMS
  const { verifyServiceSid } = envTwilio();
  await getClient().verify.v2.services(verifyServiceSid).verifications.create({ to: phone, channel: 'sms' });
}

export async function checkVerification(phone: string, code: string): Promise<boolean> {
  if (!isTwilioEnabled()) {
    return code === '000000'; // modo dev: OTP fijo
  }
  const { verifyServiceSid } = envTwilio();
  const res = await getClient().verify.v2.services(verifyServiceSid).verificationChecks.create({ to: phone, code });
  return res.status === 'approved';
}


