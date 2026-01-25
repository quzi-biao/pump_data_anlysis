import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "泵房数据分析系统",
  description: "基于 InfluxDB 的泵房数据分析和可视化系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
