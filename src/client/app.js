const form = document.getElementById("analyzerForm");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusText = document.getElementById("statusText");
const sampleBtn = document.getElementById("sampleBtn");

const readabilityMetric = document.getElementById("readabilityMetric");
const creativityMetric = document.getElementById("creativityMetric");
const grammarMetric = document.getElementById("grammarMetric");
const rhetoricMetric = document.getElementById("rhetoricMetric");

const issuesList = document.getElementById("issuesList");
const improvedDraft = document.getElementById("improvedDraft");
const creativeList = document.getElementById("creativeList");
const textInput = document.getElementById("textInput");

const SAMPLE_TEXTS = [
  "في هذا الموضوع سوف اتحدث عن أهمية الوقت و ان الطالب اذا نظم وقته فانه ينجح لكن كثير من الطلاب يهدرون الوقت في اشياء بسيطة جدا",
  "التعلم الرقمي مفيد لكنه ليس بديلا كاملا عن المعلم، فالطالب يحتاج إلى قدوة و تفاعل مباشر، لذلك يجب أن نستخدم التقنية بعقل تربوي متوازن",
  "اللغة العربية جميلة جدا جدا جدا ولكن بعض الطلاب يكتبون بسرعة دون مراجعة وهذا يجعل المعنى ضعيفا ويؤدي الى أخطاء كثيرة"
];

function renderMetrics(summary) {
  readabilityMetric.textContent = `${summary.readabilityScore}%`;
  creativityMetric.textContent = `${summary.creativityScore}%`;
  grammarMetric.textContent = summary.grammarIssues;
  rhetoricMetric.textContent = summary.rhetoricIssues;
}

function renderIssues(issues) {
  issuesList.innerHTML = "";

  if (!issues.length) {
    issuesList.innerHTML = "<li class='issue-item issue-low'><p>لم يتم رصد أخطاء واضحة في هذا النص.</p></li>";
    return;
  }

  const fragment = document.createDocumentFragment();

  issues.slice(0, 10).forEach((issue) => {
    const li = document.createElement("li");
    li.className = `issue-item issue-${issue.severity}`;

    const tag = issue.category === "grammar" ? "نحوي/إملائي" : "بلاغي";

    li.innerHTML = `
      <strong>${tag} | ${issue.snippet}</strong>
      <p>${issue.explanation}</p>
      <p><b>اقتراح:</b> ${issue.suggestion}</p>
    `;

    fragment.appendChild(li);
  });

  issuesList.appendChild(fragment);
}

function renderCreativeAlternatives(alternatives) {
  creativeList.innerHTML = "";

  if (!alternatives.length) {
    creativeList.innerHTML = "<li class='issue-item issue-low'><p>لا توجد بدائل إضافية حالياً.</p></li>";
    return;
  }

  const fragment = document.createDocumentFragment();

  alternatives.forEach((alternative) => {
    const li = document.createElement("li");
    li.className = "issue-item issue-low";
    li.innerHTML = `<p>${alternative}</p>`;
    fragment.appendChild(li);
  });

  creativeList.appendChild(fragment);
}

async function analyzeText(payload) {
  const response = await fetch("/api/analyze-text", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "فشل التحليل.");
  }

  return data;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    topic: String(formData.get("topic") || "عام"),
    gradeLevel: String(formData.get("gradeLevel") || "متوسط"),
    text: String(formData.get("text") || "")
  };

  analyzeBtn.disabled = true;
  statusText.textContent = "جارٍ تحليل النص...";

  try {
    const result = await analyzeText(payload);

    renderMetrics(result.summary);
    renderIssues(result.issues);
    renderCreativeAlternatives(result.creativeAlternatives);
    improvedDraft.textContent = result.improvedDraft || "-";

    if (result.meta?.llmAugmentationUsed) {
      statusText.textContent = "اكتمل التحليل مع دعم نموذج ذكاء اصطناعي إضافي.";
    } else {
      statusText.textContent = "اكتمل التحليل بالقواعد الذكية المحلية للنموذج الأولي.";
    }
  } catch (error) {
    statusText.textContent = error instanceof Error ? error.message : "حدث خطأ غير متوقع.";
  } finally {
    analyzeBtn.disabled = false;
  }
});

sampleBtn.addEventListener("click", () => {
  const randomText = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
  textInput.value = randomText;
  statusText.textContent = "تم إدراج نص تجريبي جديد. اضغط (تحليل النص الآن).";
});
