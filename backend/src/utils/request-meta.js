'use strict';

function parseDevice(ua) {
  if (!ua) return null;
  if (/bot|crawl|spider|slurp|facebookexternalhit/i.test(ua)) return 'bot';
  if (/mobile|android|iphone|ipad|ipod|windows phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

function extractRequestMeta(req) {
  if (!req) return { country: null, device_type: null };
  const country = (req.headers && req.headers['cf-ipcountry']) || null;
  const device_type = parseDevice(req.headers && req.headers['user-agent']);
  return { country, device_type };
}

module.exports = { parseDevice, extractRequestMeta };
