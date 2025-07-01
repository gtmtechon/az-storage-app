// services/storageService.js
const { BlobServiceClient } = require("@azure/storage-blob");
const { ShareServiceClient } = require("@azure/storage-file-share");
const { getSecret } = require("../utils/keyvault");

const getBlobServiceClient = async () => {
  const accountName = process.env.BLOB_STORAGE_ACCOUNT_NAME;
  const sasToken = await getSecret(process.env.BLOB_STORAGE_SAS_TOKEN_SECRET_NAME);
  const blobServiceUri = `https://${accountName}.blob.core.windows.net?${sasToken}`;
  return new BlobServiceClient(blobServiceUri);
};

const getShareServiceClient = async () => {
  const accountName = process.env.FILE_SHARE_STORAGE_ACCOUNT_NAME;
  const sasToken = await getSecret(process.env.FILE_SHARE_SAS_TOKEN_SECRET_NAME);
  const shareServiceUri = `https://${accountName}.file.core.windows.net?${sasToken}`;
  return new ShareServiceClient(shareServiceUri);
};

async function getBlobFiles(containerName) {
  try {
    const blobServiceClient = await getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const files = [];
    for await (const blob of containerClient.listBlobsFlat()) {
      files.push({ name: blob.name, url: `${containerClient.url}/${blob.name}` });
    }
    return files;
  } catch (error) {
    console.error("Failed to list blobs:", error);
    throw error;
  }
}

async function getAzureFiles() {
  try {
    const shareServiceClient = await getShareServiceClient();
    const shares = [];
    for await (const shareItem of shareServiceClient.listShares()) {
      const shareClient = shareServiceClient.getShareClient(shareItem.name);
      const rootDirectoryClient = shareClient.getRootDirectoryClient();
      const filesInShare = [];
      for await (const directoryEntry of rootDirectoryClient.listFilesAndDirectories()) {
        if (directoryEntry.kind === "file") {
          filesInShare.push({
            name: directoryEntry.name,
            url: `${shareClient.url}/${directoryEntry.name}`,
            shareName: shareItem.name // 파일이 속한 공유 이름 추가
          });
        }
      }
      shares.push({ name: shareItem.name, files: filesInShare });
    }
    return shares;
  } catch (error) {
    console.error("Failed to list Azure Files shares and files:", error);
    throw error;
  }
}

module.exports = {
  getBlobFiles,
  getAzureFiles,
};