import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "CST Matrix", description: "Study operations dashboard" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
