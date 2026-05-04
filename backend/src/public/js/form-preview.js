/**
 * Form Preview Live Update Handler
 * Monitors form changes and updates preview pane via hidden form POST to iframe
 */

(function () {
  const DEBUG = true;
  const IFRAME_ID = 'preview-iframe';
  const HIDDEN_FORM_ID = 'preview-form-hidden';
  const LEGACY_ADMIN_BASE_PATH = window.__LEGACY_ADMIN_BASE_PATH__ || '/admin';
  const templatePreviewContracts = window.__TEMPLATE_PREVIEW_CONTRACTS__ || {};

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

  const fallbackSelectorMap = Object.values(templatePreviewContracts).reduce((selectors, contract) => {
    const contractSelectors = contract && contract.selectors ? contract.selectors : {};
    const nextSelectors = { ...selectors };

    Object.keys(contractSelectors).forEach((fieldName) => {
      if (!nextSelectors[fieldName]) {
        nextSelectors[fieldName] = contractSelectors[fieldName];
      }
    });

    return nextSelectors;
  }, {});

  function getActiveTemplateId() {
    const mainForm = document.querySelector('form');
    if (!mainForm) return '';

    const templateInput = mainForm.querySelector('select[name="template"]');
    return templateInput ? templateInput.value : '';
  }

  function getActivePreviewSelectorMap() {
    const activeTemplateId = getActiveTemplateId();
    const contract = activeTemplateId ? templatePreviewContracts[activeTemplateId] : null;
    return contract && contract.selectors ? contract.selectors : {};
  }

  function getPreviewSelector(fieldName) {
    const selectorMap = getActivePreviewSelectorMap();
    return selectorMap[fieldName] || fallbackSelectorMap[fieldName] || `[name="${fieldName}"]`;
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
      ? `${LEGACY_ADMIN_BASE_PATH}/api/presells/${presellId}/preview`
      : `${LEGACY_ADMIN_BASE_PATH}/api/presells/preview`;

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
