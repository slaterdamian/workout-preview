import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Check, Info, ExternalLink, Loader2, Flame, Activity, Clock, Image as ImageIcon } from 'lucide-react';

// ============================================================
// CONFIG — all URLs through jsDelivr (raw.githubusercontent.com gets blocked in artifact CSP)
// ============================================================

const JSDELIVR_GH = "https://cdn.jsdelivr.net/gh";

// yuhonas/free-exercise-db
const YUHONAS_JSON = `${JSDELIVR_GH}/yuhonas/free-exercise-db@main/dist/exercises.json`;
const yuhonasImg = (imagePath) => `${JSDELIVR_GH}/yuhonas/free-exercise-db@main/exercises/${imagePath}`;

// Glowupp-app/open-exercisedb — try multiple candidate JSON paths
const GLOWUPP_CANDIDATE_URLS = [
  `${JSDELIVR_GH}/Glowupp-app/open-exercisedb@main/exercises.json`,
  `${JSDELIVR_GH}/Glowupp-app/open-exercisedb@main/data/exercises.json`,
  `${JSDELIVR_GH}/Glowupp-app/open-exercisedb@main/dist/exercises.json`,
  `${JSDELIVR_GH}/Glowupp-app/open-exercisedb@main/src/exercises.json`,
];

// Common GIF host for the exercisedb ecosystem
const GIF_URL_BUILDERS = [
  (id) => `https://static.exercisedb.dev/media/${id}.gif`,
  (id) => `${JSDELIVR_GH}/Glowupp-app/open-exercisedb@main/gifs/${id}.gif`,
];

// ============================================================
// EXERCISE LIBRARY — my workout's exercises with cues + search hints
// ============================================================

const EX = {
  goblet_squat: { name: "Goblet Squat", searchTerms: ["goblet squat"], primary: ["Quads"], secondary: ["Glutes", "Core", "Upper back"],
    cues: ["Hold KB at chest, elbows pointing down", "Feet shoulder-width, toes turned out ~15°", "Sit back and down — chest up, knees track over toes", "Drive through your whole foot to stand"] },
  db_front_squat: { name: "DB Front-Loaded Squat", searchTerms: ["dumbbell squat", "dumbbell front squat"], primary: ["Quads"], secondary: ["Glutes", "Core", "Upper back"],
    cues: ["Hold two DBs at shoulders, elbows up (front-rack position)", "Stance shoulder-width", "Sit down between your hips, chest tall", "Drive elbows forward the whole rep so DBs stay supported"] },
  db_rdl: { name: "DB Romanian Deadlift", searchTerms: ["dumbbell romanian deadlift", "romanian deadlift"], primary: ["Hamstrings", "Glutes"], secondary: ["Lower back", "Core"],
    cues: ["DBs in front of thighs, soft bend in knees (don't bend more during rep)", "Push your hips back — DBs slide down thighs", "Stop at strong hamstring stretch (usually mid-shin)", "Drive hips forward to stand, squeeze glutes at top"] },
  kb_rdl: { name: "KB Romanian Deadlift", searchTerms: ["kettlebell deadlift", "kettlebell romanian deadlift"], primary: ["Hamstrings", "Glutes"], secondary: ["Lower back", "Core"],
    cues: ["KB in both hands, soft bend in knees", "Push hips back — KB slides down thighs", "Strong stretch at mid-shin", "Squeeze glutes to stand"] },
  kb_sumo_dl: { name: "KB Sumo Deadlift", searchTerms: ["sumo deadlift", "kettlebell sumo"], primary: ["Glutes", "Quads"], secondary: ["Hamstrings", "Lower back"],
    cues: ["Wide stance, toes pointed out ~30°", "KB on floor between feet", "Sit hips down, chest tall, grip the KB", "Drive feet through the floor, stand up tall"] },
  sl_kb_rdl: { name: "Single-Leg KB RDL", searchTerms: ["single leg deadlift", "one leg romanian deadlift"], primary: ["Hamstrings", "Glutes"], secondary: ["Core", "Calves"],
    cues: ["Stand on one leg, KB in opposite hand", "Hinge forward — back leg extends straight behind like a seesaw", "Standing knee soft, hips square to the floor", "Squeeze the standing glute to return to standing"] },
  kb_swing: { name: "KB Swing", searchTerms: ["kettlebell swing", "two-arm kettlebell swing"], primary: ["Hamstrings", "Glutes"], secondary: ["Core", "Shoulders"],
    cues: ["Hike KB back high (pocket your wallet zone, not knees)", "Snap hips forward explosively", "KB floats to chest height from hip power, not arms", "Let it fall back, catch the hinge"] },
  db_reverse_lunge: { name: "DB Reverse Lunge", searchTerms: ["dumbbell lunges", "dumbbell reverse lunge"], primary: ["Quads", "Glutes"], secondary: ["Hamstrings", "Core"],
    cues: ["DBs at your sides, stand tall", "Step one foot back, lower back knee toward floor", "Front knee stays over the ankle, torso upright", "Drive through the front heel to stand"] },
  db_bench: { name: "DB Flat Bench Press", searchTerms: ["dumbbell bench press"], primary: ["Chest"], secondary: ["Triceps", "Front delts"],
    cues: ["Feet flat on floor, slight arch in lower back", "DBs at chest level, elbows ~45° from torso (not flared 90°)", "Press up and slightly together", "Lower with control until DBs are level with chest"] },
  incline_db_bench: { name: "Incline DB Bench Press", searchTerms: ["incline dumbbell press", "incline dumbbell bench press"], primary: ["Upper chest"], secondary: ["Front delts", "Triceps"],
    cues: ["Bench at 30–45° incline", "DBs start at upper chest, press straight up", "Slightly together at the top", "Slow eccentric (2–3 sec down)"] },
  pushup: { name: "Push-up", searchTerms: ["pushups", "push up", "push-up"], primary: ["Chest"], secondary: ["Triceps", "Front delts", "Core"],
    cues: ["Hands under shoulders, body one straight line", "Squeeze glutes, brace abs the whole time", "Lower chest to ~1 inch above floor", "Elbows ~45° from body (not flared)"] },
  db_shoulder_press: { name: "DB Seated Shoulder Press", searchTerms: ["seated dumbbell press", "dumbbell shoulder press"], primary: ["Shoulders"], secondary: ["Triceps", "Upper chest"],
    cues: ["Seated with back support, DBs at shoulder height", "Palms forward, elbows below wrists", "Press up until arms are straight (don't lock hard)", "Lower with control"] },
  standing_cable_press: { name: "Standing Cable Shoulder Press", searchTerms: ["alternating cable shoulder press", "cable shoulder press"], primary: ["Shoulders"], secondary: ["Triceps", "Core"],
    cues: ["Cables low, single handles at shoulder height", "Stand tall, palms forward", "Press up overhead — brace core, no leaning back", "Control on the way down"] },
  hk_db_press: { name: "Half-Kneeling DB Shoulder Press", searchTerms: ["kneeling dumbbell press", "dumbbell shoulder press"], primary: ["Shoulders"], secondary: ["Triceps", "Core"],
    cues: ["One knee down, one knee up (both at 90°)", "DB in the hand opposite the up-knee", "Press straight up, ribs down (no arching)", "Great for core stability + anti-extension"] },
  cable_row: { name: "Cable Seated Row", searchTerms: ["seated cable row"], primary: ["Mid-back"], secondary: ["Lats", "Biceps", "Rear delts"],
    cues: ["Sit tall, feet braced", "Pull handle to your ribs/upper abs", "Elbows close to ribs, pulled back", "Squeeze shoulder blades together"] },
  trx_row: { name: "TRX Row", searchTerms: ["body row", "inverted row", "suspension row"], primary: ["Mid-back"], secondary: ["Lats", "Biceps", "Core"],
    cues: ["Handles at ~waist height, body in a straight line", "Further forward your feet, the harder it gets", "Pull chest to hands, elbows along ribs", "Squeeze shoulder blades at the top"] },
  trx_inverted: { name: "TRX Inverted Row", searchTerms: ["inverted row", "body row"], primary: ["Mid-back"], secondary: ["Lats", "Biceps", "Core"],
    cues: ["Feet far forward — body nearly horizontal", "Hardest TRX row variation", "Pull chest to the handles", "Squeeze upper back hard"] },
  sa_db_row: { name: "Single-Arm DB Row", searchTerms: ["one-arm dumbbell row", "single arm dumbbell row"], primary: ["Lats"], secondary: ["Mid-back", "Biceps"],
    cues: ["One knee + same-side hand on bench", "Opposite foot on floor, DB hanging straight down", "Pull DB to your hip (not shoulder)", "Don't rotate your torso — keep shoulders square"] },
  cs_db_row: { name: "Chest-Supported DB Row", searchTerms: ["chest supported row", "incline dumbbell row", "bent over two-dumbbell row"], primary: ["Mid-back"], secondary: ["Lats", "Biceps", "Rear delts"],
    cues: ["Bench at 30–45° incline", "Lie face-down, chest fully supported", "DBs hang straight down", "Row both DBs to your ribs, squeeze blades"] },
  lat_pulldown: { name: "Cable Lat Pulldown", searchTerms: ["wide-grip lat pulldown", "lat pulldown"], primary: ["Lats"], secondary: ["Mid-back", "Biceps"],
    cues: ["Grip slightly wider than shoulders", "Pull bar/handles to upper chest", "Lead with elbows, not hands", "Squeeze lats at the bottom"] },
  sa_pulldown: { name: "Single-Arm Cable Pulldown", searchTerms: ["one arm lat pulldown", "single arm cable pulldown"], primary: ["Lats"], secondary: ["Mid-back", "Biceps"],
    cues: ["Single handle at top pulley", "Pull elbow down toward your hip", "Allow slight torso rotation for full range", "Squeeze lat hard at the bottom"] },
  lateral_raise: { name: "DB Lateral Raise", searchTerms: ["side lateral raise", "dumbbell lateral raise"], primary: ["Side delts"], secondary: ["Traps"],
    cues: ["DBs at sides, slight elbow bend", "Lead with elbows, not hands", "Stop at shoulder height — don't go higher", "Slow descent (3 seconds)"] },
  face_pull: { name: "Cable Face Pull", searchTerms: ["face pull"], primary: ["Rear delts"], secondary: ["Traps", "Mid-back"],
    cues: ["Cable at face height, rope attachment", "Pull rope toward your face, splitting the ends", "Elbows high — end position is a double-biceps pose", "Squeeze upper back hard"] },
  db_curl: { name: "DB Bicep Curl", searchTerms: ["dumbbell bicep curl", "dumbbell curl"], primary: ["Biceps"], secondary: ["Forearms"],
    cues: ["DBs at sides, palms facing forward", "Curl up by bending only at the elbow", "No swinging or using shoulders", "Squeeze at top, lower slowly"] },
  tri_pushdown: { name: "Cable Tricep Pushdown", searchTerms: ["triceps pushdown", "tricep pushdown"], primary: ["Triceps"], secondary: [],
    cues: ["Cable at top, rope or straight bar", "Elbows pinned to your sides", "Push weight down by extending elbows only", "Squeeze triceps at the bottom"] },
  plank: { name: "Plank", searchTerms: ["plank"], primary: ["Core"], secondary: ["Shoulders", "Glutes"],
    cues: ["Forearms on floor, elbows under shoulders", "Straight line from head to heels", "Squeeze glutes, brace abs (like bracing for a punch)", "Don't let hips sag or pike up"] },
  side_plank: { name: "Side Plank", searchTerms: ["side bridge", "side plank"], primary: ["Obliques"], secondary: ["Core", "Shoulders"],
    cues: ["Forearm down, elbow under shoulder", "Stack your feet", "Lift hips so body is one straight line", "Hold, then switch sides"] },
  dead_bug: { name: "Dead Bug", searchTerms: ["dead bug"], primary: ["Core"], secondary: ["Hip flexors"],
    cues: ["On back, arms straight up, knees bent 90°", "Slowly extend opposite arm and leg toward floor", "Lower back stays pressed into the floor", "Return, switch sides"] },
  pallof: { name: "Cable Pallof Press", searchTerms: ["pallof press"], primary: ["Core (anti-rotation)"], secondary: ["Obliques"],
    cues: ["Cable at chest height, grab handle with both hands", "Stand perpendicular to the cable", "Press hands straight out in front", "Resist rotation — hold 2 sec, pull back in"] },
  sb_rollout: { name: "Stability Ball Rollout", searchTerms: ["ab rollout", "stability ball rollout"], primary: ["Core"], secondary: ["Shoulders"],
    cues: ["Kneel with forearms on the ball", "Slowly roll forward into a long plank", "Stop before lower back caves", "Pull the ball back using your abs"] },
  hollow: { name: "Hollow Hold", searchTerms: ["hollow hold", "hollow body"], primary: ["Core"], secondary: ["Hip flexors"],
    cues: ["On back, arms overhead, legs straight", "Press lower back into the floor", "Lift shoulders and legs off the floor slightly", "Body shape like a banana — hold"] },
  suitcase_carry: { name: "KB Suitcase Carry", searchTerms: ["suitcase carry", "kettlebell carry"], primary: ["Core (anti-lateral flexion)"], secondary: ["Grip", "Glutes"],
    cues: ["KB in one hand at your side, like a suitcase", "Stand tall — shoulders even", "Don't let the weight pull you sideways", "Walk slowly, brace your core"] },
  bearhug_carry: { name: "Sandbag Bear-Hug Carry", searchTerms: ["sandbag carry", "bear hug carry"], primary: ["Core"], secondary: ["Upper back", "Grip"],
    cues: ["Pick up sandbag, hug tight to chest", "Stand tall, walk slowly", "Breathe through it", "Brutal for core and grip endurance"] }
};

// ============================================================
// PLAN
// ============================================================

const PLAN = [
  { week: 1, dow: "Monday", focus: "Lower (Squat) + Light Upper",
    items: [{ letter: "A1", id: "goblet_squat", sets: 3, target: "8 reps" }, { letter: "A2", id: "db_rdl", sets: 3, target: "8 reps" }, { letter: "B1", id: "db_bench", sets: 3, target: "10 reps" }, { letter: "B2", id: "cable_row", sets: 3, target: "10 reps" }, { letter: "C", id: "plank", sets: 3, target: "30 sec" }], cardio: "10 min Peloton zone 2" },
  { week: 1, dow: "Tuesday", focus: "Upper Push + Core",
    items: [{ letter: "A1", id: "db_shoulder_press", sets: 3, target: "8 reps" }, { letter: "A2", id: "lat_pulldown", sets: 3, target: "10 reps" }, { letter: "B1", id: "incline_db_bench", sets: 3, target: "8 reps" }, { letter: "B2", id: "trx_row", sets: 3, target: "10 reps" }, { letter: "C", id: "dead_bug", sets: 3, target: "8/side" }], cardio: "12 min elliptical zone 2" },
  { week: 1, dow: "Wednesday", focus: "Lower (Hinge) + Light Upper",
    items: [{ letter: "A1", id: "kb_rdl", sets: 3, target: "8 reps" }, { letter: "A2", id: "db_reverse_lunge", sets: 3, target: "8/side" }, { letter: "B1", id: "pushup", sets: 3, target: "AMRAP – 2" }, { letter: "B2", id: "sa_db_row", sets: 3, target: "10/side" }, { letter: "C", id: "suitcase_carry", sets: 3, target: "30s/side" }], cardio: "10 min zone 2" },
  { week: 1, dow: "Thursday", focus: "Upper Pull + Shoulders",
    items: [{ letter: "A1", id: "lat_pulldown", sets: 3, target: "10 reps" }, { letter: "A2", id: "db_bench", sets: 3, target: "8 reps" }, { letter: "B1", id: "cs_db_row", sets: 3, target: "10 reps" }, { letter: "B2", id: "lateral_raise", sets: 3, target: "12 reps" }, { letter: "C", id: "pallof", sets: 3, target: "10/side" }], cardio: "12 min zone 2" },
  { week: 1, dow: "Friday", focus: "Full-Body Circuit",
    items: [{ letter: "1", id: "goblet_squat", sets: 3, target: "10 reps" }, { letter: "2", id: "pushup", sets: 3, target: "10 reps" }, { letter: "3", id: "trx_row", sets: 3, target: "10 reps" }, { letter: "4", id: "kb_swing", sets: 3, target: "12 reps" }, { letter: "5", id: "side_plank", sets: 2, target: "20s/side" }], cardio: "15–20 min zone 2", note: "3 rounds, minimal rest within round, 90s between rounds" },
  { week: 2, dow: "Monday", focus: "Lower (Squat) + Light Upper",
    items: [{ letter: "A1", id: "goblet_squat", sets: 3, target: "8 reps · heavier" }, { letter: "A2", id: "db_rdl", sets: 3, target: "8 reps · heavier" }, { letter: "B1", id: "db_bench", sets: 3, target: "10 reps" }, { letter: "B2", id: "cable_row", sets: 3, target: "10 reps" }, { letter: "C", id: "plank", sets: 3, target: "40 sec" }], cardio: "10 min zone 2" },
  { week: 2, dow: "Tuesday", focus: "Upper Push + Core",
    items: [{ letter: "A1", id: "db_shoulder_press", sets: 3, target: "8 reps" }, { letter: "A2", id: "lat_pulldown", sets: 3, target: "10 reps" }, { letter: "B1", id: "incline_db_bench", sets: 3, target: "8 reps" }, { letter: "B2", id: "trx_row", sets: 3, target: "10 reps · harder angle" }, { letter: "C", id: "dead_bug", sets: 3, target: "10/side" }], cardio: "12 min zone 2" },
  { week: 2, dow: "Wednesday", focus: "Lower (Hinge) + Light Upper",
    items: [{ letter: "A1", id: "kb_rdl", sets: 3, target: "8 reps" }, { letter: "A2", id: "db_reverse_lunge", sets: 3, target: "8/side" }, { letter: "B1", id: "pushup", sets: 3, target: "AMRAP – 2" }, { letter: "B2", id: "sa_db_row", sets: 3, target: "10/side" }, { letter: "C", id: "suitcase_carry", sets: 3, target: "40s/side" }], cardio: "12 min zone 2" },
  { week: 2, dow: "Thursday", focus: "Upper Pull + Shoulders",
    items: [{ letter: "A1", id: "lat_pulldown", sets: 3, target: "10 reps" }, { letter: "A2", id: "db_bench", sets: 3, target: "8 reps" }, { letter: "B1", id: "cs_db_row", sets: 3, target: "10 reps" }, { letter: "B2", id: "lateral_raise", sets: 3, target: "12 reps" }, { letter: "C", id: "pallof", sets: 3, target: "10/side" }], cardio: "12 min zone 2" },
  { week: 2, dow: "Friday", focus: "Full-Body Circuit",
    items: [{ letter: "1", id: "goblet_squat", sets: 4, target: "10 reps" }, { letter: "2", id: "pushup", sets: 4, target: "10 reps" }, { letter: "3", id: "trx_row", sets: 4, target: "10 reps" }, { letter: "4", id: "kb_swing", sets: 4, target: "12 reps" }, { letter: "5", id: "side_plank", sets: 4, target: "25s/side" }], cardio: "15–20 min zone 2", note: "4 rounds this week" },
  { week: 3, dow: "Monday", focus: "Lower (Squat)",
    items: [{ letter: "A1", id: "db_front_squat", sets: 3, target: "8 reps" }, { letter: "A2", id: "sl_kb_rdl", sets: 3, target: "6/side · light" }, { letter: "B1", id: "incline_db_bench", sets: 3, target: "10 reps" }, { letter: "B2", id: "cable_row", sets: 3, target: "10 reps" }, { letter: "C", id: "sb_rollout", sets: 3, target: "8 reps" }], cardio: "12 min zone 2" },
  { week: 3, dow: "Tuesday", focus: "Upper Push",
    items: [{ letter: "A1", id: "standing_cable_press", sets: 3, target: "8 reps" }, { letter: "A2", id: "sa_pulldown", sets: 3, target: "10/side" }, { letter: "B1", id: "db_bench", sets: 3, target: "10 reps" }, { letter: "B2", id: "cs_db_row", sets: 3, target: "10 reps" }, { letter: "C", id: "hollow", sets: 3, target: "20–30 sec" }], cardio: "12 min zone 2" },
  { week: 3, dow: "Wednesday", focus: "Lower (Hinge)",
    items: [{ letter: "A1", id: "goblet_squat", sets: 3, target: "10 reps" }, { letter: "A2", id: "kb_sumo_dl", sets: 3, target: "8 reps" }, { letter: "B1", id: "pushup", sets: 3, target: "8 reps · feet elevated" }, { letter: "B2", id: "trx_inverted", sets: 3, target: "8 reps" }, { letter: "C", id: "bearhug_carry", sets: 3, target: "40 sec" }], cardio: "12 min zone 2" },
  { week: 3, dow: "Thursday", focus: "Upper Pull + Arms",
    items: [{ letter: "A1", id: "trx_row", sets: 3, target: "10 reps · harder" }, { letter: "A2", id: "hk_db_press", sets: 3, target: "8/side" }, { letter: "B1", id: "face_pull", sets: 3, target: "12 reps" }, { letter: "B2", id: "db_curl", sets: 3, target: "10 reps" }, { letter: "B3", id: "tri_pushdown", sets: 3, target: "12 reps" }, { letter: "C", id: "pallof", sets: 3, target: "10/side" }], cardio: "12 min zone 2" },
  { week: 3, dow: "Friday", focus: "Conditioning + Core",
    items: [{ letter: "1", id: "kb_swing", sets: 4, target: "12 reps" }, { letter: "2", id: "pushup", sets: 4, target: "10 reps" }, { letter: "3", id: "trx_row", sets: 4, target: "10 reps" }, { letter: "4", id: "goblet_squat", sets: 4, target: "12 reps" }, { letter: "5", id: "plank", sets: 4, target: "30 sec" }], cardio: "10–15 min zone 2", note: "4 rounds, moderate pace" },
  { week: 4, dow: "Monday", focus: "Lower (Squat)",
    items: [{ letter: "A1", id: "db_front_squat", sets: 3, target: "8 reps · add load" }, { letter: "A2", id: "sl_kb_rdl", sets: 3, target: "6/side" }, { letter: "B1", id: "incline_db_bench", sets: 3, target: "10 reps" }, { letter: "B2", id: "cable_row", sets: 3, target: "10 reps" }, { letter: "C", id: "sb_rollout", sets: 3, target: "10 reps" }], cardio: "12 min zone 2" },
  { week: 4, dow: "Tuesday", focus: "Upper Push",
    items: [{ letter: "A1", id: "standing_cable_press", sets: 3, target: "8 reps" }, { letter: "A2", id: "sa_pulldown", sets: 3, target: "10/side" }, { letter: "B1", id: "db_bench", sets: 3, target: "10 reps" }, { letter: "B2", id: "cs_db_row", sets: 3, target: "10 reps" }, { letter: "C", id: "hollow", sets: 3, target: "30 sec" }], cardio: "12 min zone 2" },
  { week: 4, dow: "Wednesday", focus: "Lower (Hinge)",
    items: [{ letter: "A1", id: "goblet_squat", sets: 3, target: "10 reps" }, { letter: "A2", id: "kb_sumo_dl", sets: 3, target: "8 reps" }, { letter: "B1", id: "pushup", sets: 3, target: "10 reps · feet elevated" }, { letter: "B2", id: "trx_inverted", sets: 3, target: "10 reps" }, { letter: "C", id: "bearhug_carry", sets: 3, target: "45 sec" }], cardio: "12 min zone 2" },
  { week: 4, dow: "Thursday", focus: "Upper Pull + Arms",
    items: [{ letter: "A1", id: "trx_row", sets: 3, target: "10 reps" }, { letter: "A2", id: "hk_db_press", sets: 3, target: "10/side" }, { letter: "B1", id: "face_pull", sets: 3, target: "12 reps" }, { letter: "B2", id: "db_curl", sets: 3, target: "10 reps" }, { letter: "B3", id: "tri_pushdown", sets: 3, target: "12 reps" }, { letter: "C", id: "pallof", sets: 3, target: "12/side" }], cardio: "12 min zone 2" },
  { week: 4, dow: "Friday", focus: "Lighter + Mobility",
    items: [{ letter: "1", id: "goblet_squat", sets: 2, target: "10 reps · light" }, { letter: "2", id: "trx_row", sets: 2, target: "10 reps" }, { letter: "3", id: "pushup", sets: 2, target: "8 reps" }, { letter: "4", id: "plank", sets: 2, target: "30 sec" }], cardio: "20 min zone 2 (longer, easy)", note: "2 easy rounds. Finish with 10 min mobility: hips, t-spine, shoulders." }
];

// ============================================================
// NAME MATCHING HELPERS
// ============================================================

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\bdb\b/g, 'dumbbell')
    .replace(/\bkb\b/g, 'kettlebell')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildYuhonasIndex(data) {
  const records = Array.isArray(data) ? data : [];
  const byName = new Map();
  for (const ex of records) {
    if (ex && ex.name) byName.set(normalize(ex.name), ex);
  }
  return { byName, records };
}

function findYuhonasMatch(exercise, index) {
  if (!index || !index.byName?.size) return null;
  const candidates = [exercise.name, ...(exercise.searchTerms || [])];
  // Exact normalized match
  for (const c of candidates) {
    const norm = normalize(c);
    if (index.byName.has(norm)) return index.byName.get(norm);
  }
  // Token overlap fallback
  let best = null, bestScore = 0;
  for (const c of candidates) {
    const target = normalize(c);
    const targetTokens = new Set(target.split(' ').filter(t => t.length > 2));
    if (targetTokens.size === 0) continue;
    for (const [name, ex] of index.byName) {
      const tokens = name.split(' ').filter(t => t.length > 2);
      if (tokens.length === 0) continue;
      const overlap = tokens.filter(t => targetTokens.has(t)).length;
      const score = overlap / Math.max(targetTokens.size, tokens.length);
      if (score > bestScore && score >= 0.55) { bestScore = score; best = ex; }
    }
  }
  return best;
}

function buildGlowuppIndex(data) {
  const records = Array.isArray(data) ? data : (data?.exercises || []);
  const byName = new Map();
  for (const ex of records) {
    const name = ex?.name || ex?.Name || ex?.title;
    if (name) byName.set(normalize(name), ex);
  }
  return { byName, records };
}

function findGlowuppMatch(exercise, index) {
  if (!index || !index.byName?.size) return null;
  const candidates = [exercise.name, ...(exercise.searchTerms || [])];
  for (const c of candidates) {
    const norm = normalize(c);
    if (index.byName.has(norm)) return index.byName.get(norm);
  }
  let best = null, bestScore = 0;
  for (const c of candidates) {
    const target = normalize(c);
    const targetTokens = new Set(target.split(' ').filter(t => t.length > 2));
    if (targetTokens.size === 0) continue;
    for (const [name, ex] of index.byName) {
      const tokens = name.split(' ').filter(t => t.length > 2);
      if (tokens.length === 0) continue;
      const overlap = tokens.filter(t => targetTokens.has(t)).length;
      const score = overlap / Math.max(targetTokens.size, tokens.length);
      if (score > bestScore && score >= 0.6) { bestScore = score; best = ex; }
    }
  }
  return best;
}

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

async function fetchGlowuppData() {
  for (const url of GLOWUPP_CANDIDATE_URLS) {
    const data = await fetchJson(url);
    if (data) return data;
  }
  return null;
}

// ============================================================
// DEMO COMPONENT — Glowupp GIF → yuhonas 2-frame → placeholder
// ============================================================

function ExerciseDemo({ exercise, glowuppMatch, yuhonasMatch }) {
  const [gifFailed, setGifFailed] = useState({});
  const [frameFailed, setFrameFailed] = useState({ 0: false, 1: false });
  const [frame, setFrame] = useState(0);

  // Reset failure flags when exercise changes
  useEffect(() => {
    setGifFailed({});
    setFrameFailed({ 0: false, 1: false });
    setFrame(0);
  }, [exercise.name, glowuppMatch?.exerciseId, yuhonasMatch?.id]);

  // Build candidate GIF URLs
  const gifCandidates = useMemo(() => {
    if (!glowuppMatch) return [];
    const out = [];
    if (glowuppMatch.gifUrl) {
      const g = glowuppMatch.gifUrl;
      if (typeof g === 'string') {
        if (g.startsWith('http')) out.push(g);
        else {
          const id = g.replace(/\.gif$/i, '');
          out.push(...GIF_URL_BUILDERS.map(fn => fn(id)));
        }
      }
    }
    if (glowuppMatch.exerciseId) {
      out.push(...GIF_URL_BUILDERS.map(fn => fn(glowuppMatch.exerciseId)));
    }
    return [...new Set(out)];
  }, [glowuppMatch]);

  const activeGif = gifCandidates.find(u => !gifFailed[u]);

  // Yuhonas image URLs — use the JSON's own images field
  const yuhonasImages = useMemo(() => {
    if (!yuhonasMatch?.images?.length) return [];
    return yuhonasMatch.images.slice(0, 2).map(yuhonasImg);
  }, [yuhonasMatch]);

  const yuhonasUsable = yuhonasImages.length > 0 && (!frameFailed[0] || !frameFailed[1]);

  // Alternate frames when on yuhonas tier
  useEffect(() => {
    if (activeGif || !yuhonasUsable) return;
    const id = setInterval(() => setFrame(f => (f + 1) % yuhonasImages.length), 900);
    return () => clearInterval(id);
  }, [activeGif, yuhonasUsable, yuhonasImages.length]);

  // --- Render: Glowupp GIF
  if (activeGif) {
    return (
      <div className="relative aspect-square w-full bg-white border border-zinc-800 rounded-lg overflow-hidden">
        <img
          src={activeGif}
          alt={`${exercise.name}`}
          onError={() => setGifFailed(prev => ({ ...prev, [activeGif]: true }))}
          className="absolute inset-0 w-full h-full object-contain"
        />
        <div className="absolute top-2 right-2 text-[9px] font-mono uppercase tracking-wider bg-zinc-950/70 text-yellow-300 px-1.5 py-0.5 rounded">GIF</div>
      </div>
    );
  }

  // --- Render: Yuhonas 2-frame
  if (yuhonasUsable) {
    return (
      <div className="relative aspect-square w-full bg-white border border-zinc-800 rounded-lg overflow-hidden">
        {yuhonasImages.map((url, i) => (
          <img
            key={url}
            src={url}
            alt={`${exercise.name} position ${i + 1}`}
            onError={() => setFrameFailed(prev => ({ ...prev, [i]: true }))}
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-200 ${frame === i ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
        <div className="absolute top-2 right-2 flex gap-1">
          {yuhonasImages.map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full transition ${frame === i ? 'bg-yellow-300' : 'bg-zinc-300'}`} />
          ))}
        </div>
        <div className="absolute bottom-2 left-2 text-[9px] font-mono uppercase tracking-wider bg-zinc-950/70 text-zinc-300 px-1.5 py-0.5 rounded">
          {frame === 0 ? 'Start' : 'End'}
        </div>
      </div>
    );
  }

  // --- Render: placeholder
  return (
    <div className="aspect-square w-full bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col items-center justify-center gap-3 p-6 text-center">
      <ImageIcon className="w-10 h-10 text-zinc-700" strokeWidth={1.5} />
      <div className="text-sm text-zinc-400">No demo image available</div>
      <div className="text-xs text-zinc-600">Use the YouTube button below</div>
    </div>
  );
}

// ============================================================
// SET LOGGER
// ============================================================

function SetLogger({ sessionIdx, exerciseId, sets, lastSession }) {
  const [logs, setLogs] = useState(() => Array(sets).fill(null).map(() => ({ w: '', r: '' })));
  const [done, setDone] = useState(false);
  const key = `log:s${sessionIdx}:${exerciseId}`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await window.storage.get(key);
        if (!cancelled && result?.value) {
          const parsed = JSON.parse(result.value);
          if (parsed.sets) setLogs(prev => {
            const next = [...prev];
            parsed.sets.forEach((s, i) => { if (next[i]) next[i] = s; });
            return next;
          });
          if (parsed.done) setDone(true);
        }
      } catch (e) {}
    }
    load();
    return () => { cancelled = true; };
  }, [key]);

  const save = async (nextLogs, nextDone) => {
    setLogs(nextLogs);
    if (nextDone !== undefined) setDone(nextDone);
    try {
      await window.storage.set(key, JSON.stringify({ sets: nextLogs, done: nextDone ?? done }));
    } catch (e) {}
  };

  const updateSet = (i, field, value) => {
    const next = logs.map((s, j) => j === i ? { ...s, [field]: value } : s);
    save(next);
  };
  const toggleDone = () => save(logs, !done);

  return (
    <div className="space-y-3">
      {lastSession && (
        <div className="text-xs font-mono text-zinc-500 flex items-center gap-2">
          <Clock className="w-3 h-3" />
          Last (W{lastSession.week} {lastSession.dow.slice(0, 3)}):{' '}
          <span className="text-zinc-300">
            {lastSession.sets.filter(s => s.w || s.r).map(s => `${s.w || '–'}×${s.r || '–'}`).join(' · ') || 'no data'}
          </span>
        </div>
      )}
      <div className="space-y-2">
        {logs.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-12 text-xs font-mono uppercase tracking-wider text-zinc-500">Set {i + 1}</div>
            <input type="text" inputMode="decimal" placeholder="lb" value={s.w} onChange={(e) => updateSet(i, 'w', e.target.value)} className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-yellow-300/50" />
            <span className="text-zinc-600 font-mono text-sm">×</span>
            <input type="text" inputMode="numeric" placeholder="reps" value={s.r} onChange={(e) => updateSet(i, 'r', e.target.value)} className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-yellow-300/50" />
          </div>
        ))}
      </div>
      <button onClick={toggleDone} className={`w-full py-2.5 rounded font-medium text-sm transition flex items-center justify-center gap-2 ${done ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-yellow-300 text-zinc-950 hover:bg-yellow-200'}`}>
        {done ? <><Check className="w-4 h-4" /> Completed</> : 'Mark complete'}
      </button>
    </div>
  );
}

// ============================================================
// EXERCISE DETAIL
// ============================================================

function ExerciseDetail({ exerciseId, item, sessionIdx, glowuppIndex, yuhonasIndex, onClose }) {
  const exercise = EX[exerciseId];
  const [lastSession, setLastSession] = useState(null);
  const [showFullInstructions, setShowFullInstructions] = useState(false);

  const glowuppMatch = useMemo(() => findGlowuppMatch(exercise, glowuppIndex), [exercise, glowuppIndex]);
  const yuhonasMatch = useMemo(() => findYuhonasMatch(exercise, yuhonasIndex), [exercise, yuhonasIndex]);

  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name + ' form tutorial')}`;

  useEffect(() => {
    let cancelled = false;
    async function findLast() {
      for (let i = sessionIdx - 1; i >= 1; i--) {
        const session = PLAN[i - 1];
        if (!session.items.some(it => it.id === exerciseId)) continue;
        try {
          const result = await window.storage.get(`log:s${i}:${exerciseId}`);
          if (result?.value) {
            const parsed = JSON.parse(result.value);
            if (parsed.sets?.some(s => s.w || s.r)) {
              if (!cancelled) setLastSession({ ...parsed, week: session.week, dow: session.dow });
              return;
            }
          }
        } catch (e) {}
      }
    }
    findLast();
    return () => { cancelled = true; };
  }, [exerciseId, sessionIdx]);

  // Use Glowupp's instructions if matched, otherwise yuhonas
  let detailedSteps = null;
  if (glowuppMatch?.instructions?.length) {
    detailedSteps = glowuppMatch.instructions.map(s => String(s).replace(/^Step\s*:?\s*\d+\s*:?\s*/i, '').trim()).filter(Boolean);
  } else if (yuhonasMatch?.instructions?.length) {
    detailedSteps = yuhonasMatch.instructions;
  }

  // Show matched name if it differs from the display name, so user can see what we matched against
  const matchedName = glowuppMatch?.name || yuhonasMatch?.name;
  const showMatchInfo = matchedName && normalize(matchedName) !== normalize(exercise.name);

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur overflow-y-auto">
      <div className="max-w-2xl mx-auto min-h-full">
        <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-900 px-4 py-3 flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 text-zinc-400 hover:text-zinc-100 rounded transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{item.letter} · {item.sets} × {item.target}</div>
            <div className="text-base font-semibold text-zinc-50 truncate">{exercise.name}</div>
          </div>
        </div>

        <div className="p-4 space-y-5 pb-12">
          <ExerciseDemo exercise={exercise} glowuppMatch={glowuppMatch} yuhonasMatch={yuhonasMatch} />

          {/* Match indicator */}
          {showMatchInfo && (
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 -mt-2">
              Matched to: <span className="text-zinc-400">{matchedName}</span>
            </div>
          )}

          {/* Always-available YouTube */}
          <a href={ytUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 border border-zinc-800 hover:border-yellow-300/30 hover:bg-zinc-900/70 rounded text-sm font-medium text-zinc-100 transition">
            <ExternalLink className="w-4 h-4 text-yellow-300" />
            Watch demo on YouTube
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">Muscles worked</div>
            <div className="flex flex-wrap gap-1.5">
              {exercise.primary.map(m => (<span key={m} className="text-xs px-2 py-1 rounded bg-yellow-300/10 text-yellow-300 border border-yellow-300/20">{m}</span>))}
              {exercise.secondary.map(m => (<span key={m} className="text-xs px-2 py-1 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">{m}</span>))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-3">Key cues</div>
            <ul className="space-y-2">
              {exercise.cues.map((cue, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-200 leading-relaxed">
                  <span className="text-yellow-300 font-mono text-xs mt-1 flex-shrink-0">0{i + 1}</span>
                  <span>{cue}</span>
                </li>
              ))}
            </ul>
          </div>

          {detailedSteps && detailedSteps.length > 0 && (
            <div>
              <button onClick={() => setShowFullInstructions(!showFullInstructions)} className="w-full flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition mb-3">
                <span>Detailed technique</span>
                <span className="text-zinc-600">{showFullInstructions ? '−' : '+'}</span>
              </button>
              {showFullInstructions && (
                <ol className="space-y-3">
                  {detailedSteps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-zinc-400 leading-relaxed">
                      <span className="text-zinc-600 font-mono text-xs mt-1 flex-shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-zinc-900">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-3">Log this session</div>
            <SetLogger sessionIdx={sessionIdx} exerciseId={exerciseId} sets={item.sets} lastSession={lastSession} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EXERCISE CARD
// ============================================================

function ExerciseCard({ item, onClick }) {
  const exercise = EX[item.id];
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 py-4 px-4 -mx-4 hover:bg-zinc-900/50 active:bg-zinc-900 transition text-left group">
      <div className="w-8 flex-shrink-0 text-xs font-mono uppercase tracking-wider text-zinc-500">{item.letter}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium text-zinc-100 truncate">{exercise.name}</div>
        <div className="text-xs font-mono text-zinc-500 mt-0.5">{item.sets} × {item.target}</div>
      </div>
      <ChevronLeft className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition flex-shrink-0 rotate-180" />
    </button>
  );
}

// ============================================================
// SESSION NAV
// ============================================================

function SessionNav({ currentIdx, onPick, completionMap }) {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map(week => (
        <div key={week} className="flex items-center gap-1.5">
          <div className="w-12 text-[10px] font-mono uppercase tracking-wider text-zinc-500">WK {week}</div>
          <div className="flex-1 grid grid-cols-5 gap-1.5">
            {['M', 'T', 'W', 'T', 'F'].map((d, i) => {
              const sessionIdx = (week - 1) * 5 + i + 1;
              const isCurrent = sessionIdx === currentIdx;
              const completedCount = completionMap[sessionIdx] || 0;
              const totalCount = PLAN[sessionIdx - 1]?.items.length || 0;
              const allDone = completedCount > 0 && completedCount === totalCount;
              return (
                <button key={i} onClick={() => onPick(sessionIdx)} className={`relative h-10 rounded text-xs font-mono uppercase transition ${isCurrent ? 'bg-yellow-300 text-zinc-950 font-semibold' : allDone ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : completedCount > 0 ? 'bg-zinc-900 text-zinc-300 border border-zinc-800' : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700'}`}>
                  {d}
                  {completedCount > 0 && !isCurrent && (<span className="absolute bottom-0.5 right-1 text-[8px] opacity-70">{completedCount}/{totalCount}</span>)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MACROS CARD
// ============================================================

function MacrosCard() {
  const macros = [{ label: 'Calories', value: '2050', unit: 'kcal' }, { label: 'Protein', value: '170', unit: 'g' }, { label: 'Carbs', value: '210', unit: 'g' }, { label: 'Fat', value: '60', unit: 'g' }];
  return (
    <div className="bg-zinc-900/50 border border-zinc-900 rounded-lg p-4">
      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2"><Flame className="w-3 h-3" />Daily macro target</div>
      <div className="grid grid-cols-4 gap-3">
        {macros.map(m => (
          <div key={m.label}>
            <div className="text-xl font-mono font-semibold text-zinc-100">{m.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-0.5">{m.label}<span className="text-zinc-700"> · {m.unit}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  const [currentIdx, setCurrentIdx] = useState(1);
  const [openExerciseIdx, setOpenExerciseIdx] = useState(null);
  const [completionMap, setCompletionMap] = useState({});
  const [showNav, setShowNav] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  // Data sources
  const [yuhonasIndex, setYuhonasIndex] = useState(null);
  const [yuhonasStatus, setYuhonasStatus] = useState('loading');
  const [glowuppIndex, setGlowuppIndex] = useState(null);
  const [glowuppStatus, setGlowuppStatus] = useState('loading');

  const session = PLAN[currentIdx - 1];

  // Load yuhonas data (primary image source)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = await fetchJson(YUHONAS_JSON);
      if (cancelled) return;
      if (data) {
        const idx = buildYuhonasIndex(data);
        setYuhonasIndex(idx);
        setYuhonasStatus('loaded');
      } else {
        setYuhonasStatus('failed');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Load Glowupp data (preferred GIF source)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = await fetchGlowuppData();
      if (cancelled) return;
      if (data) {
        const idx = buildGlowuppIndex(data);
        setGlowuppIndex(idx);
        setGlowuppStatus(idx.byName.size > 0 ? 'loaded' : 'failed');
      } else {
        setGlowuppStatus('failed');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Load completion counts
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await window.storage.list('log:');
        if (cancelled || !result?.keys) { setStorageReady(true); return; }
        const counts = {};
        for (const key of result.keys) {
          const m = key.match(/log:s(\d+):/);
          if (!m) continue;
          const sIdx = parseInt(m[1]);
          try {
            const r = await window.storage.get(key);
            if (r?.value) {
              const parsed = JSON.parse(r.value);
              if (parsed.done) counts[sIdx] = (counts[sIdx] || 0) + 1;
            }
          } catch (e) {}
        }
        if (!cancelled) setCompletionMap(counts);
      } catch (e) {}
      if (!cancelled) setStorageReady(true);
    }
    load();
    return () => { cancelled = true; };
  }, [openExerciseIdx]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await window.storage.get('current_session');
        if (!cancelled && result?.value) {
          const idx = parseInt(result.value);
          if (idx >= 1 && idx <= 20) setCurrentIdx(idx);
        }
      } catch (e) {}
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.storage.set('current_session', String(currentIdx)).catch(() => {});
  }, [currentIdx, storageReady]);

  const pickSession = (idx) => { setCurrentIdx(idx); setShowNav(false); };
  const completedHere = completionMap[currentIdx] || 0;
  const totalHere = session.items.length;

  // Status pill
  const statusText = () => {
    if (yuhonasStatus === 'loading' || glowuppStatus === 'loading') return 'connecting...';
    if (glowuppStatus === 'loaded') return `${glowuppIndex.byName.size} GIFs · ${yuhonasStatus === 'loaded' ? yuhonasIndex.byName.size + ' frames' : 'frames offline'}`;
    if (yuhonasStatus === 'loaded') return `${yuhonasIndex.byName.size} exercises`;
    return 'YouTube fallback only';
  };
  const statusColor = () => {
    if (yuhonasStatus === 'loading' || glowuppStatus === 'loading') return 'text-zinc-600';
    if (glowuppStatus === 'loaded' || yuhonasStatus === 'loaded') return 'text-emerald-400';
    return 'text-zinc-600';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">Tom Holland Recomp · Block 1</div>
            <div className="text-[9px] font-mono uppercase tracking-wider flex items-center gap-1.5">
              {(yuhonasStatus === 'loading' || glowuppStatus === 'loading') ? (
                <><Loader2 className="w-3 h-3 animate-spin text-zinc-600" /><span className={statusColor()}>{statusText()}</span></>
              ) : (
                <><span className={`w-1.5 h-1.5 rounded-full ${glowuppStatus === 'loaded' || yuhonasStatus === 'loaded' ? 'bg-emerald-400' : 'bg-zinc-700'}`} /><span className={statusColor()}>{statusText()}</span></>
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <h1 className="text-5xl font-mono font-bold tracking-tight text-zinc-50 tabular-nums">
              <span>{String(currentIdx).padStart(2, '0')}</span><span className="text-zinc-700">/20</span>
            </h1>
            <button onClick={() => setShowNav(!showNav)} className="ml-auto px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 rounded transition">
              {showNav ? 'Hide' : 'Jump'}
            </button>
          </div>
        </header>

        {showNav && (
          <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-900 rounded-lg">
            <SessionNav currentIdx={currentIdx} onPick={pickSession} completionMap={completionMap} />
          </div>
        )}

        <div className="mb-6">
          <div className="text-[10px] font-mono uppercase tracking-wider text-yellow-300 mb-1">Week {session.week} · {session.dow}</div>
          <h2 className="text-2xl font-semibold text-zinc-50 leading-tight">{session.focus}</h2>
          {session.note && <p className="text-sm text-zinc-400 mt-2">{session.note}</p>}
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-300 transition-all duration-500" style={{ width: totalHere ? `${(completedHere / totalHere) * 100}%` : '0%' }} />
          </div>
          <div className="text-xs font-mono text-zinc-500 tabular-nums">{completedHere}/{totalHere}</div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden divide-y divide-zinc-900">
          {session.items.map((item, i) => (
            <div key={`${currentIdx}-${i}`} className="px-4">
              <ExerciseCard item={item} onClick={() => setOpenExerciseIdx(i)} />
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3 px-4 py-3 bg-zinc-900/50 border border-zinc-900 rounded-lg">
          <Activity className="w-4 h-4 text-yellow-300 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Cardio finisher</div>
            <div className="text-sm text-zinc-200">{session.cardio}</div>
          </div>
        </div>

        <div className="mt-6"><MacrosCard /></div>

        <div className="mt-8 flex items-center gap-2">
          <button disabled={currentIdx === 1} onClick={() => pickSession(currentIdx - 1)} className="flex-1 py-2.5 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-100 disabled:text-zinc-700 disabled:cursor-not-allowed bg-zinc-900 border border-zinc-800 rounded transition flex items-center justify-center gap-2">
            <ChevronLeft className="w-3.5 h-3.5" />Previous
          </button>
          <button disabled={currentIdx === 20} onClick={() => pickSession(currentIdx + 1)} className="flex-1 py-2.5 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-100 disabled:text-zinc-700 disabled:cursor-not-allowed bg-zinc-900 border border-zinc-800 rounded transition flex items-center justify-center gap-2">
            Next<ChevronLeft className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>

        <div className="mt-12 pt-6 border-t border-zinc-900">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 flex items-center gap-2">
            <Info className="w-3 h-3" />
            Demos via jsDelivr CDN: Glowupp GIFs → yuhonas frames → YouTube
          </div>
        </div>
      </div>

      {openExerciseIdx !== null && (
        <ExerciseDetail
          exerciseId={session.items[openExerciseIdx].id}
          item={session.items[openExerciseIdx]}
          sessionIdx={currentIdx}
          glowuppIndex={glowuppIndex}
          yuhonasIndex={yuhonasIndex}
          onClose={() => setOpenExerciseIdx(null)}
        />
      )}
    </div>
  );
}
