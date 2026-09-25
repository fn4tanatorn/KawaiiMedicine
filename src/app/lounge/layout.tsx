import { AppShell } from "@/components/app-shell";

export default function LoungeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell nextPath="/lounge">{children}</AppShell>;
}
