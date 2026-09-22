export function getTemplateContainerName() {
  return process.env.AZURE_TEMPLATE_CONTAINER || 'cloudorbix-document-templates';
}

export function isTemplateUploadAllowed(roles = []) {
  return Array.isArray(roles) && roles.includes('Admin');
}

export function buildTemplateBlobName(fileName = 'template') {
  const fallbackName = String(fileName || 'template').trim() || 'template';
  const sanitized = fallbackName
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'template';

  return `templates/${Date.now()}-${sanitized}`;
}
