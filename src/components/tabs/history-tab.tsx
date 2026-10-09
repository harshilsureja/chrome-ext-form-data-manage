import { useState } from 'react';
import { ExternalLink, History, Loader2, Play, Save, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmButton } from '@/components/confirm-button';
import { EmptyState } from '@/components/empty-state';
import { FieldsCollapsible } from '@/components/field-table';
import { deleteHistory } from '@/lib/actions';
import { fieldValueText, fillEntry, hostOf, timeAgo, writeStore } from '@/lib/chrome';
import { cn } from '@/lib/utils';
import type { Store } from '@/hooks/use-store';
import type { FormSnapshot, HistoryAction, HistoryEntry } from '@/lib/types';

const ACTION_STYLE: Record<HistoryAction, string> = {
  submitted: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  saved: 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  filled: 'border-success/30 bg-success/10 text-success',
  captured: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300',
  generated: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

function HistoryCard({ entry, onSave }: { entry: HistoryEntry; onSave: (s: FormSnapshot) => void }) {
  const [busy, setBusy] = useState(false);

  return (
    <div className="bg-card hover:border-foreground/20 rounded-lg border p-3 transition-colors">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 leading-snug font-medium" title={entry.title}>
            {entry.title || hostOf(entry.url)}
          </p>
          <p className="text-muted-foreground mt-0.5 truncate text-xs" title={entry.url}>
            {entry.url}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-destructive -mt-0.5 -mr-1"
          onClick={() => deleteHistory(entry.id)}
        >
          <Trash2 />
        </Button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={cn('capitalize', ACTION_STYLE[entry.action])}>
          {entry.action}
        </Badge>
        <Badge variant="secondary" className="font-normal">{entry.fields?.length || 0} fields</Badge>
        <Badge variant="secondary" className="font-normal" title={new Date(entry.createdAt).toLocaleString()}>
          {timeAgo(entry.createdAt)}
        </Badge>
      </div>

      <div className="mt-3 flex items-center gap-1 border-t pt-3">
        <Button
          size="xs"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await fillEntry(entry);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Play />}
          Fill
        </Button>
        <Button size="xs" variant="ghost" onClick={() => onSave({ url: entry.url, title: entry.title, fields: entry.fields })}>
          <Save />
          Save as form
        </Button>
        <Button size="xs" variant="ghost" onClick={() => chrome.tabs.create({ url: entry.url })}>
          <ExternalLink />
          Open
        </Button>
      </div>

      <div className="mt-2">
        <FieldsCollapsible fields={entry.fields || []} />
      </div>
    </div>
  );
}

export function HistoryTab({ store, onSave }: { store: Store; onSave: (s: FormSnapshot) => void }) {
  const [q, setQ] = useState('');
  const [action, setAction] = useState<'all' | HistoryAction>('all');
  const query = q.trim().toLowerCase();

  const list = store.history.filter((h) => {
    if (action !== 'all' && h.action !== action) return false;
    if (!query) return true;
    return (
      (h.title || '').toLowerCase().includes(query) ||
      (h.url || '').toLowerCase().includes(query) ||
      h.fields?.some((f) => String(fieldValueText(f)).toLowerCase().includes(query))
    );
  });

  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input className="pl-8" placeholder="Search history…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={action} onValueChange={(v) => setAction(v as typeof action)}>
          <SelectTrigger className="w-[118px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="saved">Saved</SelectItem>
            <SelectItem value="filled">Filled</SelectItem>
            <SelectItem value="captured">Captured</SelectItem>
            <SelectItem value="generated">Generated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          {list.length} of {store.history.length} entries
        </span>
        {store.history.length > 0 && (
          <ConfirmButton
            title="Clear all history?"
            description="Every history entry will be removed. Saved forms are not affected."
            confirmLabel="Clear history"
            onConfirm={async () => {
              await writeStore({ history: [] });
              toast('History cleared');
            }}
          >
            <Button variant="ghost" size="xs" className="text-destructive hover:text-destructive">
              Clear all
            </Button>
          </ConfirmButton>
        )}
      </div>

      {list.length ? (
        list.map((h) => <HistoryCard key={h.id} entry={h} onSave={onSave} />)
      ) : (
        <EmptyState icon={History} title={query || action !== 'all' ? 'No matches' : 'History is empty'}>
          {query || action !== 'all' ? 'Try a different search or filter.' : 'Submitted forms appear here automatically.'}
        </EmptyState>
      )}
    </div>
  );
}
