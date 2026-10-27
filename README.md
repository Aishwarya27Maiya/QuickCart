# Quick Cart

Quick Cart is a React app for finding nearby Walmart stores, keeping a grocery
list, keeping an independent to-do list, and opening product searches while
shopping. To-do items can be added, edited, and deleted from the **To-do list**
tab, and are saved in the browser alongside the rest of the app data.

## Run locally

```sh
npm install
npm run dev
```

Store and ZIP lookups use OpenStreetMap Nominatim. The Vite development and
preview servers proxy `/api/nominatim` requests to Nominatim so browsers can
make the requests without cross-origin restrictions. The GitHub Pages build
uses Nominatim's public HTTPS endpoint directly. Its usage policy applies:
requests are rate-limited, and the public service is intended for limited use,
not high-volume production traffic.

Current-location lookup also requires browser location permission and a secure
context (HTTPS, or localhost during development).

If current-location lookup is blocked, allow location access for the Quick Cart
site in your browser and enable Location Services for the browser in your
device's privacy settings. Localhost is treated as a secure context; ZIP-code
search remains available if device location cannot be determined.

Store search shows up to five nearby Walmart locations, sorted by distance.
The nearest is selected by default; choose another result to use that store for
your grocery list, directions, and aisle searches.

## Publish to GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds the app and deploys
it whenever a commit is pushed to `main`. In the repository's **Settings >
Pages**, set the build and deployment source to **GitHub Actions**. The project
site will then be available at
`https://aishwarya27maiya.github.io/QuickCart/`.

The app stores grocery lists, to-do items, and aisle notes in browser
`localStorage`. That data stays on the device and browser where it was entered;
it does not automatically sync between a computer and phone.

## Optional Walmart aisle helper

The optional Tampermonkey helper can pass aisle details it can actually read
from Walmart product pages back to Quick Cart. Install the helper from
`https://aishwarya27maiya.github.io/QuickCart/aisle-finder-helper.user.js` in a
userscript-compatible browser, then open Quick Cart on that device. For local
development, the helper also supports `http://localhost:<Vite port>` and
`http://127.0.0.1:<Vite port>`. It runs only on Walmart and these explicit
Quick Cart origins.

Mobile userscript support depends on the phone and browser. iPhone users need a
Safari browser extension that supports userscripts; Android support varies by
browser. Quick Cart itself works in a mobile browser without the helper, but
automatic aisle lookup requires it.

Select grocery items to show them in the Shopping Guide. Use the search icon
beside an item to look up that item's aisle. Aisle details remain hidden until
the helper returns a verified aisle. With Tampermonkey enabled, Quick Cart
opens a separate Walmart tab and keeps Quick Cart open in its own tab. Sign in,
confirm the store, and start the search in the Walmart tab when prompted. The
helper does not read or send passwords, cookies, or account credentials. Aisle
details are saved in this
browser and associated with the selected store and grocery item. The helper is
best-effort and can stop working if Walmart changes its page.

Saved aisle notes remain in browser storage even if the corresponding
grocery-list item is later edited or removed. They can be edited or removed
individually from **Saved aisles**.

When the Walmart helper finds aisle details, Quick Cart saves them
under the matching store and item, then opens **Saved aisles** so the results
are visible. **Saved aisles** shows all saved notes grouped into separate store
sections, so the same item can have different aisle details for each Walmart.
The saved-item count reflects the Walmart currently selected in **Find store**.
A new search result updates the saved note for the same item at the same
store instead of creating a duplicate.

On Walmart, the helper's **Add to my list** button also sends each entered aisle
note to Quick Cart. Keep Quick Cart open and select a store; valid aisle notes
are saved under that store and shown in **Saved aisles**. Notes entered before a
store is selected remain queued until you choose one. **Copy all** remains
available for copying the helper's full list.

The helper timestamps queued notes. Quick Cart ignores notes queued before the
current page session, so stale Tampermonkey entries cannot appear as results
from a new search. Update the helper to version 4.4.3 for this protection; if an
older queued note is needed, add it again with the updated helper.
