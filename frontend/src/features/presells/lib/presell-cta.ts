import { buildAffiliateUrl } from '@/lib/affiliate.ts'
import { DEFAULT_TRACKING_PARAM } from '@/features/presells/lib/constants.ts'

export function handlePresellCta(slug: string, affiliateUrl: string, trackingParam = DEFAULT_TRACKING_PARAM) {
  navigator.sendBeacon(`/api/public/presells/${slug}/redirect`)
  window.location.href = buildAffiliateUrl(affiliateUrl, trackingParam)
}
