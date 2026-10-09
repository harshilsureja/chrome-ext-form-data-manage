import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, readStore } from '@/lib/chrome';
import type { StoreState } from '@/lib/types';

const EMPTY: StoreState = { profile: {}, savedForms: [], history: [], settings: DEFAULT_SETTINGS };

/** Live view of chrome.storage.local; re-reads whenever any key changes. */
export function useStore() {
  const [state, setState] = useState<StoreState>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      readStore().then((s) => {
        if (!alive) return;
        setState(s);
        setLoaded(true);
      });
    load();
    const onChanged = (_: unknown, area: string) => area === 'local' && load();
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  return { ...state, loaded };
}

export type Store = ReturnType<typeof useStore>;
