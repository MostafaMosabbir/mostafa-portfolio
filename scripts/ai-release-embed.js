/* Launch the review in Tools and retain its answers while the page is open. */
(() => {
  'use strict';
  const launcher = document.getElementById('ai-release-launch');
  const frame = document.getElementById('ai-release-frame');
  if (!launcher || !frame || !['http:', 'https:'].includes(location.protocol)) return;

  launcher.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const destination = new URL(launcher.href);
    if (destination.origin !== location.origin) return;

    event.preventDefault();
    if (!frame.hasAttribute('src')) {
      frame.hidden = false;
      frame.src = destination.href;
    }
    frame.focus();
  });

  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    const message = event.data;
    if (message?.type !== 'ai-release-height' || !Number.isFinite(message.height) || message.height <= 0) return;
    const height = Math.min(16000, Math.max(360, Math.ceil(message.height) + 4));
    frame.style.height = `${height}px`;
  });
})();
