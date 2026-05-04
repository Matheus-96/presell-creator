function splitSelectorList(selector) {
  return String(selector || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSelectorSpecificity(selector) {
  const normalizedSelector = String(selector || "");
  const idCount = (normalizedSelector.match(/#[\w-]+/g) || []).length;
  const classCount = (normalizedSelector.match(/\.[\w-]+/g) || []).length;
  const attributeCount = (normalizedSelector.match(/\[[^\]]+\]/g) || []).length;

  return (idCount * 1000) + ((classCount + attributeCount) * 100) + normalizedSelector.length;
}

function buildPreviewFieldRules(previewContract = {}) {
  return Array.isArray(previewContract.fields)
    ? previewContract.fields.flatMap((field, index) => splitSelectorList(field.selector).map((selector) => ({
      fieldName: String(field.inputName || field.key || ""),
      order: index,
      priority: field.source === "core" ? 1 : 0,
      selector,
      specificity: getSelectorSpecificity(selector)
    })))
    : [];
}

function buildPreviewBridgeScript(previewContract = {}) {
  const fieldRules = buildPreviewFieldRules(previewContract);

  return `
const previewFieldRules = ${JSON.stringify(fieldRules)};

document.addEventListener("click", function(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const matches = [];

  previewFieldRules.forEach(function(rule) {
    try {
      if (event.target.closest(rule.selector)) {
        matches.push(rule);
      }
    } catch (error) {
      // Ignore invalid selectors so the preview keeps working.
    }
  });

  matches.sort(function(left, right) {
    if (right.specificity !== left.specificity) {
      return right.specificity - left.specificity;
    }

    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    return left.order - right.order;
  });

  if (!matches[0]) {
    return;
  }

  window.parent.postMessage({
    type: "preview-click",
    fieldName: matches[0].fieldName
  }, "*");
});

window.addEventListener("message", function(event) {
  if (event.source !== window.parent) {
    return;
  }

  const data = event.data;
  if (!data || typeof data !== "object") {
    return;
  }

  if (data.type === "highlight" && data.selector) {
    document.querySelectorAll(".preview-highlight-active").forEach(function(element) {
      element.classList.remove("preview-highlight-active");
    });

    try {
      const target = document.querySelector(data.selector);
      if (target) {
        target.classList.add("preview-highlight-active");
      }
    } catch (error) {
      // Ignore invalid selectors from preview payloads.
    }
  }

  if (data.type === "unhighlight") {
    document.querySelectorAll(".preview-highlight-active").forEach(function(element) {
      element.classList.remove("preview-highlight-active");
    });
  }
});
  `.trim();
}

module.exports = {
  buildPreviewFieldRules,
  buildPreviewBridgeScript
};
