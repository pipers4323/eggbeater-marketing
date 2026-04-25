# Scorer Follow-Ups
Date: 2026-04-25

## Live Hotfixes Shipped

- Web/source repo: `9291572`
- Native wrapper repo: `64f01ad`

## Fixed In Code

1. Same-club simultaneous scoring should now be allowed across different games.
2. Timeout should now resume the quarter clock from the saved time.
3. Manual `Sprint` button is back in the scorer controls.

## Still Needs Verification

1. Live Activities:
   - verify score updates are reliable during normal play
   - verify timeout start/end propagate correctly
   - verify final score/finalization updates reliably

2. Same-game conflict protection:
   - verify one scorer still blocks a second scorer on the exact same game

3. Server-side scorer lock:
   - if different-game simultaneous scoring still conflicts across devices, inspect the push worker scorer-session lock keying directly
   - likely area: server lock may still be using age-group scope instead of game scope

## Recommended First Checks Tomorrow

1. Two scorers on two different games in the same club/division
2. Same game from two devices to confirm conflict still blocks correctly
3. One timeout cycle end-to-end
4. One finalized game with Live Activity visible
