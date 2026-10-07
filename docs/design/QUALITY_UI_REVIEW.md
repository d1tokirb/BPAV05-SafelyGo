# Product UI review — October 7

The user redirected the aesthetic references from campus safety products to well-designed consumer apps. Reviewed published Airbnb app screens, Uber's redesigned-app material, Apple's Find My People screen, and Things 3 typography examples. Borrowed hierarchy and interaction patterns, not brand assets or feature promises.

Implemented a brighter sapphire and white system, quieter Home action surfaces, earlier Report/Help entry points, recognizable recipient initials, unboxed walk/report forms, compact report status summaries, single-target call rows, and a bottom map detail sheet with a 48px close target. The Home report shortcut opens the form directly and preserves saved drafts. Detailed report progress remains inside the disclosure.

Browser review at 393×852 and 320×740 verified no horizontal overflow, direct report entry, save-and-close, report history, walk recipient selection and transition to time selection, Help call confirmation/cancel without dialing, and map marker details/close. Small-phone walk layout and overly dominant map-sheet close control were corrected during review. TypeScript, lint, and cross-platform export checks were run. Physical iPhone UX and native map sheet behavior remain unverified.

Proof images are in output/ui/iterations: home-quality-reference.png, reports-quality-reference.png, help-quality-reference.png, map-quality-reference.png. No perfection score is claimed.

References:
- https://news.airbnb.com/product-releases/airbnb-2025-summer-release
- https://www.uber.com/br/en/u/redesigned-uber-app/
- https://support.apple.com/en-mt/guide/iphone/ipha24eb4a37/ios
- https://culturedcode.com/things/blog/2023/09/things-big-and-small/
