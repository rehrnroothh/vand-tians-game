# Add Örjan win/loss pictures

If you want to use custom photos in the end-game modal, add files with these exact names:

- `public/orjan-winning.jpg` (shown when Örjan wins)
- `public/orjan-losing.jpg` (shown when Örjan loses)

Then restart `npm run dev` (if it is already running).

## Fallback behavior

The game first tries the JPG files above. If one is missing, it automatically falls back to:

- `public/orjan-winning.svg`
- `public/orjan-losing.svg`

So the UI won’t show a broken image.

## Recommended dimensions

Use roughly 16:9 (for example `960x540`) for best fit in the modal.
