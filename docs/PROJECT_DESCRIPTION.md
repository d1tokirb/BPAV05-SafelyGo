# SafelyGo: Student Campus Safety App

SafelyGo is a mobile application for campus communities that need a clear way to report concerns, find help and stay connected with trusted people. Each participating institution receives its own map, emergency directory, membership and staff administration. Students use an institutional email and campus invitation to join, while a platform operator verifies the authority of the campus owner before activation.

The application uses React Native and Expo for Android and iOS. A Node.js API persists information in PostgreSQL and is configured for deployment on Railway. Native Apple Maps and Google Maps provide campus visualization; the supplementary browser preview uses Leaflet and attributed OpenStreetMap tiles.

Students submit categorized concerns at a selected map position and track review status. Detailed reports remain private to the student and campus staff. Staff can review reports and publish an edited, non-identifying summary on the campus map. This separates operational detail from useful community awareness. Staff also maintain contact numbers and time-limited campus announcements, and owners delegate staff authority. An audit log records administrative changes.

Location sharing is based on explicit, reversible consent. A user invites another verified SafelyGo user; the recipient must accept before either can choose to share. The sender selects recipients and a limited duration. The server stores only the latest position and rejects access after expiry or revocation. The interface displays update time and accuracy, including stale-location warnings. Optional background updates use Expo's native location task; device operating systems can still interrupt updates, and SafelyGo does not promise uninterrupted tracking.

The design uses a blue navigation system, readable platform typography, large touch controls and consistent notices. The map supports spatial understanding while report lists provide a readable alternative. A clear distinction between campus information, student concerns and selected trusted contacts makes the application's privacy boundaries understandable.

Testing includes TypeScript checks, real-PostgreSQL integration scenarios, browser interaction, native configuration generation and Android/iOS bundle export. Signed-device testing, live hosting, sender verification, actual emergency contact validation and institution-specific operational procedures remain part of launch acceptance. SafelyGo is not emergency dispatch and does not guarantee personal or route safety.
