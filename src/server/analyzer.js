const COMMON_MISTAKE_RULES = [
  {
    target: "الى",
    replacement: "إلى",
    category: "grammar",
    severity: "medium",
    explanation: "كلمة (إلى) تكتب بهمزة قطع في أول الكلمة.",
    suggestion: "استخدم: إلى"
  },
  {
    target: "ان",
    replacement: "أن",
    category: "grammar",
    severity: "medium",
    explanation: "في كثير من السياقات النحوية تستخدم (أن) وليس (ان).",
    suggestion: "راجع أداة النصب المناسبة للسياق واستبدلها بـ(أن) إن لزم."
  },
  {
    target: "اهمية",
    replacement: "أهمية",
    category: "grammar",
    severity: "medium",
    explanation: "الصواب الإملائي هو (أهمية) بهمزة قطع.",
    suggestion: "استخدم: أهمية"
  },
  {
    target: "لانها",
    replacement: "لأنها",
    category: "grammar",
    severity: "medium",
    explanation: "الصواب الإملائي هو (لأنها) بهمزة قطع.",
    suggestion: "استخدم: لأنها"
  },
  {
    target: "هاذا",
    replacement: "هذا",
    category: "grammar",
    severity: "high",
    explanation: "الصواب الإملائي لاسم الإشارة هو (هذا).",
    suggestion: "استخدم: هذا"
  },
  {
    target: "هاذه",
    replacement: "هذه",
    category: "grammar",
    severity: "high",
    explanation: "الصواب الإملائي لاسم الإشارة المؤنث هو (هذه).",
    suggestion: "استخدم: هذه"
  },
  {
    target: "اللذي",
    replacement: "الذي",
    category: "grammar",
    severity: "high",
    explanation: "الصواب الإملائي للاسم الموصول هو (الذي).",
    suggestion: "استخدم: الذي"
  },
  {
    target: "التي قامو",
    replacement: "التي قاموا",
    category: "grammar",
    severity: "high",
    explanation: "واو الجماعة في الفعل الماضي تكتب (قاموا).",
    suggestion: "استخدم: قاموا"
  },
  {
    target: "لكن",
    replacement: "لكن",
    detectOnly: true,
    category: "rhetoric",
    severity: "low",
    explanation: "قد تفقد (لكن) قوتها الحجاجية عندما تتكرر كثيرًا.",
    suggestion: "نوّع أدوات الربط: غير أن، مع ذلك، في المقابل."
  }
];

const WEAK_OPENINGS = [
  /في\s+هذا\s+الموضوع\s+سوف\s+[أا]تحدث/i,
  /سأتحدث\s+في\s+هذا\s+المقال/i,
  /موضوعنا\s+اليوم\s+هو/i
];

const CLICHE_PATTERNS = [
  /لا\s+شك\s+أن/i,
  /مما\s+لا\s+يدع\s+مجالا\s+للشك/i,
  /من\s+الجدير\s+بالذكر/i
];

const SIMILE_MARKERS = ["كأن", "كـ", "مثل", "يشبه", "كأنما"];
const STOPWORDS = new Set([
  "في", "من", "على", "إلى", "الى", "عن", "أن", "ان", "ما", "لا", "لم", "لن", "هو", "هي", "هم", "هن", "هذا", "هذه", "ذلك", "تلك", "كان", "كانت", "وقد", "ثم", "مع", "كما", "أيضا", "ايضا"
]);

function normalizeArabicText(text) {
  return text
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .trim();
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?؟؛])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function tokenize(text) {
  return text
    .replace(/[^\u0600-\u06FF\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1);
}

function createIssue({ id, category, severity, snippet, explanation, suggestion, start, end }) {
  return {
    id,
    category,
    severity,
    snippet,
    explanation,
    suggestion,
    position: {
      start,
      end
    }
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildArabicBoundaryRegex(target) {
  const escapedTarget = escapeRegex(target).replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^\\u0600-\\u06FF])(${escapedTarget})(?=$|[^\\u0600-\\u06FF])`, "gi");
}

function detectRuleBasedIssues(text, startId) {
  const issues = [];
  let issueId = startId;

  for (const rule of COMMON_MISTAKE_RULES) {
    const regex = buildArabicBoundaryRegex(rule.target);
    let match = regex.exec(text);

    while (match) {
      const startIndex = match.index + (match[1] ? match[1].length : 0);
      const replacementHint = rule.replacement ? ` (بديل مقترح: ${rule.replacement})` : "";

      issues.push(
        createIssue({
          id: `ISS-${issueId++}`,
          category: rule.category,
          severity: rule.severity,
          snippet: match[2],
          explanation: rule.explanation,
          suggestion: `${rule.suggestion}${replacementHint}`,
          start: startIndex,
          end: startIndex + match[2].length
        })
      );

      match = regex.exec(text);
    }
  }

  return { issues, nextId: issueId };
}

function detectPunctuationIssues(text, startId) {
  const issues = [];
  let issueId = startId;

  const badCommaSpacing = /\s+,|,\S/g;
  let commaMatch = badCommaSpacing.exec(text);

  while (commaMatch) {
    issues.push(
      createIssue({
        id: `ISS-${issueId++}`,
        category: "grammar",
        severity: "medium",
        snippet: commaMatch[0],
        explanation: "فواصل الجملة تحتاج ضبط المسافة أو استخدام الفاصلة العربية (،).",
        suggestion: "استخدم (،) العربية مع مسافة بعدها عند الحاجة.",
        start: commaMatch.index,
        end: commaMatch.index + commaMatch[0].length
      })
    );

    commaMatch = badCommaSpacing.exec(text);
  }

  if (!/[.!?؟]/.test(text)) {
    issues.push(
      createIssue({
        id: `ISS-${issueId++}`,
        category: "grammar",
        severity: "low",
        snippet: text.slice(0, Math.min(28, text.length)),
        explanation: "النص يخلو تقريبًا من علامات إنهاء الجمل.",
        suggestion: "قسّم الفكرة إلى جمل قصيرة واضحة بعلامات ترقيم مناسبة.",
        start: 0,
        end: Math.min(28, text.length)
      })
    );
  }

  return { issues, nextId: issueId };
}

function detectSentenceFlowIssues(sentences, rawText, startId) {
  const issues = [];
  let issueId = startId;

  sentences.forEach((sentence) => {
    const words = sentence.split(/\s+/).filter(Boolean);

    if (words.length > 30) {
      const start = rawText.indexOf(sentence);
      issues.push(
        createIssue({
          id: `ISS-${issueId++}`,
          category: "rhetoric",
          severity: "medium",
          snippet: sentence.slice(0, 55),
          explanation: "الجملة طويلة جدًا وقد تضعف الوضوح والإيقاع البلاغي.",
          suggestion: "قسّم الجملة إلى جملتين أو ثلاث مع روابط منطقية.",
          start,
          end: start + sentence.length
        })
      );
    }

    if (words.length < 4) {
      const start = rawText.indexOf(sentence);
      issues.push(
        createIssue({
          id: `ISS-${issueId++}`,
          category: "rhetoric",
          severity: "low",
          snippet: sentence,
          explanation: "الجملة قصيرة جدًا وقد تبدو مبتورة دلاليًا.",
          suggestion: "أضف سببا أو نتيجة أو مثالا يعزز الفكرة.",
          start,
          end: start + sentence.length
        })
      );
    }
  });

  return { issues, nextId: issueId };
}

function detectRepetitionIssues(tokens, startId) {
  const issues = [];
  let issueId = startId;
  const frequencies = new Map();

  tokens.forEach((token) => {
    if (STOPWORDS.has(token)) {
      return;
    }

    frequencies.set(token, (frequencies.get(token) || 0) + 1);
  });

  for (const [word, count] of frequencies.entries()) {
    if (count >= 3) {
      issues.push(
        createIssue({
          id: `ISS-${issueId++}`,
          category: "rhetoric",
          severity: "medium",
          snippet: word,
          explanation: `تكرار كلمة (${word}) بمعدل ${count} مرات قد يضعف التنويع التعبيري.`,
          suggestion: "استبدل بعض التكرارات بمرادفات أو تراكيب بلاغية.",
          start: -1,
          end: -1
        })
      );
    }
  }

  return { issues, nextId: issueId };
}

function detectStyleIssues(text, startId) {
  const issues = [];
  let issueId = startId;

  WEAK_OPENINGS.forEach((pattern) => {
    if (pattern.test(text)) {
      issues.push(
        createIssue({
          id: `ISS-${issueId++}`,
          category: "rhetoric",
          severity: "high",
          snippet: "افتتاحية تقليدية مباشرة",
          explanation: "البداية تقليدية ولا تبني صورة ذهنية قوية لدى القارئ.",
          suggestion: "ابدأ بسؤال صادم، مشهد قصير، أو مقارنة دلالية تعمق الفكرة.",
          start: 0,
          end: Math.min(40, text.length)
        })
      );
    }
  });

  CLICHE_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) {
      issues.push(
        createIssue({
          id: `ISS-${issueId++}`,
          category: "rhetoric",
          severity: "low",
          snippet: "عبارة تقريرية مكررة",
          explanation: "الاعتماد على قوالب جاهزة يضعف التميز البلاغي.",
          suggestion: "استبدل العبارة بمعلومة محددة أو صورة حسية أدق.",
          start: 0,
          end: Math.min(36, text.length)
        })
      );
    }
  });

  const hasImagery = SIMILE_MARKERS.some((marker) => text.includes(marker));
  if (!hasImagery && text.length > 90) {
    issues.push(
      createIssue({
        id: `ISS-${issueId++}`,
        category: "rhetoric",
        severity: "low",
        snippet: "نص مباشر دون صور بيانية واضحة",
        explanation: "لا يظهر في النص توظيف كاف للتشبيه أو الصورة البلاغية.",
        suggestion: "أضف تشبيهًا واحدًا على الأقل لتقوية التأثير الدلالي.",
        start: 0,
        end: Math.min(48, text.length)
      })
    );
  }

  return { issues, nextId: issueId };
}

function applyCoreCorrections(text) {
  let improved = text;

  COMMON_MISTAKE_RULES.forEach((rule) => {
    if (rule.detectOnly || !rule.replacement) {
      return;
    }

    const regex = buildArabicBoundaryRegex(rule.target);
    improved = improved.replace(regex, (fullMatch, prefix) => `${prefix || ""}${rule.replacement}`);
  });

  improved = improved
    .replace(/\s+,\s*/g, "، ")
    .replace(/\s+\./g, ".")
    .replace(/\s+/g, " ")
    .trim();

  if (WEAK_OPENINGS.some((pattern) => pattern.test(improved))) {
    improved = improved.replace(
      WEAK_OPENINGS[0],
      "يفرض هذا الموضوع سؤالا جوهريا: كيف نصوغ الفكرة التعليمية بوضوح وإقناع؟"
    );
  }

  return improved;
}

function buildCreativeAlternatives(sentences) {
  const alternatives = [];

  if (sentences.length === 0) {
    return alternatives;
  }

  const first = sentences[0];
  alternatives.push(`صياغة افتتاحية بديلة: حين تتكلم المعرفة بلغة واضحة، يتحول الصف إلى مساحة اكتشاف لا تلقين.`);
  alternatives.push(`صياغة حجاجية بديلة: لا تتقدم جودة التعلم بكثرة المعلومات فقط، بل بدقة التعبير الذي ينظمها.`);

  if (first.length > 0) {
    alternatives.push(`صياغة سردية بديلة: في بداية الحصة، بدا النص عاديا، لكنه كشف مع كل جملة عن فكرة أعمق مما توقع الطلاب.`);
  }

  return alternatives;
}

function scoreReadability(sentences, issuesCount) {
  if (sentences.length === 0) {
    return 0;
  }

  const avgLength = sentences.reduce((sum, sentence) => sum + sentence.split(/\s+/).length, 0) / sentences.length;
  const lengthPenalty = Math.max(0, avgLength - 18) * 1.3;
  const issuePenalty = issuesCount * 1.8;

  return Math.max(0, Math.round(100 - lengthPenalty - issuePenalty));
}

function scoreCreativity(text, rhetoricIssues) {
  const imageryBonus = SIMILE_MARKERS.some((marker) => text.includes(marker)) ? 12 : 0;
  const rhetoricPenalty = rhetoricIssues.length * 4;
  const lexicalRange = new Set(tokenize(text)).size;

  return Math.max(0, Math.min(100, 45 + imageryBonus + lexicalRange * 0.6 - rhetoricPenalty));
}

async function requestLlmRefinement({ text, baselineAnalysis }) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || typeof fetch !== "function") {
    return null;
  }

  const prompt = [
    "أنت خبير لغة عربية وبلاغة.",
    "حسّن النص التالي مع الحفاظ على فكرته التعليمية.",
    "قدم مخرجا JSON فقط بالمفاتيح: improvedDraft, rhetoricalAdvice.",
    "النص:",
    text,
    "ملخص الأخطاء المرصودة:",
    JSON.stringify(baselineAnalysis.issues.slice(0, 8))
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_ANALYZER_MODEL || "gpt-4.1-mini",
        input: prompt,
        max_output_tokens: 500,
        text: {
          format: {
            type: "json_object"
          }
        }
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const outputText = payload.output_text;

    if (!outputText) {
      return null;
    }

    const parsed = JSON.parse(outputText);

    if (!parsed.improvedDraft || typeof parsed.improvedDraft !== "string") {
      return null;
    }

    return {
      improvedDraft: parsed.improvedDraft.trim(),
      rhetoricalAdvice: typeof parsed.rhetoricalAdvice === "string" ? parsed.rhetoricalAdvice.trim() : null
    };
  } catch {
    return null;
  }
}

export async function analyzeArabicStudentText({ text, gradeLevel = "متوسط", topic = "عام", enableLlm = true }) {
  const normalizedText = normalizeArabicText(text || "");
  const sentences = splitSentences(normalizedText);
  const tokens = tokenize(normalizedText);

  let issueIdSeed = 1;

  const ruleBased = detectRuleBasedIssues(normalizedText, issueIdSeed);
  issueIdSeed = ruleBased.nextId;

  const punctuation = detectPunctuationIssues(normalizedText, issueIdSeed);
  issueIdSeed = punctuation.nextId;

  const flow = detectSentenceFlowIssues(sentences, normalizedText, issueIdSeed);
  issueIdSeed = flow.nextId;

  const repetition = detectRepetitionIssues(tokens, issueIdSeed);
  issueIdSeed = repetition.nextId;

  const style = detectStyleIssues(normalizedText, issueIdSeed);

  const issues = [
    ...ruleBased.issues,
    ...punctuation.issues,
    ...flow.issues,
    ...repetition.issues,
    ...style.issues
  ].sort((a, b) => a.position.start - b.position.start);

  const grammarIssues = issues.filter((issue) => issue.category === "grammar");
  const rhetoricIssues = issues.filter((issue) => issue.category === "rhetoric");

  const baselineAnalysis = {
    issues,
    summary: {
      grammarIssues: grammarIssues.length,
      rhetoricIssues: rhetoricIssues.length,
      readabilityScore: scoreReadability(sentences, issues.length),
      creativityScore: Math.round(scoreCreativity(normalizedText, rhetoricIssues))
    }
  };

  let improvedDraft = applyCoreCorrections(normalizedText);
  const creativeAlternatives = buildCreativeAlternatives(sentences);

  let llmRefinement = null;
  if (enableLlm) {
    llmRefinement = await requestLlmRefinement({
      text: normalizedText,
      baselineAnalysis
    });

    if (llmRefinement?.improvedDraft) {
      improvedDraft = llmRefinement.improvedDraft;
    }

    if (llmRefinement?.rhetoricalAdvice) {
      creativeAlternatives.push(`نصيحة بلاغية مدعومة بالذكاء الاصطناعي: ${llmRefinement.rhetoricalAdvice}`);
    }
  }

  return {
    meta: {
      analyzedAt: new Date().toISOString(),
      gradeLevel,
      topic,
      llmAugmentationUsed: Boolean(llmRefinement)
    },
    summary: baselineAnalysis.summary,
    issues,
    improvedDraft,
    creativeAlternatives
  };
}
