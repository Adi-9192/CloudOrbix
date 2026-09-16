import { useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, ChevronDown, Sparkles } from "lucide-react";

interface ProjectFrameworkProps {
  dark: boolean;
}

type LifecycleStage = {
  stage: string;
  accent: string;
  summary: string;
  keyActivities: string[];
  outputs: string[];
};

const lifecycle: LifecycleStage[] = [
  {
    stage: "Intake & Initiation",
    accent: "linear-gradient(135deg, rgba(14,165,233,0.22), rgba(59,130,246,0.08))",
    summary: "Discovery, scoping, and intake approval",
    keyActivities: [
      "Submit Project Intake Document",
      "Classify project type",
      "Identify business need",
      "Define high-level scope & objectives",
      "Initial feasibility & rough sizing",
    ],
    outputs: [
      "Approved Intake",
      "Project Charter / Brief / Kick off / ISOW",
      "Assigned Project Manager",
    ],
  },
  {
    stage: "Planning",
    accent: "linear-gradient(135deg, rgba(96,165,250,0.18), rgba(59,130,246,0.08))",
    summary: "Planning the work, risks, and delivery path",
    keyActivities: [
      "Kick off",
      "Define detailed scope (In/Out)",
      "Work Break Down work (WBS)",
      "Create timeline & milestones",
      "Resource planning (team, budget, access)",
      "ISOW creation / approval",
      "Assessment and Gap Analysis",
      "Risk assessment",
      "Define success metrics (KPIs)",
      "Prepare the Scope of work (SOW)",
    ],
    outputs: [
      "Project Plan / Schedule",
      "Approved I-SOW",
      "Gap Analysis Report",
      "Resource Plan",
      "Risk Register",
      "Communication Plan",
      "Approved Scope document",
    ],
  },
  {
    stage: "Design (Solutioning)",
    accent: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(14,165,233,0.08))",
    summary: "Architecture, design, and technical validation",
    keyActivities: [
      "Architecture design",
      "Functional & technical specifications",
      "Security & compliance review (If applicable)",
      "Process design (if applicable)",
    ],
    outputs: [
      "Solution Design Document (HLD / LLD)",
      "Architecture diagrams",
      "Approved design sign-off",
    ],
  },
  {
    stage: "Build / Execution",
    accent: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(16,185,129,0.08))",
    summary: "Execution and continuous project coordination",
    keyActivities: [
      "Development / configuration",
      "Integration with systems",
      "Regular status tracking / cadence call",
      "Issue & dependency management",
    ],
    outputs: [
      "Build artifacts",
      "Status reports / MOMs",
      "Updated risk / issue logs",
    ],
  },
  {
    stage: "Testing",
    accent: "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(14,165,233,0.08))",
    summary: "Quality assurance and business acceptance",
    keyActivities: [
      "Unit Testing / User Acceptance Testing (UAT)",
    ],
    outputs: [
      "Test cases & results",
      "Defect logs",
      "UAT sign-off",
    ],
  },
  {
    stage: "Deployment / Release",
    accent: "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(45,212,191,0.08))",
    summary: "Production rollout and release control",
    keyActivities: [
      "Release planning",
      "Change management approval",
      "Deployment execution",
      "Rollback planning",
    ],
    outputs: [
      "Production release",
      "Deployment checklist",
    ],
  },
  {
    stage: "Stabilization & Support / Hypercare",
    accent: "linear-gradient(135deg, rgba(20,184,166,0.18), rgba(59,130,246,0.08))",
    summary: "Operational stabilization after go-live",
    keyActivities: [
      "Observability",
      "Fix post-production issues",
      "Knowledge transfer to support teams",
    ],
    outputs: [
      "Support documentation",
      "Incident logs",
      "Stable system handover",
    ],
  },
  {
    stage: "Closure Or Handover",
    accent: "linear-gradient(135deg, rgba(251,191,36,0.18), rgba(34,197,94,0.08))",
    summary: "Closure, governance, and transition",
    keyActivities: [
      "Validate success metrics achieved",
      "Financial closure",
      "Lessons learned",
      "Handover to Operations",
      "Offboarding the Project team",
    ],
    outputs: [
      "Lessons Learned document",
      "Project Closure Report",
      "Signed ATR",
      "Confirmation on offboarding of the project team",
      "Stakeholder sign-off",
    ],
  },
];

const mandatoryArtefacts = [
  "Project Intake Form",
  "Kick Off",
  "ISOW",
  "SOW",
  "Inventory",
  "Gap Analysis",
  "RAID LOG",
  "RACI",
  "Project Plan",
  "Solution review / sign off",
  "Design Documents - HLD/LLD",
  "Project Reports",
  "Test reports / Evidences",
  "Project Sign off",
  "ATR",
  "Offboarding the project team",
  "Lessons Learned document",
  "Scope Creep trackers",
  "Cost Overrun / Time overrun",
  "KB articles",
];

export default function ProjectFramework({ dark }: ProjectFrameworkProps) {
  const [expanded, setExpanded] = useState("Intake & Initiation");
  const pageBg = dark ? "#0F172A" : "#F8FAFC";
  const panel = dark ? "#0B1220" : "#FFFFFF";
  const panelAlt = dark ? "#111827" : "#F8FAFC";
  const border = dark ? "rgba(148,163,184,0.25)" : "rgba(148,163,184,0.35)";
  const text = dark ? "#E2E8F0" : "#0F172A";
  const muted = dark ? "#94A3B8" : "#64748B";
  const subtle = dark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.06)";

  return (
    <div className="p-4 md:p-6" style={{ background: pageBg, color: text }}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border shadow-lg" style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.24), rgba(16,185,129,0.22))", borderColor: border }}>
            <BookOpen className="h-5 w-5" style={{ color: "#1D4ED8" }} />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: muted }}>Lifecycle Blueprint</div>
            <h1 className="text-2xl font-bold">Project Framework</h1>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium md:flex" style={{ background: subtle, borderColor: border, color: text }}>
          <Sparkles className="h-3.5 w-3.5" style={{ color: "#0EA5E9" }} />
          End-to-End Lifecycle
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2.3fr)_320px]">
        <div className="space-y-4">
          {lifecycle.map((stage) => {
            const isExpanded = expanded === stage.stage;
            return (
              <button
                key={stage.stage}
                type="button"
                onClick={() => setExpanded(isExpanded ? "" : stage.stage)}
                className="relative w-full overflow-hidden rounded-[28px] border p-4 text-left shadow-[0_18px_45px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_56px_rgba(37,99,235,0.18)]"
                style={{
                  background: stage.accent,
                  borderColor: border,
                  transform: isExpanded ? "perspective(1200px) rotateX(0deg) translateY(-2px)" : "perspective(1200px) rotateX(2deg)",
                }}
              >
                <div className="absolute inset-0 opacity-80" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0))" }} />
                <div className="relative">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-lg font-bold" style={{ background: panel, borderColor: border, color: text }}>
                      {stage.stage.split(" ")[0].slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-xl font-bold" style={{ color: text }}>{stage.stage}</h2>
                        <ChevronDown className="h-4 w-4 transition-transform duration-300" style={{ color: muted, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }} />
                      </div>
                      <p className="mt-1 text-sm" style={{ color: muted }}>{stage.summary}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {stage.keyActivities.slice(0, 3).map((item) => (
                          <span key={item} className="rounded-full border px-2 py-1 text-[10px] font-medium" style={{ background: panelAlt, borderColor: border, color: text }}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-5 grid gap-4 border-t pt-4 md:grid-cols-2" style={{ borderColor: border }}>
                      <div className="rounded-2xl border p-3" style={{ background: panel, borderColor: border }}>
                        <div className="mb-3 flex items-center gap-2 text-sm font-bold" style={{ color: text }}>
                          <CheckCircle2 className="h-4 w-4" style={{ color: "#10B981" }} />
                          Key Activities
                        </div>
                        <ul className="space-y-2 text-sm" style={{ color: text }}>
                          {stage.keyActivities.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ background: "#3B82F6" }} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-2xl border p-3" style={{ background: panel, borderColor: border }}>
                        <div className="mb-3 flex items-center gap-2 text-sm font-bold" style={{ color: text }}>
                          <ArrowRight className="h-4 w-4" style={{ color: "#0EA5E9" }} />
                          Output
                        </div>
                        <ul className="space-y-2 text-sm" style={{ color: text }}>
                          {stage.outputs.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ background: "#14B8A6" }} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <aside className="rounded-[28px] border p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]" style={{ background: panel, borderColor: border }}>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(16,185,129,0.2))" }}>
              <BookOpen className="h-4 w-4" style={{ color: "#2563EB" }} />
            </div>
            <h3 className="text-lg font-bold">Mandatory Artefacts</h3>
          </div>

          <div className="space-y-2">
            {mandatoryArtefacts.map((item) => (
              <div key={item} className="rounded-xl border px-3 py-2.5 text-sm transition-colors hover:translate-x-1" style={{ background: dark ? "rgba(15,23,42,0.8)" : "#F8FAFC", borderColor: border, color: text }}>
                {item}
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border p-3" style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.08), rgba(16,185,129,0.06))", borderColor: border }}>
            <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: muted }}>Other Documents</div>
            <ul className="mt-3 space-y-2 text-sm" style={{ color: text }}>
              <li>Scope Creep trackers</li>
              <li>Cost Overrun / Time overrun</li>
              <li>KB articles</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}