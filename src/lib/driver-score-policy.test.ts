import { describe, expect, it } from "vitest";
import {
  isAssignmentRestrictedByScore,
  isAssignmentSuspendedByScore,
  SCORE_ASSIGNMENT_MIN,
  SCORE_ASSIGNMENT_SUSPEND_MAX_EXCLUSIVE,
} from "./driver-score-policy";

describe("driver-score-policy", () => {
  it("définit les seuils attendus", () => {
    expect(SCORE_ASSIGNMENT_MIN).toBe(60);
    expect(SCORE_ASSIGNMENT_SUSPEND_MAX_EXCLUSIVE).toBe(40);
  });

  it("suspend en dessous de 40", () => {
    expect(isAssignmentSuspendedByScore(39)).toBe(true);
    expect(isAssignmentSuspendedByScore(40)).toBe(false);
    expect(isAssignmentSuspendedByScore(null)).toBe(false);
  });

  it("restreint entre 40 et 59", () => {
    expect(isAssignmentRestrictedByScore(59)).toBe(true);
    expect(isAssignmentRestrictedByScore(60)).toBe(false);
    expect(isAssignmentRestrictedByScore(35)).toBe(false);
  });
});
