/**
 * Form Preview Live Update Handler
 * Monitors form changes and updates preview pane via hidden form POST to iframe
 */

(function () {
  const DEBUG = true;
  const IFRAME_ID = 'preview-iframe';
  const HIDDEN_FORM_ID = 'preview-form-hidden';

  const iframe = document.getElementById(IFRAME_ID);
  
  // Create or get hidden form
  const hiddenForm = document.getElementById(HIDDEN_FORM_ID) || (() => {
    const f = document.createElement('form');
    f.id = HIDDEN_FORM_ID;
    f.method = 'POST';
    f.target = IFRAME_ID;
    f.style.display = 'none';
    document.body.appendChild(f);
    return f;
  })();

  /**
   * Extract presell ID from URL
   * Returns null for /presells/new, ID number for /presells/:id/edit
   */
  function getPresellId() {
    const pathMatch = window.location.pathname.match(/presells\/(\d+)/);
    return pathMatch ? pathMatch[1] : null;
  }

  const fieldToSelectorMap = {
    'settings[badge_text]': '.official-simple-badge',
    'settings[trust_badges]': '.official-simple-trust-list',
    'settings[accent_color]': '.official-simple-cta',
    'settings[discount_text]': '.offer-modal-discount',
    'settings[scarcity_text]': '.offer-modal-scarcity',
    'settings[rating]': '.offer-modal-rating-value',
    'settings[stars_text]': '.offer-modal-rating',
    'settings[modal_cta_text_override]': '.offer-modal-cta',
    'settings[overlay_strength]': '.offer-modal-overlay',
    'settings[frame_type]': '.device-frame-window',
    'settings[top_bar_text]': '.device-frame-top-bar',
    'settings[footer_left_text]': '.device-frame-footer',
    'settings[footer_right_text]': '.device-frame-footer',
    'settings[offer_note]': '.device-frame-offer-note',
    'settings[label_text]': '.app-ad-label',
    'settings[microcopy]': '.app-ad-microcopy',
    'settings[disclaimer]': '.app-ad-disclaimer',
    'settings[layout_density]': '.app-ad-shell, .app-ad-fullscreen-shell',
    'settings[button_style]': '.app-ad-cta',
    'headline': 'h1',
    'subtitle': '.lead, .subtitle, .app-ad-subtitle',
    'body': '.copy, .app-ad-body-copy',
    'bullets': '.benefits li, .app-ad-benefits li',
    'cta_text': '.cta, .app-ad-cta, .official-simple-cta, .offer-modal-cta, .device-frame-cta'
  };

  function getPreviewSelector(fieldName) {
    return fieldToSelectorMap[fieldName] || `[name="${fieldName}"]`;
  }

  /**
   * Update preview by submitting hidden form
   */
  function updatePreview() {
    const mainForm = document.querySelector('form');
    if (!mainForm) return;

    const formData = new FormData(mainForm);

    // Clear hidden form
    while (hiddenForm.firstChild) {
      hiddenForm.removeChild(hiddenForm.firstChild);
    }

    // Add CSRF token
    const csrf = mainForm.querySelector('input[name="_csrf"]');
    if (csrf) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = '_csrf';
      input.value = csrf.value;
      hiddenForm.appendChild(input);
    }

    // Add all form fields
    for (const [key, value] of formData.entries()) {
      if (key === '_csrf') continue;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      hiddenForm.appendChild(input);
    }

    // Set action based on whether it's new or existing
    const presellId = getPresellId();
    hiddenForm.action = presellId
      ? `/admin/api/presells/${presellId}/preview`
      : '/admin/api/presells/preview';

    if (DEBUG) {
      console.log('[Preview] Submitting form to:', hiddenForm.action);
      console.log('[Preview] Form data:', Object.fromEntries(new FormData(mainForm).entries()));
    }

    hiddenForm.submit();
  }

  /**
   * Send ready message to iframe
   */
  function sendReadyMessage() {
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage({ type: 'ready' }, '*');
  }

  /**
   * Initialize form listeners
   */
  function initializeFormListeners() {
    const mainForm = document.querySelector('form');
    if (!mainForm) return;

    // Listen to all input/textarea/select changes
    const formElements = mainForm.querySelectorAll('input, textarea, select');

    formElements.forEach((element) => {
      // Skip hidden fields except CSRF
      if (element.type === 'hidden' && element.name !== 'template') {
        return;
      }

      // Use 'change' for select, 'input' for text inputs
      const eventType = (element.tagName === 'SELECT') ? 'change' : 'input';
      element.addEventListener(eventType, updatePreview);

      // Add focus event listener for highlight
      element.addEventListener('focus', function() {
        const selector = this.dataset.previewSelector || getPreviewSelector(this.name);
        if (selector && iframe?.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'highlight', selector }, '*');
        }
      });
    });

    // Template select should update immediately (no debounce)
    const templateSelect = mainForm.querySelector('select[name="template"]');
    if (templateSelect) {
      templateSelect.addEventListener('change', () => {
        updatePreview();
      });
    }

    // Initial preview load
    updatePreview();
  }

  /**
   * Setup postMessage listener for iframe
   */
  function setupPostMessageListener() {
    window.addEventListener('message', (event) => {
      // Verify origin if needed
      if (event.source !== iframe?.contentWindow) return;
      
      const data = event.data;
      if (DEBUG) console.log('[Preview] Received message:', data);
      if (!data || typeof data !== 'object') return;
      
      if (data.type === 'preview-click' && data.fieldName) {
        const field = document.querySelector(`[name="${data.fieldName}"]`);
        if (field) {
          field.focus();
          field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }

  /**
   * Initialize when DOM is ready
   */
  function init() {
    initializeFormListeners();
    setupPostMessageListener();

    // Send ready message when iframe loads
    if (iframe) {
      iframe.addEventListener('load', () => {
        if (DEBUG) console.log('[Preview] Iframe loaded:', iframe.contentDocument?.title);
        sendReadyMessage();
      });
      iframe.addEventListener('error', (e) => {
        if (DEBUG) console.error('[Preview] Iframe error:', e);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for testing/debugging
  window.formPreview = {
    updatePreview,
    getPresellId
  };
}());
