import { useEffect, useRef, useState, type CSSProperties } from "react";

export interface Service {
  index: string;
  title: string;
  tagline: string;
  creating: string;
  capabilities: string[];
  capabilityGroups?: { title: string; items: string[] }[];
  image: string;
}

export const DEFAULT_SERVICES: Service[] = [
  {
    index: "01",
    title: "Cloud Infrastructure Architecture and Modernization",
    tagline: "Secure, scalable, and policy aligned multi-cloud foundations",
    creating: "End-to-end design, assessment, modernization, and implementation of cloud platforms aligned with enterprise governance, security, compliance, and target operating model requirements.",
    capabilities: [
    "Cloud Foundation - Design secure, policy-aligned landing zone architectures across Azure Landing Zones and Sovereign Landing Zones (SLZ), AWS Control Tower, GCP, and OCI environments.",
    "Deployment of enterprise-scale landing zones aligned with the Microsoft Cloud Adoption Framework (CAF).",
    "Custom Landing Zone design and implementation for single-region and multi-region cloud environments.",
    "Capacity planning and optimization assessments, including resource utilization analysis and future demand forecasting based on vendor-specific regional availability.",
    "Strategic vendor engagement for cloud region enablement, expansion planning, and large-scale transformation initiatives.",
    "Design and implementation of Virtual Network (VNet) peering, route tables, and firewall strategies.",
    "Design and implementation of Hub-and-Spoke, multi-region, and hybrid-cloud network connectivity architectures.",
    "Multi-Cloud Integration - Design and implement integrated Azure, AWS, GCP, OCI, and hybrid-cloud architectures.",
    "AI Platform Architecture - Design and implement enterprise AI platform architectures using Azure AI Foundry, Amazon Bedrock, and Google Vertex AI, enabling secure and scalable AI adoption.",
    "Disaster Recovery Architecture - Design multi-region high-availability and disaster recovery architectures across Azure, AWS, GCP, and OCI environments.",
    "DevOps Platform Build - Design and implement CI/CD, repository, and artifact management platforms across multi-cloud environments.",
    "Azure Virtual Desktop (AVD) - Design and deploy secure virtual desktop infrastructure with Entra ID, FSLogix, autoscaling, application delivery, and hybrid workforce enablement.",
    "File Services Modernization - Design and implement hybrid file storage, synchronization, cloud tiering, and DFS modernization using Azure File Sync and Azure Files."
],
    image: "/portfolio/1.png",
  },
  {
    index: "02",
    title: "DevOps, Platform Engineering & Infrastructure as Code",
    tagline: "Standardize, secure, and accelerate cloud adoption through DevOps, platform engineering, and Infrastructure as Code.",
    creating: "Enable scalable, policy-aligned, and automated cloud platforms through modern DevOps practices, Infrastructure as Code (IaC), and platform engineering frameworks.",
    capabilities: [
    "Cloud Foundation Automation - Design and automate deployment of Azure Landing Zones, AWS Control Tower, and Google Cloud foundations using Infrastructure as Code.",
    "Infrastructure as Code (IaC) - Implement Terraform, Azure Bicep, CloudFormation and cloud-native IaC frameworks using reusable modules and version-controlled configurations.",
    "CI/CD Platform Engineering - Design and implement enterprise-grade CI/CD platforms using Azure DevOps, GitHub Actions, GitLab, AWS CodePipeline, and Google Cloud Build.",
    "Platform Engineering Automation - Implement self-service platforms, standardized delivery frameworks and reusable engineering patterns.",
    "Build & Release Automation - Design and implement automated provisioning, environment promotion, deployment orchestration, and release management frameworks across multi-cloud environments.",
    "IaC Validation & Testing Framework - Implement automated validation, security, compliance and deployment testing for Infrastructure as Code configurations and cloud platforms.",
    "Cloud Platform Automation - Design and implement automation frameworks for infrastructure provisioning, platform lifecycle management, operational resilience, and self-healing cloud capabilities across multi-cloud environments.",
    "AIOps & Observability Engineering - Design and implement AIOps and observability frameworks leveraging intelligent analytics, event correlation, automation, and predictive insights to enhance platform reliability and operational resilience.",
    "Governance & Compliance Automation - Design and implement Policy as Code frameworks, automated governance controls, compliance validation mechanisms, and audit-ready cloud platforms aligned with enterprise security and regulatory requirements."
],
    image: "/portfolio/2.png",
  },
  {
    index: "03",
    title: "Consultancy & Transformation Services",
    tagline: "Strategy, modernization and operating-model transformation",
    creating: "Strategic consulting that optimizes technology investment, strengthens governance and accelerates business outcomes.",
    capabilities: [
  "Cloud Strategy Assessment: Define cloud adoption strategies, target-state architectures, and transformation roadmaps.",
  "Infrastructure Modernization: Transform legacy infrastructure into scalable, cloud-ready platforms.",
  "Platform Engineering Advisory: Assess platform maturity and establish target operating models.",
  "Cloud Governance Consulting: Establish policies, standards, guardrails, and compliance frameworks.",
  "Technology Due Diligence: Assess technology landscapes for mergers, acquisitions, and investment decisions.",
  "Platform Engineering Transformation: Design and implement self-service developer platforms."
],
    image: "/portfolio/3.png",
  },
  {
    index: "04",
    title: "Cloud-Native Observability Solutions",
    tagline: "• Azure Monitor • Amazon CloudWatch • Google Cloud Monitoring",
    creating: "Design and implementation of cloud-native observability architectures using Infrastructure as Code (Terraform), enabling end-to-end visibility, resilience, reliability, and data-driven operations across cloud, hybrid, and enterprise environments.",
    capabilities:  [
    "Infrastructure Observability - Design monitoring architectures for virtual machines, infrastructure services, and VM Scale Sets.",
    "Platform Observability - Design observability frameworks for databases, storage platforms, snapshots, application services, and cloud-native resources.",
    "Hybrid & Edge Observability - Implement observability architectures for Azure Local, Resource Bridge, and hybrid infrastructure environments.",
    "Enterprise Application Observability - Design monitoring and telemetry strategies for Active Directory, DNS, DHCP, MABS, SQL Server, SAP, and Windows clusters.",
    "Digital Workspace Observability - Design observability solutions for Azure Virtual Desktop environments and end-user experience monitoring.",
    "Identity & Access Observability - Design and implement identity observability frameworks for Entra ID enterprise applications, application registrations, certificates, and service principals.",
    "Observability Engineering - Design alerting frameworks, telemetry standards, dashboard architectures, and event correlation models aligned with enterprise operating requirements.",
    "Platform Integration - Design and implement integrations between observability, ITSM, and automation platforms to enhance visibility, governance, and service reliability.",
    "Service Reliability Analytics - Design executive dashboards, service health metrics, and reliability reporting frameworks that support data-driven operational decision-making."
],
    image: "/portfolio/4.png",
  },
  {
    index: "05",
    title: "Middleware, Integration & Application Modernization Services",
    tagline: " • Integration Architecture • Application modernization • Enterprise connectivity",
    creating: "Design, modernization, and implementation of enterprise middleware, application runtime, and integration platforms across cloud, hybrid, and on-premises environments, enabling application modernization, seamless data exchange, and business process transformation.",
    capabilities: [
    ],
    capabilityGroups: [
      {
        title: "Web & Application Platform Architecture",
        items: [
    "Design and modernize web and application platform architectures for cloud, hybrid, and containerized environments.",
    "Architect application delivery, traffic management, reverse proxy, and security frameworks.",
    "Design scalable, resilient, and highly available application hosting platforms.",
    "Reference Technologies: Apache HTTP Server, NGINX, IIS, IBM HTTP Server, Tomcat, JBoss EAP, WildFly, WebLogic, and WebSphere."
],
      },
      {
        title: "Application Modernization",
        items: [
    "Assess Java, .NET, and enterprise application runtime environments.",
    "Define target-state architectures and modernization roadmaps.",
    "Modernise workloads across virtual machines, managed application services and containers.",
    "Enable scalability, resilience, portability, and platform engineering automation.",
    "Reference Platforms: Azure App Service, AKS, Amazon EKS and Google Kubernetes Engine."
],
      },
      {
        title: "Enterprise Integration, Data Transformation & Automation",
        items: [
    "Application and system integration across hybrid estates",
    "Data transformation, ETL and batch workflow automation",
    "Secure internal and external file transfer",
    "Enterprise data exchange and process automation",
    "webMethods, TIBCO, DataStage and Serv-U SFTP"
]
      },
    ],

    image: "/portfolio/5.png",
  },
  {
    index: "06",
    title: "Database Transformation & Architecture Services",
    tagline: " • Database Modernization • Data Platform Architecture • Cloud Database Transformation",
    creating: "Design, modernization, and transformation of enterprise database platforms across Microsoft SQL Server, Azure SQL Database, Azure SQL Managed Instance, MySQL, PostgreSQL, Maria DB, Oracle Database, Amazon RDS, and hybrid cloud environments, enabling scalable, secure, and resilient data platforms.",
    capabilities: [
    "Database Strategy & Advisory - Define database strategies, target-state architectures, and transformation roadmaps aligned with business and technology objectives.",
    "Database Modernization - Assess and modernize SQL Server, Oracle, MySQL, and legacy database estates through cloud adoption and platform transformation initiatives.",
    "Database Architecture & Platform Design - Design scalable, resilient, and highly available database architectures across cloud, hybrid, and multi-cloud environments.",
    "Database Migration & Consolidation - Design and execute database migration, consolidation, and modernization programs across on-premises and cloud platforms.",
    "Cloud Database Transformation - Modernize database workloads using Azure SQL Database, Azure SQL Managed Instance, Amazon RDS, and cloud-native database services.",
    "High Availability & Disaster Recovery Architecture - Design database resilience, high availability, backup, and disaster recovery architectures aligned with business continuity objectives.",
    "Database Performance & Optimization - Assess database performance, workload patterns, resource utilization, and optimization opportunities to improve scalability and efficiency.",
    "Security & Compliance Architecture - Design database security architectures encompassing encryption, identity integration, privileged access controls, compliance, and governance frameworks.",
    "Database Automation & Platform Engineering - Design automated database provisioning, deployment, patch governance, configuration management, and Infrastructure-as-Code frameworks.",
    "Database Observability & Reliability Engineering - Design database observability, telemetry, monitoring, and reliability frameworks that support proactive performance management and operational resilience.",
    "Database Cost Optimization - Assess database consumption, licensing, storage, and infrastructure utilization to optimize cloud and platform investment.",
    "Database Technology Assessment & Rationalization - Assess SQL Server, Oracle, MySQL, Azure SQL, Azure SQL Managed Instance, and Amazon RDS estates to establish future-state architectures and platform rationalization strategies."
],
    image: "/portfolio/6.png",
  },
{
    index: "07",
    title: "Backup, Recovery & Resilience Transformation Services",
    tagline: " • Data Protection • Disaster Recovery",
    creating: "Design, modernization, and transformation of enterprise backup, recovery, and cyber resilience capabilities across cloud, hybrid, and on-premises environments",
    capabilities: [
    "Data Protection Strategy & Advisory - Define enterprise backup, retention, archival, and recovery strategies aligned with business and regulatory requirements.",
    "Backup Platform Modernization - Assess, rationalize, and modernize backup platforms across cloud, hybrid, and on-premises environments.",
    "Disaster Recovery Architecture - Design recovery architectures, failover strategies, and resilience frameworks aligned with RTO and RPO objectives.",
    "Cloud Backup Transformation - Design cloud-native data protection architectures across Azure, AWS, and Google Cloud environments.",
    "Hybrid Data Protection - Design integrated backup and recovery architectures spanning on-premises, hybrid, and multi-cloud estates.",
    "Recovery Readiness & Resilience - Establish recovery testing, validation, and resilience assessment frameworks to improve recovery confidence.",
    "Backup Governance & Compliance - Define backup governance models, retention policies, compliance controls, and audit-ready frameworks.",
    "Backup Automation & Platform Engineering - Design automated backup, recovery, and policy management frameworks using platform engineering principles.",
    "Technology Assessment & Rationalization - Assess and optimize NetWorker, Commvault, Rubrik, Veeam, and other backup platforms to establish future-state architectures.",
    "Business Continuity Integration - Align backup and recovery capabilities with enterprise business continuity and operational resilience strategies.",
    "Backup Migration & Consolidation - Design and execute migrations, consolidations, and modernization initiatives across backup platforms.",
    "Cost Optimization & Licensing Advisory - Assess backup consumption, licensing models, and infrastructure dependencies to optimize cost and efficiency.",
    "Recovery Vault & Air-Gapped Architecture - Design secure recovery vaults, isolated recovery environments, and air-gapped data protection architectures."
],
    image: "/portfolio/7.png",
},
{
    index: "08",
    title: "Azure Arc Architecture & Transformation Services",
    tagline: "Hybrid and multi-cloud governance, automation, and platform modernization",
    creating: "Design and implementation of Azure Arc-enabled architectures that unify governance, security, automation, observability, and compliance across on-premises, Azure, AWS, Google Cloud, and edge environments.",
    capabilities: [
    "Hybrid & Multi-Cloud Architecture - Design Azure Arc architectures that provide a consistent operating model across cloud, on-premises, and edge platforms.",
    "Governance & Operating Model Design - Establish governance frameworks, resource management standards, lifecycle policies, and enterprise operating models.",
    "Kubernetes Platform Enablement - Design and implement governance, GitOps, policy management, and platform engineering frameworks for AKS, EKS, GKE, OpenShift, and on-premises Kubernetes environments.",
    "SQL Platform Modernization - Assess and modernize SQL Server estates through Azure Arc-enabled inventory, dependency analysis, licensing optimization, security assessments, and migration planning.",
    "VMware Modernization & Hybrid Enablement - Design Azure Arc-enabled architectures for VMware environments to support hybrid-cloud transformation, platform modernization, and operational consistency.",
    "Governance & Policy Automation - Design and implement tagging, policy-as-code, compliance, and configuration governance frameworks aligned with enterprise requirements.",
    "Security & Compliance Architecture - Design security posture management, vulnerability assessment, and cloud security governance frameworks using Microsoft Defender for Cloud.",
    "Observability Architecture - Design and implement monitoring, telemetry, logging, and observability architectures using Azure Monitor, Log Analytics, and Managed Grafana.",
    "Automation & Platform Engineering - Design automation frameworks leveraging GitOps, Desired State Configuration, change automation, and infrastructure lifecycle orchestration.",
    "Operational Resilience & Compliance - Design patch governance, compliance validation, and platform resilience frameworks that support enterprise security and regulatory objectives."
],
    image: "/portfolio/8.png",

},
];

const portfolioAtAGlance = [
  {
    title: "Cloud Infrastructure Architecture",
    description: "Expertise in designing, modernizing, and automating secure multi-cloud platforms across Azure, AWS, Google Cloud, and OCI, encompassing landing zones, hybrid connectivity, capacity planning, AI platforms (Azure AI Foundry, Amazon Bedrock, Google Vertex AI), DevOps, Azure Virtual Desktop, and hybrid file services.",
  },
  {
    title: "Consultancy & Transformation Services",
    description: "Expertise in cloud strategies, target architectures, transformation roadmaps, modernized infrastructure, platform operating models, governance frameworks, technology due diligence for mergers and acquisitions, and self-service developer platforms.",
  },
  {
    title: "Cloud-Native Observability Solutions",
    description: "Expertise in designing and implementing cloud-native observability platforms through Infrastructure as Code using Terraform, enabling end-to-end visibility across infrastructure, databases, storage, application services, Azure Local resources, and enterprise applications. Capabilities include observability architecture, monitoring strategy, dashboard design, alerting frameworks, service reliability models, and ITSM integration across cloud and hybrid environments.",
  },
  {
    title: "Middleware & Integration Services",
    description: "Expertise in defining middleware strategies, designing integration architectures, and modernizing enterprise integration platforms across cloud, hybrid, and on-premises environments. Capabilities include API and integration architecture, application modernization, event-driven and microservices enablement, data transformation, ETL modernization, workflow automation, secure data exchange, and hybrid enterprise integration using technologies such as webMethods, TIBCO, IBM InfoSphere DataStage, and Serv-U SFTP.",
  },
  {
    title: "Database Capabilities - Database Transformation & Architecture Services",
    description: "Expertise in advising, designing, and transforming enterprise database platforms across SQL Server, MySQL, PostgreSQL, and Oracle Database environments. Services encompass database strategy, architecture assessments, cloud adoption planning, modernization and consolidation initiatives, performance and cost optimization, and governance framework design, and technology transformation roadmaps that enable scalable, resilient, and future-ready data platforms.",
  },
  {
    title: "Backup, Recovery & Resilience Transformation Services",
    description: "Expertise in advising, architecting, and modernizing enterprise data protection and recovery capabilities across cloud, hybrid, and third-party platforms. Services include data protection strategy, recovery architecture, disaster recovery planning, business continuity enablement, backup modernization, governance framework design, and resilience assessments to support secure and reliable technology transformation.",
  },
  {
    title: "Azure Arc Architecture & Transformation Services",
    description: "Expertise in advising, architecting, and implementing Azure Arc solutions to unify governance, automation, and operations across hybrid, multi-cloud, and edge environments. Services include platform assessments, target-state architecture design, governance framework implementation, GitOps and automation strategies, observability architecture, and modernization roadmaps that enable scalable and resilient enterprise platforms.",
  },
  {
    title: "DevOps, Platform Engineering & Infrastructure as Code Transformations",
    description: "Expertise in designing and transforming enterprise DevOps and platform engineering capabilities through automated CI/CD, Infrastructure as Code, GitOps, and Internal Developer Platforms, enabling standardized cloud provisioning, policy-driven governance, secure software delivery, developer self-service, and scalable operations across multi-cloud and hybrid environments." ,
  },
] as const;

const portfolioAtAGlanceOrder = new Map([
  ["Consultancy & Transformation Services", 0],
  ["Cloud Infrastructure Architecture", 1],
  ["DevOps, Platform Engineering & Infrastructure as Code Transformations", 2],
  ["Cloud-Native Observability Solutions", 3],
  ["Azure Arc Architecture & Transformation Services", 4],
  ["Database Capabilities - Database Transformation & Architecture Services", 5],
  ["Backup, Recovery & Resilience Transformation Services", 6],
  ["Middleware & Integration Services", 7],
]);

const serviceOrder = new Map([
  ["03", 0],
  ["01", 1],
  ["02", 2],
  ["04", 3],
  ["08", 4],
  ["06", 5],
  ["07", 6],
  ["05", 7],
]);

const portfolioAtAGlanceIntro = "Cloud and enterprise technology services are presented across architecture, transformation, observability, security, middleware, databases, backup, and hybrid-cloud management. The portfolio emphasizes governed, automated, secure, and highly available environments spanning Azure, AWS, Google Cloud Platform, Oracle Cloud Infrastructure, on-premises systems, and edge infrastructure.";

export interface PortfolioProps {
  dark?: boolean;
  services?: Service[];
  heading?: string;
  hideHeader?: boolean;
  hideFooter?: boolean;
  className?: string;
}

export default function Portfolio({
  dark = false,
  services = DEFAULT_SERVICES,
  heading = "CIS Professional Services - Portfolio",
  hideHeader = false,
  hideFooter = false,
  className = "",
}: PortfolioProps) {
  const [active, setActive] = useState<number | null>(null);
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState<number | null>(null);
  const orderedPortfolioAtAGlance = [...portfolioAtAGlance].sort(
    (a, b) =>
      (portfolioAtAGlanceOrder.get(a.title) ?? Number.MAX_SAFE_INTEGER) -
      (portfolioAtAGlanceOrder.get(b.title) ?? Number.MAX_SAFE_INTEGER),
  );
  const orderedServices = [...services].sort(
    (a, b) =>
      (serviceOrder.get(a.index) ?? Number.MAX_SAFE_INTEGER) -
      (serviceOrder.get(b.index) ?? Number.MAX_SAFE_INTEGER),
  );

  useEffect(() => {
    if (selectedPortfolioItem === null) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPortfolioItem(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      previouslyFocused?.focus();
    };
  }, [selectedPortfolioItem]);

  return (
    <div data-theme={dark ? "dark" : undefined} className={`portfolio-page min-h-screen w-full bg-[var(--portfolio-bg)] text-[var(--portfolio-ink)] ${className}`} style={{ fontFamily: "var(--font-sans, 'Inter', system-ui, sans-serif)" }}>

      {!hideHeader && (
        <header className="px-8 md:px-16 pt-12 pb-8 flex items-start justify-between border-b border-[var(--portfolio-border)] bg-[var(--portfolio-card)]">
          <div>
            <span className="mono" style={{ fontSize: "20px", letterSpacing: "0.18em", color: "var(--portfolio-accent)", textTransform: "uppercase" }}>
              PORTFOLIO
            </span>
            <h1 style={{ fontSize: "clamp(1.65rem, 3.75vw, 3rem)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", color: "var(--portfolio-ink)", marginTop: "0.4rem" }}>
              {heading === "CIS Professional Services - Portfolio" ? (
                <>CIS{" "}<span className="text-[var(--portfolio-primary)]">Professional Services</span></>
              ) : heading}
            </h1>
          </div>
        </header>
      )}

      <section
        aria-label="Portfolio overview"
        className="relative overflow-hidden border-b border-[var(--portfolio-border)] bg-[var(--portfolio-card)] px-4 py-9 md:px-8 md:py-12 lg:px-16 lg:py-14"
      >
        <div className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-[var(--portfolio-primary-light)] opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-[var(--portfolio-primary-light)] opacity-30 blur-3xl" />

        <div className="relative mx-auto max-w-none">
          <p className="w-full text-sm font-medium leading-6 text-[var(--portfolio-body)] md:text-base md:leading-7">
            {portfolioAtAGlanceIntro}
          </p>

          <div className="mt-7 overflow-hidden rounded-2xl border border-[var(--portfolio-border)] bg-[var(--portfolio-border)] shadow-lg">
            <div className="h-1 bg-[var(--portfolio-accent)]" />
            <div className="grid gap-px bg-[var(--portfolio-border)] md:grid-cols-2">
              {orderedPortfolioAtAGlance.map((item) => {
                const itemIndex = portfolioAtAGlance.indexOf(item);
                return (
                  <article
                    key={item.title}
                    className="group relative bg-[var(--portfolio-card)] transition-colors duration-300 hover:bg-[var(--portfolio-panel)]"
                  >
                    <div className="absolute bottom-0 left-0 top-0 w-1 origin-y scale-y-0 bg-[var(--portfolio-accent)] transition-transform duration-300 group-hover:scale-y-100 group-focus-within:scale-y-100" />
                    <h3>
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => setSelectedPortfolioItem(itemIndex)}
                        className="grid min-h-24 w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-5 text-left text-sm font-bold leading-5 text-[var(--portfolio-ink)] outline-none transition-colors duration-300 hover:text-[var(--portfolio-primary)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--portfolio-accent)] md:px-6 md:text-base md:leading-6"
                      >
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 rounded-full bg-[var(--portfolio-accent)] shadow-[0_0_0_5px_var(--portfolio-primary-light)]"
                        />
                        <span>{item.title}</span>
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--portfolio-border)] text-xl font-normal text-[var(--portfolio-muted)] transition-[transform,border-color,color] duration-300 group-hover:translate-x-0.5 group-hover:border-[var(--portfolio-accent)] group-hover:text-[var(--portfolio-primary)]"
                        >
                          ›
                        </span>
                      </button>
                    </h3>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {selectedPortfolioItem !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedPortfolioItem(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="portfolio-dialog-title"
            aria-describedby="portfolio-dialog-description"
            className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--portfolio-border)] bg-[var(--portfolio-card)] p-6 shadow-2xl md:p-10"
          >
            <button
              type="button"
              autoFocus
              aria-label="Close"
              onClick={() => setSelectedPortfolioItem(null)}
              className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[var(--portfolio-border)] bg-[var(--portfolio-panel)] text-2xl leading-none text-[var(--portfolio-muted)] transition-colors hover:border-[var(--portfolio-accent)] hover:text-[var(--portfolio-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--portfolio-accent)]"
            >
              ×
            </button>
            <div className="h-1 w-14 rounded-full bg-[var(--portfolio-accent)]" />
            <h2
              id="portfolio-dialog-title"
              className="mt-6 max-w-xl pr-10 text-2xl font-extrabold leading-tight tracking-tight text-[var(--portfolio-ink)] md:text-3xl"
            >
              {portfolioAtAGlance[selectedPortfolioItem].title}
            </h2>
            <p
              id="portfolio-dialog-description"
              className="mt-5 text-base leading-8 text-[var(--portfolio-body)]"
            >
              {portfolioAtAGlance[selectedPortfolioItem].description}
            </p>
          </div>
        </div>
      )}

      <div className="bg-[var(--portfolio-card)] mt-4 mx-4 md:mx-8 rounded-xl border border-[var(--portfolio-border)] overflow-hidden shadow-sm">
        <ul className="divide-y divide-[var(--portfolio-border)]">
          {orderedServices.map((s, i) => (
            <ServiceRow
              key={s.index}
              service={s}
              index={i}
              displayIndex={i + 1}
              isActive={active === i}
              onToggle={() => setActive(active === i ? null : i)}
            />
          ))}
        </ul>
      </div>

      {!hideFooter && (
        <footer className="px-8 md:px-16 py-8 mt-4 flex flex-col md:flex-row justify-between gap-4">
          <span className="mono" style={{ fontSize: "11px", letterSpacing: "0.14em", color: "var(--portfolio-faint)" }}>
            © {new Date().getFullYear()} CIS Professional Services
          </span>
        </footer>
      )}
    </div>
  );
}

function ServiceRow({
  service,
  index,
  displayIndex,
  isActive,
  onToggle,
}: {
  service: Service;
  index: number;
  displayIndex: number;
  isActive: boolean;
  onToggle: () => void;
}) {
  const definitionRef = useRef<HTMLDivElement>(null);
  const [definitionHeight, setDefinitionHeight] = useState<number | null>(null);

  useEffect(() => {
    const definition = definitionRef.current;
    if (!isActive || !definition) return;

    const updateHeight = () => {
      setDefinitionHeight(definition.getBoundingClientRect().height);
    };
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(definition);
    return () => observer.disconnect();
  }, [isActive, service.creating]);

  return (
    <li>
      <button className="w-full text-left group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--portfolio-accent)]" onClick={onToggle} aria-expanded={isActive} aria-controls={`service-panel-${service.index}`}>
        <div
          className="px-6 md:px-10 py-6 flex items-center gap-5 md:gap-8 transition-all duration-300"
          style={{ background: isActive ? "var(--portfolio-panel)" : "transparent" }}
        >
          <span className="mono shrink-0" style={{ fontSize: "11px", letterSpacing: "0.14em", color: isActive ? "var(--portfolio-accent)" : "var(--portfolio-faint)", minWidth: "2rem", transition: "color 0.3s" }}>
            {String(displayIndex).padStart(2, "0")}
          </span>

          <h2
            className="flex-1 transition-colors duration-300 group-hover:text-[var(--portfolio-primary)]"
            style={{ fontSize: "clamp(1.3rem, 2.5vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: isActive ? "var(--portfolio-primary)" : "var(--portfolio-ink)" }}
          >
            {service.title}
          </h2>

          {service.tagline.includes("•") ? (
            <span className="hidden max-w-sm flex-wrap justify-end gap-1.5 text-right font-normal transition-colors duration-300 lg:flex" style={{ fontSize: "0.82rem", color: isActive ? "var(--portfolio-muted)" : "var(--portfolio-faint)" }}>
              {service.tagline.split("•").map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                <span key={tag} className="rounded-md border border-current/30 bg-[var(--portfolio-panel)] px-2 py-1">
                  {tag}
                </span>
              ))}
            </span>
          ) : (
            <span className="hidden lg:block shrink-0" style={{ fontSize: "0.82rem", color: isActive ? "var(--portfolio-muted)" : "var(--portfolio-faint)", maxWidth: "200px", textAlign: "right", transition: "color 0.3s", fontWeight: 400 }}>
              {service.tagline}
            </span>
          )}

          <span
            className="ml-2 shrink-0 flex items-center justify-center"
            style={{
              width: "28px",
              height: "28px",
              border: `1.5px solid ${isActive ? "var(--portfolio-accent)" : "var(--portfolio-border)"}`,
              borderRadius: "50%",
              color: isActive ? "var(--portfolio-accent)" : "var(--portfolio-faint)",
              fontSize: "16px",
              lineHeight: 1,
              transition: "all 0.3s",
              background: isActive ? "var(--portfolio-primary-light)" : "transparent",
            }}
          >
            {isActive ? "−" : "+"}
          </span>
        </div>
      </button>

      {/* Expanded panel */}
      <div
        id={`service-panel-${service.index}`}
        className="grid transition-[grid-template-rows,opacity] duration-500 ease-in-out motion-reduce:transition-none"
        style={{ gridTemplateRows: isActive ? "1fr" : "0fr", opacity: isActive ? 1 : 0 }}
        inert={!isActive}
      >
        <div className="min-h-0 overflow-hidden border-t border-[var(--portfolio-border)] bg-[var(--portfolio-panel)]">
          <div
            className="grid items-start gap-6 px-6 py-8 md:grid-cols-[var(--definition-height)_minmax(0,1fr)] md:px-10"
            style={{
              "--definition-height": definitionHeight
                ? `${definitionHeight}px`
                : "10rem",
            } as CSSProperties}
          >

            {/* Left — image */}
            <div className="aspect-video overflow-hidden rounded-lg border border-[var(--portfolio-border)] md:aspect-square md:h-[var(--definition-height)] md:w-[var(--definition-height)]" style={{ background: "#E5E7EB" }}>
                <img
                  src={service.image}
                  alt={service.title}
                  onError={(event) => {
                    const fallback = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
                    if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
                  }}
                  className="w-full h-full object-cover"
                  style={{ transition: "transform 0.7s cubic-bezier(0.4,0,0.2,1)", transform: isActive ? "scale(1)" : "scale(1.06)" }}
                />
            </div>

            {/* Definition */}
            <div ref={definitionRef} className="min-w-0">
              <div>
                <span className="mono" style={{ fontSize: "10px", letterSpacing: "0.16em", color: "var(--portfolio-accent)", textTransform: "uppercase", fontWeight: 500 }}>
                  Definition
                </span>
                <p style={{ marginTop: "0.5rem", fontWeight: 400, fontSize: "0.975rem", lineHeight: 1.8, color: "var(--portfolio-body)" }}>
                  {service.creating}
                </p>
              </div>
            </div>

            {/* Core Capabilities */}
            {(service.capabilities.length > 0 || (service.capabilityGroups?.length ?? 0) > 0) && (
              <div className="md:col-span-2 border-t border-[var(--portfolio-border)] pt-6">
                <span className="mono" style={{ fontSize: "10px", letterSpacing: "0.16em", color: "var(--portfolio-muted)", textTransform: "uppercase", fontWeight: 500 }}>
                  Core Capabilities
                </span>
                {service.capabilities.length > 0 && <ul className="mt-3 flex flex-col gap-2">
                  {service.capabilities.map((cap, i) => {
                    const labelled = cap.match(/^(.+?)(\s+-\s+|:\s+)(.+)$/);
                    return <li key={i} className="flex items-start gap-3">
                      {/* Bullet */}
                      <span
                        className="shrink-0 mt-[6px]"
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "var(--portfolio-accent)",
                          display: "inline-block",
                        }}
                      />
                      <span style={{ fontSize: "0.9rem", color: "var(--portfolio-detail)", lineHeight: 1.65, fontWeight: 400 }}>
                        {labelled ? <><strong className="font-semibold text-[var(--portfolio-primary)]">{labelled[1]}{labelled[2]}</strong>{labelled[3]}</> : cap}
                      </span>
                    </li>;
                  })}
                </ul>}
                {service.capabilityGroups && service.capabilityGroups.length > 0 && (
                  <ul className="mt-4 grid gap-3">
                    {service.capabilityGroups.map((group) => (
                      <li key={group.title} className="rounded-xl border-2 border-dotted border-[var(--portfolio-warning)] bg-[var(--portfolio-warning-bg)] p-4">
                        <span className="font-semibold text-[var(--portfolio-primary)]">{group.title}</span>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--portfolio-detail)] marker:text-[var(--portfolio-warning)]">
                          {group.items.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
