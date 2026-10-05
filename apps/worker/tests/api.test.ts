import { describe, it, expect } from 'vitest';
import { app } from '../src/index.js';

describe('TempBox API Endpoints', () => {
  it('responds with 200 on /api/health', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
  });

  it('creates a mailbox and handles simulation flow', async () => {
    // 1. Create mailbox
    const createRes = await app.request('/api/mailboxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alias: 'testbox', ttlSeconds: 3600 })
    });
    expect(createRes.status).toBe(201);
    const { mailbox } = await createRes.json();
    expect(mailbox.id).toBeDefined();
    expect(mailbox.address).toBe('testbox@tempbox.dev');
    expect(mailbox.token).toBeDefined();

    // 2. Fetch mailbox
    const getRes = await app.request(`/api/mailboxes/${mailbox.id}`);
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.mailbox.address).toBe('testbox@tempbox.dev');

    // 3. Inject mock email with OTP
    const simEmailRes = await app.request('/api/simulations/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mailboxId: mailbox.id,
        template: 'github_otp'
      })
    });
    expect(simEmailRes.status).toBe(201);
    const { message } = await simEmailRes.json();
    expect(message.extractedOtp?.code).toBe('849201');

    // 4. Fetch message list
    const msgListRes = await app.request(`/api/mailboxes/${mailbox.id}/messages`);
    expect(msgListRes.status).toBe(200);
    const { emails } = await msgListRes.json();
    expect(emails.length).toBe(1);
    expect(emails[0].extractedOtp?.code).toBe('849201');

    // 5. Ingest webhook via public token endpoint /h/:token
    const hookRes = await app.request(`/h/${mailbox.token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Header': 'TempBoxTesting'
      },
      body: JSON.stringify({ event: 'ping', status: 'ok' })
    });
    expect(hookRes.status).toBe(200);

    // 6. Fetch overview endpoint
    const overviewRes = await app.request(`/api/mailboxes/${mailbox.id}/overview`);
    expect(overviewRes.status).toBe(200);
    const overview = await overviewRes.json();
    expect(overview.emails.length).toBe(1);
    expect(overview.webhooks.length).toBe(1);
    expect(overview.webhooks[0].headers['x-custom-header']).toBe('TempBoxTesting');

    // 7. Purge mailbox
    const deleteRes = await app.request(`/api/mailboxes/${mailbox.id}`, {
      method: 'DELETE'
    });
    expect(deleteRes.status).toBe(200);

    // 8. Confirm mailbox is purged
    const afterDeleteRes = await app.request(`/api/mailboxes/${mailbox.id}`);
    expect(afterDeleteRes.status).toBe(404);
  });
});
