"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./auth";

const links = [
  ["/dashboard", "Dashboard", "▦"],
  ["/matrix", "Study matrix", "▤"],
  ["/admin", "Admin panel", "⚙"],
] as const;
export function Navigation() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <div className="brand">
        <i>⬡</i>
        <div>
          <b>CST Matrix</b>
          <small>
            <span />
            Study system online
          </small>
        </div>
      </div>
      <div className="level">
        <b>Lv 1 · Rookie</b>
        <span>0 / 60 XP</span>
        <div>
          <i />
        </div>
      </div>
      <nav>
        {links.map(([href, label, icon]) => (
          <Link className={path === href ? "active" : ""} href={href} key={href}>
            <i>{icon}</i>
            {label}
          </Link>
        ))}
      </nav>
      <div className="sideBottom">
        <small>Syllabus workspace</small>
        <LogoutButton />
      </div>
    </aside>
  );
}
