/**
 * License client (Phase 5.3 / 5.8).
 *
 * CRITICAL CONSTRAINT (spec Part 3.4): this module MUST NOT import any
 * type from src/core/model/* or src/core/diff/* — document content cannot
 * pass through licensing. The integration-isolation test enforces this.
 *
 * For v1 we ship with a local-only client that grants a 14-day trial on
 * first use. The server-augmented client extends this and validates
 * cryptographically-signed license keys against the backend.
 */
import type { ILicenseClient, LicenseState } from "../interfaces.js";
import { makeKv } from "../storage/index.js";

const STATE_KEY = "biddiff.license.state";
const TRIAL_DAYS = 14;
const GRACE_SECONDS = 7 * 24 * 60 * 60; // 7 days

interface StoredLicense {
  /** ISO-8601 trial start. */
  trialStartedAt: string | null;
  /** ISO-8601 last successful server validation. */
  lastValidatedAt: string | null;
  /** Encrypted/signed license blob — only the server can verify it. */
  signedBlob: string | null;
}

function daysBetween(a: string, b: string): number {
  return Math.floor((Date.parse(b) - Date.parse(a)) / (24 * 60 * 60 * 1000));
}

export class LocalLicenseClient implements ILicenseClient {
  private readonly kv = makeKv();

  async validate(): Promise<LicenseState> {
    const now = new Date().toISOString();
    let stored = await this.kv.get<StoredLicense>(STATE_KEY);
    if (!stored) {
      stored = { trialStartedAt: now, lastValidatedAt: null, signedBlob: null };
      await this.kv.set(STATE_KEY, stored);
    }

    // If a signed blob exists, this would be where we'd verify it server-side.
    // The local-only client treats any non-null blob as a valid solo license
    // for stub purposes. The Phase 5 server-augmented client replaces this.
    if (stored.signedBlob) {
      return {
        tier: "solo",
        status: "active",
        trialDaysLeft: null,
        gracePeriodSecondsLeft: null,
        lastValidatedAt: stored.lastValidatedAt,
      };
    }

    // Trial accounting
    if (stored.trialStartedAt) {
      const daysUsed = daysBetween(stored.trialStartedAt, now);
      const daysLeft = TRIAL_DAYS - daysUsed;
      if (daysLeft >= 0) {
        return {
          tier: "trial",
          status: "active",
          trialDaysLeft: daysLeft,
          gracePeriodSecondsLeft: null,
          lastValidatedAt: null,
        };
      }
      // Trial expired — short grace window.
      const secondsOver = Math.floor(
        (Date.parse(now) - Date.parse(stored.trialStartedAt)) / 1000 - TRIAL_DAYS * 24 * 60 * 60,
      );
      const graceLeft = GRACE_SECONDS - secondsOver;
      if (graceLeft > 0) {
        return {
          tier: "trial",
          status: "grace",
          trialDaysLeft: 0,
          gracePeriodSecondsLeft: graceLeft,
          lastValidatedAt: null,
        };
      }
      return {
        tier: "trial",
        status: "expired",
        trialDaysLeft: 0,
        gracePeriodSecondsLeft: null,
        lastValidatedAt: null,
      };
    }

    return {
      tier: "trial",
      status: "invalid",
      trialDaysLeft: null,
      gracePeriodSecondsLeft: null,
      lastValidatedAt: null,
    };
  }
}
