import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FieldTable } from '@/components/field-table';
import { createForm } from '@/lib/actions';
import { hostOf } from '@/lib/chrome';
import type { FormSnapshot } from '@/lib/types';

interface Props {
  snapshot: FormSnapshot | null;
  onOpenChange: (open: boolean) => void;
}

export function SaveFormDialog({ snapshot, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [autoFill, setAutoFill] = useState(false);

  useEffect(() => {
    if (!snapshot) return;
    setName(snapshot.title || hostOf(snapshot.url));
    setAutoFill(false);
  }, [snapshot]);

  async function save() {
    if (!snapshot) return;
    const form = await createForm(snapshot, name, autoFill);
    onOpenChange(false);
    toast.success(`Saved “${form.name}”`);
  }

  return (
    <Dialog open={!!snapshot} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] gap-3 p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save form</DialogTitle>
          <DialogDescription className="truncate" title={snapshot?.url}>
            {snapshot?.url}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="save-name">Name</Label>
            <Input id="save-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <label className="flex items-center justify-between rounded-md border px-3 py-2">
            <span className="text-sm">Auto-fill when this URL opens</span>
            <Switch checked={autoFill} onCheckedChange={setAutoFill} />
          </label>
          <div className="grid gap-1.5">
            <Label className="text-muted-foreground font-normal">{snapshot?.fields.length ?? 0} fields will be saved</Label>
            <FieldTable fields={snapshot?.fields ?? []} />
          </div>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save form
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
