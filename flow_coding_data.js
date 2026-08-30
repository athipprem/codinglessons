/* Flow Academy — The Loop — data source for the-loop.html's Mission Roadmap.
   This is the App Dev project's OWN data file — separate from Lessons/prem_coding_data.js,
   which belongs to the earlier "Code Cadet" build. App Dev is being rebuilt fresh under the
   Flow Academy brand (new files live under App Dev/theloop_units/), so this file starts
   with an empty `results` array rather than carrying over Prem's old Code-Cadet-era results.

   Same computeCodingRoadmap() pattern as the Lessons version: roadmap entries carry NO
   "status" field — status (done / in_progress / locked) is computed automatically from
   `results`. A unit with `file: null` hasn't been rebuilt in this project yet, so it always
   renders as a non-clickable locked/upcoming card regardless of roadmap position. */
var FLOW_CODING_DATA = {

  // Stage 1 roadmap — 10 units + Milestone Test 1. Same curriculum plan as the Lessons
  // project (titles/concepts/life-connections are content, not branding) — keep both in
  // sync with Executive Summary/Curriculum and Progress.md's roadmap table.
  roadmap: [
    { n: 1,  title: "Sequence",       concept: "A computer does exactly what you say, in exact order",
      life: "Recipes/routines — step 1 before step 2",
      file: "theloop_units/unit_01_sequence.html" },
    { n: 2,  title: "Loops",          concept: "Repeat instead of copy-paste",
      life: "Habits — same routine every day until done",
      file: "theloop_units/unit_02_loops.html" },
    { n: 3,  title: "Nested Loops",   concept: "A loop inside a loop",
      life: "A weekly routine (outer) containing a daily routine (inner)",
      file: "theloop_units/unit_03_nested_loops.html" },
    { n: 4,  title: "Events",         concept: "“When X happens, do Y” — reacting, not deciding",
      life: "Reflexes — when the alarm goes off, you get up",
      file: "theloop_units/unit_04_events.html" },
    { n: 5,  title: "Conditions",     concept: "Branching logic, including combined AND/OR conditions",
      life: "Decisions — “if it's raining AND I don't have an umbrella, take the bus”",
      file: "theloop_units/unit_05_conditions.html" },
    { n: 6,  title: "Variables",      concept: "A named box holding a value that changes",
      life: "Things tracked over time — a score, a streak",
      file: "theloop_units/unit_06_variables.html" },
    { n: 7,  title: "Custom Blocks",  concept: "Build a tool once, reuse it anywhere",
      life: "A skill learned once, reused forever (riding a bike)",
      file: "theloop_units/unit_07_custom_blocks.html" },
    { n: 8,  title: "Lists",          concept: "Tracking many values in order, not just one",
      life: "Rankings, a shopping list",
      file: "theloop_units/unit_08_lists.html" },
    { n: 9,  title: "Debugging",      concept: "Find *why* something's wrong, not just that it is",
      life: "Diagnosing a mistake — where exactly did the logic break?",
      file: "theloop_units/unit_09_debugging.html" },
    { n: "M1", title: "Milestone Test 1", concept: "Mixed conceptual check + a combined hands-on challenge spanning Units 1–9",
      life: "Skills that looked solid one at a time have to hold up combined",
      file: "theloop_units/milestone_test_1.html" },
    { n: 10, title: "Capstone Project", concept: "Combine everything (1–9) into one finished mini-game",
      life: "The real final step — idea to finished, working thing, only once Milestone 1 confirms the fundamentals hold",
      file: null }
  ],

  // Fresh start for this project — no results carried over from the old Code Cadet build.
  // One entry per completed unit/milestone goes here as Prem plays through the new versions.
  results: []
};

// Units 1-9 are all browsable any time, in any order, regardless of completion — "feel free to
// browse and learn." Milestone 1 and Unit 10 (Capstone) stay locked until every one of Units 1-9
// has a saved result; the moment that's true, whichever of the two isn't done yet becomes the
// current "in_progress" pick — Milestone 1 first (it's the real checkpoint on whether the 9
// fundamentals actually hold up combined), then Capstone once M1 is done, since the Capstone is
// the true final step of Stage 1, not a dress rehearsal for the milestone.
function computeFlowRoadmap(data){
  var doneSet = {};
  data.results.forEach(function(r){ doneSet[r.unit] = true; });
  var allNineDone = true;
  for (var i = 1; i <= 9; i++) { if (!doneSet[i]) { allNineDone = false; break; } }
  var gateUnlockedNext = true;
  return data.roadmap.map(function(u){
    var status;
    if (doneSet[u.n]) {
      status = 'done';
    } else if (u.n === 10 || u.n === 'M1') {
      if (allNineDone && gateUnlockedNext) { status = 'in_progress'; gateUnlockedNext = false; }
      else { status = 'locked'; }
    } else {
      status = 'unlocked';
    }
    var merged = {};
    for (var k in u) merged[k] = u[k];
    merged.status = status;
    return merged;
  });
}
