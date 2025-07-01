
// services/storageService.js (수정 후)
const { BlobServiceClient } = require("@azure/storage-blob");
const { ShareServiceClient } = require("@azure/storage-file-share");
// const { getSecret } = require("../utils/keyvault"); // 이 줄은 이제 필요 없습니다.

const getBlobServiceClient = async () => {
  const accountName = process.env.BLOB_STORAGE_ACCOUNT_NAME;
  const sasToken = process.env.BLOB_SAS_TOKEN; // App Service 환경 변수에서 직접 가져옴
  if (!sasToken) {
    throw new Error("BLOB_SAS_TOKEN environment variable is not set.");
  }
  const blobServiceUri = `https://${accountName}.blob.core.windows.net?${sasToken}`;
  return new BlobServiceClient(blobServiceUri);
};

const getShareServiceClient = async () => {
  const accountName = process.env.FILE_SHARE_STORAGE_ACCOUNT_NAME;
  const sasToken = process.env.FILE_SAS_TOKEN; // App Service 환경 변수에서 직접 가져옴 (예시)
  if (!sasToken) {
    throw new Error("FILE_SAS_TOKEN environment variable is not set.");
  }
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