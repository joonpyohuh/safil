import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: { default: "SAFIL · 카페 홍보 도우미", template: "%s · SAFIL" },
  description: "카페 사장님을 위한 쉽고 빠른 홍보 콘텐츠 제작 도구",
};

export const viewport = {
  themeColor: "#f7f3ed",
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} h-full bg-background antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
