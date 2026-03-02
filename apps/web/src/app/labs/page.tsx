import Link from "next/link";

const labs = [
  {
    slug: "kicad",
    name: "KiCad",
    description: "PCB design and schematic capture in a real KiCad environment.",
    available: true,
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    slug: "freecad",
    name: "FreeCAD",
    description: "3D parametric modeling and mechanical design.",
    available: false,
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
  },
  {
    slug: "blender",
    name: "Blender",
    description: "3D modeling, animation, and rendering.",
    available: false,
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V15m0 0l-2.25-1.313M3 16.5v-2.25m0 0l2.25 1.313M21 16.5v-2.25m0 0l-2.25 1.313" />
      </svg>
    ),
  },
];

export default function LabsPage() {
  return (
    <main className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Labs
        </h1>
        <p className="text-lg text-muted-foreground mb-12">
          Choose an environment to browse its assessments.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {labs.map((lab) =>
            lab.available ? (
              <Link
                key={lab.slug}
                href={`/lab/${lab.slug}`}
                className="group p-6 rounded-lg ring-1 ring-border bg-card shadow-sm hover:ring-accent/30 hover:shadow-accent/[0.08] transition-all duration-200"
              >
                <div className="w-14 h-14 rounded-lg bg-accent/10 ring-1 ring-accent/20 flex items-center justify-center mb-5 text-accent">
                  {lab.icon}
                </div>
                <h3 className="text-lg font-semibold mb-1.5 group-hover:text-accent transition-colors">
                  {lab.name}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {lab.description}
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 ring-1 ring-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Available
                </span>
              </Link>
            ) : (
              <div
                key={lab.slug}
                className="p-6 rounded-lg ring-1 ring-border/50 bg-card/50 opacity-50"
              >
                <div className="w-14 h-14 rounded-lg bg-muted ring-1 ring-border flex items-center justify-center mb-5 text-muted-foreground">
                  {lab.icon}
                </div>
                <h3 className="text-lg font-semibold mb-1.5">{lab.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {lab.description}
                </p>
                <span className="text-xs text-muted-foreground">Coming Soon</span>
              </div>
            ),
          )}
        </div>
      </div>
    </main>
  );
}
