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
});