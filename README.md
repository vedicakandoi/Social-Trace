# Social Trace (static HTML/CSS/JavaScript)

A privacy-first, browser-only Instagram followers/following analyzer. No React, TypeScript, Node.js, build step, backend, login, database, or analytics are required.

## Files

- `index.html` — page structure and tool UI
- `styles.css` — responsive styling
- `app.js` — local HTML parsing, comparison, search, and CSV export
- `.nojekyll` — tells GitHub Pages not to run Jekyll processing

## Run locally

Open `index.html` in a modern browser. For normal use, no local server is required. The browser only reads files the user explicitly selects.

## Publish on GitHub Pages

1. Upload the contents of this folder to the root of your repository (not the outer folder).
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`, then save.
5. Remove/disable the old GitHub Actions deployment workflow if one exists at `.github/workflows/deploy.yml`, so it does not conflict with branch deployment. You can delete that file through GitHub's web editor.
6. Wait for Pages to publish, then open `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

## Using the analyzer

1. In Instagram's downloaded information, select the HTML file(s) for **Followers** and the HTML file(s) for **Following**. You can select multiple files in either input.
2. Click **Analyze my data**. The app combines each group, normalizes usernames, removes duplicates, and compares the lists.
3. Browse the three tabs, search usernames, open Instagram profiles in a new tab, or export the current tab / all results as CSV.
4. Click **Clear data** to clear the current page's selections and results. Results also disappear when the page is refreshed or closed.

## Privacy

All processing is client-side. The app does not send selected files or extracted usernames to a server, does not request Instagram login credentials, and does not use analytics or browser storage. Google Fonts are referenced for typography; if you want absolutely no external network requests, remove the `@import` line at the top of `styles.css` and use system fonts instead.

## Parser notes

The parser uses rule-based strategies and does not depend on Instagram CSS class names. It prioritizes Instagram profile URLs (including `/ _u / username` style links after normal URL parsing), then nearby headings/text, and finally profile-shaped URL patterns in the HTML source. Instagram can change its export structure, so unusual or newly changed exports may produce warnings or require a parser update. Warnings do not block viewing whatever results could be extracted.
