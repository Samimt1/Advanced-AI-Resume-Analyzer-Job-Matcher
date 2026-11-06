import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "CareerMatch AI", description: "AI Resume Analyzer & Job Matcher" };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
