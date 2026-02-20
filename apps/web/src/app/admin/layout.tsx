import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Assessments", href: "/admin/assessments" },
  { label: "Sessions", href: "/admin/sessions" },
  { label: "Users", href: "/admin/users" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <nav className="w-48 border-r border-foreground/10 p-4 shrink-0">
        <h2 className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-4">Admin</h2>
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 text-sm rounded hover:bg-foreground/5 text-foreground/70 hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
