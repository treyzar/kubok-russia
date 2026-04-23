# Round Transparency

This document explains how frontend makes winner selection transparent for experts.

## Inputs visible to user

1. Room fund (`jackpot`).
2. Participants list, including bot labels.
3. Per-participant chance and boost impact.
4. Current room phase and timer.

## Winner explanation on frontend

After round completion frontend shows:

1. Winner name.
2. Round journal record with:
   - participants and bots count,
   - fund and calculated prize,
   - boost usage,
   - textual winner reason:
     "weighted RNG based on chance and boost."
3. Balance delta for the current user.

## Journal as verification source

Round journal modal stores latest rounds and allows expert to verify that:

1. Displayed result matches room state.
2. Winner reason remains consistent.
3. Economic values (fund/prize/delta) are auditable.

## Practical expert check

1. Run a simulated round in lobby.
2. Open journal.
3. Compare winner/fund/chance signals between live simulation and stored round row.
