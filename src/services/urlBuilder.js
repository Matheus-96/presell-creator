const { TRACKING_PARAMS } = require("../middleware/tracking");

function buildAffiliateUrl(baseUrl, params) {
  const url = new URL(baseUrl);

  for (const key of TRACKING_PARAMS) {
    if (params[key] && !url.searchParams.has(key)) {
      url.searchParams.set(key, params[key]);
    }
  }

  return url.toString();
}

module.exports = { buildAffiliateUrl };
