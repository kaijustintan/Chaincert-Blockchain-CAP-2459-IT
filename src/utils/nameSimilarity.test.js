/*
  Tests for the credential-name collision rules (S-6).

  This replaces the Create React App boilerplate test that asserted on "learn react" text — copy
  that never existed in this app, so it had been failing (or never run) since the project started.

  nameSimilarity is worth testing over anything else in src/utils/: it is the ONLY module shared
  verbatim between the frontend and the Express backend, and it gates whether a credential can be
  created. A false negative lets two indistinguishable credentials exist; a false positive blocks a
  legitimate one. The rules are also deliberately pattern-based rather than a similarity score, so
  the boundaries are worth pinning down.
*/

import { describe, it, expect } from 'vitest';
import nameSimilarity from './nameSimilarity';

const { normName, isExactDuplicate, isNearMatch, findNameMatches } = nameSimilarity;

describe('normName', () => {
  it('strips case, spaces and punctuation', () => {
    expect(normName('Python-Certificate')).toBe('pythoncertificate');
    expect(normName('  Python   Certificate  ')).toBe('pythoncertificate');
    expect(normName('Python_Certificate!')).toBe('pythoncertificate');
  });

  it('tolerates nullish input', () => {
    expect(normName(null)).toBe('');
    expect(normName(undefined)).toBe('');
    expect(normName('')).toBe('');
  });
});

describe('isExactDuplicate (BLOCK rule)', () => {
  it('catches punctuation and spacing variants that a plain trim+lowercase would miss', () => {
    expect(isExactDuplicate('Python-Certificate', 'Python Certificate')).toBe(true);
    expect(isExactDuplicate('python certificate', 'PYTHON CERTIFICATE')).toBe(true);
    expect(isExactDuplicate('Data  Science', 'Data Science')).toBe(true);
  });

  it('does not treat genuinely different names as duplicates', () => {
    expect(isExactDuplicate('Python Certificate', 'Java Certificate')).toBe(false);
  });

  it('never reports a duplicate for empty input', () => {
    // Guards against an empty candidate matching an empty existing name and blocking creation.
    expect(isExactDuplicate('', '')).toBe(false);
    expect(isExactDuplicate(null, null)).toBe(false);
  });
});

describe('isNearMatch (WARN rule)', () => {
  it('flags a truncation of the whole name (rule B)', () => {
    expect(isNearMatch('Python Certificate', 'Python Cert')).toBe(true);
  });

  it('flags per-word abbreviation (rule C)', () => {
    expect(isNearMatch('Advanced Python Certificate', 'Adv Python Cert')).toBe(true);
  });

  it('is symmetric', () => {
    expect(isNearMatch('Python Cert', 'Python Certificate'))
      .toBe(isNearMatch('Python Certificate', 'Python Cert'));
  });

  it('does NOT flag different subjects that share a suffix', () => {
    // The distinction the design turns on: "Java" is not an abbreviation of "Python", so these are
    // two legitimate credentials and must not warn.
    expect(isNearMatch('Python Certificate', 'Java Certificate')).toBe(false);
  });

  it('does not flag a pair that is already an exact duplicate', () => {
    // Exact equality is isExactDuplicate's job — near-match must not double-report it.
    expect(isNearMatch('Python Certificate', 'python-certificate')).toBe(false);
  });

  it('does not flag differing word counts', () => {
    expect(isNearMatch('Python', 'Advanced Python Certificate')).toBe(false);
  });
});

describe('findNameMatches', () => {
  it('separates exact from similar and preserves the original display strings', () => {
    const existing = ['Python Certificate', 'Java Certificate', 'python-certificate'];
    const result = findNameMatches('Python Cert', existing);

    expect(result.exact).toEqual([]);
    expect(result.similar).toEqual(['Python Certificate', 'python-certificate']);
  });

  it('puts an exact hit in exact, not similar', () => {
    const result = findNameMatches('Python-Certificate', ['Python Certificate']);
    expect(result.exact).toEqual(['Python Certificate']);
    expect(result.similar).toEqual([]);
  });

  it('returns empty buckets for a genuinely new name', () => {
    const result = findNameMatches('Cloud Architecture', ['Python Certificate']);
    expect(result).toEqual({ exact: [], similar: [] });
  });

  it('tolerates a missing or non-array existing list', () => {
    expect(findNameMatches('Anything', undefined)).toEqual({ exact: [], similar: [] });
    expect(findNameMatches('Anything', null)).toEqual({ exact: [], similar: [] });
  });
});
