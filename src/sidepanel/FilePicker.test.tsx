// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilePicker } from "./FilePicker.js";

describe("FilePicker", () => {
  it("shows both drop zones and a disabled Compare button at start", () => {
    render(<FilePicker onRun={() => {}} />);
    expect(screen.getByText(/New version/i)).toBeTruthy();
    expect(screen.getByText(/Prior version/i)).toBeTruthy();
    const btn = screen.getByRole("button", { name: /Compare versions/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("rejects non-PDF/.docx files with a visible error", () => {
    render(<FilePicker onRun={() => {}} />);
    const input = screen
      .getAllByLabelText(/Choose New version/i)[0] as HTMLInputElement;
    const file = new File(["junk"], "image.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText(/Only PDF \(\.pdf\) and Word/i)).toBeTruthy();
  });

  it("does not show a rejection message when the dialog is cancelled (no files)", () => {
    render(<FilePicker onRun={() => {}} />);
    const input = screen
      .getAllByLabelText(/Choose New version/i)[0] as HTMLInputElement;
    // Empty file list = user cancelled the dialog.
    fireEvent.change(input, { target: { files: [] } });
    expect(screen.queryByText(/Only PDF \(\.pdf\) and Word/i)).toBeNull();
  });

  it("enables Compare once both files are picked", () => {
    const onRun = vi.fn();
    render(<FilePicker onRun={onRun} />);
    const inputs = screen.getAllByLabelText(/Choose/i) as HTMLInputElement[];
    const a = new File(["%PDF-1.7"], "a.pdf", { type: "application/pdf" });
    const b = new File(["%PDF-1.7"], "b.pdf", { type: "application/pdf" });
    fireEvent.change(inputs[0], { target: { files: [a] } });
    fireEvent.change(inputs[1], { target: { files: [b] } });
    const btn = screen.getByRole("button", { name: /Compare versions/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onRun.mock.calls[0][0].name).toBe("a.pdf");
    expect(onRun.mock.calls[0][1].name).toBe("b.pdf");
  });
});
