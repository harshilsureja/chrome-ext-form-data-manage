import { ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { fieldValueText } from '@/lib/chrome';
import type { Field } from '@/lib/types';

export function FieldTable({ fields }: { fields: Field[] }) {
  if (!fields.length) return <p className="text-muted-foreground py-3 text-center text-xs">No fields</p>;
  return (
    <div className="max-h-56 overflow-auto rounded-md border text-xs">
      <table className="w-full table-fixed">
        <tbody>
          {fields.map((f, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="text-muted-foreground w-2/5 truncate px-2 py-1.5 font-medium" title={f.selector}>
                {f.label || f.name || f.id || f.selector}
              </td>
              <td className="px-2 py-1.5 break-words">{fieldValueText(f)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FieldsCollapsible({ fields }: { fields: Field[] }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors">
        <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
        Show {fields.length} fields
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <FieldTable fields={fields} />
      </CollapsibleContent>
    </Collapsible>
  );
}
