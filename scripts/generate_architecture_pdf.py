#!/usr/bin/env python3
"""Generate VisionEduHub architecture PDF without external dependencies."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "output" / "pdf" / "visioneduhub-architecture-deployment.pdf"
OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)


def build_summary_lines() -> list[str]:
  generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
  return [
    "VisionEduHub - Architecture and Deployment Brief",
    f"Generated: {generated_at}",
    "",
    "1) Product Intent",
    "- Arabic-first Smart Teacher's Assistant for classroom writing quality.",
    "- Detect grammar/spelling issues and rhetoric weaknesses.",
    "- Return improved draft plus creative alternatives.",
    "",
    "2) Recommended MVP Stack",
    "- Frontend: RTL dashboard (Liquid Glass and Spatial UI direction).",
    "- Backend: Node.js API with isolated analyzer module.",
    "- Data: PostgreSQL schema with typed enums and indexed analytics.",
    "- AI: Optional OpenAI augmentation; rule-based fallback is always available.",
    "",
    "3) Layered Architecture",
    "- Presentation Layer: src/client/*",
    "- Application Layer: src/server/index.js",
    "- NLP and AI Layer: src/server/analyzer.js",
    "- Data Layer: database/schema.sql",
    "",
    "4) Database Highlights",
    "- Core tables: users, lessons, analytics.",
    "- Extended MVP tables: lesson_enrollments, student_submissions.",
    "- Governance: constraints, timestamps, indexes, RLS enabled.",
    "",
    "5) Security Controls",
    "- Role segmentation (admin, teacher, student).",
    "- Input length limits and strict JSON parsing.",
    "- Minimal PII in analytics payloads.",
    "- Ready for JWT auth and tenant-scoped RLS policies.",
    "",
    "6) Scalability Plan",
    "- Add async workers for heavy analysis workloads.",
    "- Partition analytics by time windows.",
    "- Add Redis counters and read replicas for dashboards.",
    "",
    "7) Deployment Steps",
    "1. Install runtime dependencies and start API service.",
    "2. Provision PostgreSQL and apply database/schema.sql.",
    "3. Set env vars: PORT, OPENAI_API_KEY (optional).",
    "4. Configure reverse proxy, TLS, and observability.",
    "5. Run smoke checks for /api/health and /api/analyze-text.",
    "",
    "Output artifact:",
    "output/pdf/visioneduhub-architecture-deployment.pdf"
  ]


def pdf_escape(text: str) -> str:
  safe = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
  # Minimal PDF text engine below uses latin-1 encoding.
  return safe.encode("latin-1", "replace").decode("latin-1")


def write_minimal_pdf(path: Path, lines: list[str]) -> None:
  lines_per_page = 44
  chunks = [lines[i:i + lines_per_page] for i in range(0, len(lines), lines_per_page)] or [[""]]

  objects: dict[int, bytes] = {
    1: b"<< /Type /Catalog /Pages 2 0 R >>",
    2: b"",
    3: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  }

  next_obj = 4
  page_refs: list[int] = []

  for chunk in chunks:
    content_lines = ["BT", "/F1 11 Tf", "14 TL", "50 790 Td"]

    for idx, line in enumerate(chunk):
      if idx > 0:
        content_lines.append("T*")
      content_lines.append(f"({pdf_escape(line)}) Tj")

    content_lines.append("ET")
    content_stream = "\n".join(content_lines).encode("latin-1")

    content_obj = next_obj
    objects[content_obj] = (
      f"<< /Length {len(content_stream)} >>\nstream\n".encode("latin-1")
      + content_stream
      + b"\nendstream"
    )
    next_obj += 1

    page_obj = next_obj
    page_refs.append(page_obj)
    objects[page_obj] = (
      f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
      f"/Resources << /Font << /F1 3 0 R >> >> /Contents {content_obj} 0 R >>"
    ).encode("latin-1")
    next_obj += 1

  kids_refs = " ".join(f"{page_ref} 0 R" for page_ref in page_refs)
  objects[2] = f"<< /Type /Pages /Kids [ {kids_refs} ] /Count {len(page_refs)} >>".encode("latin-1")

  max_obj = max(objects)
  pdf = bytearray()
  pdf.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

  offsets = [0] * (max_obj + 1)
  for obj_number in range(1, max_obj + 1):
    offsets[obj_number] = len(pdf)
    pdf.extend(f"{obj_number} 0 obj\n".encode("latin-1"))
    pdf.extend(objects[obj_number])
    pdf.extend(b"\nendobj\n")

  xref_start = len(pdf)
  pdf.extend(f"xref\n0 {max_obj + 1}\n".encode("latin-1"))
  pdf.extend(b"0000000000 65535 f \n")

  for obj_number in range(1, max_obj + 1):
    pdf.extend(f"{offsets[obj_number]:010d} 00000 n \n".encode("latin-1"))

  pdf.extend(f"trailer\n<< /Size {max_obj + 1} /Root 1 0 R >>\n".encode("latin-1"))
  pdf.extend(f"startxref\n{xref_start}\n%%EOF\n".encode("latin-1"))

  path.write_bytes(bytes(pdf))


def main() -> None:
  lines = build_summary_lines()
  write_minimal_pdf(OUTPUT_PATH, lines)
  print(f"PDF generated: {OUTPUT_PATH}")


if __name__ == "__main__":
  main()
