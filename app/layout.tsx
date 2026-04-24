import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AppraiseOS — Appraisal Workbench",
    template: "%s",
  },
  description: "From order intake to signed URAR, in half the time.",
  applicationName: "AppraiseOS",
  appleWebApp: {
    capable: true,
    title: "AppraiseOS",
    statusBarStyle: "default",
  },
  // Makes the browser's URL bar color match the app on mobile. iOS respects
  // the apple-web-app flags above when the user does "Add to Home Screen".
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#2b6cb0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
