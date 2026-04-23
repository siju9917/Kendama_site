import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AppraiseOS — Appraisal Workbench",
  description: "From order intake to signed URAR, in half the time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
