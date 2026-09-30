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
    title: "Cloud Infrastructure Architecture and Management",
    tagline: "Turning business ambition into scalable technology foundations.",
    creating: "Design, assessment, modernization and automated deployment aligned with governance, policy, tagging, reporting, SLA and naming standards.",
    capabilities: [
    "Cloud Foundation - Design secure and governed Azure Landing Zones, Sovereign Landing Zones (SLZ), AWS Control Tower, GCP, and OCI core landing zones.",
    "Enterprise Landing Zones - Deploy enterprise-scale landing zones aligned with the Microsoft Cloud Adoption Framework (CAF).",
    "Custom Landing Zones - Design and implement single-region and multi-region cloud landing zones.",
    "Capacity Management - Assess resource utilization and forecast future capacity based on regional availability.",
    "Vendor Engagement - Coordinate cloud region enablement and large-scale capacity provisioning.",
    "Network Architecture - Design and implement VNet peering, route tables, and firewall strategies.",
    "Hybrid Connectivity - Build Hub-and-Spoke, multi-region, and hybrid-cloud network architectures.",
    "Multi-Cloud Integration - Develop integrated Azure, AWS, GCP, OCI, and hybrid-cloud architectures.",
    "AI Platform Architecture - Architect secure AIOps environments using Microsoft Foundry, Amazon Bedrock, and Google Vertex AI.",
    "Disaster Recovery - Design multi-region high-availability and disaster recovery solutions across cloud platforms.",
    "DevOps Platform Build - Implement CI/CD, security scanning, repository, and artifact management platforms.",
    "Azure Virtual Desktop - Design and deploy secure AVD environments with Entra ID, FSLogix, autoscaling, and application delivery.",
    "Azure File Sync Services - Implement hybrid file storage, synchronization, cloud tiering, and DFS modernization using Azure File Sync and Azure Files."
],
    image: "/portfolio/1.png",
  },
  {
    index: "02",
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
    image: "/portfolio/2.png",
  },
  {
    index: "03",
    title: "DevOps, Automation & Operations",
    tagline: "Standardize, secure and accelerate cloud delivery through DevOps and Infrastructure as Code",
    creating: "Enable automated, governed and scalable cloud platforms through modern DevOps practices, Infrastructure as Code and platform engineering.",
    capabilities: [
    "Cloud Foundation Automation : Automate deployment and lifecycle management of Azure Landing Zones, AWS Control Tower and GCP using Infrastructure as Code.",
    "Infrastructure as Code (IaC) : Implement Terraform, Azure Bicep, CloudFormation and cloud-native IaC frameworks using reusable, standardized and version-controlled templates.",
    "CI/CD Platform Engineering : Build enterprise-grade Azure DevOps, GitHub Actions, GitLab and AWS CodePipeline and Google Cloud Build pipelines for continuous integration and delivery.",
    "DevSecOps Enablement : Embed security scanning, secrets management and infrastructure security controls into Infrastructure as Code and deployment pipelines.",
    "Platform Engineering Automation : Implement self-service platforms, standardized delivery frameworks and reusable engineering patterns.",
    "Build & Release Automation : Automate infrastructure provisioning, configuration updates, environment promotion and deployment orchestration across cloud platforms.",
    "IaC Validation & Testing Framework : Implement automated validation, security, compliance and deployment testing for Infrastructure as Code templates and cloud platforms.",
    "Cloud Operations Automation : Automate provisioning, patching, backup, monitoring, remediation and operational activities across cloud environments.",
    "AIOps & Incident Automation : Leverage intelligent monitoring, alert correlation and automated remediation to improve platform reliability and operational efficiency.",
    "Compliance Automation : Enforce governance standards through Policy as Code, continuous compliance monitoring and automated audit readiness."
],
    image: "/portfolio/3.png",
  },
  {
    index: "04",
    title: "Cloud-Native Observability Solutions",
    tagline: "• Azure Monitor • Amazon CloudWatch • Google Cloud Monitoring",
    creating: "Cloud-native observability design and deployment using Infrastructure as Code with Terraform.",
    capabilities:  [
  "IaaS Monitoring: Monitor VM performance, infrastructure services, and Virtual Machine Scale Sets.",
  "PaaS Monitoring: Track databases, storage, snapshots, applications, and platform resources.",
  "Azure Local Monitoring: Monitor Resource Bridge, Azure Local virtual machines, and clusters.",
  "Enterprise Application Monitoring: Monitor Active Directory, DNS, DHCP, MABS, SQL Server, SAP, and Windows clusters.",
  "Azure Virtual Desktop Monitoring: Monitor AVD session hosts, user experience, and platform health.",
  "Entra ID Monitoring: Monitor enterprise applications, app registrations, service principals, certificates, and secrets.",
  "Alert Management: Configure threshold tuning, alert auto-resolution, and ITSM integrations.",
  "Operational Visibility: Deliver dashboards, SLA reporting, and proactive alerting."
],
    image: "/portfolio/4.png",
  },
  {
    index: "05",
    title: "Vulnerability Management for IaaS Platforms",
    tagline: "Cloud-native patch management and audit readiness",
    creating: "Azure Update Manager, AWS Systems Manager Patch Manager and Google Cloud OS Patch Management.",
    capabilities: [
  "Dynamic Patch Targeting: Use resource tags and policy-based targeting to define patch scope.",
  "Environment-Based Scheduling: Configure patch schedules aligned with Development, Test, UAT, and Production environments.",
  "Patch Compliance Strategy: Maintain N and N-1 patch compliance across infrastructure workloads.",
  "Automated Patch Deployment: Execute automated patch deployment, validation, and post-update verification.",
  "Compliance Reporting: Deliver comprehensive compliance reporting and audit-readiness support."


    ],
    image: "/portfolio/5.png",
  },
  {
    index: "06",
    title: "Middleware Capabilities",
    tagline: " • Web delivery • Application runtime • Enterprise integration",
    creating: "Architecture, deployment and management across IaaS, PaaS and hybrid services, including VMs, App Services, AKS, EKS and GKE.",
    capabilities: [
    ],
    capabilityGroups: [
      {
        title: "Web Servers",
        items: [
    "Front-end entry for client requests and HTTP/HTTPS delivery",
    "Load balancing, SSL/TLS termination and reverse proxy",
    "Availability, performance and security improvements",
    "Apache HTTP Server, NGINX, IIS, IBM HTTP Server and Oracle HTTP Server"
],
      },
      {
        title: "Application Servers",
        items: [
    "Enterprise application and API hosting",
    "Java, .NET and business-application runtimes",
    "Lifecycle, session management and clustering",
    "Scalability, high availability and workload distribution",
    "Tomcat, JBoss EAP, WildFly, WebLogic and WebSphere"
],
      },
      {
        title: "EAI, ETL & MFT",
        items: [
    "Application and system integration across hybrid estates",
    "Data transformation, ETL and batch workflow automation",
    "Secure internal and external file transfer",
    "Enterprise data exchange and process automation",
    "webMethods, TIBCO, DataStage and Serv-U SFTP"
]
      },
    ],

    image: "/portfolio/6.png",
  },
  {
    index: "07",
    title: "Database Capabilities",
    tagline: " • SQL Server • MySQL • PostgreSQL • Oracle Database",
    creating: "Multi-cloud database architecture, migration, implementation and managed services across Azure, AWS, GCP and hybrid environments.",
    capabilities: [
    "Provisioning, connectivity and high availability",
    "Operational dashboards, SLA tracking and compliance reporting",
    "Performance monitoring, health assessment and incident support",
    "Database upgrades, patch deployment and security remediation",
    "Consolidation, migration and platform modernization",
    "Query tuning, resource optimization and cloud cost management",
    "Access control, encryption, compliance and vulnerability remediation"
],
    image: "/portfolio/7.png",
  },
{
    index: "08",
    title: "Backup Capabilities",
    tagline: " • Azure Backup • AWS Backup • Google Cloud Backup and DR",
    creating: "Multi-cloud and third-party backup architecture, implementation and governance using Rubrik, Veeam and Commvault.",
    capabilities: [
    "Backup policies, retention schedules and recovery strategies",
    "Reporting and automated success/failure alerting",
    "Hybrid backup across on-premises and cloud environments",
    "Third-party backup deployment, integration and management",
    "Recovery validation, testing and compliance reporting"
],
    image: "/portfolio/8.png",
},
{
    index: "09",
    title: "Azure Arc Capabilities",
    tagline: "Unified hybrid and multi-cloud management",
    creating: "Centralized management, security, compliance, monitoring and automation across on-premises, Azure, AWS, GCP and edge.",
    capabilities: [
    "Central inventory, governance and lifecycle management",
    "Windows and Linux server onboarding and administration",
    "Kubernetes governance, monitoring, policy and GitOps for AKS, EKS, GKE, OpenShift and on-premises",
    "Arc-enabled SQL inventory, licensing, assessment and security recommendations",
    "Arc-enabled VMware vSphere discovery, governance and lifecycle operations",
    "Azure Policy, compliance tracking, tagging and configuration enforcement",
    "Microsoft Defender for Cloud posture, vulnerability and threat protection",
    "Azure Monitor, Log Analytics and Managed Grafana observability",
    "Update Manager, Change Tracking, DSC and automation runbooks",
    "Central patch orchestration and compliance reporting"
],
    image: "/portfolio/9.png",

},
];

export interface ServiceCatalogueProps {
  dark?: boolean;
  services?: Service[];
  heading?: string;
  intro?: string;
  hideHeader?: boolean;
  hideFooter?: boolean;
  className?: string;
}

export default function ServiceCatalogue({
  dark = false,
  services = DEFAULT_SERVICES,
  heading = "CIS Professional Services - Portfolio",
  intro = "Cloud and enterprise technology services are presented across architecture, transformation, observability, security, middleware, databases, backup, and hybrid-cloud management. The portfolio emphasizes governed, automated, secure, and highly available environments spanning Azure, AWS, Google Cloud Platform, Oracle Cloud Infrastructure, on-premises systems, and edge infrastructure.",
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

      <div className="px-8 md:px-16 py-10 grid border-b border-[var(--catalogue-border)] bg-[var(--catalogue-card)]">
        <p style={{ textAlign: "justify", fontWeight: 400, fontSize: "clamp(0.95rem, 1.3vw, 1.1rem)", lineHeight: 1.75, color: "var(--catalogue-muted)" }}>
          {intro}
        </p>
      </div>

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
            <div className={"md:col-span-2 " + (index % 2 !== 0 ? "md:order-2" : "md:order-1") + " overflow-hidden rounded-lg border border-[var(--catalogue-border)]"} style={{ aspectRatio: "3/4", background: "#E5E7EB" }}>
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
            <div className={"md:col-span-3 " + (index % 2 !== 0 ? "md:order-1" : "md:order-2") + " flex flex-col gap-6"}>

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
