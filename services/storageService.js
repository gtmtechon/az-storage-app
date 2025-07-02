// services/storageService.js
const { BlobServiceClient } = require("@azure/storage-blob");
const { ShareServiceClient } = require("@azure/storage-file-share");
const { ShareServiceClient, AzureSasCredential } = require('@azure/storage-file-share');

// const { getSecret } = require("../utils/keyvault"); // Key Vault 참조를 사용할 경우 이 줄은 필요 없습니다.

const getBlobServiceClient = async () => {
  const accountName = process.env.BLOB_STORAGE_ACCOUNT_NAME;
  const sasToken = process.env.BLOB_SAS_TOKEN; // Key Vault 참조를 통해 환경 변수로 주입된 SAS 토큰
  if (!sasToken) {
    throw new Error("BLOB_SAS_TOKEN environment variable is not set.");
  }
  const blobServiceUri = `https://${accountName}.blob.core.windows.net?${sasToken}`; // 이 URI는 BlobServiceClient를 초기화하는 데 사용됩니다.
  return new BlobServiceClient(blobServiceUri);
};

const getShareServiceClient = async () => {
  const accountName = process.env.FILE_SHARE_STORAGE_ACCOUNT_NAME;
  const sasToken = process.env.FILE_SAS_TOKEN; // Key Vault 참조를 통해 환경 변수로 주입된 SAS 토큰 (Azure Files용)
  if (!sasToken) {
    throw new Error("FILE_SAS_TOKEN environment variable is not set.");
  }
  const shareServiceUri = `https://${accountName}.file.core.windows.net?${sasToken}`;
  return new ShareServiceClient(shareServiceUri);
};

// getBlobFiles 함수를 수정합니다.
async function getBlobFiles(containerName) {
  try {
    const accountName = process.env.BLOB_STORAGE_ACCOUNT_NAME;
    const sasToken = process.env.BLOB_SAS_TOKEN; // 여기서 SAS 토큰을 다시 가져와야 합니다.

    if (!accountName || !sasToken) {
      throw new Error("BLOB_STORAGE_ACCOUNT_NAME or BLOB_SAS_TOKEN environment variable is not set.");
    }

    // BlobServiceClient는 SAS 토큰 없이도 생성할 수 있지만,
    // 파일을 List할 때는 필요하지 않고, URL을 구성할 때 필요합니다.
    const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const files = [];
    for await (const blob of containerClient.listBlobsFlat()) {
      // 올바른 URL 형식으로 조합
      const fileUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blob.name}?${sasToken}`;
      files.push({ name: blob.name, url: fileUrl });
    }
    return files;
  } catch (error) {
    console.error("Failed to list blobs:", error);
    throw error;
  }
}

async function getAzureFiles() {
  // 이 함수는 현재 SAS 토큰을 파일 URL에 직접 추가할 필요가 없습니다.
  // getShareServiceClient에서 이미 SAS 토큰을 사용하여 클라이언트를 초기화하기 때문입니다.
  // 다만, 필요하다면 Blob 파일처럼 명시적으로 URL을 구성할 수 있습니다.
  try {
    const accountName = process.env.FILE_SHARE_STORAGE_ACCOUNT_NAME;
    const sasToken = process.env.FILE_SAS_TOKEN;
    const fshareName = process.env.AZURE_FILE_SHARE_NAME; // 목록을 가져올 파일 공유 이름

    if (!accountName || !sasToken || !fshareName) {
      throw new Error("FILE_SHARE_STORAGE_ACCOUNT_NAME or FILE_SAS_TOKEN environment variable is not set.");
    }


     // AzureSasCredential을 사용하여 인증 정보 생성
        const sasCredential = new AzureSasCredential(AZURE_FILE_SHARE_SAS_TOKEN);

        // ShareServiceClient 초기화 (SAS 토큰 포함)
        // SAS 토큰은 파일 공유(Share) 수준에서 발급되어야 합니다.
        // URL 형식: https://<storageaccountname>.file.core.windows.net/<filesharename>?<sastoken>
        // 또는 ShareServiceClient에 sasCredential을 직접 전달합니다.
        const shareServiceClient = new ShareServiceClient(
            `https://${accountName}.file.core.windows.net`,sasCredential);

            // 특정 파일 공유 클라이언트 가져오기
        const shareClient = shareServiceClient.getShareClient(fshareName);

        // 파일 공유가 존재하는지 확인 (SAS 토큰에 따라 권한이 없을 수 있음)
        if (!(await shareClient.exists())) {
            console.error(`오류: 파일 공유 '${fshareName}'가 존재하지 않거나, SAS 토큰에 접근 권한이 없습니다.`);
            return;
        }

        // 루트 디렉토리 클라이언트 가져오기
        const directoryClient = shareClient.getDirectoryClient(''); // 루트 디렉토리

        console.log(`\n파일 공유 '${fshareName}'의 내용:`);




    //const shareServiceClient = new ShareServiceClient(`https://${accountName}.file.core.windows.net?${sasToken}`);
    const shares = [];
    for await (const shareItem of shareServiceClient.listShares()) {
      const shareClient = shareServiceClient.getShareClient(shareItem.name);
      const rootDirectoryClient = shareClient.getRootDirectoryClient();
      const filesInShare = [];
      for await (const directoryEntry of rootDirectoryClient.listFilesAndDirectories()) {
        if (directoryEntry.kind === "file") {
          // Azure Files는 SAS 토큰이 서비스 클라이언트에 포함되어 있으므로
          // 파일 URL은 일반적으로 `shareClient.url`을 기반으로 합니다.
          // 여기서도 명시적으로 SAS 토큰을 URL에 포함시키려면 아래처럼 할 수 있습니다.
          const fileUrl = `${shareClient.url}/${directoryEntry.name}?${sasToken}`;
          filesInShare.push({
            name: directoryEntry.name,
            url: fileUrl,
            shareName: shareItem.name
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