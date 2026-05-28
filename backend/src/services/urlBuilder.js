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

function buildRedirectUrl(affiliateUrl, params, gclid = null) {
  const url = new URL(affiliateUrl);

  // Add all tracking parameters
  for (const key of TRACKING_PARAMS) {
    if (params[key] && !url.searchParams.has(key)) {
      url.searchParams.set(key, params[key]);
    }
  }

  // Add gclid if provided and not already present
  if (gclid && !url.searchParams.has("gclid")) {
    url.searchParams.set("gclid", gclid);
  }

  return url.toString();
}

module.exports = { buildAffiliateUrl, buildRedirectUrl };
