import { BlobServiceClient } from '@azure/storage-blob';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

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

const blobServiceClient =
  BlobServiceClient.fromConnectionString(connectionString);

const containerClient =
  blobServiceClient.getContainerClient(containerName);

export async function initializeStorage() {
  const exists = await containerClient.exists();

  if (!exists) {
    throw new Error(
      `Azure Blob Storage container "${containerName}" does not exist.`
    );
  }

  console.log('Azure Blob Storage connection successful.');
}

export { blobServiceClient, containerClient };
