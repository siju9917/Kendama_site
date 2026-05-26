/**
 * IOpportunitySite implementation for SAM.gov. ALL SAM.gov DOM selectors
 * live here.
 */
import type {
  IOpportunitySite,
  OpportunityAmendmentMeta,
  OpportunityAttachment,
} from "../../core/interfaces.js";

// SAM.gov opportunity URL pattern: /opp/<hex>/view
const OPP_URL_RE = /\/opp\/[a-f0-9]+\/view/i;

// Selectors are best-effort and grouped here. If SAM.gov changes its DOM,
// only this list needs updating.
const SELECTORS = {
  // The "Attachments / Links" section heading.
  attachmentsContainer:
    "[data-sam-section='attachments'], section[aria-label*='Attachments'], .attachments",
  attachmentLink: "a[href$='.pdf'], a[href$='.docx'], a[href*='/download/']",
  amendmentRow: "[data-sam-amendment-row], .amendment-row, tr.amendment",
  amendmentNumber: "[data-amendment-number], .amendment-number",
  amendmentPostedAt: "[data-amendment-posted], time[datetime]",
  amendmentDescription: ".amendment-description, [data-amendment-description]",
} as const;

export class SamIntegration implements IOpportunitySite {
  isOpportunityPage(): boolean {
    if (typeof window === "undefined") return false;
    return OPP_URL_RE.test(window.location.pathname);
  }

  async findAttachments(): Promise<OpportunityAttachment[]> {
    const container = document.querySelector(SELECTORS.attachmentsContainer);
    const root = container ?? document;
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>(SELECTORS.attachmentLink));
    return links.map((a, i) => ({
      id: a.getAttribute("data-attachment-id") ?? String(i),
      fileName: a.getAttribute("download") ?? a.textContent?.trim() ?? `attachment-${i}`,
      url: a.href,
      mimeType: this.guessMime(a.href),
      postedAt: null,
      amendmentNumber: null,
      sizeBytes: null,
    }));
  }

  async readAmendmentMetadata(): Promise<OpportunityAmendmentMeta[]> {
    const rows = Array.from(document.querySelectorAll<HTMLElement>(SELECTORS.amendmentRow));
    return rows.map((row) => {
      const number = row.querySelector(SELECTORS.amendmentNumber)?.textContent?.trim() ?? "";
      const postedRaw =
        row.querySelector<HTMLTimeElement>(SELECTORS.amendmentPostedAt)?.dateTime ??
        row.querySelector(SELECTORS.amendmentPostedAt)?.textContent?.trim() ??
        null;
      const description = row.querySelector(SELECTORS.amendmentDescription)?.textContent?.trim() ?? null;
      return { amendmentNumber: number, postedAt: postedRaw, description };
    });
  }

  private guessMime(url: string): string | null {
    if (/\.pdf(\?|$)/i.test(url)) return "application/pdf";
    if (/\.docx(\?|$)/i.test(url))
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    return null;
  }
}
