/* Open either tool in place without discarding the other tool's draft. */
(() => {
  'use strict';
  if (!['http:', 'https:'].includes(location.protocol)) return;

  const launchers = [...document.querySelectorAll('[data-home-tool]')];
  const tools = {
    security: {
      panel: document.getElementById('home-workspace-panel'),
      frame: document.getElementById('home-workspace-frame'),
      messageType: 'security-workspace-height',
      min: 720,
      max: 50000,
    },
    ai: {
      panel: document.getElementById('ai-release-panel'),
      frame: document.getElementById('ai-release-frame'),
      messageType: 'ai-release-height',
      min: 360,
      max: 16000,
    },
  };
  const entries = Object.entries(tools);
  if (!launchers.length || entries.some(([, tool]) => !tool.panel || !tool.frame)) return;

  let activeLauncher;
  let requestedMode;

  function showRequestedMode() {
    if (requestedMode) {
      tools.security.frame.contentWindow?.postMessage({ type: 'security-workspace-mode', mode: requestedMode }, location.origin);
    }
  }

  function showTool(key) {
    entries.forEach(([name, tool]) => { tool.panel.hidden = name !== key; });
    launchers.forEach(launcher => {
      launcher.setAttribute('aria-expanded', String(launcher.dataset.homeTool === key));
    });
  }

  tools.security.frame.addEventListener('load', showRequestedMode);
  showTool(null);

  for (const launcher of launchers) {
    launcher.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const key = launcher.dataset.homeTool;
      const tool = tools[key];
      if (!tool) return;

      const destination = new URL(launcher.href);
      if (destination.origin !== location.origin) return;

      event.preventDefault();
      activeLauncher = launcher;
      showTool(key);

      if (key === 'security') {
        requestedMode = launcher.dataset.workspaceMode;
        destination.searchParams.set('embed', '1');
      }
      if (!tool.frame.hasAttribute('src')) {
        tool.frame.src = destination.href;
      } else if (key === 'security') {
        showRequestedMode();
      }

      const heading = tool.panel.querySelector('h3');
      tool.panel.scrollIntoView({ block: 'start', behavior: 'instant' });
      heading?.focus({ preventScroll: true });
    });
  }

  for (const [, tool] of entries) {
    tool.panel.querySelector('[data-close-home-tool]')?.addEventListener('click', () => {
      showTool(null);
      activeLauncher?.focus();
      activeLauncher = undefined;
    });
  }

  window.addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    const found = entries.find(([, tool]) => event.source === tool.frame.contentWindow);
    if (!found) return;
    const [, tool] = found;
    const message = event.data;
    if (message?.type !== tool.messageType || !Number.isFinite(message.height) || message.height <= 0) return;
    const height = Math.min(tool.max, Math.max(tool.min, Math.ceil(message.height) + 4));
    tool.frame.style.height = `${height}px`;
  });
})();
