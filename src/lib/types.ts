export interface Field {
  selector: string;
  tag: string;
  type: string;
  name: string;
  id: string;
  label: string;
  value: string | string[];
  checked?: boolean;
}

export interface SavedForm {
  id: string;
  name: string;
  url: string;
  title?: string;
  fields: Field[];
  autoFill: boolean;
  createdAt: number;
  updatedAt: number;
  useCount: number;
  lastUsedAt?: number;
}

export type HistoryAction = 'submitted' | 'saved' | 'filled' | 'captured' | 'generated';

export interface HistoryEntry {
  id: string;
  action: HistoryAction;
  url: string;
  title?: string;
  fields: Field[];
  createdAt: number;
}

export interface CustomField {
  key: string;
  value: string;
}

export interface Profile {
  [key: string]: string | CustomField[] | undefined;
  custom?: CustomField[];
}

export interface Settings {
  captureSubmissions: boolean;
  historyLimit: number;
  theme: 'light' | 'dark';
  dataSource: 'local' | 'randomuser';
  nationalities: string;
}

export interface StoreState {
  profile: Profile;
  savedForms: SavedForm[];
  history: HistoryEntry[];
  settings: Settings;
}

/** Captured page data that can become a saved form. */
export interface FormSnapshot {
  url: string;
  title?: string;
  fields: Field[];
}

export type Person = Record<string, string>;

declare global {
  // Provided by public/faker.js (loaded as a classic script before the app).
  // eslint-disable-next-line no-var
  var FDMFaker: {
    profile(): Person;
    pick<T>(arr: T[]): T;
    int(min: number, max: number): number;
  };
}
