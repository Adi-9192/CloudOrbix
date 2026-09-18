import { BlobServiceClient } from "@azure/storage-blob";

const connectionString =
  process.env.AZURE_STORAGE_CONNECTION_STRING;

const containerName =
  process.env.AZURE_STORAGE_CONTAINER_NAME;

if (!connectionString) {
  throw new Error(
    "AZURE_STORAGE_CONNECTION_STRING environment variable is not configured"
  );
}

if (!containerName) {
  throw new Error(
    "AZURE_STORAGE_CONTAINER_NAME environment variable is not configured"
  );
}

const blobServiceClient =
  BlobServiceClient.fromConnectionString(connectionString);

const containerClient =
  blobServiceClient.getContainerClient(containerName);

export { blobServiceClient, containerClient };
