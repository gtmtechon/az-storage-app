// app.js
//require("dotenv").config(); // .env 파일 로드
const express = require("express");
const path = require("path");
const { getBlobFiles, getAzureFiles } = require("./services/storageService");



const app = express();
const port = process.env.PORT || 3000;

// EJS 템플릿 엔진 설정
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, "public")));

// --- 라우팅 ---

// 루트 페이지 (메인 메뉴)
app.get("/", (req, res) => {
  res.render("index");
});

// Blob Storage 파일 목록 페이지
app.get("/blob-files", async (req, res) => {
  const containerName = process.env.BLOB_CONTAINER_NAME;
  if (!containerName) {
    return res.status(500).send("BLOB_CONTAINER_NAME is not defined in environment variables.");
  }
  try {
    const files = await getBlobFiles(containerName);
    res.render("blobFiles", { containerName, files });
  } catch (error) {
    console.error("Error fetching blob files:", error);
    res.status(500).send("Error fetching blob files. Please check logs for details.");
  }
});

// Azure Files 공유 및 파일 목록 페이지
app.get("/azure-files", async (req, res) => {
  try {
    const shares = await getAzureFiles();
    res.render("azureFiles", { shares });
  } catch (error) {
    console.error("Error fetching Azure files:", error);
    res.status(500).send("Error fetching Azure files. Please check logs for details.");
  }
});


// 서버 시작
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});