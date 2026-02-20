import Link from "next/link";

const environments = [
  {
    name: "KiCad",
    description: "PCB design and layout",
    href: "/lab/kicad",
    available: true,
  },
  {
    name: "FreeCAD",
    description: "3D parametric modeling",
    href: "#",
    available: false,
  },
  {
    name: "LTspice",
    description: "Circuit simulation",
    href: "#",
    available: false,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-2">ai-eval-lab</h1>
        <p className="text-lg text-foreground/60 mb-12">
          AI-proctored practical exams for engineering tools.
          Demonstrate your skills in a real environment.
        </p>

        <h2 className="text-xl font-semibold mb-6">Choose an environment</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {environments.map((env) => (
            <Link
              key={env.name}
              href={env.href}
              className={`block p-6 rounded-lg border transition-colors ${
                env.available
                  ? "border-foreground/20 hover:border-foreground/40 hover:bg-foreground/5"
                  : "border-foreground/10 opacity-40 pointer-events-none"
              }`}
            >
              <h3 className="font-semibold text-lg mb-1">{env.name}</h3>
              <p className="text-sm text-foreground/60">{env.description}</p>
              {!env.available && (
                <span className="text-xs text-foreground/40 mt-2 block">
                  Coming soon
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
