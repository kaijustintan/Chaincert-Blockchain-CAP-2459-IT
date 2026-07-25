// nameSimilarity.js
/*
  FILE: nameSimilarity.js
  LAYMAN (Tropang Ex): Detector ng "muntik nang kapareho" na pangalan ng credential —
  yung "Python Certificate" vs "Python Cert" na hindi nahuhuli ng exact match. Walang
  similarity score dito kasi arbitrary lang ang kahit anong cutoff (0.72 vs 0.67 lang ang
  agwat ng dapat-mahuli at hindi-dapat); pattern detection ang ginagamit: pareho ba pag
  tinanggal ang kudlit/espasyo, o putol/abbreviation ba ng isa't isa.
  TECHNICAL: Pure functions, zero dependencies. Shared by the frontend advisory
  (issuerDashboardPage nameClash) and the backend guard (issuerCredentialController).
  Three rules: A) normalized-equal -> exact duplicate (BLOCK; catches punctuation/spacing
  variants the old trim+lowercase missed), B) containment-at-start of the full normalized
  string (shorter side >= MIN_NORM_LEN), C) ordered per-word mutual-prefix match — both
  WARN-level (near-match). Deliberately NO similarity metric: Dice/Levenshtein cannot
  separate "Python Cert" (should flag) from "Java Certificate" (should not) without an
  arbitrary threshold, which is the exact class of unjustified number the defense panel
  flagged elsewhere.
  OUTLINE:
    HELPERS
      - normName(s)                 lowercase + strip all non-alphanumeric
    RULES
      - isExactDuplicate(a, b)      Rule A — normalized equality
      - isNearMatch(a, b)           Rule B/C — truncation/abbreviation pattern
      - findNameMatches(name, list) classify one name against a list -> {exact[], similar[]}
*/

const MIN_NORM_LEN = 5; // shorter side must be at least this long for Rule B (avoids "BS" ~ "BSIT" noise)
const MIN_WORD_PREFIX = 3; // a word only counts as an abbreviation if >= this many chars (Rule C)

/*
  Function Name: normName

  LAYMAN (Tropang Ex):
  Gawing pare-pareho ang anyo: lahat lowercase, tanggal lahat ng hindi letra/numero.
  "Python-Certificate!" at "python certificate" -> parehong "pythoncertificate".

  TECHNICAL:
  Lowercases and strips every non-alphanumeric character. Basis of all three rules.

  PARAMS:
  - s — any value; coerced to string, null/undefined tolerated.

  RETURNS:
  Normalized string ('' for empty/nullish input).
*/
function normName(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/*
  Function Name: isExactDuplicate

  LAYMAN (Tropang Ex):
  Pareho ba talaga sila kapag tinanggal ang kudlit, gitling, at espasyo? Kung oo,
  duplicate ito at dapat i-BLOCK — mas mahigpit ito sa lumang trim+lowercase na
  hindi nakakahuli ng "Python-Certificate" vs "Python Certificate".

  TECHNICAL:
  normName(a) === normName(b), non-empty. Strict superset of the previous
  trim+lowercase exact check (Rule A).

  PARAMS:
  - a, b — the two names.

  RETURNS:
  boolean.
*/
function isExactDuplicate(a, b) {
  const na = normName(a);
  return na.length > 0 && na === normName(b);
}

/*
  Function Name: isNearMatch

  LAYMAN (Tropang Ex):
  "Python Cert" ba ang "Python Certificate" na pinaikli? Dalawang hulmahan ang
  tinitingnan: (B) yung isa ay simula ng isa ("pythoncert" nasa unahan ng
  "pythoncertificate"), o (C) bawat salita ay putol ng katapat na salita
  ("Adv Python Cert" vs "Advanced Python Certificate"). Hindi ito nagba-block —
  babala lang, kasi pwedeng sadyang magkaiba ang dalawang credential.

  TECHNICAL:
  Rule B: containment-at-start on the full normalized strings, shorter side >=
  MIN_NORM_LEN, strings not equal (equality is Rule A's job). Rule C: word-split on
  non-alphanumeric, equal word count, every word pair is a mutual prefix with the
  shorter word >= MIN_WORD_PREFIX, and at least one pair differs. Symmetric.

  PARAMS:
  - a, b — the two names.

  RETURNS:
  boolean — true when the pair looks like a truncation/abbreviation of one name.

  EXAMPLE
    isNearMatch('Python Certificate', 'Python Cert')            → true  (B and C)
    isNearMatch('Advanced Python Certificate', 'Adv Python Cert') → true (C)
    isNearMatch('Python Certificate', 'Java Certificate')        → false
*/
function isNearMatch(a, b) {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb || na === nb) return false;

  // Rule B — containment at the start of the whole normalized name.
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  if (shorter.length >= MIN_NORM_LEN && longer.startsWith(shorter)) return true;

  // Rule C — ordered per-word abbreviation.
  const wa = String(a || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const wb = String(b || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (wa.length !== wb.length || wa.length === 0) return false;
  let anyDiff = false;
  for (let i = 0; i < wa.length; i++) {
    const w1 = wa[i];
    const w2 = wb[i];
    if (w1 === w2) continue;
    const short = w1.length <= w2.length ? w1 : w2;
    const long = w1.length <= w2.length ? w2 : w1;
    if (short.length < MIN_WORD_PREFIX || !long.startsWith(short)) return false;
    anyDiff = true;
  }
  return anyDiff;
}

/*
  Function Name: findNameMatches

  LAYMAN (Tropang Ex):
  Isang tawag para sa lahat: ibigay ang bagong pangalan at ang listahan ng existing,
  sasabihin kung alin ang eksaktong kapareho (block) at alin ang kamukha lang (warn).

  TECHNICAL:
  Maps the candidate against every entry. Order preserved; each existing name lands in
  at most one bucket (exact wins). Callers pass ACTIVE names only — status filtering is
  the caller's job (mirrors the existing active-only duplicate check).

  PARAMS:
  - name — the candidate name being created.
  - existingNames — array of existing credential names (strings).

  RETURNS:
  { exact: string[], similar: string[] } — original display strings from existingNames.

  EXAMPLE
    findNameMatches('Python Cert', ['Python Certificate', 'Java Certificate'])
    → { exact: [], similar: ['Python Certificate'] }
    findNameMatches('New Name', []) → { exact: [], similar: [] }
*/
function findNameMatches(name, existingNames) {
  const exact = [];
  const similar = [];
  for (const existing of (Array.isArray(existingNames) ? existingNames : [])) {
    if (isExactDuplicate(name, existing)) exact.push(existing);
    else if (isNearMatch(name, existing)) similar.push(existing);
  }
  return { exact, similar };
}

// UBUNTU DIRECTORY BASED — the backend copy deploys to ~/chaincert-api/utils/nameSimilarity.js
// (CommonJS exports so the Express controller can require() it; CRA/webpack handles this fine too).
module.exports = { normName, isExactDuplicate, isNearMatch, findNameMatches };
