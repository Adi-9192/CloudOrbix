import { useState } from "react";

export interface Service {
  index: string;
  title: string;
  tagline: string;
  creating: string;
  capabilities: string[];
  image: string;
}

export const DEFAULT_SERVICES: Service[] = [
  {
    index: "01",
    title: "Architecture, Design & Build",
    tagline: "Turning business ambition into scalable technology foundations.",
    creating: "We define target-state architectures and engineer secure, resilient platforms that support modernization and growth. Our services span enterprise and solution architecture, platform engineering, cloud design, integration patterns, and production-ready implementation.", 
    capabilities: [
      "Enterprise and solution architecture",
      "Cloud and platform engineering",
      "High-level and low-level design",
      "Solution build and implementation",
      "Security, resilience, and scalability by design",
    ],
    image: "/portfolio/1.png",
  },
  {
    index: "02",
    title: "Consultancy & Transformation",
    tagline: "Creating a pragmatic path from current state to future state.",
    creating: "We help organizations shape transformation strategies, establish governance, modernize technology estates, and implement effective operating models. Our approach aligns technology investments with measurable business priorities and delivery outcomes.",
    capabilities: [
      "Technology strategy and roadmaps",
      "Cloud and application modernization",
      "Governance, risk, and compliance",
      "Target operating model design",
      "Transformation planning and execution",
    ],
    image: "/portfolio/2.png",
  },
  {
    index: "03",
    title: "DevOps, Automation & Operations",
    tagline: "Accelerating delivery while improving reliability and operational control.",
    creating: "We establish modern engineering practices that connect development, security, operations, and platform teams. Through DevSecOps, intelligent automation, SRE, observability, and AIOps, we help organizations deliver changes faster and operate services more reliably.",
    capabilities: [
          "CI/CD and DevSecOps enablement",
    "Infrastructure and configuration automation",
    "Site Reliability Engineering (SRE)",
    "Monitoring, observability, and AIOps",
    "Operational process automation"  ,
  ],
    image: "/portfolio/3.png",
  },
  {
    index: "04",
    title: "Lifecycle Management",
    tagline: "Keeping technology secure, supported, optimzed and ready for change.",
    creating: "We manage technology assets and platforms throughout the complete lifecycle, from onboarding and continuous optimization to refresh, modernization, and retirement. Structured governance helps reduce technical debt, operational risk, and unsupported technology exposure.",
    capabilities: [
      "Technology lifecycle governance",
      "Capacity, performance, and cost optimization",
      "Patch, upgrade, and refresh planning",
      "Modernization and technical debt reduction",
      "End-of-life and decommissioning management",
    ],
    image: "/portfolio/4.png",
  },
  {
    index: "05",
    title: "Operation Enablement",
    tagline: "Building resilient, automated, and efficient operations that keep business-critical services running at scale.",
    creating: "We enable organizations to modernize and optimize IT operations through automation, observability, reliability engineering, intelligent monitoring, and operational governance. Our Operations Enablement services help reduce downtime, improve service reliability, accelerate incident resolution, strengthen security posture, and drive continuous operational improvement across hybrid and multi-cloud environments." , 
    capabilities: [ 
      "Cloud operations setup and operating model design",
"Site Reliability Engineering (SRE) enablement",
"AIOps and intelligent operations automation",
"Monitoring, observability, and alerting platforms",
"Patch management and infrastructure automation",
"Backup, disaster recovery, and business continuity operations",
"Security operations and SOC enablement" , 

    ],
    image: "/portfolio/5.png",
  },
  {
    index: "06",
    title: "Technology Capabilities",
    tagline: "Providing the specialist expertise that powers enterprise platforms.",
    creating: "Our technology capabilities support the design, modernization, integration, and operation of data platforms, middleware ecosystems, and cloud-native solutions. These capabilities provide the reusable building blocks required for scalable digital transformation.",
    capabilities: [
"Data and database platforms",
"Enterprise middleware and integration",
"API and event-driven architectures",
"Containers and cloud-native platforms",
"Platform services and reusable engineering patterns"
    ],
    image: "/portfolio/6.png",
  },
];

export interface ServiceCatalogueProps {
  services?: Service[];
  heading?: string;
  intro?: string;
  hideHeader?: boolean;
  hideFooter?: boolean;
  className?: string;
}

export default function ServiceCatalogue({
  services = DEFAULT_SERVICES,
  heading = "CIS Professional Services - Portfolio",
  intro = "From advisory and architecture to engineering, automation, operations, and lifecycle optimization, our integrated portfolio enables organizations to modernize with confidence and translate technology investment into sustainable business value.",
  hideHeader = false,
  hideFooter = false,
  className = "",
}: ServiceCatalogueProps) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className={`w-full ${className}`} style={{ fontFamily: "var(--font-sans, 'Inter', system-ui, sans-serif)", color: "#0F172A" }}>

      {!hideHeader && (
        <header className="px-8 md:px-16 pt-12 pb-8 flex items-start justify-between border-b border-[#E2E8F0] bg-white">
          <div>
            <span className="mono" style={{ fontSize: "11px", letterSpacing: "0.18em", color: "#3B82F6", textTransform: "uppercase" }}>
              Service Catalogue
            </span>
            <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 4rem)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", color: "#0F172A", marginTop: "0.4rem" }}>
              CIS{" "}<span style={{ color: "#1E40AF" }}>Professional Services</span>
            </h1>
          </div>
        </header>
      )}

      <div className="px-8 md:px-16 py-10 grid border-b border-[#E2E8F0] bg-white">
        <p style={{ textAlign: "justify", fontWeight: 400, fontSize: "clamp(0.95rem, 1.3vw, 1.1rem)", lineHeight: 1.75, color: "#64748B" }}>
          {intro}
        </p>
        {/* <div className="flex items-end justify-start md:justify-end">
          <span style={{ fontWeight: 800, fontSize: "clamp(4rem, 10vw, 8rem)", lineHeight: 0.85, color: "#DBEAFE", letterSpacing: "-0.04em" }}>
            {String(services.length).padStart(2, "0")}
          </span>
        </div> */}
      </div>

      <div className="bg-white mt-4 mx-4 md:mx-8 rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <ul className="divide-y divide-[#E2E8F0]">
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
          <span className="mono" style={{ fontSize: "11px", letterSpacing: "0.14em", color: "#CBD5E1" }}>
            © {new Date().getFullYear()} CIS Professional Services
          </span>
          <span className="mono" style={{ fontSize: "11px", letterSpacing: "0.14em", color: "#CBD5E1" }}>
            {/* SOFTWARE · CLOUD · SECURITY · DATA · AI */}
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
      <button className="w-full text-left group" onClick={onToggle} aria-expanded={isActive}>
        <div
          className="px-6 md:px-10 py-6 flex items-center gap-5 md:gap-8 transition-all duration-300"
          style={{ background: isActive ? "#F8FAFC" : "transparent" }}
        >
          <span className="mono shrink-0" style={{ fontSize: "11px", letterSpacing: "0.14em", color: isActive ? "#3B82F6" : "#CBD5E1", minWidth: "2rem", transition: "color 0.3s" }}>
            {service.index}
          </span>

          <h2
            className="flex-1 transition-colors duration-300 group-hover:text-[#1E40AF]"
            style={{ fontSize: "clamp(1.3rem, 2.5vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: isActive ? "#1E40AF" : "#0F172A" }}
          >
            {service.title}
          </h2>

          <span className="hidden lg:block shrink-0" style={{ fontSize: "0.82rem", color: isActive ? "#64748B" : "#CBD5E1", maxWidth: "200px", textAlign: "right", transition: "color 0.3s", fontWeight: 400 }}>
            {service.tagline}
          </span>

          <span
            className="ml-2 shrink-0 flex items-center justify-center"
            style={{
              width: "28px",
              height: "28px",
              border: `1.5px solid ${isActive ? "#3B82F6" : "#E2E8F0"}`,
              borderRadius: "50%",
              color: isActive ? "#3B82F6" : "#CBD5E1",
              fontSize: "16px",
              lineHeight: 1,
              transition: "all 0.3s",
              background: isActive ? "#DBEAFE" : "transparent",
            }}
          >
            {isActive ? "−" : "+"}
          </span>
        </div>
      </button>

      {/* Expanded panel */}
      <div
        className="overflow-hidden"
        style={{
          maxHeight: isActive ? "700px" : "0px",
          opacity: isActive ? 1 : 0,
          transition: "max-height 0.6s cubic-bezier(0.4,0,0.2,1), opacity 0.35s",
        }}
      >
        <div className="border-t border-[#E2E8F0]" style={{ background: "#F8FAFC" }}>
          <div className="px-6 md:px-10 py-8 grid md:grid-cols-5 gap-8 items-start">

            {/* Left — image */}
            <div className={"md:col-span-2 " + (index % 2 !== 0 ? "md:order-2" : "md:order-1") + " overflow-hidden rounded-lg border border-[#E2E8F0]"} style={{ aspectRatio: "3/4", background: "#F1F5F9" }}>
              <img
                src={service.image}
                alt={service.title}
                className="w-full h-full object-cover"
                style={{ transition: "transform 0.7s cubic-bezier(0.4,0,0.2,1)", transform: isActive ? "scale(1)" : "scale(1.06)" }}
              />
            </div>

            {/* Right — content */}
            <div className={"md:col-span-3 " + (index % 2 !== 0 ? "md:order-1" : "md:order-2") + " flex flex-col gap-6"}>

              {/* Creating paragraph */}
              <div>
                <span className="mono" style={{ fontSize: "10px", letterSpacing: "0.16em", color: "#3B82F6", textTransform: "uppercase", fontWeight: 500 }}>
                  Creating
                </span>
                <p style={{ marginTop: "0.5rem", fontWeight: 400, fontSize: "0.975rem", lineHeight: 1.8, color: "#475569" }}>
                  {service.creating}
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "#E2E8F0" }} />

              {/* Core Capabilities */}
              <div>
                <span className="mono" style={{ fontSize: "10px", letterSpacing: "0.16em", color: "#64748B", textTransform: "uppercase", fontWeight: 500 }}>
                  Core Capabilities
                </span>
                <ul className="mt-3 flex flex-col gap-2">
                  {service.capabilities.map((cap, i) => (
                    <li key={i} className="flex items-start gap-3">
                      {/* Bullet */}
                      <span
                        className="shrink-0 mt-[6px]"
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#3B82F6",
                          display: "inline-block",
                        }}
                      />
                      <span style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.65, fontWeight: 400 }}>
                        {cap}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
