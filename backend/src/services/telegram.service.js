'use strict';

const { loadEnv } = require('../config/env');
const { parseDevice, extractRequestMeta } = require('../utils/request-meta');

function escapeMd(str) {
  return String(str).replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

function formatVisitorLine(data) {
  const parts = [];
  if (data.device_type) parts.push(data.device_type === 'mobile' ? '📱' : data.device_type === 'bot' ? '🤖' : '🖥️');
  if (data.country) parts.push(escapeMd(data.country));
  return parts.length ? `\n${parts.join(' ')}` : '';
}

function formatMessage(type, data) {
  const visitor = formatVisitorLine(data);
  switch (type) {
    case 'presell.created':
      return `✅ *Presell criado*\nTítulo: ${escapeMd(data.title ?? '—')}\nSlug: ${escapeMd(data.slug ?? '—')}`;
    case 'presell.published':
      return `🚀 *Presell publicado*\nTítulo: ${escapeMd(data.title ?? '—')}\nSlug: ${escapeMd(data.slug ?? '—')}`;
    case 'presell.deleted':
      return `🗑️ *Presell removido*\nTítulo: ${escapeMd(data.title ?? '—')}\nSlug: ${escapeMd(data.slug ?? '—')}`;
    case 'admin.login':
      return `❗❗❗ *Login de admin detectado* ❗❗❗${visitor}`;
    case 'presell.page_view':
      return `👁 *Visita*\nTítulo: ${escapeMd(data.title ?? '—')}\nSlug: ${escapeMd(data.slug ?? '—')}${data.hasClickId ? '\n🎯 GCLID 🎯' : ''}${visitor}`;
    case 'presell.cta_click':
      return `🖱️ *Clique no CTA*\nTítulo: ${escapeMd(data.title ?? '—')}\nSlug: ${escapeMd(data.slug ?? '—')}${data.hasClickId ? '\n🎯 GCLID 🎯' : ''}${visitor}`;
    case 'error.critical':
      return `🔴 *Erro crítico*\n${escapeMd(data.message ?? JSON.stringify(data))}`;
    case 'deploy.triggered':
      return `🔄 *Deploy disparado*\n${escapeMd(data.message ?? '')}`;
    case 'healthcheck.ssr_down':
      return `🔴 *SSR fora do ar*\nErro: ${escapeMd(data.error ?? '—')}\nHost: ${escapeMd(data.host ?? '—')}`;
    default:
      return `[${escapeMd(type)}] ${escapeMd(JSON.stringify(data))}`;
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
