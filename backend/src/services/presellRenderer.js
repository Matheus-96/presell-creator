const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { serializePublicPresell } = require("../contracts");

// Bundle gerado em build time por scripts/build-templates.js. Contém o mapa
// templateId -> ReactComponent dos templates do frontend.
const { registry } = require("../templates/templates.bundle.js");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderGooglePixel(googlePixelId) {
  if (!googlePixelId) return "";

  const id = escapeHtml(googlePixelId);
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>` +
    `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
    `gtag('js',new Date());gtag('config','${id}');</script>`;
}

// Constrói uma URL absoluta a partir de um caminho relativo de mídia, usando
// PUBLIC_BASE_URL quando configurado. Sem base configurada, mantém relativo.
function absoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  return base ? `${base}${pathOrUrl}` : pathOrUrl;
}

function renderHead(publicData) {
  const title = escapeHtml(publicData.headline || publicData.slug);
  const description = escapeHtml(publicData.subtitle || "");
  const canonical = `/p/${escapeHtml(publicData.slug)}`;
  const ogImage = absoluteUrl(publicData.imageUrl);

  return [
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${canonical}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : "",
    '<link rel="stylesheet" href="/assets/presell.css">',
    renderGooglePixel(publicData.googlePixelId)
  ]
    .filter(Boolean)
    .join("\n    ");
}

function renderTrackingScript(publicData) {
  const slug = JSON.stringify(publicData.slug);
  const affiliateUrl = JSON.stringify(publicData.affiliateUrl || "");
  const trackingParam = JSON.stringify(publicData.trackingParam || "gclid");

  return `<script>(function(){
  var slug=${slug};
  var affiliateUrl=${affiliateUrl};
  var trackingParam=${trackingParam};
  var params={};
  location.search.slice(1).split('&').forEach(function(p){var kv=p.split('=');if(kv[0])params[decodeURIComponent(kv[0])]=decodeURIComponent(kv[1]||'');});
  fetch('/api/public/presells/'+slug+'/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventType:'page_view',params:params})}).catch(function(){});
  var startTime=Date.now();var timeSent=false;
  function sendTime(){if(timeSent)return;timeSent=true;var seconds=Math.round((Date.now()-startTime)/1000);if(seconds<1)return;navigator.sendBeacon('/api/public/presells/'+slug+'/events',new Blob([JSON.stringify({eventType:'time_on_page',params:{seconds:seconds}})],{type:'application/json'}));}
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')sendTime();});
  window.addEventListener('pagehide',sendTime,{once:true});
  document.querySelectorAll('[data-presell-cta]').forEach(function(el){
    el.addEventListener('click',function(e){
      e.preventDefault();
      sendTime();
      navigator.sendBeacon('/api/public/presells/'+slug+'/events',new Blob([JSON.stringify({eventType:'cta_click',params:params})],{type:'application/json'}));
      try{var u=new URL(affiliateUrl);var tv=params[trackingParam];if(tv&&!u.searchParams.has(trackingParam))u.searchParams.set(trackingParam,tv);location.href=u.toString();}catch(err){location.href=affiliateUrl;}
    });
  });
})();</script>`;
}

function renderPresellHtml(presell) {
  const publicData = serializePublicPresell(presell);
  const Template = registry[publicData.templateId];

  if (!Template) {
    throw new Error(
      `Template "${publicData.templateId}" não encontrado no bundle de templates.`
    );
  }

  const body = renderToStaticMarkup(createElement(Template, { presell: publicData }));

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    ${renderHead(publicData)}
  </head>
  <body>${body}
  ${renderTrackingScript(publicData)}</body>
</html>`;
}

module.exports = { renderPresellHtml };
