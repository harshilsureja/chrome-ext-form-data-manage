// The side panel is per-tab: disabled globally, enabled only on the tab whose icon was clicked.
function disablePanelGlobally() {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  chrome.sidePanel.setOptions({ enabled: false });
}

chrome.action.onClicked.addListener((tab) => {
  // Don't await before open(): it must run inside the click's user gesture.
  chrome.sidePanel.setOptions({ tabId: tab.id, path: `sidepanel.html?tabId=${tab.id}`, enabled: true });
  chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onInstalled.addListener(async () => {
  disablePanelGlobally();

  const data = await chrome.storage.local.get(['profile', 'savedForms', 'history', 'settings']);
  await chrome.storage.local.set({
    profile: data.profile || {},
    savedForms: data.savedForms || [],
    history: data.history || [],
    settings: {
      captureSubmissions: true,
      historyLimit: 500,
      theme: 'light',
      ...(data.settings || {}),
    },
  });
});

chrome.runtime.onStartup.addListener(disablePanelGlobally);

// History writes go through the worker so concurrent tabs don't clobber each other.
let queue = Promise.resolve();

function addHistory(entry) {
  queue = queue.then(async () => {
    const { history = [], settings = {} } = await chrome.storage.local.get(['history', 'settings']);
    history.unshift({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      ...entry,
    });
    const limit = settings.historyLimit || 500;
    await chrome.storage.local.set({ history: history.slice(0, limit) });
  });
  return queue;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'history:add') {
    chrome.storage.local.get('settings').then(({ settings = {} }) => {
      if (msg.entry.action === 'submitted' && settings.captureSubmissions === false) {
        sendResponse({ ok: false, skipped: true });
        return;
      }
      addHistory({
        ...msg.entry,
        url: msg.entry.url || sender.tab?.url,
        title: msg.entry.title || sender.tab?.title,
      }).then(() => sendResponse({ ok: true }));
    });
    return true;
  }
});
