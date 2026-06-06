// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { OpportunityAttachment } from "../core/interfaces.js";

// vi.mock is hoisted — intercepts both static and dynamic imports of chrome-rt.
const mockSendRuntime = vi.fn();
vi.mock("../shared/chrome-rt.js", () => ({
  sendRuntime: mockSendRuntime,
}));

// Import after mock is registered so SamAttachments' dynamic import resolves to the mock.
import { SamAttachments } from "./SamAttachments.js";

function fakeAttachment(id: string, mimeType: string | null = "application/pdf"): OpportunityAttachment {
  return {
    id,
    fileName: `attachment-${id}.pdf`,
    url: `https://sam.gov/download/${id}`,
    mimeType,
    postedAt: null,
    amendmentNumber: null,
    sizeBytes: 12345,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: empty list.
  mockSendRuntime.mockResolvedValue({ attachments: [] });
});

describe("SamAttachments", () => {
  it("renders nothing while the list is loading (items === null)", () => {
    // Stall the runtime call so items stays null.
    mockSendRuntime.mockReturnValue(new Promise(() => {}));
    const { container } = render(
      <SamAttachments onChooseCurrent={vi.fn()} onChoosePrior={vi.fn()} />,
    );
    expect(container.querySelector("section")).toBeNull();
  });

  it("renders nothing when the attachment list is empty", async () => {
    mockSendRuntime.mockResolvedValue({ attachments: [] });
    const { container } = render(
      <SamAttachments onChooseCurrent={vi.fn()} onChoosePrior={vi.fn()} />,
    );
    await waitFor(() => expect(mockSendRuntime).toHaveBeenCalled());
    expect(container.querySelector("section")).toBeNull();
  });

  it("renders attachment filenames when the list is non-empty", async () => {
    const atts = [fakeAttachment("a1"), fakeAttachment("a2")];
    mockSendRuntime.mockResolvedValue({ attachments: atts });
    render(<SamAttachments onChooseCurrent={vi.fn()} onChoosePrior={vi.fn()} />);
    await waitFor(() => screen.getByText("attachment-a1.pdf"));
    expect(screen.getByText("attachment-a2.pdf")).toBeTruthy();
  });

  it("renders MIME type when present", async () => {
    mockSendRuntime.mockResolvedValue({ attachments: [fakeAttachment("a1", "application/pdf")] });
    render(<SamAttachments onChooseCurrent={vi.fn()} onChoosePrior={vi.fn()} />);
    await waitFor(() => screen.getByText("attachment-a1.pdf"));
    expect(screen.getByText("application/pdf")).toBeTruthy();
  });

  it("does not render MIME type when null", async () => {
    mockSendRuntime.mockResolvedValue({ attachments: [fakeAttachment("a1", null)] });
    render(<SamAttachments onChooseCurrent={vi.fn()} onChoosePrior={vi.fn()} />);
    await waitFor(() => screen.getByText("attachment-a1.pdf"));
    // No MIME type element should appear.
    expect(screen.queryByText("application/pdf")).toBeNull();
  });

  it("calls onChooseCurrent with the attachment when 'As new' is clicked", async () => {
    const onCurrent = vi.fn();
    mockSendRuntime.mockResolvedValue({ attachments: [fakeAttachment("a1")] });
    render(<SamAttachments onChooseCurrent={onCurrent} onChoosePrior={vi.fn()} />);
    await waitFor(() => screen.getByTitle(/Use as new/i));
    fireEvent.click(screen.getByTitle(/Use as new/i));
    expect(onCurrent).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }));
  });

  it("calls onChoosePrior with the attachment when 'As prior' is clicked", async () => {
    const onPrior = vi.fn();
    mockSendRuntime.mockResolvedValue({ attachments: [fakeAttachment("a1")] });
    render(<SamAttachments onChooseCurrent={vi.fn()} onChoosePrior={onPrior} />);
    await waitFor(() => screen.getByTitle(/Use as prior/i));
    fireEvent.click(screen.getByTitle(/Use as prior/i));
    expect(onPrior).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }));
  });

  it("'As new' button is disabled and shows 'Loading…' while current slot is downloading", async () => {
    mockSendRuntime.mockResolvedValue({ attachments: [fakeAttachment("a1")] });
    render(
      <SamAttachments
        onChooseCurrent={vi.fn()}
        onChoosePrior={vi.fn()}
        downloading={new Set(["current:a1"])}
      />,
    );
    await waitFor(() => screen.getByTitle(/Use as new/i));
    const btn = screen.getByTitle(/Use as new/i) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toBe("Loading…");
  });

  it("'As prior' button is disabled and shows 'Loading…' while prior slot is downloading", async () => {
    mockSendRuntime.mockResolvedValue({ attachments: [fakeAttachment("a1")] });
    render(
      <SamAttachments
        onChooseCurrent={vi.fn()}
        onChoosePrior={vi.fn()}
        downloading={new Set(["prior:a1"])}
      />,
    );
    await waitFor(() => screen.getByTitle(/Use as prior/i));
    const btn = screen.getByTitle(/Use as prior/i) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toBe("Loading…");
  });

  it("downloading a different ID does not disable the buttons for this attachment", async () => {
    mockSendRuntime.mockResolvedValue({ attachments: [fakeAttachment("a1")] });
    render(
      <SamAttachments
        onChooseCurrent={vi.fn()}
        onChoosePrior={vi.fn()}
        downloading={new Set(["current:other-id"])}
      />,
    );
    await waitFor(() => screen.getByTitle(/Use as new/i));
    expect((screen.getByTitle(/Use as new/i) as HTMLButtonElement).disabled).toBe(false);
  });

  it("renders nothing when the runtime call fails (treats failure as empty list)", async () => {
    mockSendRuntime.mockRejectedValue(new Error("Service worker offline"));
    const { container } = render(
      <SamAttachments onChooseCurrent={vi.fn()} onChoosePrior={vi.fn()} />,
    );
    await waitFor(() => expect(mockSendRuntime).toHaveBeenCalled());
    expect(container.querySelector("section")).toBeNull();
  });

  it("renders nothing when the runtime returns null (no response)", async () => {
    mockSendRuntime.mockResolvedValue(null);
    const { container } = render(
      <SamAttachments onChooseCurrent={vi.fn()} onChoosePrior={vi.fn()} />,
    );
    await waitFor(() => expect(mockSendRuntime).toHaveBeenCalled());
    // resp?.attachments ?? [] → [] when resp is null → renders nothing
    expect(container.querySelector("section")).toBeNull();
  });
});
