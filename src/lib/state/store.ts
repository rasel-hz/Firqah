// localStorage persistence: data lives in one browser only (no database, no auth).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Challenge } from './types.ts';

const KEY = 'firqah.challenges.v1';
const MAX_RUNS = 5;

export function loadChallenges(): Challenge[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Challenge[]) : [];
  } catch {
    return [];
  }
}

function saveChallenges(challenges: Challenge[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(challenges));
    return true;
  } catch {
    return false;
  }
}

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createChallenge(): Challenge {
  const challenge: Challenge = {
    id: makeId(),
    createdAt: new Date().toISOString(),
    name: '',
    description: '',
    objective: '',
    plannedParticipants: 24,
    teamCount: 6,
    analysis: null,
    skills: [],
    participants: [],
    runs: [],
  };
  saveChallenges([...loadChallenges(), challenge]);
  return challenge;
}

export function deleteChallenge(id: string): Challenge[] {
  const remaining = loadChallenges().filter((c) => c.id !== id);
  saveChallenges(remaining);
  return remaining;
}

/** Challenges that were opened and left blank are not worth listing. */
export function loadSavedChallenges(): Challenge[] {
  const all = loadChallenges();
  const kept = all.filter((c) => c.name.trim() !== '' || c.description.trim() !== '' || c.participants.length > 0);
  if (kept.length !== all.length) saveChallenges(kept);
  return kept;
}

/** undefined while loading, null if the challenge does not exist in this browser. */
export function useChallenge(id: string) {
  const [challenge, setChallenge] = useState<Challenge | null | undefined>(undefined);
  const [storageFailed, setStorageFailed] = useState(false);
  const latest = useRef<Challenge | null>(null);

  useEffect(() => {
    const found = loadChallenges().find((c) => c.id === id) ?? null;
    latest.current = found;
    setChallenge(found);
  }, [id]);

  // Reads the latest value through a ref, so updates made after a slow API call never overwrite newer edits.
  const update = useCallback((change: (current: Challenge) => Challenge) => {
    if (!latest.current) return;
    const next = change(latest.current);
    next.runs = next.runs.slice(0, MAX_RUNS);
    latest.current = next;
    setChallenge(next);
    const saved = saveChallenges(loadChallenges().map((c) => (c.id === next.id ? next : c)));
    setStorageFailed(!saved);
  }, []);

  return { challenge, update, storageFailed };
}
