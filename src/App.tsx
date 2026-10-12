import { useEffect, useState } from 'react';
import { Moon, Settings as SettingsIcon, Sun } from 'lucide-react';
import logoUrl from '../assets/logo.svg';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SaveFormDialog } from '@/components/save-form-dialog';
import { HistoryTab } from '@/components/tabs/history-tab';
import { PageTab } from '@/components/tabs/page-tab';
import { ProfileTab } from '@/components/tabs/profile-tab';
import { SavedTab } from '@/components/tabs/saved-tab';
import { SettingsTab } from '@/components/tabs/settings-tab';
import { usePanelTab } from '@/hooks/use-panel-tab';
import { useStore } from '@/hooks/use-store';
import { writeStore } from '@/lib/chrome';
import type { FormSnapshot } from '@/lib/types';

export default function App() {
  const store = useStore();
  const tab = usePanelTab();
  const [activeTab, setActiveTab] = useState('page');
  const [snapshot, setSnapshot] = useState<FormSnapshot | null>(null);
  const dark = store.settings.theme === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <TooltipProvider delayDuration={400}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-screen gap-0">
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 border-b px-3 pt-3 pb-2 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src={logoUrl} alt="" className="size-9 drop-shadow-sm" />
              <div className="leading-tight">
                <p className="font-semibold">Open Autofill</p>
                <p className="text-muted-foreground text-xs">Fill · Save · Replay</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Toggle theme"
              onClick={() => writeStore({ settings: { ...store.settings, theme: dark ? 'light' : 'dark' } })}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
          </div>

          <TabsList className="mt-3 grid w-full grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <TabsTrigger value="page">Page</TabsTrigger>
            <TabsTrigger value="saved" className="gap-1">
              Saved
              {store.savedForms.length > 0 && (
                <span className="bg-muted-foreground/15 rounded px-1 text-[10px] tabular-nums">{store.savedForms.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="settings" className="px-2" title="Settings">
              <SettingsIcon />
            </TabsTrigger>
          </TabsList>
        </header>

        <main className="p-3">
          <TabsContent value="page">
            <PageTab store={store} tab={tab} onSave={setSnapshot} onGoToProfile={() => setActiveTab('profile')} />
          </TabsContent>
          <TabsContent value="saved">
            <SavedTab store={store} />
          </TabsContent>
          <TabsContent value="history">
            <HistoryTab store={store} onSave={setSnapshot} />
          </TabsContent>
          <TabsContent value="profile">
            <ProfileTab store={store} />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab store={store} />
          </TabsContent>
        </main>
      </Tabs>

      <SaveFormDialog snapshot={snapshot} onOpenChange={(open) => !open && setSnapshot(null)} />
      <Toaster position="bottom-center" theme={dark ? 'dark' : 'light'} richColors closeButton />
    </TooltipProvider>
  );
}
