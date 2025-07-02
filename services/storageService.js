const { BlobServiceClient } = require("@azure/storage-blob");
const { ShareServiceClient, StorageSharedKeyCredential } = require('@azure/storage-file-share');


// getBlobFiles 함수를 수정합니다.
async function getBlobFiles(containerName) {
  try {
    const accountName = process.env.BLOB_STORAGE_ACCOUNT_NAME;
    const sasToken = process.env.BLOB_SAS_TOKEN; // 여기서 SAS 토큰을 다시 가져와야 합니다.
    console.log('${sasToken}');

    
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
      console.log(`[getblobfiles]Blob found: ${blob.name} - URL: ${fileUrl}`);
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
// 환경 변수에서 Azure Storage 계정 정보 및 SAS 토큰 로드
    const accountName = process.env.FILE_SHARE_STORAGE_ACCOUNT_NAME;
    const acckey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const fshareName=process.env.AZURE_FILE_SHARE_NAME;


    if (!accountName || !sasToken || !fshareName) {
      throw new Error("FILE_SHARE_STORAGE_ACCOUNT_NAME or FILE_SAS_TOKEN environment variable is not set.");
    }

    let azfilesInShare = [];
    const shareName = 'Mounted Azure File Share'; // 단일 마운트된 공유이므로 고정된 이름 사용

    const sharedKeyCredential = new StorageSharedKeyCredential(
            accountName,
            acckey
        );

        // ShareServiceClient 초기화 (스토리지 계정 URL과 SharedKeyCredential 사용)
        const shareServiceClient = new ShareServiceClient(
            `https://${accountName}.file.core.windows.net`,
            sharedKeyCredential
        );


            // 특정 파일 공유 클라이언트 가져오기
        const shareClient = shareServiceClient.getShareClient(fshareName);
 
        // 파일 공유가 존재하는지 확인 (SAS 토큰에 따라 권한이 없을 수 있음)
        /*
        if (!(await shareClient.exists())) {
            console.error(`오류: 파일 공유 '${fshareName}'가 존재하지 않거나, SAS 토큰에 접근 권한이 없습니다.`);
            return;
        }
            */
         

      const shares = [];
      const directoryClient = shareClient.getDirectoryClient('');
      const filesInShare = [];

      for await (const item of directoryClient.listFilesAndDirectories()) {
        if (item.kind === "file") {
          // Azure Files는 SAS 토큰이 서비스 클라이언트에 포함되어 있으므로
          // 파일 URL은 일반적으로 `shareClient.url`을 기반으로 합니다.
          // 여기서도 명시적으로 SAS 토큰을 URL에 포함시키려면 아래처럼 할 수 있습니다.
          const fileUrl = `${shareClient.url}/${item.name}?${sasToken}`;
          filesInShare.push({
            name: item.name,
            url: fileUrl,
            shareName: item.name
          });
        }
       }
      shares.push({ name: fshareName, files: filesInShare });
   
    return shares;
  } catch (error) {
    console.error("Failed to list Azure Files shares and files:", error);
    throw error;
  }
}


/**
 * SMB files
 * @returns 
 */
async function getSMBFiles() {

    const MOUNT_PATH = '/mnt/appdata';
    const fs = require('fs').promises;
    const path = require('path');

    console.log(`마운트된 경로 '${MOUNT_PATH}'에서 파일 목록을 조회합니다.`);
    let smbfilesInShare = [];
    const smbshareName = 'Mounted Azure File Share'; // 단일 마운트된 공유이므로 고정된 이름 사용

    try {
        // 마운트 경로가 존재하는지 확인
        await fs.access(MOUNT_PATH);

        const files = await fs.readdir(MOUNT_PATH);
        // 숨김 파일이나 시스템 파일 제외 (선택 사항)
        const filteredFiles = files.filter(file => !file.startsWith('.'));

        for (const file of filteredFiles) {
            // 파일의 전체 경로
            const fullPath = path.join(MOUNT_PATH, file);
            const stats = await fs.stat(fullPath);

            // 디렉토리는 제외하고 파일만 포함 (또는 디렉토리도 포함하려면 로직 변경)
            if (stats.isFile()) {
                // 웹에서 접근할 수 있는 URL 생성
                // 파일은 '/files/:filename' 라우트를 통해 서빙됩니다.
                const fileUrl = `/files/${encodeURIComponent(file)}`;

                smbfilesInShare.push({
                    name: file,
                    url: fileUrl,
                    shareName: smbshareName // EJS 템플릿에 맞춰 shareName 추가
                });
            }
        }
        console.log(`총 ${smbfilesInShare.length}개의 파일을 찾았습니다.`);
        // EJS 템플릿의 'shares' 형식에 맞춰 배열 반환
        return [{ name: shareName, files: smbfilesInShare }];

    } catch (error) {
        console.error('getSMBFiles 함수에서 오류 발생:', error);
        if (error.code === 'ENOENT') {
            throw new Error(`마운트 경로 '${MOUNT_PATH}'를 찾을 수 없습니다. App Service 마운트 설정을 확인해주세요.`);
        } else if (error.code === 'EACCES') {
            throw new Error(`마운트 경로 '${MOUNT_PATH}'에 대한 접근 권한이 없습니다.`);
        } else {
            throw new Error(`파일 목록 조회 실패: ${error.message}`);
        }
    }
}


module.exports = {
  getBlobFiles,
  getAzureFiles,
  getSMBFiles
};