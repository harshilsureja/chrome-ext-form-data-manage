import { useEffect, useState } from 'react';
import { Dices, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { getRandomPerson, writeStore } from '@/lib/chrome';
import type { Store } from '@/hooks/use-store';
import type { CustomField, Profile } from '@/lib/types';

type Row = { name: string; label: string; placeholder?: string; type?: string };

const SECTIONS: { title: string; rows: (Row | [Row, Row])[] }[] = [
  {
    title: 'Personal',
    rows: [
      [
        { name: 'firstName', label: 'First name' },
        { name: 'lastName', label: 'Last name' },
      ],
      { name: 'fullName', label: 'Full name', placeholder: 'Auto from first + last if empty' },
      { name: 'email', label: 'Email', type: 'email' },
      [
        { name: 'phone', label: 'Phone' },
        { name: 'dob', label: 'Date of birth', placeholder: 'YYYY-MM-DD' },
      ],
      [
        { name: 'username', label: 'Username' },
        { name: 'website', label: 'Website' },
      ],
    ],
  },
  {
    title: 'Work',
    rows: [
      [
        { name: 'company', label: 'Company' },
        { name: 'jobTitle', label: 'Job title' },
      ],
    ],
  },
  {
    title: 'Address',
    rows: [
      { name: 'address1', label: 'Address line 1' },
      { name: 'address2', label: 'Address line 2' },
      [
        { name: 'city', label: 'City' },
        { name: 'state', label: 'State' },
      ],
      [
        { name: 'zip', label: 'ZIP / Postal' },
        { name: 'country', label: 'Country' },
      ],
    ],
  },
];

export function ProfileTab({ store }: { store: Store }) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<CustomField[]>([]);
  const [dirty, setDirty] = useState(false);

  // Sync from storage unless the user has unsaved edits.
  useEffect(() => {
    if (dirty) return;
    const { custom: c, ...rest } = store.profile;
    setDraft(rest as Record<string, string>);
    setCustom(c || []);
  }, [store.profile, dirty]);

  const set = (name: string, value: string) => {
    setDraft((d) => ({ ...d, [name]: value }));
    setDirty(true);
  };

  async function randomize() {
    const person = await getRandomPerson(store.settings);
    setDraft(person);
    setDirty(true);
    toast('Random profile generated', { description: 'Click Save profile to keep it.' });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const profile: Profile = {};
    for (const [k, v] of Object.entries(draft)) if (typeof v === 'string' && v.trim()) profile[k] = v.trim();
    profile.custom = custom.filter((c) => c.key.trim());
    await writeStore({ profile });
    setDirty(false);
    toast.success('Profile saved');
  }

  const field = (r: Row) => (
    <div key={r.name} className="grid gap-1.5">
      <Label htmlFor={`p-${r.name}`} className="text-xs">
        {r.label}
      </Label>
      <Input
        id={`p-${r.name}`}
        type={r.type || 'text'}
        className="h-8"
        placeholder={r.placeholder}
        value={draft[r.name] || ''}
        onChange={(e) => set(r.name, e.target.value)}
      />
    </div>
  );

  return (
    <Card className="gap-4 py-4 shadow-none">
      <CardHeader className="px-4">
        <CardTitle>Autofill profile</CardTitle>
        <CardDescription className="text-xs">Matched to fields by name, id, label, placeholder and autocomplete.</CardDescription>
        <CardAction>
          <Button type="button" variant="outline" size="xs" onClick={randomize}>
            <Dices /> Random
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-4">
        <form className="grid gap-4" onSubmit={save}>
          {SECTIONS.map((s) => (
            <div key={s.title} className="grid gap-3">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{s.title}</span>
                <Separator className="flex-1" />
              </div>
              {s.rows.map((row, i) =>
                Array.isArray(row) ? (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    {row.map(field)}
                  </div>
                ) : (
                  field(row)
                )
              )}
            </div>
          ))}

          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Custom fields</span>
              <Separator className="flex-1" />
            </div>
            <p className="text-muted-foreground -mt-1 text-xs">If a field's name or label contains the key, its value is used.</p>
            {custom.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                <Input
                  className="h-8"
                  placeholder="key (e.g. gst)"
                  value={c.key}
                  onChange={(e) => {
                    setCustom((prev) => prev.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)));
                    setDirty(true);
                  }}
                />
                <Input
                  className="h-8"
                  placeholder="value"
                  value={c.value}
                  onChange={(e) => {
                    setCustom((prev) => prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)));
                    setDirty(true);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setCustom((prev) => prev.filter((_, j) => j !== i));
                    setDirty(true);
                  }}
                >
                  <X />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start border-dashed"
              onClick={() => setCustom((prev) => [...prev, { key: '', value: '' }])}
            >
              <Plus /> Add custom field
            </Button>
          </div>

          <div className="bg-card sticky bottom-0 -mx-4 flex gap-2 border-t px-4 pt-3">
            <Button type="submit" className="flex-1" size="sm">
              Save profile
            </Button>
            {dirty && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setDirty(false)}>
                Discard
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
