import { addHistory, readStore, writeStore } from './chrome';
import type { FormSnapshot, SavedForm } from './types';

// Every write re-reads storage first so concurrent panels/tabs don't clobber each other.

export async function createForm(snapshot: FormSnapshot, name: string, autoFill: boolean) {
  const form: SavedForm = {
    id: crypto.randomUUID(),
    name: name.trim() || snapshot.title || 'Untitled form',
    url: snapshot.url,
    title: snapshot.title,
    fields: snapshot.fields,
    autoFill,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    useCount: 0,
  };
  const { savedForms } = await readStore();
  await writeStore({ savedForms: [form, ...savedForms] });
  await addHistory({ action: 'saved', url: form.url, title: form.name, fields: form.fields });
  return form;
}

export async function updateForm(id: string, patch: Partial<SavedForm>) {
  const { savedForms } = await readStore();
  await writeStore({
    savedForms: savedForms.map((f) => (f.id === id ? { ...f, ...patch, updatedAt: Date.now() } : f)),
  });
}

export async function deleteForm(id: string) {
  const { savedForms } = await readStore();
  await writeStore({ savedForms: savedForms.filter((f) => f.id !== id) });
}

export async function deleteHistory(id: string) {
  const { history } = await readStore();
  await writeStore({ history: history.filter((h) => h.id !== id) });
}
