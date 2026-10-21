import assert from "node:assert/strict";
import test from "node:test";
import {
  mandatoryDocumentsRequiredMessage,
  missingMandatoryProjectDocuments,
  requiresMandatoryProjectDocuments,
} from "./mandatory-project-documents.js";
import { MANDATORY_DOCUMENTS } from "../../shared/project-documents.js";

test("identifies mandatory project documents that have not been uploaded", () => {
  assert.deepEqual(
    missingMandatoryProjectDocuments(["project-intake-form", "kick-off"]),
    MANDATORY_DOCUMENTS.slice(2),
  );
  assert.deepEqual(
    missingMandatoryProjectDocuments(MANDATORY_DOCUMENTS.map(({ id }) => id)),
    [],
  );
});

test("requires mandatory documents for completed status aliases", () => {
  assert.equal(requiresMandatoryProjectDocuments("Completed"), true);
  assert.equal(requiresMandatoryProjectDocuments("Closed"), true);
  assert.equal(requiresMandatoryProjectDocuments("On Track"), false);
});

test("lists missing documents in the completion validation message", () => {
  assert.equal(
    mandatoryDocumentsRequiredMessage([{ name: "Project Intake Form" }]),
    "A project cannot be marked Completed until all mandatory documents are added. Missing: Project Intake Form.",
  );
});
