import { useState } from 'react';
import { Bookmark, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/empty-state';
import { SavedFormCard } from '@/components/saved-form-card';
import type { Store } from '@/hooks/use-store';

export function SavedTab({ store }: { store: Store }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const list = store.savedForms.filter(
    (f) => !query || f.name.toLowerCase().includes(query) || f.url.toLowerCase().includes(query)
  );

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input className="pl-8" placeholder="Search by name or URL…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length ? (
        list.map((f) => <SavedFormCard key={f.id} form={f} />)
      ) : (
        <EmptyState icon={Bookmark} title={query ? 'No matches' : 'No saved forms yet'}>
          {query ? 'Try a different search.' : 'Open a page with a form and click Save form.'}
        </EmptyState>
      )}
    </div>
  );
}
