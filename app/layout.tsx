import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Common Thread",
  description:
    "Find the people most likely to reply, and send short personal emails you approve.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
