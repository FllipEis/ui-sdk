---
"@ui-sdk/core": patch
---

A Carousel no longer pulls against a trackpad flick in Safari or the iOS rubber band past either end. Safari fires `scrollend` as the fingers lift, and the carousel took it for rest and sprang back to the nearest page while momentum carried on. A native scroll now rests once it settles on a page, or once it holds still.
