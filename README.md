# Striide

A minimal daily habit app. Pick up to three habits, run timed sessions, jot notes, and see your week.

It's a home screen web app. All data stays on the device, in the browser's storage. There's no account and no server-side database.

## Put it on your iPhone

1. Host the `public/` folder on any static host, such as GitHub Pages.
2. Open the address in Safari on the iPhone.
3. Tap Share, then Add to Home Screen.

After the first visit, it works offline.

## Preview on a computer

```sh
npm start
```

Then open http://localhost:3000. No install step is needed.

## How it's built

- `public/data.js` stores profile, habits, check-offs and notes on the device and computes streaks and weekly stats.
- `public/app.js` holds every screen.
- `public/sw.js` caches the app for offline use. Bump its `VERSION` when you ship changes.
- `server.js` is only a local preview server.

## Known limits

- Data lives on one device and doesn't sync. Deleting the home screen app deletes its data.
- Reminders only fire while the app is open.
- Habits with a time like "20 min" become timed sessions. Everything else is a simple check-off.
