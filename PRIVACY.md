# Privacy Policy

_Last updated: October 12, 2026_

Open Autofill is a browser extension that helps you fill, save and replay web forms. It is designed to keep your data on your device.

## What Open Autofill stores

- **Profile** details you type into the Profile tab.
- **Saved forms**: field values and the page URL of forms you choose to save.
- **History**: field values and URLs of forms you submit, save, fill or generate data for (submission logging can be turned off in Settings).
- **Settings** such as theme and history limit.

All of this is stored locally with `chrome.storage.local`. It never leaves your browser unless you export it yourself.

## What Open Autofill never collects

- Passwords, hidden inputs and file inputs are skipped and never stored.
- No analytics, telemetry, tracking, cookies or advertising.
- No accounts and no Open Autofill servers.

## Network requests

Open Autofill makes a network request **only** when you select **randomuser.me** as the random data source in Settings. It then sends an anonymous request to `https://randomuser.me/api/` to fetch a fictional person. No personal data or browsing information is included. The default data source is fully offline.

## Permissions

| Permission | Why it's needed |
|---|---|
| `sidePanel` | Show the Open Autofill interface in Chrome's side panel. |
| `storage` | Save your profile, forms, history and settings locally. |
| `tabs`, `activeTab` | Read the current tab's URL/title and navigate to a saved form's URL when you click Fill. |
| `scripting` | Inject the form-filling script into tabs that were open before installation. |
| Host access (`<all_urls>`) | Read and fill form fields on the pages you use Open Autofill on, and auto-fill saved forms when their URL opens. |

## Your control

- Delete individual saved forms or history entries at any time.
- **Settings → Delete all data** erases everything.
- Uninstalling the extension removes all stored data.

## Contact

Questions? Open an issue at <https://github.com/harshil-at/chrome-ext-form-data-manage/issues>.
