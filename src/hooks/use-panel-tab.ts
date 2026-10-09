import { useEffect, useState } from 'react';
import { PANEL_TAB_ID, panelTab } from '@/lib/chrome';

/** The tab this side panel belongs to, kept fresh as it navigates. */
export function usePanelTab() {
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);

  useEffect(() => {
    const refresh = () => panelTab().then(setTab);
    refresh();

    const onUpdated = (tabId: number, info: chrome.tabs.OnUpdatedInfo, t: chrome.tabs.Tab) => {
      const mine = PANEL_TAB_ID ? tabId === PANEL_TAB_ID : t.active;
      if (mine && (info.status === 'complete' || info.title || info.url)) refresh();
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
    if (!PANEL_TAB_ID) chrome.tabs.onActivated.addListener(refresh);
    return () => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      if (!PANEL_TAB_ID) chrome.tabs.onActivated.removeListener(refresh);
    };
  }, []);

  return tab;
}
