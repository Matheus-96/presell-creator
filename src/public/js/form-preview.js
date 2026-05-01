/**
 * Form Preview Live Update Handler
 * Monitors form changes and updates preview pane in real-time via API
 */

(function () {
  const PREVIEW_DEBOUNCE_MS = 300;
  const PREVIEW_PANE_ID = 'preview-pane';
  const API_ENDPOINT = '/admin/api/presells/{id}/preview';

  let debounceTimer = null;
  let lastPreviewData = null;

  /**
   * Extract presell ID from URL
   * Returns null for /presells/new, ID number for /presells/:id/edit
   */
  function getPresellId() {
    const pathMatch = window.location.pathname.match(/presells\/(\d+)/);
    return pathMatch ? pathMatch[1] : null;
  }

  /**
   * Get all form field values
   */
  function getFormData() {
    const form = document.querySelector('form');
    if (!form) return {};

    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
      // Skip technical fields
      if (key === '_csrf' || key === 'current_image_path') {
        continue;
      }
      data[key] = value;
    }

    return data;
  }

  /**
   * Request preview from API
   */
  async function updatePreview() {
    const presellId = getPresellId();
    const formData = getFormData();

    // Skip update if data hasn't changed
    if (JSON.stringify(formData) === JSON.stringify(lastPreviewData)) {
      return;
    }

    lastPreviewData = formData;

    try {
      // Determine endpoint based on whether presell is new or existing
      const endpoint = presellId
        ? API_ENDPOINT.replace('{id}', presellId) // /admin/api/presells/:id/preview
        : '/admin/api/presells/preview'; // /admin/api/presells/preview

      // Get CSRF token from form
      const csrfTokenElement = document.querySelector('input[name="_csrf"]');
      const csrfToken = csrfTokenElement ? csrfTokenElement.value : '';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        console.warn('Preview update failed:', {
          status: response.status,
          endpoint,
          presellId
        });
        return;
      }

      const html = await response.text();
      updatePreviewPane(html);
    } catch (error) {
      console.error('Error updating preview:', error);
    }
  }

  /**
   * Update preview pane with new HTML
   */
  function updatePreviewPane(html) {
    const pane = document.getElementById(PREVIEW_PANE_ID);
    if (pane) {
      pane.innerHTML = html;
    }
  }

  /**
   * Debounced preview update
   */
  function debouncedUpdate() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      updatePreview();
    }, PREVIEW_DEBOUNCE_MS);
  }

  /**
   * Initialize form listeners
   */
  function initializeFormListeners() {
    const form = document.querySelector('form');
    if (!form) return;

    // Listen to all input/textarea/select changes
    const formElements = form.querySelectorAll(
      'input, textarea, select'
    );

    formElements.forEach((element) => {
      // Skip CSRF and hidden fields
      if (element.type === 'hidden') {
        return;
      }

      // Use 'change' for select, 'input' for text inputs
      const eventType = (element.tagName === 'SELECT') ? 'change' : 'input';
      element.addEventListener(eventType, debouncedUpdate);
    });

    // Initial preview load
    updatePreview();
  }

  /**
   * Initialize when DOM is ready
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFormListeners);
  } else {
    initializeFormListeners();
  }

  // Export for testing/debugging
  window.formPreview = {
    updatePreview,
    getFormData,
    getPresellId
  };
}());
