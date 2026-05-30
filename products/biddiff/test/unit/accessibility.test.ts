/**
 * Accessibility smoke tests for the design system color tokens.
 *
 * WCAG AA contrast minimums:
 *   - Normal text:        4.5:1
 *   - Large text (>=18pt or 14pt bold): 3:1
 *   - Non-text UI elements (borders, focus rings): 3:1
 *
 * The contrast ratio uses sRGB relative luminance per WCAG 2.x.
 */
import { describe, it, expect } from "vitest";

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ];
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const f = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: string, b: string): number {
  const La = relLuminance(hexToRgb(a));
  const Lb = relLuminance(hexToRgb(b));
  const [hi, lo] = La > Lb ? [La, Lb] : [Lb, La];
  return (hi + 0.05) / (lo + 0.05);
}

describe("Design system contrast (WCAG AA)", () => {
  const BG = "#ffffff";
  const FG = "#14181f";
  const FG_MUTED = "#5b6573";
  const FG_FAINT = "#8a92a0";
  const ACCENT = "#1f5cd6";
  const CRITICAL = "#b00020";
  const ACCENT_FG = "#ffffff";

  it("body text on background passes AA (4.5:1)", () => {
    expect(contrast(FG, BG)).toBeGreaterThanOrEqual(4.5);
  });

  it("muted text on background passes AA (4.5:1)", () => {
    expect(contrast(FG_MUTED, BG)).toBeGreaterThanOrEqual(4.5);
  });

  it("faint text on background — at minimum AA-large (3:1)", () => {
    // Faint is used only for footer/inline timestamps; treat as AA-large.
    expect(contrast(FG_FAINT, BG)).toBeGreaterThanOrEqual(3.0);
  });

  it("accent button text on accent background passes AA (4.5:1)", () => {
    expect(contrast(ACCENT_FG, ACCENT)).toBeGreaterThanOrEqual(4.5);
  });

  it("critical text on white passes AA (4.5:1)", () => {
    expect(contrast(CRITICAL, BG)).toBeGreaterThanOrEqual(4.5);
  });

  it("accent on background — minimum AA (4.5:1) for links/buttons", () => {
    expect(contrast(ACCENT, BG)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("Design system contrast — dark mode", () => {
  const BG = "#0e1116";
  const FG = "#e9edf2";
  const FG_MUTED = "#a4adb8";
  const FG_FAINT = "#7d8694";
  const ACCENT = "#6ea1ff";
  const ACCENT_FG = "#0b1220";
  const CRITICAL = "#ff6b88";

  it("body text on dark background passes AA", () => {
    expect(contrast(FG, BG)).toBeGreaterThanOrEqual(4.5);
  });
  it("muted text on dark background passes AA", () => {
    expect(contrast(FG_MUTED, BG)).toBeGreaterThanOrEqual(4.5);
  });
  it("faint text on dark background — at minimum AA-large", () => {
    expect(contrast(FG_FAINT, BG)).toBeGreaterThanOrEqual(3.0);
  });
  it("accent button text on dark accent background passes AA", () => {
    expect(contrast(ACCENT_FG, ACCENT)).toBeGreaterThanOrEqual(4.5);
  });
  it("critical text on dark background passes AA", () => {
    expect(contrast(CRITICAL, BG)).toBeGreaterThanOrEqual(4.5);
  });
  it("accent on dark background passes AA", () => {
    expect(contrast(ACCENT, BG)).toBeGreaterThanOrEqual(4.5);
  });
});

// Partially addresses K1 Accessibility P2: the base-token tests above check
// fg/bg pairs in isolation, but real components layer diff/critical colors
// on *card* and *soft-badge* surfaces. These assert the ACTUAL color pairs
// the rendered components use (ChangeCard tokens, the critical badge, meta
// text on cards) in BOTH modes. The remaining P2 gap — verifying these on
// the genuinely rendered DOM — needs a browser (axe can't resolve computed
// color under jsdom; see brain/WISHLIST.md), but the *color pairs* are now
// all verified AA here. Values mirror src/sidepanel/styles.css tokens.
describe("Rendered-component color pairs (ChangeCard / badges)", () => {
  it("light mode: diff + critical + meta pairs on card/soft surfaces pass AA", () => {
    const pairs: [string, string][] = [
      ["#0f7a3a", "#ffffff"], // insert text on card bg
      ["#0f7a3a", "#f5f7fa"], // insert text on subtle bg
      ["#b22222", "#ffffff"], // delete text on card bg
      ["#b22222", "#f5f7fa"], // delete text on subtle bg
      ["#b00020", "#fdecef"], // critical text on critical-soft (badge)
      ["#5b6573", "#f5f7fa"], // muted meta text on subtle bg
    ];
    for (const [fg, bg] of pairs) {
      expect(contrast(fg, bg), `light ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("dark mode: diff + critical + meta pairs on card/soft surfaces pass AA", () => {
    const pairs: [string, string][] = [
      ["#5ce697", "#161a21"], // insert text on subtle bg
      ["#5ce697", "#1a1f27"], // insert text on card (elev) bg
      ["#ff8a8a", "#1a1f27"], // delete text on card bg
      ["#ff6b88", "#1a1f27"], // critical text on card bg
      ["#ff6b88", "#3a1a22"], // critical text on critical-soft (badge)
      ["#a4adb8", "#1a1f27"], // muted meta text on card bg
      ["#a4adb8", "#161a21"], // muted meta text on subtle bg
    ];
    for (const [fg, bg] of pairs) {
      expect(contrast(fg, bg), `dark ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
