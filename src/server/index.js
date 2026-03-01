import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { analyzeArabicStudentText } from "./analyzer.js";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const CLIENT_ROOT = resolve(process.cwd(), "src/client");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload, null, 2));
}

async function parseJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function serveStaticAsset(pathname, res) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const safeFilePath = resolve(CLIENT_ROOT, `.${requestedPath}`);

  if (!safeFilePath.startsWith(CLIENT_ROOT)) {
    sendJson(res, 403, {
      error: "FORBIDDEN_PATH",
      message: "المسار المطلوب غير مسموح به."
    });
    return;
  }

  try {
    const fileContent = await readFile(safeFilePath);
    const extension = extname(safeFilePath);

    res.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream"
    });
    res.end(fileContent);
  } catch {
    sendJson(res, 404, {
      error: "NOT_FOUND",
      message: "الملف المطلوب غير موجود."
    });
  }
}

async function handleAnalyzeRequest(req, res) {
  const body = await parseJsonBody(req);

  if (body === null) {
    sendJson(res, 400, {
      error: "INVALID_JSON",
      message: "صيغة JSON غير صحيحة."
    });
    return;
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const topic = typeof body.topic === "string" ? body.topic.trim() : "عام";
  const gradeLevel = typeof body.gradeLevel === "string" ? body.gradeLevel.trim() : "متوسط";

  if (text.length < 20) {
    sendJson(res, 422, {
      error: "TEXT_TOO_SHORT",
      message: "الرجاء إدخال نص عربي أطول (20 حرفًا على الأقل)."
    });
    return;
  }

  if (text.length > 5000) {
    sendJson(res, 422, {
      error: "TEXT_TOO_LONG",
      message: "النص طويل جدًا للنموذج الأولي. الحد الأقصى هو 5000 حرف."
    });
    return;
  }

  const result = await analyzeArabicStudentText({
    text,
    topic,
    gradeLevel,
    enableLlm: true
  });

  sendJson(res, 200, result);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, {
      service: "VisionEduHub Smart Teacher's Assistant",
      status: "ok",
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (url.pathname === "/api/analyze-text" && req.method === "POST") {
    await handleAnalyzeRequest(req, res);
    return;
  }

  if (req.method === "GET") {
    await serveStaticAsset(url.pathname, res);
    return;
  }

  sendJson(res, 405, {
    error: "METHOD_NOT_ALLOWED",
    message: "الطريقة المطلوبة غير مدعومة لهذا المسار."
  });
});

server.listen(PORT, HOST, () => {
  console.log(`VisionEduHub server running on http://${HOST}:${PORT}`);
});
