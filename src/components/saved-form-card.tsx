import { useState } from 'react';
import { ExternalLink, Loader2, Pencil, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfirmButton } from '@/components/confirm-button';
import { EditFormDialog } from '@/components/edit-form-dialog';
import { FieldsCollapsible } from '@/components/field-table';
import { deleteForm, updateForm } from '@/lib/actions';
import { fillEntry, hostOf, pathOf, timeAgo } from '@/lib/chrome';
import type { SavedForm } from '@/lib/types';

interface Props {
  form: SavedForm;
  compact?: boolean;
  otherPage?: boolean;
}

export function SavedFormCard({ form, compact = false, otherPage = false }: Props) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const host = hostOf(form.url);

  async function fill(newTab = false) {
    setBusy(true);
    try {
      if (await fillEntry(form, newTab)) {
        await updateForm(form.id, { useCount: (form.useCount || 0) + 1, lastUsedAt: Date.now() });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-card hover:border-foreground/20 group rounded-lg border p-3 transition-colors">
      <div className="flex items-start gap-3">
        <div className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
          {(form.name || host).trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 leading-snug font-medium" title={form.name}>
            {form.name}
          </p>
          <p className="text-muted-foreground mt-0.5 truncate text-xs" title={form.url}>
            <span className="text-foreground/70 font-medium">{host}</span>
            {pathOf(form.url)}
          </p>
        </div>
        <ConfirmButton
          title="Delete saved form?"
          description={`“${form.name}” will be removed permanently.`}
          onConfirm={async () => {
            await deleteForm(form.id);
            toast('Form deleted');
          }}
        >
          <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-destructive -mt-0.5 -mr-1">
            <Trash2 />
          </Button>
        </ConfirmButton>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="font-normal">{form.fields.length} fields</Badge>
        <Badge variant="secondary" className="font-normal">{timeAgo(form.createdAt)}</Badge>
        {form.useCount > 0 && <Badge variant="secondary" className="font-normal">used {form.useCount}×</Badge>}
        {otherPage && <Badge variant="outline" className="font-normal">other page</Badge>}
        {form.autoFill && (
          <Badge variant="outline" className="border-success/30 bg-success/10 text-success">auto-fill</Badge>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1 border-t pt-3">
        <Button size="xs" onClick={() => fill()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Play />}
          Fill
        </Button>
        {!compact && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="xs" variant="ghost" onClick={() => fill(true)} disabled={busy}>
                <ExternalLink />
                New tab
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open in a new tab and fill</TooltipContent>
          </Tooltip>
        )}
        <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
          <Pencil />
          Edit
        </Button>
        {!compact && (
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="text-muted-foreground ml-auto flex cursor-pointer items-center gap-1.5 text-xs">
                Auto
                <Switch
                  checked={form.autoFill}
                  onCheckedChange={async (autoFill) => {
                    await updateForm(form.id, { autoFill });
                    toast(autoFill ? 'Auto-fill enabled' : 'Auto-fill disabled');
                  }}
                />
              </label>
            </TooltipTrigger>
            <TooltipContent>Fill automatically when this URL opens</TooltipContent>
          </Tooltip>
        )}
      </div>

      {!compact && (
        <div className="mt-2">
          <FieldsCollapsible fields={form.fields} />
        </div>
      )}

      <EditFormDialog form={form} open={editing} onOpenChange={setEditing} />
    </div>
  );
}
