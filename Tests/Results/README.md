# Results

When Prem finishes a unit's self-check, the lesson page downloads a `coding_unitNN_results.json` file (e.g. `coding_unit01_results.json`). Drop it in this folder.

Next session, Claude reads whatever's newest here to see how the unit went, updates `units.status` in the Executive Summary, and drafts the next unit accordingly. Nothing in here needs to be graded by hand first — that's Claude's job as the coach.
