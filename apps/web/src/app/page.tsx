import Link from "next/link";

const environments = [
  {
    name: "KiCad",
    description: "PCB design and schematic capture in a real KiCad environment.",
    href: "/lab/kicad",
    available: true,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    name: "FreeCAD",
    description: "3D parametric modeling and mechanical design.",
    href: "#",
    available: false,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
  },
  {
    name: "Blender",
    description: "3D modeling, animation, and rendering.",
    href: "#",
    available: false,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V15m0 0l-2.25-1.313M3 16.5v-2.25m0 0l2.25 1.313M21 16.5v-2.25m0 0l-2.25 1.313" />
      </svg>
    ),
  },
];

function WindowChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-card ring-1 ring-border overflow-hidden shadow-2xl shadow-black/10 dark:shadow-black/40">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/50">
        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]/80" />
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-32 sm:pt-44 pb-8 px-6">
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-500/[0.07] rounded-full blur-[120px]" />
        <div className="pointer-events-none absolute top-20 -right-40 w-[500px] h-[500px] bg-cyan-500/[0.04] rounded-full blur-[100px]" />

        <div className="relative max-w-5xl mx-auto text-center">
          <Link
            href="/lab/kicad"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md ring-1 ring-green-500/20 bg-green-500/[0.05] text-sm text-green-400 mb-12 hover:bg-green-500/10 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500/75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Now Available — KiCad Environment
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.25] mb-10">
            AI-proctored practical assessments for engineering&nbsp;tools
          </h1>

          <p className="text-xl sm:text-2xl text-muted-foreground max-w-4xl mx-auto mb-14 leading-relaxed">
            The best way to understand someone's ability is to watch them work.
            You get a real tool, a problem statement, and an AI proctor that
            interviews you along the way. When you're done, the grading takes
            care of itself.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/lab/kicad"
              className="h-12 px-8 inline-flex items-center justify-center text-base font-medium rounded-md bg-accent text-accent-foreground hover:bg-accent-hover shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all duration-150 active:scale-[0.98]"
            >
              Browse Assessments
            </Link>
            <Link
              href="#how-it-works"
              className="h-12 px-8 inline-flex items-center justify-center text-base font-medium rounded-md ring-1 ring-border hover:bg-muted transition-all duration-150 active:scale-[0.98]"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Environment cards */}
        <div className="relative max-w-4xl mx-auto mt-28 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {environments.map((env) =>
            env.available ? (
              <Link
                key={env.name}
                href={env.href}
                className="group p-6 rounded-lg ring-1 ring-border bg-card shadow-lg shadow-black/[0.03] dark:shadow-black/20 hover:ring-accent/30 hover:shadow-accent/[0.08] transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-lg bg-accent/10 ring-1 ring-accent/20 flex items-center justify-center mb-4 text-accent">
                  {env.icon}
                </div>
                <h3 className="text-lg font-semibold mb-1 group-hover:text-accent transition-colors">
                  {env.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {env.description}
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 ring-1 ring-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Available Now
                </span>
              </Link>
            ) : (
              <div
                key={env.name}
                className="p-6 rounded-lg ring-1 ring-border/50 bg-card/50 opacity-50"
              >
                <div className="w-12 h-12 rounded-lg bg-muted ring-1 ring-border flex items-center justify-center mb-4 text-muted-foreground">
                  {env.icon}
                </div>
                <h3 className="text-lg font-semibold mb-1">{env.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {env.description}
                </p>
                <span className="text-xs text-muted-foreground">Coming Soon</span>
              </div>
            ),
          )}
        </div>
      </section>

      {/* ── How It Works — DB Pro alternating feature layout ── */}
      <section id="how-it-works" className="py-24 sm:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Four steps from start to verdict. No setup required.
            </p>
          </div>

          <div className="space-y-24 sm:space-y-32">
            {/* Step 1 — Pick an Assessment */}
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              <div>
                <span className="text-sm font-medium text-accent mb-3 block">
                  Step 01
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                  Pick an Assessment
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Browse available environments and choose a challenge matched to
                  your skill level. Each assessment has a defined time limit and
                  clear objectives.
                </p>
                <Link
                  href="/lab/kicad"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  Explore assessments
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              <WindowChrome>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 rounded-md ring-1 ring-accent/20 bg-accent/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-accent/10 flex items-center justify-center text-accent">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium">LED Circuit Board</div>
                        <div className="text-xs text-muted-foreground">30 min</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 ring-1 ring-green-500/20">
                      Easy
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md ring-1 ring-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Power Supply PCB</div>
                        <div className="text-xs text-muted-foreground">45 min</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20">
                      Medium
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md ring-1 ring-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Multi-layer Board</div>
                        <div className="text-xs text-muted-foreground">60 min</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
                      Hard
                    </span>
                  </div>
                </div>
              </WindowChrome>
            </div>

            {/* Step 2 — AI Interview (visual left, text right) */}
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              <div className="md:order-last">
                <span className="text-sm font-medium text-accent mb-3 block">
                  Step 02
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                  AI Interview
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Answer adaptive domain questions from the AI proctor. The AI
                  evaluates your knowledge, asks follow-up questions, and adapts
                  difficulty in real-time based on your responses.
                </p>
              </div>
              <WindowChrome>
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-accent/10 ring-1 ring-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                    <div className="p-2.5 rounded-md bg-muted/50 ring-1 ring-border/50 text-xs text-muted-foreground leading-relaxed">
                      Explain the difference between a bypass capacitor and a decoupling capacitor in PCB design.
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="p-2.5 rounded-md bg-accent/[0.08] ring-1 ring-accent/20 text-xs leading-relaxed max-w-[80%]">
                      A bypass capacitor filters high-frequency noise from the power supply, while a decoupling capacitor...
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-accent/10 ring-1 ring-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                    <div className="p-2.5 rounded-md bg-muted/50 ring-1 ring-border/50 text-xs text-muted-foreground leading-relaxed">
                      Good. How does placement relative to the IC affect their effectiveness?
                    </div>
                  </div>
                </div>
              </WindowChrome>
            </div>

            {/* Step 3 — Hands-on Lab */}
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              <div>
                <span className="text-sm font-medium text-accent mb-3 block">
                  Step 03
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                  Hands-on Lab
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Work in a real engineering environment streamed directly to
                  your browser. The AI observes your workflow, tracks milestones,
                  and evaluates your approach in real-time.
                </p>
              </div>
              <WindowChrome>
                <div className="flex gap-3">
                  <div className="w-[38%] space-y-3">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Task
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      Design a 2-layer PCB for an LED driver circuit with proper power regulation...
                    </div>
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>60%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full w-[60%] bg-accent rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      18:42
                    </div>
                  </div>
                  <div className="flex-1 aspect-[4/3] rounded-md bg-background ring-1 ring-border/50 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-8 h-8 text-muted-foreground/30 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                      </svg>
                      <span className="text-[10px] text-muted-foreground/30">
                        KiCad Viewport
                      </span>
                    </div>
                  </div>
                </div>
              </WindowChrome>
            </div>

            {/* Step 4 — Get Your Verdict (visual left, text right) */}
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              <div className="md:order-last">
                <span className="text-sm font-medium text-accent mb-3 block">
                  Step 04
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                  Get Your Verdict
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Receive detailed AI grading with checkpoint scores, timeline
                  analysis, Q&amp;A evaluation, and an overall performance
                  report.
                </p>
              </div>
              <WindowChrome>
                <div>
                  <div className="text-center mb-5">
                    <span className="inline-block px-4 py-1.5 rounded-md bg-green-500/10 ring-1 ring-green-500/20 text-green-400 text-sm font-semibold">
                      Hire
                    </span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Circuit Design", score: 85 },
                      { label: "PCB Layout", score: 70 },
                      { label: "Domain Knowledge", score: 90 },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-xs text-muted-foreground w-28 shrink-0">
                          {item.label}
                        </span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full"
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-medium w-10 text-right">
                          {(item.score / 10).toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </WindowChrome>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative overflow-hidden py-24 sm:py-32 px-6">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/[0.06] rounded-full blur-[120px]" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-lg bg-accent/10 ring-1 ring-accent/20 flex items-center justify-center mx-auto mb-8">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Ready to prove your skills?
          </h2>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-10">
            Pick an assessment, complete the interview and lab, and get your
            AI-generated verdict.
          </p>
          <Link
            href="/lab/kicad"
            className="h-12 px-8 inline-flex items-center justify-center text-base font-medium rounded-md bg-accent text-accent-foreground hover:bg-accent-hover shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all duration-150 active:scale-[0.98]"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 pt-16 pb-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-sm font-semibold mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <Link href="/lab/kicad" className="hover:text-foreground transition-colors">
                    Assessments
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-foreground transition-colors">
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">Environments</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <Link href="/lab/kicad" className="hover:text-foreground transition-colors">
                    KiCad
                  </Link>
                </li>
                <li><span>FreeCAD</span></li>
                <li><span>LTspice</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">Features</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><span>AI Proctor</span></li>
                <li><span>Live Lab</span></li>
                <li><span>Auto Grading</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><span>About</span></li>
                <li><span>Contact</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/50 pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ai-eval-lab. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
