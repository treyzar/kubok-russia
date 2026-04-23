# Game Parameters (Frontend View)

This document explains configurable room parameters exposed in frontend and how they affect UX.

## Parameters

1. `seatsTotal` — number of seats in room.
2. `entryCost` — bonus points required to join.
3. `prizeFundPercent` — share of total fund paid to winner.
4. `boostPrice` — bonus points required for one boost.

## Impact on user attractiveness

1. High `entryCost` can reduce conversion and room fill speed.
2. Large `seatsTotal` + high `entryCost` may create long waiting time.
3. Expensive `boostPrice` can reduce boost usage and perceived fairness.

## Impact on organizer economics

1. High `prizeFundPercent` reduces organizer margin.
2. Reasonable `boostPrice` can improve room revenue and engagement.
3. Balanced values keep both retention and economics healthy.

## Validation rules in configurator

1. Seats must be from `2` to `30`.
2. Entry cost must be from `100` to `200000`.
3. Prize fund percent must be from `50` to `95`.
4. Boost price must be at least `100`.

If critical rules are violated, save is blocked.

## Warning examples

1. `prizeFundPercent > 88` — low organizer profitability risk.
2. `boostPrice > 50% of entryCost` — low boost conversion risk.
3. `entryCost > 15000` — low fill-speed risk.
4. `seatsTotal >= 20` with high entry cost — high mismatch risk.
