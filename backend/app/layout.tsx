import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CST Study Matrix API",
};

export default function BackendLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
