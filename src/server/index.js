import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
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

const analyzeSchema = z.object({
  text: z
    .string({ required_error: "حقل النص مطلوب." })
    .min(20, "الرجاء إدخال نص عربي أطول (20 حرفًا على الأقل).")
    .max(5000, "النص طويل جدًا. الحد الأقصى هو 5000 حرف."),
  topic: z.string().max(100).optional().default("عام"),
  gradeLevel: z.enum(["ابتدائي", "متوسط", "ثانوي", "جامعي"]).optional().default("متوسط")
});

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json({ limit: "50kb" }));

const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    error: "RATE_LIMIT_EXCEEDED",
    message: "تجاوزت الحد المسموح به. حاول مجددًا بعد دقيقة."
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.get("/api/health", (_req, res) => {
  res.json({
    service: "VisionEduHub Smart Teacher's Assistant",
    status: "ok",
    version: "2.0.0",
    timestamp: new Date().toISOString()
  });
});

app.post("/api/analyze-text", analyzeLimiter, async (req, res) => {
  const parsed = analyzeSchema.safeParse(req.body);

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return res.status(422).json({
      error: "VALIDATION_ERROR",
      field: firstError.path[0] || "unknown",
      message: firstError.message
    });
  }

  const { text, topic, gradeLevel } = parsed.data;

  try {
    const result = await analyzeArabicStudentText({
      text,
      topic,
      gradeLevel,
      enableLlm: true
    });

    return res.json(result);
  } catch (err) {
    console.error("[analyzer] error:", err);
    return res.status(500).json({
      error: "ANALYSIS_FAILED",
      message: "حدث خطأ أثناء تحليل النص. حاول مجددًا."
    });
  }
});

app.use(async (req, res) => {
  const safePath = req.path === "/" ? "/index.html" : req.path;
  const filePath = resolve(CLIENT_ROOT, `.${safePath}`);

  if (!filePath.startsWith(CLIENT_ROOT)) {
    return res.status(403).json({ error: "FORBIDDEN_PATH", message: "المسار غير مسموح به." });
  }

  try {
    const content = await readFile(filePath);
    const ext = extname(filePath);
    res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
    return res.end(content);
  } catch {
    return res.status(404).json({ error: "NOT_FOUND", message: "الملف غير موجود." });
  }
});

app.use((err, _req, res, _next) => {
  console.error("[server] unhandled error:", err);
  res.status(500).json({ error: "INTERNAL_ERROR", message: "خطأ داخلي في الخادم." });
});

app.listen(PORT, HOST, () => {
  console.log(`VisionEduHub server running on http://${HOST}:${PORT}`);
});
