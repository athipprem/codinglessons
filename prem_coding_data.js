/* Prem's Coding — data source for index.html and Prems_Coding_Dashboard.html
   Hand-maintained by the coach (Claude) as coding_unitNN_results.json files come in
   from Lessons/Results/. No server, no auto-sync — this file is the single source
   of truth for "where Prem is" until it's updated by hand after a real playthrough.

   Note: roadmap entries carry NO "status" field. Status (done / in_progress / locked)
   is computed automatically by index.html and the dashboard from `results`: a unit
   counts as done once it has a matching entry in `results`, the first not-yet-done
   unit in order is unlocked (in_progress), and everything after that stays locked.
   That's what makes "Unit 2 unlocks once Unit 1 is completed" automatic — just add
   Unit 1's result below and Unit 2 flips to in_progress on both pages, no manual
   status edits needed. */
var PREM_CODING_DATA = {

  // Stage 1 roadmap — 10 units + Milestone Test 1. Keep in sync with
  // Executive_Summary/Curriculum and Progress.md's roadmap table.
  roadmap: [
    { n: 1,  title: "Sequence",       concept: "A computer does exactly what you say, in exact order",
      life: "Recipes/routines — step 1 before step 2",
      file: "unit_01_code_cadet.html" },
    { n: 2,  title: "Loops",          concept: "Repeat instead of copy-paste",
      life: "Habits — same routine every day until done",
      file: "unit_02_loops.html" },
    { n: 3,  title: "Nested Loops",   concept: "A loop inside a loop",
      life: "A weekly routine (outer) containing a daily routine (inner)",
      file: "unit_03_nested_loops.html" },
    { n: 4,  title: "Events",         concept: "“When X happens, do Y” — reacting, not deciding",
      life: "Reflexes — when the alarm goes off, you get up",
      file: "unit_04_events.html" },
    { n: 5,  title: "Conditions",     concept: "Branching logic, including combined AND/OR conditions",
      life: "Decisions — “if it's raining AND I don't have an umbrella, take the bus”",
      file: null },
    { n: 6,  title: "Variables",      concept: "A named box holding a value that changes",
      life: "Things tracked over time — a score, a streak",
      file: null },
    { n: 7,  title: "Custom Blocks",  concept: "Build a tool once, reuse it anywhere",
      life: "A skill learned once, reused forever (riding a bike)",
      file: null },
    { n: 8,  title: "Lists",          concept: "Tracking many values in order, not just one",
      life: "Rankings, a shopping list",
      file: null },
    { n: 9,  title: "Debugging",      concept: "Find *why* something's wrong, not just that it is",
      life: "Diagnosing a mistake — where exactly did the logic break?",
      file: null },
    { n: 10, title: "Capstone Project", concept: "Combine everything (1–9) into one finished mini-game",
      life: "A small taste of Stage 3 — idea to finished, working thing",
      file: null },
    { n: "M1", title: "Milestone Test 1", concept: "Mixed conceptual check + a combined hands-on challenge spanning all 10 units",
      life: "Skills that looked solid one at a time have to hold up combined",
      file: null }
  ],

  // One entry per completed unit/milestone, built from that unit's
  // coding_unitNN_results.json once Prem plays it and the file lands in
  // Lessons/Results/. See Executive_Summary/Curriculum and Progress.md's
  // "Unit 1 & 2 — Results Analysis" section for the write-up behind these.
  results: [
    {
      unit: 1, title: "Sequence", completed_at: "2026-08-25", xp_earned: 84,
      coding: { concept_score: 2, concept_out_of: 2,
                mission1_succeeded: true, mission1_attempts: 1,
                mission2_succeeded: true, mission2_attempts: 2 },
      life: { score: 1, out_of: 3, hits: 1, false_positives: 0 }
    },
    {
      unit: 2, title: "Loops", completed_at: "2026-08-25", xp_earned: 74,
      coding: { concept_score: 1, concept_out_of: 2,
                mission1_succeeded: true, mission1_attempts: 4,
                mission2_succeeded: true, mission2_attempts: 1 },
      life: { score: 1, out_of: 3, hits: 1, false_positives: 0 }
    },
    {
      unit: 3, title: "Nested Loops", completed_at: "2026-08-26", xp_earned: 96,
      coding: { concept_score: 2, concept_out_of: 2,
                mission1_succeeded: true, mission1_attempts: 8,
                mission2_succeeded: true, mission2_attempts: 2 },
      life: { score: 4, out_of: 5, hits: 2, false_positives: 1 }
    }
    // Next entry: Unit 4, once it's played through.
  ]
};

/* Computes status for every roadmap entry from `results`. Shared by
   index.html and Prems_Coding_Dashboard.html so both pages always agree. */
function computeCodingRoadmap(data){
  var doneSet = {};
  data.results.forEach(function(r){ doneSet[r.unit] = true; });
  var unlockedNext = true;
  return data.roadmap.map(function(u){
    var status;
    if (doneSet[u.n]) { status = 'done'; }
    else if (unlockedNext) { status = 'in_progress'; unlockedNext = false; }
    else { status = 'locked'; }
    var merged = {};
    for (var k in u) merged[k] = u[k];
    merged.status = status;
    return merged;
  });
}
