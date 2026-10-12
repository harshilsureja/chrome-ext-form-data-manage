import { useEffect, useRef, useState } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ConfirmButton } from '@/components/confirm-button';
import { readStore, writeStore } from '@/lib/chrome';
import type { Store } from '@/hooks/use-store';
import type { Settings } from '@/lib/types';

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="gap-3 py-4 shadow-none">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-4 px-4">{children}</CardContent>
    </Card>
  );
}

export function SettingsTab({ store }: { store: Store }) {
  const { settings } = store;
  const [limit, setLimit] = useState(String(settings.historyLimit));
  const [nat, setNat] = useState(settings.nationalities);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setLimit(String(settings.historyLimit)), [settings.historyLimit]);
  useEffect(() => setNat(settings.nationalities), [settings.nationalities]);

  const update = (patch: Partial<Settings>) => writeStore({ settings: { ...settings, ...patch } });

  async function commitLimit() {
    const historyLimit = Math.max(10, Math.min(5000, Number(limit) || 500));
    setLimit(String(historyLimit));
    await writeStore({ settings: { ...settings, historyLimit }, history: store.history.slice(0, historyLimit) });
  }

  async function exportData() {
    const data = await readStore();
    const blob = new Blob([JSON.stringify({ app: 'open-autofill', version: 1, ...data }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `open-autofill-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importData(file: File) {
    try {
      const data = JSON.parse(await file.text());
      const current = await readStore();
      const byId = <T extends { id: string }>(arr: T[]) => [...new Map(arr.map((x) => [x.id, x])).values()];
      await writeStore({
        savedForms: byId([...(data.savedForms || []), ...current.savedForms]),
        history: byId([...(data.history || []), ...current.history])
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, current.settings.historyLimit),
        profile: { ...current.profile, ...(data.profile || {}) },
      });
      toast.success('Import complete', {
        description: `${data.savedForms?.length || 0} forms, ${data.history?.length || 0} history entries`,
      });
    } catch (err) {
      toast.error('Import failed', { description: (err as Error).message });
    }
  }

  return (
    <div className="grid gap-3">
      <Section title="History">
        <div className="flex items-center justify-between gap-4">
          <div className="grid gap-0.5">
            <Label htmlFor="capture">Record form submissions</Label>
            <span className="text-muted-foreground text-xs">Save every submitted form to history.</span>
          </div>
          <Switch
            id="capture"
            checked={settings.captureSubmissions}
            onCheckedChange={(captureSubmissions) => update({ captureSubmissions })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="limit">Max history entries</Label>
          <Input
            id="limit"
            type="number"
            min={10}
            max={5000}
            className="h-8"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            onBlur={commitLimit}
          />
        </div>
      </Section>

      <Section title="Random data" description="Used by Auto-generate and the profile's Random button.">
        <div className="grid gap-1.5">
          <Label>Data source</Label>
          <Select value={settings.dataSource} onValueChange={(v) => update({ dataSource: v as Settings['dataSource'] })}>
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Built-in (offline)</SelectItem>
              <SelectItem value="randomuser">randomuser.me (realistic, online)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {settings.dataSource === 'randomuser' && (
          <div className="grid gap-1.5">
            <Label htmlFor="nat">
              Nationalities <span className="text-muted-foreground font-normal">(blank = any)</span>
            </Label>
            <Input
              id="nat"
              className="h-8"
              placeholder="e.g. us,gb,in"
              value={nat}
              onChange={(e) => setNat(e.target.value)}
              onBlur={() => update({ nationalities: nat.toLowerCase().replace(/[^a-z,]/g, '') })}
            />
            <span className="text-muted-foreground text-xs">
              au br ca ch de dk es fi fr gb ie in ir mx nl no nz rs tr ua us
            </span>
          </div>
        )}
      </Section>

      <Section title="Data" description="Password, hidden and file inputs are never captured.">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download /> Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload /> Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) importData(file);
            }}
          />
        </div>
        <ConfirmButton
          title="Delete all data?"
          description="All saved forms, history and your profile will be permanently deleted."
          confirmLabel="Delete everything"
          onConfirm={async () => {
            await writeStore({ savedForms: [], history: [], profile: {} });
            toast('All data deleted');
          }}
        >
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 /> Delete all data
          </Button>
        </ConfirmButton>
      </Section>
    </div>
  );
}
