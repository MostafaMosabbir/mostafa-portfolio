/* Keep the embedded workspace tall enough to show its own contents on this
   page. The child sends only a height, never assessment inputs or findings. */
(() => {
  'use strict';
  const frame = document.getElementById('home-workspace-frame');
  const open = document.getElementById('home-workspace-open');
  if (!frame || !open) return;

  // Opening is deliberate: the tool and its background do not consume
  // resources before the visitor asks for them. Do not unload on scrolling.
  open.addEventListener('click', () => {
    if (!frame.getAttribute('src')) frame.src = frame.dataset.workspaceSrc;
    frame.hidden = false;
    open.hidden = true;
    frame.focus();
  });
  open.hidden = false;

  window.addEventListener('message', event => {
    // Do not let unrelated pages or other windows resize this frame.
    if (event.source !== frame.contentWindow || event.origin !== location.origin) return;
    const message = event.data;
    if (!message || typeof message !== 'object' || message.type !== 'security-workspace-height' ||
        typeof message.height !== 'number' || !Number.isFinite(message.height)) return;
    // A generous cap prevents extreme values while allowing long assessments.
    const height = Math.min(50000, Math.max(720, Math.ceil(message.height) + 4));
    frame.style.height = `${height}px`;
  });
})();
