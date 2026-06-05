'use strict';

const { loadEnv } = require('../config/env');

function formatMessage(type, data) {
  switch (type) {
    case 'presell.created':
      return `✅ *Presell criado*\nTítulo: ${data.title ?? '—'}\nSlug: ${data.slug ?? '—'}`;
    case 'presell.published':
      return `🚀 *Presell publicado*\nTítulo: ${data.title ?? '—'}\nSlug: ${data.slug ?? '—'}`;
    case 'presell.deleted':
      return `🗑️ *Presell removido*\nTítulo: ${data.title ?? '—'}\nSlug: ${data.slug ?? '—'}`;
    case 'error.critical':
      return `🔴 *Erro crítico*\n${data.message ?? JSON.stringify(data)}`;
    case 'deploy.triggered':
      return `🔄 *Deploy disparado*\n${data.message ?? ''}`;
    default:
      return `[${type}] ${JSON.stringify(data)}`;
  }
}

async function notify(type, data = {}) {
  loadEnv();

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !token.trim() || !chatId || !chatId.trim()) {
    return;
  }

  const text = formatMessage(type, data);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[telegram] envio falhou — status ${res.status}: ${body}`);
    }
  } catch (err) {
    console.error('[telegram] erro ao enviar notificação:', err);
  }
}

module.exports = { notify };
