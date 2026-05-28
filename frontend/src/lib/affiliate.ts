export function buildAffiliateUrl(affiliateUrl: string): string {
  const gclid = new URLSearchParams(window.location.search).get('gclid')
  if (!gclid) return affiliateUrl
  try {
    const url = new URL(affiliateUrl)
    if (!url.searchParams.has('gclid')) {
      url.searchParams.set('gclid', gclid)
    }
    return url.toString()
  } catch {
    return affiliateUrl
  }
}
