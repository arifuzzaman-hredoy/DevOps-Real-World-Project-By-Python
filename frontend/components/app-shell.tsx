import { Navigation } from "./navigation";
import { RequireAuth } from "./auth";
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Navigation />
      <main className="content">{children}</main>
    </RequireAuth>
  );
}
