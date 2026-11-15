/* Keep the embedded workspace tall enough to show its own contents on this
   page. The child sends only a height, never assessment inputs or findings. */
(() => {
  'use strict';
  const frame = document.getElementById('home-workspace-frame');
  if (!frame || !['https:', 'http:'].includes(location.protocol)) return;
  const launchers = document.querySelectorAll('[data-workspace-mode]');
  let requestedMode;

  function showRequestedMode() {
    if (!requestedMode) return;
    frame.contentWindow.postMessage({ type: 'security-workspace-mode', mode: requestedMode }, location.origin);
  }

  // A second selection may arrive while the first view is still loading.
  frame.addEventListener('load', showRequestedMode);
  launchers.forEach(launcher => {
    launcher.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const destination = new URL(launcher.href);
      if (destination.origin !== location.origin) return;

      event.preventDefault();
      requestedMode = launcher.dataset.workspaceMode;
      if (frame.getAttribute('src')) {
        showRequestedMode();
      } else {
        destination.searchParams.set('embed', '1');
        frame.hidden = false;
        frame.src = destination.href;
      }
      frame.focus();
    });
  });

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
