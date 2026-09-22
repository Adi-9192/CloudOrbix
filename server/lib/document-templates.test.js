import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTemplateBlobName, getTemplateContainerName, isTemplateUploadAllowed } from './document-templates.js';

test('template uploads are restricted to administrators', () => {
  assert.equal(isTemplateUploadAllowed(['Admin']), true);
  assert.equal(isTemplateUploadAllowed(['Manager']), false);
  assert.equal(isTemplateUploadAllowed(['Viewer', 'Operations Team']), false);
});

test('template names are sanitized and stored under a dedicated Azure container prefix', () => {
  const blobName = buildTemplateBlobName('Project Charter (Final).docx');

  assert.match(blobName, /^templates\//);
  assert.doesNotMatch(blobName, /[^a-zA-Z0-9._\-/]/);
  assert.ok(blobName.endsWith('Project_Charter_Final_.docx'));
});

test('template container name uses the configured Azure template container when present', () => {
  const original = process.env.AZURE_TEMPLATE_CONTAINER;
  process.env.AZURE_TEMPLATE_CONTAINER = 'cloudorbix-template-library';
  try {
    assert.equal(getTemplateContainerName(), 'cloudorbix-template-library');
  } finally {
    if (original === undefined) delete process.env.AZURE_TEMPLATE_CONTAINER;
    else process.env.AZURE_TEMPLATE_CONTAINER = original;
  }
});
