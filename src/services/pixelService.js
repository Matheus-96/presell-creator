/**
 * Generate Google Ads Pixel HTML (script tag + noscript fallback)
 * @param {string} pixelId - The Google Ads conversion pixel ID
 * @returns {string} HTML string with script and noscript tags
 */
function generatePixelHtml(pixelId) {
  if (!pixelId || !String(pixelId).trim()) {
    return "";
  }

  const cleanPixelId = String(pixelId).trim();
  
  const scriptTag = `<script async src="https://www.googletagmanager.com/gtag/js?id=${cleanPixelId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${cleanPixelId}');
</script>`;

  const noscriptTag = `<noscript>
  <img height="1" width="1" style="display:none" 
    src="https://www.googleadservices.com/pagead/conversion/${cleanPixelId}/?label=&guid=ON&script=0"/>
</noscript>`;

  return `${scriptTag}\n${noscriptTag}`;
}

module.exports = {
  generatePixelHtml
};
