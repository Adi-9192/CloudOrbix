import { BlobServiceClient } from '@azure/storage-blob';
import 'dotenv/config';

const connectionString =
  process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();

const containerName =
  process.env.AZURE_STORAGE_CONTAINER_NAME?.trim();

let blobServiceClient = null;
let containerClient = null;


/*
 * Create and return the Azure Storage container client.
 */
function getStorageClient() {
  if (!connectionString) {
    throw new Error(
      'AZURE_STORAGE_CONNECTION_STRING is not configured.'
    );
  }

  if (!containerName) {
    throw new Error(
      'AZURE_STORAGE_CONTAINER_NAME is not configured.'
    );
  }

  if (!blobServiceClient) {
    blobServiceClient =
      BlobServiceClient.fromConnectionString(
        connectionString
      );
  }

  if (!containerClient) {
    containerClient =
      blobServiceClient.getContainerClient(
        containerName
      );
  }

  return containerClient;
}


/*
 * Test Azure Storage connection.
 */
export async function initializeStorage() {
  try {
    const client = getStorageClient();

    const exists = await client.exists();

    if (!exists) {
      throw new Error(
        `Azure Storage container "${containerName}" does not exist.`
      );
    }

    console.log(
      `Azure Storage connected successfully. Container: ${containerName}`
    );

    return {
      connected: true,
      containerName: containerName,
    };
  } catch (error) {
    console.error(
      'Azure Storage connection failed:',
      error.message
    );

    throw error;
  }
}


/*
 * Return the Azure Storage container client.
 */
export function getContainerClient() {
  return getStorageClient();
}


/*
 * Upload a file or Buffer to Azure Blob Storage.
 */
export async function uploadFile(
  blobName,
  data,
  contentType = 'application/octet-stream'
) {
  if (!blobName) {
    throw new Error(
      'Blob name is required.'
    );
  }

  if (data === undefined || data === null) {
    throw new Error(
      'File data is required.'
    );
  }

  const client = getStorageClient();

  const blockBlobClient =
    client.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(
    data,
    {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    }
  );

  return {
    name: blobName,
    url: blockBlobClient.url,
  };
}


/*
 * Download a file from Azure Blob Storage.
 */
export async function downloadFile(blobName) {
  if (!blobName) {
    throw new Error(
      'Blob name is required.'
    );
  }

  const client = getStorageClient();

  const blobClient =
    client.getBlobClient(blobName);

  const exists =
    await blobClient.exists();

  if (!exists) {
    return null;
  }

  const buffer =
    await blobClient.downloadToBuffer();

  return buffer;
}


/*
 * Delete a file from Azure Blob Storage.
 */
export async function deleteFile(blobName) {
  if (!blobName) {
    throw new Error(
      'Blob name is required.'
    );
  }

  const client = getStorageClient();

  const blobClient =
    client.getBlobClient(blobName);

  const deleteResult =
    await blobClient.deleteIfExists();

  return deleteResult.succeeded;
}


/*
 * Check whether a file exists.
 */
export async function fileExists(blobName) {
  if (!blobName) {
    return false;
  }

  const client = getStorageClient();

  const blobClient =
    client.getBlobClient(blobName);

  const exists =
    await blobClient.exists();

  return exists;
}


/*
 * List all files in the configured container.
 */
export async function listFiles() {
  const client = getStorageClient();

  const files = [];

  for await (
    const blob of client.listBlobsFlat()
  ) {
    files.push({
      name: blob.name,

      size:
        blob.properties.contentLength ??
        0,

      contentType:
        blob.properties.contentType ??
        'application/octet-stream',

      lastModified:
        blob.properties.lastModified ??
        null,
    });
  }

  return files;
}


/*
 * Get information about a specific blob.
 */
export async function getFileInfo(blobName) {
  if (!blobName) {
    throw new Error(
      'Blob name is required.'
    );
  }

  const client = getStorageClient();

  const blobClient =
    client.getBlobClient(blobName);

  const exists =
    await blobClient.exists();

  if (!exists) {
    return null;
  }

  const properties =
    await blobClient.getProperties();

  return {
    name: blobName,
    url: blobClient.url,

    size:
      properties.contentLength ??
      0,

    contentType:
      properties.contentType ??
      'application/octet-stream',

    lastModified:
      properties.lastModified ??
      null,
  };
}


/*
 * Return Storage configuration status.
 *
 * The connection string itself is deliberately
 * NOT returned because it contains credentials.
 */
export function getStorageConfig() {
  const configured =
    Boolean(
      connectionString &&
      containerName
    );

  return {
    configured: configured,
    containerName:
      containerName || null,
  };
}
