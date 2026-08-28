/* Spark Academy — The Loop — data source for the-loop.html's Mission Roadmap.
   This is the App Dev project's OWN data file — separate from Lessons/prem_coding_data.js,
   which belongs to the earlier "Code Cadet" build. App Dev is being rebuilt fresh under the
   Spark Academy brand (new files live under App Dev/theloop_units/), so this file starts
   with an empty `results` array rather than carrying over Prem's old Code-Cadet-era results.

   Same computeCodingRoadmap() pattern as the Lessons version: roadmap entries carry NO
   "status" field — status (done / in_progress / locked) is computed automatically from
   `results`. A unit with `file: null` hasn't been rebuilt in this project yet, so it always
   renders as a non-clickable locked/upcoming card regardless of roadmap position. */
var SPARK_CODING_DATA = {

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

  // Fresh start for this project — no results carried over from the old Code Cadet build.
  // One entry per completed unit/milestone goes here as Prem plays through the new versions.
  results: []
};

function computeSparkRoadmap(data){
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
