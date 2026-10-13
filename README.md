# Social Trace — static HTML/CSS/JavaScript

A privacy-first Instagram followers/following analyzer. No React, TypeScript, Node.js, build step, backend, login, database, external JavaScript library, or analytics is required.

## Files

- `index.html` — homepage and tool selection; each tool opens on its own page.
- `instagram-followers.html` — dedicated Instagram analyzer and step-by-step Instagram export instructions.
- `styles.css` — responsive styling.
- `app.js` — local HTML parsing, comparison, search, CSV export, and multi-sheet spreadsheet export.
- `.nojekyll` — optional GitHub Pages compatibility file.

## Publish on GitHub Pages

1. Extract the ZIP and upload the *contents* of `social-trace-static` to the root of your repository, not the outer folder.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`, then save.
5. Remove/disable any old GitHub Actions deployment workflow at `.github/workflows/deploy.yml` to avoid conflicting deployment methods.
6. Wait for Pages to publish, then open `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

## Using the Instagram analyzer

1. Open **Instagram followers & following** from the homepage.
2. Follow the on-page instructions to request an Instagram data export in HTML format through Accounts Center. Set the date range to **All time** so the export includes the full available data.
3. Extract Instagram's ZIP file and select every Followers HTML file and every Following HTML file. Instagram may split lists across multiple files.
4. Click **Analyze my data**, browse the three results tabs, search, or click a username to open that Instagram profile in a new tab.
5. Export a single tab as CSV. The combined export is one Excel-compatible `.xls` workbook with three worksheets: `They don’t follow back`, `You don’t follow back`, and `Mutuals`. Worksheet headings are bold; no relationship column is needed because each sheet name identifies the relationship.

## Privacy

All processing is client-side. Selected files and extracted usernames are not sent to a server. The app does not ask for Instagram credentials, use analytics, or store results in browser storage. The Accounts Center link opens only when the user chooses it.

## Parser notes

The parser uses rule-based strategies and does not depend on Instagram CSS class names. It prioritizes Instagram profile URLs (including `/_u/username` links), then nearby headings/text, and finally profile-shaped URLs in the HTML source. Instagram can change its export structure, so unusual exports may produce warnings or require a parser update.
