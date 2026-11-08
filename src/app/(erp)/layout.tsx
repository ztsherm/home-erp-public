import { AppShell } from "@/components/shell";

export default function ErpLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
