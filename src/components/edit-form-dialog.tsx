import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import { updateForm } from '@/lib/actions';
import type { Field, SavedForm } from '@/lib/types';

interface Props {
  form: SavedForm;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditFormDialog({ form, open, onOpenChange }: Props) {
  const [name, setName] = useState(form.name);
  const [url, setUrl] = useState(form.url);
  const [autoFill, setAutoFill] = useState(form.autoFill);
  const [fields, setFields] = useState<Field[]>(form.fields);

  // Reset the draft each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setName(form.name);
    setUrl(form.url);
    setAutoFill(form.autoFill);
    setFields(form.fields);
  }, [open, form]);

  const patchField = (i: number, patch: Partial<Field>) =>
    setFields((prev) => prev.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  async function save() {
    await updateForm(form.id, {
      name: name.trim() || form.name,
      url: url.trim() || form.url,
      autoFill,
      fields,
    });
    onOpenChange(false);
    toast.success('Form updated');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-1.5rem)] gap-3 overflow-hidden p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit saved form</DialogTitle>
          <DialogDescription>Change the name, URL or any stored value.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <Label htmlFor="edit-name">Name</Label>
          <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-url">URL</Label>
          <Input id="edit-url" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <label className="flex items-center justify-between rounded-md border px-3 py-2">
          <span className="text-sm">Auto-fill when this URL opens</span>
          <Switch checked={autoFill} onCheckedChange={setAutoFill} />
        </label>

        <div className="grid gap-1.5">
          <Label>Field values</Label>
          <div className="-mr-2 grid max-h-[38vh] gap-2 overflow-y-auto pr-2">
            {fields.map((f, i) => (
              <div key={`${f.selector}-${i}`} className="grid grid-cols-[38%_1fr_auto] items-center gap-2">
                <span className="text-muted-foreground truncate text-xs" title={f.selector}>
                  {f.label || f.name || f.id || f.selector}
                </span>
                {f.type === 'checkbox' || f.type === 'radio' ? (
                  <Checkbox checked={!!f.checked} onCheckedChange={(c) => patchField(i, { checked: c === true })} />
                ) : f.type === 'textarea' ? (
                  <Textarea
                    rows={2}
                    className="min-h-0 text-xs"
                    value={String(f.value)}
                    onChange={(e) => patchField(i, { value: e.target.value })}
                  />
                ) : (
                  <Input
                    className="h-8 text-xs"
                    value={Array.isArray(f.value) ? f.value.join(', ') : f.value}
                    onChange={(e) =>
                      patchField(i, {
                        value: Array.isArray(f.value)
                          ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                          : e.target.value,
                      })
                    }
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-destructive"
                  title="Remove field"
                  onClick={() => setFields((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
