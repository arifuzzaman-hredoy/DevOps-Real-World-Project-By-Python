import "./globals.css";
import "./study-matrix.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CST Matrix",
  description: "CST Semester Study Matrix",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
