import { useState } from 'react';
import { Dices, Eraser, FilePlus2, Globe, History, Loader2, Save, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/empty-state';
import { SavedFormCard } from '@/components/saved-form-card';
import { addHistory, captureCurrent, getRandomPerson, hostOf, requireTab, sendToTab, urlKey } from '@/lib/chrome';
import type { Store } from '@/hooks/use-store';
import type { Field, FormSnapshot } from '@/lib/types';

interface Props {
  store: Store;
  tab: chrome.tabs.Tab | null;
  onSave: (snapshot: FormSnapshot) => void;
  onGoToProfile: () => void;
}

export function PageTab({ store, tab, onSave, onGoToProfile }: Props) {
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const here = urlKey(tab?.url);
  const host = hostOf(tab?.url);
  const exact = store.savedForms.filter((f) => urlKey(f.url) === here);
  const sameSite = store.savedForms.filter((f) => urlKey(f.url) !== here && hostOf(f.url) === host);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast.error('Something went wrong', { description: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const autofill = () =>
    run('autofill', async () => {
      const hasProfile = Object.entries(store.profile).some(([k, v]) => (k === 'custom' ? (v as unknown[])?.length : v));
      if (!hasProfile) {
        toast.warning('Your profile is empty', { description: 'Add your details in the Profile tab first.' });
        onGoToProfile();
        return;
      }
      const t = await requireTab();
      if (!t) return;
      const res = await sendToTab<{ filled: number }>(t.id, { type: 'autofillProfile', profile: store.profile, overwrite });
      if (res.filled) toast.success(`Autofilled ${res.filled} field(s)`);
      else toast.warning('No matching empty fields found');
    });

  const generate = () =>
    run('generate', async () => {
      const t = await requireTab();
      if (!t) return;
      const person = await getRandomPerson(store.settings);
      const res = await sendToTab<{ filled: number; fields: Field[] }>(t.id, { type: 'autoGenerate', overwrite, person });
      if (!res.filled) {
        toast.warning('No empty fields to generate data for');
        return;
      }
      toast.success(`Generated data for ${res.filled} field(s)`);
      await addHistory({ action: 'generated', url: t.url!, title: t.title, fields: res.fields });
    });

  const save = () =>
    run('save', async () => {
      const snap = await captureCurrent();
      if (snap) onSave(snap);
    });

  const capture = () =>
    run('capture', async () => {
      const snap = await captureCurrent();
      if (!snap) return;
      await addHistory({ action: 'captured', url: snap.url, title: snap.title, fields: snap.fields });
      toast.success(`Added ${snap.fields.length} field(s) to history`);
    });

  const clear = () =>
    run('clear', async () => {
      const t = await requireTab();
      if (!t) return;
      const res = await sendToTab<{ cleared: number }>(t.id, { type: 'clearForm' });
      toast(`Cleared ${res.cleared} field(s)`);
    });

  const icon = (key: string, Icon: typeof Zap) => (busy === key ? <Loader2 className="animate-spin" /> : <Icon />);

  return (
    <div className="grid gap-4">
      <Card className="gap-0 py-0 shadow-none">
        <CardContent className="grid gap-3 p-3">
          <div className="flex items-start gap-3">
            <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
              {tab?.favIconUrl ? <img src={tab.favIconUrl} alt="" className="size-4" /> : <Globe className="size-4" />}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{tab?.title || '—'}</p>
              <p className="text-muted-foreground truncate text-xs" title={tab?.url}>
                {tab?.url || '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={autofill} disabled={!!busy}>
              {icon('autofill', Zap)} Autofill profile
            </Button>
            <Button size="sm" variant="secondary" onClick={save} disabled={!!busy}>
              {icon('save', Save)} Save form
            </Button>
            <Button size="sm" variant="outline" onClick={generate} disabled={!!busy} className="col-span-2">
              {icon('generate', Dices)} Auto-generate random data
            </Button>
            <Button size="sm" variant="outline" onClick={capture} disabled={!!busy}>
              {icon('capture', History)} Add to history
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clear}
              disabled={!!busy}
              className="text-destructive hover:text-destructive"
            >
              {icon('clear', Eraser)} Clear fields
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="overwrite" checked={overwrite} onCheckedChange={(c) => setOverwrite(c === true)} />
            <Label htmlFor="overwrite" className="text-muted-foreground text-xs font-normal">
              Overwrite fields that already have a value
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Saved forms for this page</h3>
        {exact.length + sameSite.length === 0 ? (
          <EmptyState icon={FilePlus2} title="Nothing saved for this page">
            Fill the form, then click <b>Save form</b>.
          </EmptyState>
        ) : (
          <>
            {exact.map((f) => (
              <SavedFormCard key={f.id} form={f} compact />
            ))}
            {sameSite.map((f) => (
              <SavedFormCard key={f.id} form={f} compact otherPage />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
