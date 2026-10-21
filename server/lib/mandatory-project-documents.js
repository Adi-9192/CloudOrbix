import { MANDATORY_DOCUMENTS } from "../../shared/project-documents.js";
import { normalizeProjectStatus } from "./project-status.js";

export const missingMandatoryProjectDocuments = (documentTypes) => {
  const uploadedTypes = new Set(documentTypes);
  return MANDATORY_DOCUMENTS.filter((document) => !uploadedTypes.has(document.id));
};

export const requiresMandatoryProjectDocuments = (status) =>
  normalizeProjectStatus(status) === "Completed";

export const mandatoryDocumentsRequiredMessage = (missingDocuments) =>
  `A project cannot be marked Completed until all mandatory documents are added. Missing: ${missingDocuments
    .map((document) => document.name)
    .join(", ")}.`;
