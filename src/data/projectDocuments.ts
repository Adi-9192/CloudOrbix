export type MandatoryDocument = {
  id: string;
  name: string;
  templateName: string;
  templateContent: string;
};

const createTemplate = (name: string) =>
  `${name}\n\nProject:\nClient:\nOwner:\nDate:\n\nDetails:\n\nReview / approval:\n`;

const mandatoryDocuments = [
  ["project-intake-form", "Project Intake Form"],
  ["kick-off", "Kick Off"],
  ["isow", "ISOW"],
  ["sow", "SOW"],
  ["inventory", "Inventory"],
  ["gap-analysis", "Gap Analysis"],
  ["raid-log", "RAID LOG"],
  ["raci", "RACI"],
  ["project-plan", "Project Plan"],
  ["solution-review-sign-off", "Solution review / sign off"],
  ["design-documents-hld-lld", "Design Documents - HLD/LLD"],
  ["project-reports", "Project Reports"],
  ["test-reports-evidences", "Test reports / Evidences"],
  ["project-sign-off", "Project Sign off"],
  ["atr", "ATR"],
  ["offboarding-project-team", "Offboarding the project team"],
] as const;

export const MANDATORY_DOCUMENTS: MandatoryDocument[] =
  mandatoryDocuments.map(([id, name]) => ({
    id,
    name,
    templateName: `${id}-template.txt`,
    templateContent: createTemplate(name),
  }));
