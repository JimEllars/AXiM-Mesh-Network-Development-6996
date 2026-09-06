export async function sendEmailItMessage(
  env: any,
  to: string,
  bcc: string,
  subject: string,
  html: string
): Promise<boolean> {
  const payload = {
    to,
    bcc,
    subject,
    html
  };

  try {
    const response = await fetch('https://api.emailit.com/v1/email/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.EMAILIT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('EmailIt API returned error:', await response.text());
      await bufferToDlq(env, payload);
      return false;
    }

    return true;
  } catch (error) {
    console.error('EmailIt request failed:', error);
    await bufferToDlq(env, payload);
    return false;
  }
}

async function bufferToDlq(env: any, payload: any) {
  try {
    const id = `email_fail_${Date.now()}`;
    await env.MESH_DLQ_KV.put(id, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to write to DLQ:', err);
  }
}
