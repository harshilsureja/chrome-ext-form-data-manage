import { toast } from 'sonner';
import type { Field, FormSnapshot, HistoryEntry, Person, Settings, StoreState } from './types';

export const DEFAULT_SETTINGS: Settings = {
  captureSubmissions: true,
  historyLimit: 500,
  theme: 'light',
  dataSource: 'local',
  nationalities: '',
};

export const STORE_KEYS = ['profile', 'savedForms', 'history', 'settings'] as const;

export async function readStore(): Promise<StoreState> {
  const data = (await chrome.storage.local.get([...STORE_KEYS])) as Partial<StoreState>;
  return {
    profile: data.profile || {},
    savedForms: data.savedForms || [],
    history: data.history || [],
    settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
  };
}

export function writeStore(patch: Partial<StoreState>) {
  return chrome.storage.local.set(patch);
}

// ---------- URL helpers ----------

export function urlKey(url?: string) {
  try {
    const u = new URL(url || '');
    return u.origin + u.pathname.replace(/\/$/, '');
  } catch {
    return url || '';
  }
}

export function hostOf(url?: string) {
  try {
    return new URL(url || '').hostname;
  } catch {
    return url || '';
  }
}

export function pathOf(url?: string) {
  try {
    return new URL(url || '').pathname;
  } catch {
    return url || '';
  }
}

export function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function fieldValueText(f: Field) {
  if (f.type === 'checkbox' || f.type === 'radio') return f.checked ? `✔ ${f.value}` : '✘';
  if (Array.isArray(f.value)) return f.value.join(', ');
  return f.value;
}

// ---------- Tab / content-script plumbing ----------

// The panel is opened per-tab; background.js passes that tab's id in the URL.
export const PANEL_TAB_ID = Number(new URLSearchParams(location.search).get('tabId')) || null;

export async function panelTab(): Promise<chrome.tabs.Tab | null> {
  if (PANEL_TAB_ID) {
    try {
      return await chrome.tabs.get(PANEL_TAB_ID);
    } catch {
      return null; // tab was closed
    }
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

export function isInjectable(url?: string) {
  return /^(https?|file):/i.test(url || '');
}

async function ensureContent(tabId: number) {
  try {
    const res = await chrome.tabs.sendMessage(tabId, { type: 'ping' });
    if (res?.ok) return;
  } catch {
    /* not injected yet (tab opened before install) */
  }
  await chrome.scripting.executeScript({ target: { tabId }, files: ['faker.js', 'content.js'] });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendToTab<T = any>(tabId: number, msg: Record<string, unknown>): Promise<T> {
  await ensureContent(tabId);
  return chrome.tabs.sendMessage(tabId, msg);
}

/** Returns the panel's tab if the extension can script it, otherwise toasts and returns null. */
export async function requireTab() {
  const tab = await panelTab();
  if (!tab?.id || !isInjectable(tab.url)) {
    toast.warning("This page can't be accessed", { description: 'chrome:// and Web Store pages are off limits.' });
    return null;
  }
  return tab as chrome.tabs.Tab & { id: number };
}

function waitForTabComplete(tabId: number, timeout = 20000) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(done, timeout);
    function done() {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }
    function listener(id: number, info: chrome.tabs.OnUpdatedInfo) {
      if (id === tabId && info.status === 'complete') done();
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function addHistory(entry: Omit<HistoryEntry, 'id' | 'createdAt'>) {
  return chrome.runtime.sendMessage({ type: 'history:add', entry });
}

export async function captureCurrent(): Promise<FormSnapshot | null> {
  const tab = await requireTab();
  if (!tab) return null;
  try {
    const res = await sendToTab<FormSnapshot>(tab.id, { type: 'capture' });
    if (!res?.fields?.length) {
      toast.warning('No filled fields found on this page');
      return null;
    }
    return res;
  } catch (err) {
    toast.error('Capture failed', { description: (err as Error).message });
    return null;
  }
}

/** Fill saved data, navigating the panel's tab to its URL first if needed. */
export async function fillEntry(entry: { url: string; fields: Field[]; name?: string; title?: string }, newTab = false) {
  let tab = await panelTab();
  if (!tab?.id && !newTab) return false;

  if (newTab) {
    tab = await chrome.tabs.create({ url: entry.url, active: true });
    await waitForTabComplete(tab.id!);
  } else if (urlKey(tab!.url) !== urlKey(entry.url)) {
    await chrome.tabs.update(tab!.id!, { url: entry.url });
    await waitForTabComplete(tab!.id!);
  }

  // SPAs may render inputs after "complete"; retry a few times.
  let res: { filled: number; total: number; missing: string[] } | undefined;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      res = await sendToTab(tab!.id!, { type: 'fill', fields: entry.fields });
      if (res?.filled) break;
    } catch {
      /* page still loading */
    }
    await sleep(700);
  }

  if (!res?.filled) {
    toast.error('No matching fields found on the page');
    return false;
  }
  if (res.missing.length) {
    toast.warning(`Filled ${res.filled}/${res.total} fields`, {
      description: `${res.missing.length} not found: ${res.missing.slice(0, 3).join(', ')}${res.missing.length > 3 ? '…' : ''}`,
    });
  } else {
    toast.success(`Filled ${res.filled}/${res.total} fields`);
  }
  addHistory({ action: 'filled', url: entry.url, title: entry.name || entry.title, fields: entry.fields });
  return true;
}

// ---------- Random person source (randomuser.me or built-in) ----------

async function fetchRandomUser(nat: string): Promise<Person> {
  const params = new URLSearchParams({ noinfo: '', inc: 'name,location,email,login,dob,phone,cell,nat' });
  if (nat) params.set('nat', nat);
  const res = await fetch(`https://randomuser.me/api/?${params}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`randomuser.me returned ${res.status}`);
  const u = (await res.json()).results[0];
  // randomuser.me has no company/job/website, so borrow those from the local generator.
  const local = FDMFaker.profile();
  return {
    ...local,
    firstName: u.name.first,
    lastName: u.name.last,
    fullName: `${u.name.first} ${u.name.last}`,
    email: u.email,
    phone: u.cell || u.phone,
    address1: `${u.location.street.number} ${u.location.street.name}`,
    city: u.location.city,
    state: u.location.state,
    zip: String(u.location.postcode),
    country: u.location.country,
    countryCode: u.nat,
    dob: u.dob.date.slice(0, 10),
    username: u.login.username,
  };
}

export async function getRandomPerson(settings: Settings): Promise<Person> {
  if (settings.dataSource !== 'randomuser') return FDMFaker.profile();
  try {
    return await fetchRandomUser(settings.nationalities || '');
  } catch (err) {
    toast.warning('randomuser.me unavailable — using built-in data', { description: (err as Error).message });
    return FDMFaker.profile();
  }
}
