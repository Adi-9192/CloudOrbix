export type MandatoryDocument = {
  id: string;
  name: string;
  templateName: string;
  templateContent: string;
};

export const MANDATORY_DOCUMENTS: MandatoryDocument[] = [
  {
    id: "project-charter",
    name: "Project Charter",
    templateName: "project-charter-template.txt",
    templateContent: "Project Charter\n\nProject name:\nClient:\nObjectives:\nScope:\nKey stakeholders:\nMilestones:\nRisks and assumptions:\nApprovals:\n",
  },
  {
    id: "statement-of-work",
    name: "Statement of Work",
    templateName: "statement-of-work-template.txt",
    templateContent: "Statement of Work\n\nClient:\nServices included:\nDeliverables:\nTimeline:\nResponsibilities:\nAcceptance criteria:\nCommercial notes:\n",
  },
  {
    id: "solution-architecture",
    name: "Solution Architecture",
    templateName: "solution-architecture-template.txt",
    templateContent: "Solution Architecture\n\nClient:\nCurrent environment:\nTarget architecture:\nIntegrations:\nSecurity considerations:\nOperational considerations:\nArchitecture owner:\n",
  },
  {
    id: "security-compliance",
    name: "Security and Compliance Review",
    templateName: "security-compliance-template.txt",
    templateContent: "Security and Compliance Review\n\nClient:\nData classification:\nAccess controls:\nCompliance requirements:\nOpen findings:\nReviewer:\nReview date:\n",
  },
  {
    id: "handover-closure",
    name: "Handover and Closure",
    templateName: "handover-closure-template.txt",
    templateContent: "Handover and Closure\n\nClient:\nHandover date:\nServices handed over:\nOutstanding actions:\nSupport contacts:\nClosure approval:\n",
  },
];