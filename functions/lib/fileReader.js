const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 100000;

function fileKind(mimetype = "") {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype === "application/pdf") return "pdf";
  if (
    mimetype.startsWith("text/") ||
    mimetype === "application/json" ||
    mimetype === "application/xml" ||
    mimetype === "application/csv"
  ) {
    return "text";
  }
  return "unsupported";
}

async function downloadSlackFile(file, token) {
  const url = file.url_private_download || file.url_private;
  if (!url) throw new Error("Slack file has no private download URL");
  if (Number(file.size || 0) > MAX_FILE_BYTES) {
    throw new Error(`파일이 10MB를 초과합니다: ${file.name || "이름 없음"}`);
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error(`Slack 파일 다운로드 실패 (${response.status})`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_FILE_BYTES) {
    throw new Error(`파일이 10MB를 초과합니다: ${file.name || "이름 없음"}`);
  }
  return bytes;
}

async function buildFileContentBlocks(files = [], token) {
  const blocks = [];

  for (const file of files.slice(0, MAX_FILES)) {
    const name = file.name || file.title || "첨부파일";
    const kind = fileKind(file.mimetype);

    try {
      if (kind === "unsupported") {
        blocks.push({
          type: "text",
          text: `[${name}]은 현재 지원하지 않는 파일 형식입니다 (${file.mimetype || "형식 불명"}).`
        });
        continue;
      }

      const bytes = await downloadSlackFile(file, token);
      if (kind === "text") {
        const text = bytes.toString("utf8").slice(0, MAX_TEXT_CHARS);
        blocks.push({
          type: "text",
          text: `첨부파일 "${name}" 내용:\n\n${text}`
        });
      } else if (kind === "image") {
        blocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: file.mimetype,
            data: bytes.toString("base64")
          }
        });
        blocks.push({ type: "text", text: `위 이미지 파일명: ${name}` });
      } else if (kind === "pdf") {
        blocks.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: bytes.toString("base64")
          },
          title: name
        });
      }
    } catch (error) {
      blocks.push({
        type: "text",
        text: `[${name}]을 읽지 못했습니다: ${error.message}`
      });
    }
  }

  return blocks;
}

module.exports = {
  buildFileContentBlocks,
  downloadSlackFile,
  fileKind,
  MAX_FILES,
  MAX_FILE_BYTES
};
