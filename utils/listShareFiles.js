// listShareFiles.js

// dotenv 패키지를 사용하여 .env 파일의 환경 변수를 로드합니다.
// 이 줄은 스크립트의 가장 상단에 위치해야 합니다.
require('dotenv').config();

const { ShareServiceClient, StorageSharedKeyCredential } = require('@azure/storage-file-share');

// 환경 변수에서 Azure Storage 계정 정보 로드
// 이 변수들은 .env 파일에 설정되어 있어야 합니다.
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const AZURE_STORAGE_ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY; // 스토리지 계정 액세스 키
const AZURE_FILE_SHARE_NAME = process.env.AZURE_FILE_SHARE_NAME; // 목록을 가져올 파일 공유 이름

async function listShareContents() {
    console.log('Azure File Share 목록을 스토리지 계정 키 기반으로 조회합니다...');

    // 필수 환경 변수가 설정되었는지 확인
    if (!AZURE_STORAGE_ACCOUNT_NAME || !AZURE_STORAGE_ACCOUNT_KEY || !AZURE_FILE_SHARE_NAME) {
        console.error('오류: 다음 환경 변수 중 하나 이상이 설정되지 않았습니다:');
        console.error('  - AZURE_STORAGE_ACCOUNT_NAME');
        console.error('  - AZURE_STORAGE_ACCOUNT_KEY');
        console.error('  - AZURE_FILE_SHARE_NAME');
        console.error('\n.env 파일 또는 환경 변수를 확인하고 스크립트를 다시 실행해주세요.');
        return;
    }

    try {
        // StorageSharedKeyCredential을 사용하여 스토리지 계정 이름과 키로 인증 정보 생성
        const sharedKeyCredential = new StorageSharedKeyCredential(
            AZURE_STORAGE_ACCOUNT_NAME,
            AZURE_STORAGE_ACCOUNT_KEY
        );

        // ShareServiceClient 초기화 (스토리지 계정 URL과 SharedKeyCredential 사용)
        const shareServiceClient = new ShareServiceClient(
            `https://${AZURE_STORAGE_ACCOUNT_NAME}.file.core.windows.net`,
            sharedKeyCredential
        );

        // 특정 파일 공유 클라이언트 가져오기
        //const shareClient = shareServiceClient.getShareClient(AZURE_FILE_SHARE_NAME);
        

            let ia = 1;
    for await (const share of shareServiceClient.listShares()) {
    console.log(`Share ${ia++}: ${share.name}`);
    }

    const shareClient = shareServiceClient.getShareClient('pictures');

        // 파일 공유가 존재하는지 확인
        /*
        const shareExists = await shareClient.exists();
        if (!shareExists) {
            console.error(`오류: 파일 공유 '${AZURE_FILE_SHARE_NAME}'가 존재하지 않습니다.`);
            console.error(`      스토리지 계정 이름 또는 파일 공유 이름이 올바른지 확인하세요.`);
            return;
        }
            **/


        // 루트 디렉토리 클라이언트 가져오기 (파일 공유의 루트를 의미)
        const directoryClient = shareClient.getDirectoryClient('');

        console.log(`\n파일 공유 '${AZURE_FILE_SHARE_NAME}'의 내용:`);
        let i = 1;
        // 파일 및 디렉토리 목록을 순회하며 출력
        for await (const item of directoryClient.listFilesAndDirectories()) {
            if (item.kind === 'directory') {
                console.log(`${i++}. [디렉토리] ${item.name}`);
            } else {
                console.log(`${i++}. [파일] ${item.name} (크기: ${item.fileSize} 바이트)`);
            }
        }
        console.log('\n성공적으로 파일 공유 목록을 조회했습니다.');

    } catch (error) {
        console.error('파일 공유 목록 조회 중 오류 발생:', error.message);
        if (error.statusCode === 401) {
            console.error('인증 실패 (401): 스토리지 계정 키가 유효하지 않거나 권한이 없습니다. 키의 정확성을 확인하세요.');
            console.error('  - 오류 상세: ', error.details);
        } else if (error.statusCode === 403) {
            console.error('액세스 거부 (403): 스토리지 계정 키에 필요한 권한이 부족하거나, 스토리지 계정의 네트워크 설정이 접근을 차단할 수 있습니다.');
            console.error('  - 오류 상세: ', error.details);
        } else if (error.statusCode === 404) {
            console.error('찾을 수 없음 (404): 스토리지 계정 이름 또는 파일 공유 이름이 올바른지 확인하세요.');
        } else {
            console.error('알 수 없는 오류:', error);
        }
    }
}

// 함수 실행
listShareContents();
