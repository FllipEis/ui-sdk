---
"@ui-sdk/core": patch
---

A Carousel no longer pulls against a trackpad flick in Safari, or against the iOS rubber band past either end. Safari fires `scrollend` as the fingers lift, and the carousel took it for rest and sprang to the nearest page while momentum carried on. A native scroll now rests once it's on a page, or once nothing scrolls for a moment, and CSS snapping lines it up. With `dragFree`, a native scroll now stays where it stops instead of springing to the nearest page.
