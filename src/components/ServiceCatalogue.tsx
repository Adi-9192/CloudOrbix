import { useState } from "react";

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
    "Infrastructure as Code (IaC) - Implement Terraform, Azure Bicep, CloudFormation and cloud-native IaC frameworks using reusable, standardized and version-controlled templates.",
    "CI/CD Platform Engineering - Design and implement enterprise-grade CI/CD platforms using Azure DevOps, GitHub Actions, GitLab, AWS CodePipeline, and Google Cloud Build.",
    "Platform Engineering Automation - Implement self-service platforms, standardized delivery frameworks and reusable engineering patterns.",
    "Build & Release Automation - Design and implement automated provisioning, environment promotion, deployment orchestration, and release management frameworks across multi-cloud environments.",
    "IaC Validation & Testing Framework - Implement automated validation, security, compliance and deployment testing for Infrastructure as Code templates and cloud platforms.",
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
] as const;

const portfolioAtAGlanceIntro = "Cloud and enterprise technology services are presented across architecture, transformation, observability, security, middleware, databases, backup, and hybrid-cloud management. The portfolio emphasizes governed, automated, secure, and highly available environments spanning Azure, AWS, Google Cloud Platform, Oracle Cloud Infrastructure, on-premises systems, and edge infrastructure.";

export interface ServiceCatalogueProps {
  dark?: boolean;
  services?: Service[];
  heading?: string;
  hideHeader?: boolean;
  hideFooter?: boolean;
  className?: string;
}

export default function ServiceCatalogue({
  dark = false,
  services = DEFAULT_SERVICES,
  heading = "CIS Professional Services - Portfolio",
  hideHeader = false,
  hideFooter = false,
  className = "",
}: ServiceCatalogueProps) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div data-theme={dark ? "dark" : undefined} className={`service-catalogue min-h-screen w-full bg-[var(--catalogue-bg)] text-[var(--catalogue-ink)] ${className}`} style={{ fontFamily: "var(--font-sans, 'Inter', system-ui, sans-serif)" }}>

      {!hideHeader && (
        <header className="px-8 md:px-16 pt-12 pb-8 flex items-start justify-between border-b border-[var(--catalogue-border)] bg-[var(--catalogue-card)]">
          <div>
            <span className="mono" style={{ fontSize: "20px", letterSpacing: "0.18em", color: "var(--catalogue-accent)", textTransform: "uppercase" }}>
              PORTFOLIO
            </span>
            <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 4rem)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", color: "var(--catalogue-ink)", marginTop: "0.4rem" }}>
              {heading === "CIS Professional Services - Portfolio" ? (
                <>CIS{" "}<span className="text-[var(--catalogue-primary)]">Professional Services</span></>
              ) : heading}
            </h1>
          </div>
        </header>
      )}

      <section
        aria-labelledby="portfolio-at-a-glance-heading"
        className="relative overflow-hidden border-b border-[var(--catalogue-border)] bg-[var(--catalogue-card)] px-4 py-12 md:px-8 md:py-16 lg:px-16 lg:py-20"
      >
        <div className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-[var(--catalogue-primary-light)] opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-[var(--catalogue-primary-light)] opacity-30 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-5xl">
            <h2
              id="portfolio-at-a-glance-heading"
              className="text-2xl font-bold tracking-[-0.03em] text-[var(--catalogue-ink)]"
            >
              <em className="font-semibold">Portfolio</em> at Glance
            </h2>
            <p className="mt-6 max-w-5xl text-base font-semibold leading-7 text-[var(--catalogue-body)] md:text-lg md:leading-8">
              {portfolioAtAGlanceIntro}
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-[var(--catalogue-border)] bg-[var(--catalogue-border)] shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)]">
            <div className="h-1.5 bg-[var(--catalogue-accent)]" />
            <div className="grid gap-px bg-[var(--catalogue-border)] lg:grid-cols-2">
              {portfolioAtAGlance.map((item, index) => (
                <article
                  key={item.title}
                  className={`group relative bg-[var(--catalogue-card)] px-6 py-7 transition-colors duration-300 hover:bg-[var(--catalogue-panel)] md:px-8 md:py-9 ${index === portfolioAtAGlance.length - 1 ? "lg:col-span-2" : ""}`}
                >
                  <div className="absolute bottom-0 left-0 top-0 w-1 origin-y scale-y-0 bg-[var(--catalogue-accent)] transition-transform duration-300 group-hover:scale-y-100" />
                  <h3 className="text-base font-bold leading-6 text-[var(--catalogue-ink)] md:text-lg">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--catalogue-body)] md:leading-7">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
            <div className="h-1.5 bg-[var(--catalogue-accent)]" />
          </div>
        </div>
      </section>

      <div className="bg-[var(--catalogue-card)] mt-4 mx-4 md:mx-8 rounded-xl border border-[var(--catalogue-border)] overflow-hidden shadow-sm">
        <ul className="divide-y divide-[var(--catalogue-border)]">
          {services.map((s, i) => (
            <ServiceRow
              key={s.index}
              service={s}
              index={i}
              isActive={active === i}
              onToggle={() => setActive(active === i ? null : i)}
            />
          ))}
        </ul>
      </div>

      {!hideFooter && (
        <footer className="px-8 md:px-16 py-8 mt-4 flex flex-col md:flex-row justify-between gap-4">
          <span className="mono" style={{ fontSize: "11px", letterSpacing: "0.14em", color: "var(--catalogue-faint)" }}>
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
  isActive,
  onToggle,
}: {
  service: Service;
  index: number;
  isActive: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button className="w-full text-left group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--catalogue-accent)]" onClick={onToggle} aria-expanded={isActive} aria-controls={`service-panel-${service.index}`}>
        <div
          className="px-6 md:px-10 py-6 flex items-center gap-5 md:gap-8 transition-all duration-300"
          style={{ background: isActive ? "var(--catalogue-panel)" : "transparent" }}
        >
          <span className="mono shrink-0" style={{ fontSize: "11px", letterSpacing: "0.14em", color: isActive ? "var(--catalogue-accent)" : "var(--catalogue-faint)", minWidth: "2rem", transition: "color 0.3s" }}>
            {service.index}
          </span>

          <h2
            className="flex-1 transition-colors duration-300 group-hover:text-[var(--catalogue-primary)]"
            style={{ fontSize: "clamp(1.3rem, 2.5vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: isActive ? "var(--catalogue-primary)" : "var(--catalogue-ink)" }}
          >
            {service.title}
          </h2>

          {service.tagline.includes("•") ? (
            <span className="hidden max-w-sm flex-wrap justify-end gap-1.5 text-right font-normal transition-colors duration-300 lg:flex" style={{ fontSize: "0.82rem", color: isActive ? "var(--catalogue-muted)" : "var(--catalogue-faint)" }}>
              {service.tagline.split("•").map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                <span key={tag} className="rounded-md border border-current/30 bg-[var(--catalogue-panel)] px-2 py-1">
                  {tag}
                </span>
              ))}
            </span>
          ) : (
            <span className="hidden lg:block shrink-0" style={{ fontSize: "0.82rem", color: isActive ? "var(--catalogue-muted)" : "var(--catalogue-faint)", maxWidth: "200px", textAlign: "right", transition: "color 0.3s", fontWeight: 400 }}>
              {service.tagline}
            </span>
          )}

          <span
            className="ml-2 shrink-0 flex items-center justify-center"
            style={{
              width: "28px",
              height: "28px",
              border: `1.5px solid ${isActive ? "var(--catalogue-accent)" : "var(--catalogue-border)"}`,
              borderRadius: "50%",
              color: isActive ? "var(--catalogue-accent)" : "var(--catalogue-faint)",
              fontSize: "16px",
              lineHeight: 1,
              transition: "all 0.3s",
              background: isActive ? "var(--catalogue-primary-light)" : "transparent",
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
        <div className="min-h-0 overflow-hidden border-t border-[var(--catalogue-border)] bg-[var(--catalogue-panel)]">
          <div className="px-6 md:px-10 py-8 grid md:grid-cols-5 gap-8 items-start">

            {/* Left — image */}
            <div className="md:order-1 md:col-span-2 overflow-hidden rounded-lg border border-[var(--catalogue-border)]" style={{ aspectRatio: "3/4", background: "#E5E7EB" }}>
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

            {/* Right — content */}
            <div className="md:order-2 md:col-span-3 flex flex-col gap-6">

              {/* Creating paragraph */}
              <div>
                <span className="mono" style={{ fontSize: "10px", letterSpacing: "0.16em", color: "var(--catalogue-accent)", textTransform: "uppercase", fontWeight: 500 }}>
                  Definition
                </span>
                <p style={{ marginTop: "0.5rem", fontWeight: 400, fontSize: "0.975rem", lineHeight: 1.8, color: "var(--catalogue-body)" }}>
                  {service.creating}
                </p>
              </div>

              {/* Divider */}
              {(service.capabilities.length > 0 || (service.capabilityGroups?.length ?? 0) > 0) && <div className="h-px bg-[var(--catalogue-border)]" />}

              {/* Core Capabilities */}
              {(service.capabilities.length > 0 || (service.capabilityGroups?.length ?? 0) > 0) && <div>
                <span className="mono" style={{ fontSize: "10px", letterSpacing: "0.16em", color: "var(--catalogue-muted)", textTransform: "uppercase", fontWeight: 500 }}>
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
                          background: "var(--catalogue-accent)",
                          display: "inline-block",
                        }}
                      />
                      <span style={{ fontSize: "0.9rem", color: "var(--catalogue-detail)", lineHeight: 1.65, fontWeight: 400 }}>
                        {labelled ? <><strong className="font-semibold text-[var(--catalogue-primary)]">{labelled[1]}{labelled[2]}</strong>{labelled[3]}</> : cap}
                      </span>
                    </li>;
                  })}
                </ul>}
                {service.capabilityGroups && service.capabilityGroups.length > 0 && (
                  <ul className="mt-4 grid gap-3">
                    {service.capabilityGroups.map((group) => (
                      <li key={group.title} className="rounded-xl border-2 border-dotted border-[var(--catalogue-warning)] bg-[var(--catalogue-warning-bg)] p-4">
                        <span className="font-semibold text-[var(--catalogue-primary)]">{group.title}</span>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--catalogue-detail)] marker:text-[var(--catalogue-warning)]">
                          {group.items.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>}

            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
