# TaskFlow academic workspace

The Vite/React application serves the signed-in academic dashboard, Study Matrix,
and login screen. The production API image bundles the Vite build and Flask serves
its entry page and assets behind the production TLS Nginx proxy. The local Nginx
image serves the frontend directly. The authenticated `/legacy` route remains
available as a Flask-rendered fallback while the older
study hub, focus timer, admin editing, export, and print features are not yet
ported to React; the HTML-to-TSX migration is therefore still in progress.

The dashboard derives subject, chapter, and question counts from the persisted
`cst-study-data-v2` and `cst-study-matrix-v1` documents. Revision and assignment
counts are shown only when matching tasks exist in the saved matrix. Exam dates,
goals, streaks, and dated study activity are not currently persisted, so the UI
identifies these as unavailable instead of estimating them.

Styling uses project-owned CSS; no UI framework or chart package is required.
Study-state reads and writes continue through the authenticated Flask API, with
same-origin session cookies and CSRF tokens. Browser-local Study Matrix data is
never uploaded automatically. When the server has no plan, the empty state offers
an explicit recovery action for a valid browser copy or a JSON file. Supported
files contain either the plan object directly or a `cst-study-data-v2` property;
an optional `cst-study-matrix-v1` property restores progress only when the server
does not already have progress. Existing server plans and progress are preserved.
The Settings section can download a JSON backup containing the currently saved
plan and progress. The classic `/legacy` page remains linked from Settings for
the study hub, focus timer, admin editing, achievement, and print/export
workflows that are not yet ported to React.

From this directory, run:

```sh
npm ci
npm run build
npm run lint
npm test
```

The `npm test` command uses Node's built-in test runner and the existing
TypeScript compiler to exercise dashboard calculations and recovery validation.
