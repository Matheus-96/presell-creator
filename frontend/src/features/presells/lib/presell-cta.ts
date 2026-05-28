export function handlePresellCta(slug: string, affiliateUrl: string) {
  navigator.sendBeacon(`/api/public/presells/${slug}/redirect`)
  window.location.href = affiliateUrl
}
