import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AppraiseOS",
    short_name: "AppraiseOS",
    description: "Residential appraisal workbench — orders, inspections, comps, URAR reports.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7fafc",
    theme_color: "#2b6cb0",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "maskable" },
      { src: "/icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
