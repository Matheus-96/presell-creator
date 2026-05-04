// Auto-disable file input when remove is checked
document.addEventListener('DOMContentLoaded', function() {
  const removeCheckboxes = document.querySelectorAll('input[name="remove_image"], input[name="remove_background_image"]');

  removeCheckboxes.forEach(function(checkbox) {
    checkbox.addEventListener('change', function() {
      const container = this.closest('.mb-4, .mb-3');
      const fileInput = container.querySelector('input[type="file"]');

      if (fileInput) {
        fileInput.disabled = this.checked;
        fileInput.style.opacity = this.checked ? '0.5' : '1';
        fileInput.style.pointerEvents = this.checked ? 'none' : 'auto';
      }
    });
  });

  function showImagePreview(container, file) {
    if (!file || !file.type.startsWith('image/')) return;

    let previewContainer = container.querySelector('.preview-container');
    if (!previewContainer) {
      previewContainer = document.createElement('div');
      previewContainer.className = 'preview-container';
      previewContainer.style.marginTop = '10px';
      container.appendChild(previewContainer);
    }

    previewContainer.innerHTML = '';

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = '200px';
    img.style.maxHeight = '200px';
    img.style.borderRadius = '4px';
    img.style.border = '1px solid #ddd';
    previewContainer.appendChild(img);
  }

  const dropZones = document.querySelectorAll('.image-preview-container, .mb-4, .mb-3');
  dropZones.forEach(zone => {
    const fileInput = zone.querySelector('input[type="file"][name="image"], input[type="file"][name="background_image"]');
    if (!fileInput) return;

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));

    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        showImagePreview(zone, file);
        if (window.formPreview && typeof window.formPreview.updatePreview === 'function') {
          window.formPreview.updatePreview();
        }
      }
    });

    fileInput.addEventListener('change', function() {
      const file = this.files[0];
      if (file) {
        showImagePreview(zone, file);
        if (window.formPreview && typeof window.formPreview.updatePreview === 'function') {
          window.formPreview.updatePreview();
        }
      }
    });
  });
});
