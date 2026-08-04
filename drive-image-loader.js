// drive-image-loader.js
// Loads images-config.json and replaces img[src] for elements with data-config-key

async function loadImageConfig() {
  try {
    const res = await fetch('images-config.json', {cache: 'no-store'});
    if (!res.ok) return null;
    const cfg = await res.json();
    return cfg;
  } catch (e) {
    console.warn('Could not load images-config.json', e);
    return null;
  }
}

async function applyImageConfig() {
  const cfg = await loadImageConfig();
  if (!cfg || !cfg.images) return;
  Object.keys(cfg.images).forEach(key => {
    // Find elements that declare this key
    const els = document.querySelectorAll('[data-config-key="' + key + '"]');
    els.forEach(el => {
      if (el.tagName === 'IMG') {
        el.src = cfg.images[key];
      } else {
        // If element contains img
        const img = el.querySelector('img');
        if (img) img.src = cfg.images[key];
      }
    });
  });
  // expose config for admin to use
  window._imageConfig = cfg;
}

// run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyImageConfig);
} else {
  applyImageConfig();
}

// helper for admin page
window.getImageConfig = loadImageConfig;
window.saveImageConfigBlob = function(json) {
  const blob = new Blob([JSON.stringify(json, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'images-config.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};
