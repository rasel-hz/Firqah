/**
 * Team sizes that sum to the participant count and differ by at most one.
 * 24 participants, 6 teams -> [4,4,4,4,4,4]. 23 participants, 5 teams -> [5,5,5,4,4].
 */
export function computeCapacities(participantCount: number, teamCount: number): number[] {
  if (!Number.isInteger(participantCount) || participantCount < 1) {
    throw new Error('عدد المشاركين يجب أن يكون رقمًا صحيحًا موجبًا.');
  }
  if (!Number.isInteger(teamCount) || teamCount < 1) {
    throw new Error('عدد الفرق يجب أن يكون رقمًا صحيحًا موجبًا.');
  }
  if (teamCount > participantCount) {
    throw new Error('عدد الفرق أكبر من عدد المشاركين.');
  }
  const base = Math.floor(participantCount / teamCount);
  const extra = participantCount % teamCount;
  return Array.from({ length: teamCount }, (_, i) => (i < extra ? base + 1 : base));
}
