// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { SamIntegration } from "./sam-integration.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("SamIntegration.findAttachments — parses untrusted SAM.gov DOM", () => {
  it("finds .pdf/.docx/download links and guesses mime through query strings", async () => {
    document.body.innerHTML = `
      <section aria-label="Attachments">
        <a href="https://sam.gov/files/solicitation.pdf?token=abc" download="RFP.pdf">RFP</a>
        <a href="https://sam.gov/api/download/123">Attachment 2</a>
        <a href="https://sam.gov/files/sow.docx">SOW</a>
      </section>`;
    const found = await new SamIntegration().findAttachments();
    expect(found).toHaveLength(3);
    // querySelectorAll groups by the comma-separated selector order
    // (.pdf, then .docx, then /download/), NOT document order — assert by url.
    const byUrl = Object.fromEntries(found.map((f) => [f.url, f.mimeType]));
    // mime guessed through a ?query suffix (the reason the selector uses *=).
    expect(byUrl["https://sam.gov/files/solicitation.pdf?token=abc"]).toBe("application/pdf");
    expect(byUrl["https://sam.gov/files/sow.docx"]).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    // /download/ route has no extension → null mime, still captured.
    expect(byUrl["https://sam.gov/api/download/123"]).toBeNull();
  });

  it("prefers download attr, then text, then an index fallback for the file name", async () => {
    document.body.innerHTML = `
      <a href="https://sam.gov/a.pdf" download="Named.pdf">ignored text</a>
      <a href="https://sam.gov/b.pdf">  Visible Text  </a>
      <a href="https://sam.gov/c.pdf" download="   ">   </a>`;
    const found = await new SamIntegration().findAttachments();
    expect(found[0].fileName).toBe("Named.pdf");
    expect(found[1].fileName).toBe("Visible Text"); // trimmed text
    // Empty download="" AND empty text → index fallback (the || not ?? case).
    expect(found[2].fileName).toBe("attachment-2");
  });

  it("prefixes ids with the index so duplicate data-attachment-id can't collide", async () => {
    document.body.innerHTML = `
      <a href="https://sam.gov/a.pdf" data-attachment-id="dup">A</a>
      <a href="https://sam.gov/b.pdf" data-attachment-id="dup">B</a>`;
    const found = await new SamIntegration().findAttachments();
    expect(found[0].id).not.toBe(found[1].id);
    expect(found[0].id.startsWith("0-")).toBe(true);
    expect(found[1].id.startsWith("1-")).toBe(true);
  });

  it("returns an empty list when there are no attachment links", async () => {
    document.body.innerHTML = `<p>No attachments here.</p>`;
    expect(await new SamIntegration().findAttachments()).toEqual([]);
  });
});

describe("SamIntegration.readAmendmentMetadata", () => {
  it("reads number, posted date (datetime preferred), and description per row", async () => {
    // Wrap in a real table so jsdom keeps the <tr> (a bare <tr> is dropped).
    document.body.innerHTML = `
      <table><tbody>
      <tr class="amendment">
        <td><span class="amendment-number">0002</span></td>
        <td><time datetime="2026-08-01T00:00:00Z">Aug 1</time></td>
        <td><span class="amendment-description">Extended due date</span></td>
      </tr>
      </tbody></table>`;
    const meta = await new SamIntegration().readAmendmentMetadata();
    expect(meta).toHaveLength(1);
    expect(meta[0].amendmentNumber).toBe("0002");
    expect(meta[0].postedAt).toBe("2026-08-01T00:00:00Z"); // dateTime wins over text
    expect(meta[0].description).toBe("Extended due date");
  });

  it("falls back to text content for a non-<time> [data-amendment-posted] element", async () => {
    // The selector also matches a [data-amendment-posted] element that is not a
    // <time> (so it has no .dateTime); the human-readable text is then used.
    document.body.innerHTML = `
      <table><tbody>
      <tr class="amendment">
        <td><span class="amendment-number">0003</span></td>
        <td><span data-amendment-posted>August 5, 2026</span></td>
        <td><span class="amendment-description">Q&amp;A posted</span></td>
      </tr>
      </tbody></table>`;
    const meta = await new SamIntegration().readAmendmentMetadata();
    expect(meta[0].postedAt).toBe("August 5, 2026"); // text fallback, no machine date
  });

  it("degrades — never throws — on a malformed row with missing fields (untrusted DOM)", async () => {
    // SAM.gov can change its markup at any time. A row missing the number,
    // date, and description elements must yield empty/null fields, not crash
    // the content script.
    document.body.innerHTML = `
      <table><tbody>
      <tr class="amendment"><td>nothing recognizable here</td></tr>
      </tbody></table>`;
    const meta = await new SamIntegration().readAmendmentMetadata();
    expect(meta).toHaveLength(1);
    expect(meta[0]).toEqual({ amendmentNumber: "", postedAt: null, description: null });
  });

  it("returns an empty list when there are no amendment rows", async () => {
    document.body.innerHTML = `<table><tbody></tbody></table>`;
    expect(await new SamIntegration().readAmendmentMetadata()).toEqual([]);
  });
});
