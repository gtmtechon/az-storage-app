// services/storageService.js (수정 후)
const { BlobServiceClient } = require("@azure/storage-blob");
const { ShareServiceClient } = require("@azure/storage-file-share");
//const { getSecret } = require("../utils/keyvault"); // 이 줄은 이제 필요 없습니다.

const getBlobServiceClient = async () => {
  const accountName = process.env.BLOB_STORAGE_ACCOUNT_NAME;
  const sasToken = process.env.BLOB_SAS_TOKEN; // App Service 환경 변수에서 직접 가져옴
  if (!sasToken) {
    throw new Error("BLOB_SAS_TOKEN environment variable is not set.");
  }
  const blobServiceUri = `https://${accountName}.blob3.core.windows.net?${sasToken}`;
  return new BlobServiceClient(blobServiceUri);
};

const getShareServiceClient = async () => {
  const accountName = process.env.FILE_SHARE_STORAGE_ACCOUNT_NAME;
  const sasToken = process.env.FILE_SAS_TOKEN; // App Service 환경 변수에서 직접 가져옴 (예시)
  if (!sasToken) {
    throw new Error("FILE_SAS_TOKEN environment variable is not set.");
  }
  const shareServiceUri = `https://${accountName}.file3.core.windows.net?${sasToken}`;
  return new ShareServiceClient(shareServiceUri);
};

// ... 나머지 함수들은 동일

module.exports = {
  getBlobFiles,
  getAzureFiles,
};