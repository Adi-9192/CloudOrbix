import express from 'express';
import multer from 'multer';
import { BlobServiceClient } from '@azure/storage-blob';
import { protectRoute, requireRole } from '../middleware/auth.js';
import { buildTemplateBlobName, getTemplateContainerName, isTemplateUploadAllowed } from '../lib/document-templates.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function normalizeTemplateList(items = []) {
  return items.map((item, index) => ({
    id: item.id || `${Date.now()}-${index}`,
    fileName: item.fileName || item.name || 'template',
    blobName: item.blobName || item.name || '',
    blobUrl: item.blobUrl || item.url || '#',
    contentType: item.contentType || item.content_type || 'application/octet-stream',
    uploadedBy: item.uploadedBy || item.uploaded_by || 'Admin',
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
  }));
}

router.get('/', protectRoute, async (req, res, next) => {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      return res.status(503).json({ message: 'Azure document storage is not configured.' });
    }

    const service = BlobServiceClient.fromConnectionString(connectionString);
    const container = service.getContainerClient(getTemplateContainerName());
    await container.createIfNotExists();

    const items = [];
    for await (const blob of container.listBlobsFlat()) {
      const client = container.getBlobClient(blob.name);
      const properties = await client.getProperties();
      items.push({
        id: blob.name,
        fileName: blob.name.split('/').pop() || blob.name,
        blobName: blob.name,
        blobUrl: client.url,
        contentType: properties.contentSettings?.contentType || 'application/octet-stream',
        uploadedBy: 'Admin',
        createdAt: properties.lastModified ? new Date(properties.lastModified).toISOString() : new Date().toISOString(),
      });
    }

    return res.json({ templates: normalizeTemplateList(items) });
  } catch (error) {
    return next(error);
  }
});

router.post('/upload', protectRoute, requireRole('Admin'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No template file uploaded.' });

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      return res.status(503).json({ message: 'Azure document storage is not configured. Set AZURE_STORAGE_CONNECTION_STRING on the API server.' });
    }

    const service = BlobServiceClient.fromConnectionString(connectionString);
    const container = service.getContainerClient(getTemplateContainerName());
    await container.createIfNotExists();

    const blobName = buildTemplateBlobName(req.file.originalname);
    const blob = container.getBlockBlobClient(blobName);
    await blob.uploadData(req.file.buffer, { blobHTTPHeaders: { blobContentType: req.file.mimetype || 'application/octet-stream' } });

    return res.status(201).json({
      template: {
        id: blobName,
        fileName: req.file.originalname,
        blobName,
        blobUrl: blob.url,
        contentType: req.file.mimetype || 'application/octet-stream',
        uploadedBy: req.user.email,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
