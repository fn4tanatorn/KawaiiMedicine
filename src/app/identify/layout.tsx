import { AppShell } from "@/components/app-shell";

export default function IdentifyLayout({ children }: LayoutProps<"/identify">) {
  return <AppShell nextPath="/identify">{children}</AppShell>;
}
