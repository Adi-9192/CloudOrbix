import { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  LifeBuoy,
  ShieldCheck,
  X,
} from "lucide-react";

type HelpRole = "Admin" | "Manager" | "Account Manager" | "Viewer" | "Reader";

type HelpSupportProps = {
  dark: boolean;
  user: { roles: string[] };
};

type GuideSection = {
  title: string;
  steps: string[];
};

const guideByRole: Record<Exclude<HelpRole, "Viewer" | "Reader">, GuideSection[]> = {
  Admin: [
    {
      title: "Getting around",
      steps: [
        "Use Portfolio to browse service capabilities and Dashboard to review project, risk, and RFP views.",
        "Use Home, Dashboard, and RFP as direct navbar links; open Project Management for projects, framework, repository, Risk Register, and Excel Import.",
        "Use the clickable page directory below the navbar to return to a parent page.",
        "Use the profile menu for your profile and account actions. The theme button switches between light and dark appearance.",
      ],
    },
    {
      title: "Projects and project records",
      steps: [
        "Open Project Management → Projects, then choose Add Project to start the project wizard.",
        "Complete the project details, dates, services, resources, and other requested fields. Save the project when ready.",
        "Select a project name to open its details. Review project information, documents, tasks, updates, and risks from the project page.",
        "Use the project list export when you need a spreadsheet copy. Confirm the project and its ID before deleting; deletion is permanent.",
      ],
    },
    {
      title: "Dashboards",
      steps: [
        "Open the Dashboard navbar dropdown and choose Project Dashboard, Risk Dashboard, or RFP Dashboard.",
        "Use each dashboard's Group by control to change the breakdown, such as project status or region.",
        "Adjust the available period or year filters to review the corresponding metrics and activity.",
      ],
    },
    {
      title: "RFP and approvals",
      steps: [
        "Open RFP to prepare an estimate, enter project details, build resource plans, and save or submit the estimate.",
        "Review submitted RFP requests from Admin → Approvals. Approve or reject requests after checking their details.",
        "Maintain resource rate cards and currency exchange rates in RFP. Keep the selected year and rates aligned with the estimate.",
        "Export a saved estimate to Excel from its estimation page.",
      ],
    },
    {
      title: "Administration and audit",
      steps: [
        "Admin → Users manages accounts, roles, active status, and password reset actions.",
        "Use Roles and Permissions to review access and Approvals to process project and RFP requests.",
        "Audit Logs provides a record of tracked system activity. Use the filters and search controls to narrow the results.",
      ],
    },
    {
      title: "Framework, repository, and profile",
      steps: [
        "Project Framework contains the standard project structure and delivery guidance.",
        "Project Repository provides access to project documents. Open a project to view the documents available to you.",
        "My Profile shows your account information and associated projects. Use the profile password form to change your password.",
      ],
    },
  ],
  Manager: [
    {
      title: "Navigation and dashboard",
      steps: [
        "Use Portfolio for service capabilities and Dashboard for Project Dashboard, Risk Dashboard, and RFP Dashboard.",
        "Use the Project Management dropdown in the navbar for Project Framework, Projects, and Project Repository.",
        "Use the clickable page directory below the navbar to return to a parent page.",
        "Use Group by and the available period/year filters to focus dashboard summaries.",
      ],
    },
    {
      title: "Finding and opening projects",
      steps: [
        "Open Project Management → Projects and select a project to view its details.",
        "Project access is restricted. If a project page says access is denied, choose Request access; administrators will receive the request.",
        "After access is granted, reopen the project to view the information and documents available to your role.",
      ],
    },
    {
      title: "RFP estimates",
      steps: [
        "Open RFP to prepare an estimate and its resource plan.",
        "Save a draft to continue later, or submit the estimate for administrator approval.",
        "Use the RFP Dashboard to review estimates and adjust its grouping. Rate-card and exchange-rate administration is restricted to Admin users.",
      ],
    },
    {
      title: "Project Framework and profile",
      steps: [
        "Use Project Framework for the standard delivery structure and Project Repository for documents you are permitted to access.",
        "My Profile lists your associated projects. Select a project name to open it.",
        "Use the profile password form to change your password and the theme control to change appearance.",
      ],
    },
  ],
  "Account Manager": [
    {
      title: "Navigation and dashboard",
      steps: [
        "Use Portfolio to browse service capabilities and Dashboard to review project, risk, and RFP summaries.",
        "Use the Project Management dropdown in the navbar for Project Framework, Projects, and Project Repository.",
        "Use the clickable page directory below the navbar to return to a parent page.",
        "Use the Dashboard dropdown to select a dashboard, then use its grouping controls and available filters.",
      ],
    },
    {
      title: "Working with projects",
      steps: [
        "Open Project Management → Projects and use search, sorting, or pagination to find a project.",
        "Select the project name to open its detail page. Project actions and editable fields depend on your permissions.",
        "If a project is not accessible, ask an administrator to grant access. Managers can submit an access request from the denied project page.",
        "Use project details to review available updates, tasks, risks, and documents. Follow the required fields and validation messages when making permitted changes.",
      ],
    },
    {
      title: "Estimation and project resources",
      steps: [
        "Open RFP to prepare or review estimates available to your account.",
        "Save a draft when you need to continue later. Submit an estimate when it is ready for administrator review.",
        "Resource rate-card and currency-rate maintenance is available to Admin users only.",
      ],
    },
    {
      title: "Framework, repository, and profile",
      steps: [
        "Project Framework provides the standard delivery structure. Project Repository lists documents available to you.",
        "My Profile shows your account details and associated projects; select a project name to open it.",
        "Use the profile password form to change your password. Contact IT support if you cannot sign in.",
      ],
    },
  ],
};

const releaseNotes = [
  {
    title: "Project overview layout",
    detail:
      "Reordered the project overview sidebar to show Overall completion, Project updates, Alerts, Temporary access manager, and Mandatory documents. Increased project page text by 15%, made the project brief height content-driven, and moved Tasks directly below Project details.",
  },
  {
    title: "Risk and RFP dashboard typography",
    detail:
      "Increased text sizes by 20% in the Risk dashboard cards and RFP overview.",
  },
  {
    title: "Dashboard typography and grouping",
    detail:
      "Increased text size by 20% in the Project overview and Active project completion sections. The Project pie chart can now be grouped by Status or Region only.",
  },
  {
    title: "Dashboard chart sizing",
    detail:
      "Increased the Project and RFP dashboard pie charts by 25% and slightly reduced the dashboard's top padding.",
  },
  {
    title: "Service offering header",
    detail:
      "Placed Cloud Professional Services above the Service Offering label on the landing page and reduced the header's top padding.",
  },
  {
    title: "Daily update import",
    detail:
      "Project Daily Updates can be imported from pasted dated notes or an Excel workbook. Review parsed updates before saving; recognized dates, including dates without a year using the selected year, are stored as each update's timestamp.",
  },
  {
    title: "Excel import validation review",
    detail:
      "The review shows how many rows are ready, saved, or still need review. Validation failures stay in the table with row-level issues and inline corrections; accepted duplicates and corrected rows still require confirmation. Only rows with an explicit server save result are removed. Invalid workbooks appear as rejectable file-level failures, and project table headers are detected below report summaries.",
  },
  {
    title: "Project statuses and phases",
    detail: "Projects now use seven canonical statuses and a Phase dropdown. Excel imports normalize status and phase variants, and Project Type has been removed from active project and RFP screens.",
  },
  {
    title: "Active project completion chart",
    detail:
      "The Project Dashboard includes one completion-progress bar per approved active project. It follows the selected project year, updates as the active project list changes, and excludes completed, cancelled, and 100%-complete projects.",
  },
  {
    title: "Dashboard project totals",
    detail:
      "Cancelled and canceled projects are excluded from dashboard totals and breakdowns. Completed project counts are based only on project status, matching the chart.",
  },
  {
    title: "Project task table columns",
    detail:
      "Expanded the Project Tasks table to show task title, assignee, planned and actual start/end dates, progress, one status column, and remarks. Task dates and remarks continue to use existing database fields; task Excel imports accept the new column labels and legacy date labels.",
  },
  {
    title: "Project and RFP copy protection",
    detail:
      "Disabled text selection, copying, cutting, and dragging for project listings, project details, and RFP-page content across roles. Editable fields remain available for normal text entry and pasting; page routes and navigation are unchanged.",
  },
  {
    title: "Project page readability",
    detail:
      "Increased project-page typography by 10%, gave the project brief a one-inch minimum height that grows with its content, and renamed Priority tasks to Tasks.",
  },
  {
    title: "Temporary project manager access",
    detail:
      "Assigned project managers can request temporary access for another project manager with a reason for administrator approval. Administrators can grant access immediately, review requests, and project managers or administrators can revoke access.",
  },
  {
    title: "Projects table readability",
    detail:
      "Increased the Projects table typography and cell spacing by 25%, made the full header row bold, and updated clickable project names to use theme-appropriate Portfolio colors.",
  },
  {
    title: "Project Dashboard layout",
    detail:
      "Applied consistent enlarged typography and themed metric cards across the Project, Risk, and RFP dashboards. Project and RFP views use side-by-side charts and overviews with compact color-coded legends, while existing metric and revenue content is preserved.",
  },
  {
    title: "INR project revenue display",
    detail:
      "Project revenue, recovered revenue, and pending revenue are displayed in INR using the saved exchange rate for the project year.",
  },
  {
    title: "RFP lumpsum amount entry",
    detail:
      "Renamed the RFP estimation method option from Direct entry to Lumpsum amount. It continues to support projects with a total budget and duration without requiring resource allocations. Existing monthly and daily resource planning remains available.",
  },
  {
    title: "RFP estimate register readability",
    detail:
      "Increased the estimate register table font size by 25% and styled both account names in bold blue, with brighter blue text in dark mode.",
  },
  {
    title: "Project overview and scope",
    detail:
      "Moved each project’s Overview, In Scope, Out of Scope, and Assumptions section to the bottom of its project page and stacked the fields in one column. Reordered project page sections to show Project Details, Daily Updates, Project Summary, Task Manager, Task Manager Import, Risk Details, and then RFP Overview & Scope.",
  },
  {
    title: "Navigation and dashboard options",
    detail:
      "Separated Home, Dashboard, and RFP as direct navbar links. Moved Risk Register into Project Management, matched the Dashboard dropdown to its menu style, made the CloudOrbix logo navigate Home, and removed the standalone Reports page.",
  },
  {
    title: "Navbar and page directory",
    detail:
      "Replaced the sidebar with role-aware dropdowns in the top navbar, removed global search from the navbar, and added clickable page-directory breadcrumbs below it.",
  },
  {
    title: "Portfolio service popups",
    detail:
      "Portfolio at-a-glance cards have service titles increased by 25%. Their popups show the matching service image and title, its definition as a subtitle, and all core capabilities, with the capability text matched to the subtitle size, a blue accent bar, and reduced top padding. Removed the separate collapsible service list from the page.",
  },
  {
    title: "Home navigation",
    detail:
      "Renamed the Portfolio navigation entry to Home for all roles; it continues to open the existing Portfolio page.",
  },
  {
    title: "Projects navigation",
    detail:
      "Renamed the Projects page route so project navigation and global search use #projects. Older saved links continue to redirect to Projects.",
  },
  {
    title: "Document and spreadsheet downloads",
    detail:
      "Removed the Admin document library and spreadsheet downloads. Existing files in Azure storage were not deleted.",
  },
  {
    title: "Help Center improvements",
    detail:
      "Added role-specific user guides, Git-history-based pre-release notes, and a single-open FAQ accordion with independent card heights and clearer spacing.",
  },
  {
    title: "Portfolio experience",
    detail:
      "Expanded the Portfolio page with a full-width overview, reduced the title sizes, reordered service cards and detail popups, and removed service card taglines.",
  },
  {
    title: "Dashboard updates",
    detail:
      "Added separate Project, Risk, and RFP dashboard views, with grouping controls for project and RFP summaries.",
  },
  {
    title: "RFP estimation",
    detail:
      "Extended estimation workflows with project details, resource plans, yearly rate data, currency conversion, and spreadsheet export.",
  },
  {
    title: "Project and profile workflows",
    detail:
      "Improved project access and approval flows, added revenue recovery percentage tracking with calculated recovered and pending amounts, and enhanced project navigation and administration.",
  },
];

const faqs = [
  {
    question: "How do I find a project?",
    answer:
      "Open Project Management → Projects. Use the search, sorting, and pagination controls, then select the project name to open its details.",
  },
  {
    question: "Why can't I open a project?",
    answer:
      "Project access is limited by role and project assignment. Managers can choose Request access on the access-denied page. Otherwise, contact an administrator.",
  },
  {
    question: "How do I create or update a project?",
    answer:
      "Project creation is available to administrators from Projects → Add Project. Project updates depend on your role and access to that project.",
  },
  {
    question: "How do I submit an RFP estimate?",
    answer:
      "Open RFP, complete the estimate and resource plan, then choose Submit for approval. You can save a draft before submitting.",
  },
  {
    question: "Where can I review risks and project progress?",
    answer:
      "Use the Risk Dashboard for portfolio-level risk summaries. Open an accessible project to review its project-specific progress, updates, and risks.",
  },
  {
    question: "Who can manage users, access requests, and rates?",
    answer:
      "Those administration actions are available to Admin users. Ask an administrator if your account needs a role or permission change.",
  },
  {
    question: "How do I change my password or appearance?",
    answer:
      "Open the profile menu to access My Profile and the password form. Use the theme control in the top bar to switch appearance.",
  },
  {
    question: "Where can I get more help?",
    answer:
      "Contact IT Support using the support information on this page. Include the project ID and a short description of the issue when relevant.",
  },
];

export default function HelpSupport({ dark, user }: HelpSupportProps) {
  const [dialog, setDialog] = useState<"guide" | "release" | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const roles = user.roles;
  const selectedRole: HelpRole = roles.includes("Admin")
    ? "Admin"
    : roles.includes("Manager")
      ? "Manager"
      : roles.includes("Account Manager")
        ? "Account Manager"
        : roles.includes("Viewer")
          ? "Viewer"
          : "Reader";
  const guideAvailable =
    selectedRole !== "Viewer" && selectedRole !== "Reader";
  const colors = {
    bg: dark ? "#0F172A" : "#F1F5F9",
    card: dark ? "#1E293B" : "#FFFFFF",
    subtle: dark ? "#0B1220" : "#F8FAFC",
    border: dark ? "#334155" : "#E2E8F0",
    text: dark ? "#E2E8F0" : "#0F172A",
    muted: dark ? "#94A3B8" : "#64748B",
  };
  const sections = guideAvailable
    ? guideByRole[selectedRole as keyof typeof guideByRole]
    : [];

  useEffect(() => {
    if (!dialog) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialog(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [dialog]);

  return (
    <div
      className="min-h-full space-y-6 p-5 text-[var(--help-text)] md:p-8"
      style={{ color: colors.text }}
    >
      <header className="flex flex-col gap-2 border-b pb-5 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: colors.border }}>
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: colors.border, color: colors.muted }}>
            <LifeBuoy className="h-3.5 w-3.5 text-blue-500" />
            Help Center
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">How can we help?</h1>
          <p className="mt-1 text-sm" style={{ color: colors.muted }}>
            Guides, release updates, and answers for your CloudOrbix workspace.
          </p>
        </div>
        {guideAvailable && (
          <span className="w-fit rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: colors.border, color: colors.muted }}>
            Guide for {selectedRole}
          </span>
        )}
      </header>

      <section aria-label="Help resources" className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border p-5 md:p-6" style={{ background: colors.card, borderColor: colors.border }}>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <h2 className="font-semibold">IT Support</h2>
          <p className="mt-1 text-sm" style={{ color: colors.muted }}>
            For sign-in help or a technical issue, contact the support team.
          </p>
          <a className="mt-4 inline-block text-sm font-semibold text-blue-500 hover:underline" href="mailto:it-support@enterprise.com">
            it-support@enterprise.com
          </a>
        </article>

        {guideAvailable ? (
          <button
            type="button"
            onClick={() => setDialog("guide")}
            className="group rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-lg md:p-6"
            style={{ background: colors.card, borderColor: colors.border }}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
              <BookOpen className="h-5 w-5" />
            </div>
            <h2 className="font-semibold">User Guide</h2>
            <p className="mt-1 text-sm" style={{ color: colors.muted }}>
              Step-by-step instructions tailored to your {selectedRole} role.
            </p>
            <span className="mt-4 inline-block text-sm font-semibold text-indigo-500 group-hover:underline">
              Open your guide
            </span>
          </button>
        ) : (
          <article className="rounded-2xl border p-5 md:p-6" style={{ background: colors.card, borderColor: colors.border }}>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500">
              <BookOpen className="h-5 w-5" />
            </div>
            <h2 className="font-semibold">User Guide</h2>
            <p className="mt-1 text-sm" style={{ color: colors.muted }}>
              A user guide is not available for the {selectedRole} role.
            </p>
          </article>
        )}

        <button
          type="button"
          onClick={() => setDialog("release")}
          className="group rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-lg md:p-6"
          style={{ background: colors.card, borderColor: colors.border }}
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <ClipboardList className="h-5 w-5" />
          </div>
          <h2 className="font-semibold">Release Notes</h2>
          <p className="mt-1 text-sm" style={{ color: colors.muted }}>
            Version 0.9.0 · October 2026
          </p>
          <span className="mt-4 inline-block text-sm font-semibold text-emerald-600 group-hover:underline">
            See what’s new
          </span>
        </button>
      </section>

      <section className="rounded-2xl border p-5 md:p-7" style={{ background: colors.card, borderColor: colors.border }}>
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-2 text-blue-500">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">Quick answers</span>
          </div>
          <h2 className="text-lg font-bold">Frequently asked questions</h2>
          <p className="mt-1 text-sm" style={{ color: colors.muted }}>
            Guidance for common project, access, and account questions.
          </p>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {faqs.map((faq) => (
            <article
              key={faq.question}
              className={`group self-start rounded-xl border px-3 py-2 transition-colors ${openFaq === faq.question ? "border-blue-400/60" : ""}`}
              style={{ background: colors.subtle, borderColor: openFaq === faq.question ? "#60A5FA" : colors.border }}
            >
              <button
                type="button"
                aria-expanded={openFaq === faq.question}
                onClick={() =>
                  setOpenFaq((current) =>
                    current === faq.question ? null : faq.question,
                  )
                }
                className="flex w-full cursor-pointer items-center justify-between gap-4 text-left text-sm font-semibold"
              >
                {faq.question}
                <ChevronDown className={`h-4 w-4 shrink-0 text-blue-500 transition-transform ${openFaq === faq.question ? "rotate-180" : ""}`} />
              </button>
              {openFaq === faq.question && (
                <p className="mt-3 pr-6 text-sm leading-6" style={{ color: colors.muted }}>
                  {faq.answer}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      {dialog && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDialog(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-dialog-title"
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
            style={{ background: colors.card, borderColor: colors.border }}
          >
            <header className="flex items-start justify-between gap-4 border-b p-5 md:p-6" style={{ borderColor: colors.border }}>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-500">
                  {dialog === "guide" ? `${selectedRole} documentation` : "Product updates"}
                </p>
                <h2 id="help-dialog-title" className="mt-1 text-xl font-bold">
                  {dialog === "guide" ? `${selectedRole} User Guide` : "Release Notes · 0.9.0"}
                </h2>
                <p className="mt-1 text-sm" style={{ color: colors.muted }}>
                  {dialog === "guide"
                    ? "A practical walkthrough of the pages and actions available to your role."
                    : "A summary of changes reflected in the recent project history."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDialog(null)}
                aria-label="Close dialog"
                className="rounded-lg border p-2 transition hover:border-blue-400"
                style={{ borderColor: colors.border, color: colors.muted }}
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="overflow-y-auto p-5 md:p-6">
              {dialog === "guide" ? (
                <div className="space-y-4">
                  {sections.map((section, index) => (
                    <article key={section.title} className="rounded-xl border p-4 md:p-5" style={{ background: colors.subtle, borderColor: colors.border }}>
                      <div className="mb-3 flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-bold text-blue-500">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <h3 className="font-semibold">{section.title}</h3>
                      </div>
                      <ul className="space-y-2.5">
                        {section.steps.map((step) => (
                          <li key={step} className="flex gap-2.5 text-sm leading-6" style={{ color: colors.muted }}>
                            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border p-4" style={{ background: colors.subtle, borderColor: colors.border }}>
                    <div>
                      <p className="text-sm font-bold">CloudOrbix 0.9.0</p>
                      <p className="mt-1 text-xs" style={{ color: colors.muted }}>Pre-release · October 2026</p>
                    </div>
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">
                      Before 1.0
                    </span>
                  </div>
                  {releaseNotes.map((note) => (
                    <article key={note.title} className="rounded-xl border p-4" style={{ background: colors.subtle, borderColor: colors.border }}>
                      <h3 className="font-semibold">{note.title}</h3>
                      <p className="mt-1 text-sm leading-6" style={{ color: colors.muted }}>{note.detail}</p>
                    </article>
                  ))}
                  <p className="text-xs leading-5" style={{ color: colors.muted }}>
                    Notes are summarized from the recent Git history and describe features delivered in this pre-1.0 build.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
