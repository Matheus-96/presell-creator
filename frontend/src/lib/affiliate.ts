import { DEFAULT_TRACKING_PARAM } from '@/features/presells/lib/constants.ts'

export function buildAffiliateUrl(affiliateUrl: string, trackingParam = DEFAULT_TRACKING_PARAM): string {
  const gclid = new URLSearchParams(window.location.search).get('gclid')
  if (!gclid) return affiliateUrl
  try {
    const url = new URL(affiliateUrl)
    if (!url.searchParams.has(trackingParam)) {
      url.searchParams.set(trackingParam, gclid)
    }
    return url.toString()
  } catch {
    return affiliateUrl
  }
}
