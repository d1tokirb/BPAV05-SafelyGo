# Campus dashboard — October 6

Removed the oversized decorative sharing diagram from Home and walk setup. Home now uses a compact walk action, a passive campus map preview with actual active report pins, and paired Report/Help actions. The full map remains deliberately opened and interactive. The preview uses campus coordinates, not device location. Optional campus updates remain collapsed.

TypeScript and Expo lint passed without warnings. iOS, Android, and web exports passed. Browser checks at 393×852 and 320×740 confirmed navigation to walk setup, full map, reports, and help, with no horizontal overflow. Preview zoom controls are absent and attribution links excluded from keyboard navigation; full-map zoom controls remain available.

Screenshots: output/ui/iterations/home-campus-dashboard.png and walk-campus-dashboard.png. Native device behavior remains unverified. No numeric perfection rating is claimed.
