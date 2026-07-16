#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_SAMPLE_DATA = path.join(PROJECT_ROOT, "data", "sample-data.js");
const MANUAL_VERIFICATION_PATH = path.join(PROJECT_ROOT, "data", "manual-verifications.json");
const MANUAL_KNOWLEDGE_VERIFICATION_PATH = path.join(PROJECT_ROOT, "data", "manual-knowledge-verifications.json");

const SUBJECTS = {
  law: {
    id: "law",
    label: "法规",
    rootDir: path.join(PROJECT_ROOT, "data", "2026安全【法规】SVIP"),
    outputDir: path.join(PROJECT_ROOT, "data", "processed", "law"),
  },
  management: {
    id: "management",
    label: "管理",
    rootDir: path.join(PROJECT_ROOT, "data", "2026安全【管理】SVIP"),
    outputDir: path.join(PROJECT_ROOT, "data", "processed", "management"),
  },
  technology: {
    id: "technology",
    label: "技术",
    rootDir: path.join(PROJECT_ROOT, "data", "2026安全【技术】SVIP"),
    outputDir: path.join(PROJECT_ROOT, "data", "processed", "technology"),
  },
  construction: {
    id: "construction",
    label: "建筑",
    rootDir: path.join(PROJECT_ROOT, "data", "2026安全【建筑】SVIP"),
    outputDir: path.join(PROJECT_ROOT, "data", "processed", "construction"),
  },
};

const QUESTION_FILE_HINTS = [
  "真题",
  "习题",
  "专训",
  "模考",
  "冲关",
  "冲刺",
  "试卷",
  "题库",
  "考前",
];

const STOP_TERMS = new Set([
  "根据",
  "下列",
  "关于",
  "正确",
  "错误",
  "生产经营单位",
  "安全生产",
  "规定",
  "应当",
  "可以",
  "不得",
  "属于",
  "进行",
  "有关",
  "工作",
  "管理",
  "单位",
  "工程",
  "企业",
  "人员",
  "制度",
  "规定的",
  "安全",
  "生产",
  "什么",
  "哪一项",
  "哪些",
  "以下",
  "下述",
  "法定",
  "内容",
  "要求",
  "时间",
  "负责",
]);

const AD_PATTERNS = [
  /联系Q+Q\/?微信[:：]?\s*\d+/u,
  /唯一联系微信[:：]?\s*\d+/u,
  /精准押题/u,
  /咨询热线/u,
  /免费约直播领资料/u,
  /微信扫码刷题/u,
  /扫码关注/u,
  /学员专用/u,
  /请勿外泄/u,
  /官方网站/u,
  /点亮职业人生/u,
  /二建、监理、一建、一造/u,
  /第\s*\d+\s*页\s*共\s*\d+\s*页/u,
];

const OPTION_LINE_RE = /^[A-E][.．、]\s*/u;
const QUESTION_LINE_RE = /^\d{1,3}[.．、]\s*/u;
const ANSWER_RE = /(?:【?\s*答案\s*】?|答案[:：])\s*([A-E](?:\s*[、,，]?\s*[A-E]){0,5})/u;
const EXPLANATION_RE = /(?:【?\s*解析\s*】?|解析[:：])\s*([\s\S]+)$/u;
const HEADING_RE = /^(第[一二三四五六七八九十百0-9]+[章节节篇].{0,40}|[一二三四五六七八九十]+、.{2,50}|\d{1,2}[.．、].{2,50})$/u;
const AD_CHAR_SEQUENCE_RE = /^[微信联系精准押题一唯系联信微题准精\s]+$/u;

function parseArgs(argv) {
  const args = {
    subject: "all",
    limit: null,
    sampleData: DEFAULT_SAMPLE_DATA,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--subject") {
      args.subject = argv[i + 1] || "all";
      i += 1;
      continue;
    }
    if (arg === "--limit") {
      const value = Number(argv[i + 1]);
      args.limit = Number.isFinite(value) && value > 0 ? value : null;
      i += 1;
      continue;
    }
    if (arg === "--sample-data") {
      args.sampleData = path.resolve(argv[i + 1] || DEFAULT_SAMPLE_DATA);
      i += 1;
      continue;
    }
  }

  return args;
}

function ensureCommand(name) {
  const result = spawnSync("which", [name], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`未找到命令 ${name}，请先安装后再运行。`);
  }
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || "").trim();
    throw new Error(`${command} 执行失败: ${message || "未知错误"}`);
  }
  return result.stdout;
}

function listPdfFiles(rootDir) {
  const files = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
        files.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return files.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

function mkdirp(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function relativeProjectPath(targetPath) {
  return path.relative(PROJECT_ROOT, targetPath).split(path.sep).join("/");
}

function safeOutputName(rootDir, pdfPath) {
  const relative = path.relative(rootDir, pdfPath).split(path.sep).join("__");
  return relative.replace(/\.pdf$/iu, ".txt");
}

function normalizeWhitespace(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/\f/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isNoiseLine(line) {
  if (!line) {
    return false;
  }
  if (/^\d+$/u.test(line)) {
    return true;
  }
  if (/^[A-E]$/u.test(line)) {
    return false;
  }
  if (/^[0-9 ]{2,12}$/u.test(line)) {
    return true;
  }
  if (AD_CHAR_SEQUENCE_RE.test(line)) {
    return true;
  }
  if (/^第\s*\d+\s*页$/u.test(line)) {
    return true;
  }
  return AD_PATTERNS.some((pattern) => pattern.test(line));
}

function stripInlineNoise(line) {
  return line
    .replace(/\s+[微信联系精准押题一唯系联信微题准精]$/gu, "")
    .replace(/\s+[微信联系精准押题一唯系联信微题准精](?:\s*[微信联系精准押题一唯系联信微题准精])+$/gu, "")
    .replace(/\s+\d{2,3}\s+\d(?:\s+\d{2,3}\s+\d)*$/gu, "")
    .trim();
}

function cleanText(rawText) {
  const lines = normalizeWhitespace(rawText).split("\n");
  const cleaned = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      if (cleaned.length > 0 && cleaned[cleaned.length - 1] !== "") {
        cleaned.push("");
      }
      continue;
    }
    if (isNoiseLine(line)) {
      continue;
    }
    const compact = stripInlineNoise(line.replace(/\s{2,}/g, " "));
    if (!compact || isNoiseLine(compact)) {
      continue;
    }
    cleaned.push(compact);
  }

  return cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function getPdfPageCount(pdfPath) {
  const info = runCommand("pdfinfo", [pdfPath]);
  const match = info.match(/^Pages:\s+(\d+)/mu);
  return match ? Number(match[1]) : null;
}

function extractPdfText(pdfPath) {
  return runCommand("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, "-"]);
}

function isGoodChar(char) {
  if (/[0-9A-Za-z]/u.test(char)) {
    return true;
  }
  if (/[\u3400-\u9FFF\u3000-\u303F\uFF00-\uFFEF]/u.test(char)) {
    return true;
  }
  return /[，。！？；：、“”‘’（）《》【】·…—\-•→℃%㎡/\\,.!?;:()[\]<>+_=&*#'"\s]/u.test(char);
}

function assessQuality(text) {
  const meaningful = text.replace(/\s+/gu, "");
  if (!meaningful) {
    return { quality: "poor", score: 0 };
  }
  let goodCount = 0;
  for (const char of meaningful) {
    if (isGoodChar(char)) {
      goodCount += 1;
    }
  }
  const score = goodCount / meaningful.length;
  if (score >= 0.88 && meaningful.length >= 600) {
    return { quality: "good", score };
  }
  if (score >= 0.6 && meaningful.length >= 200) {
    return { quality: "partial", score };
  }
  return { quality: "poor", score };
}

function normalizeSearchText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function uniquePush(list, value, limit = 5) {
  if (!value || list.includes(value)) {
    return;
  }
  if (list.length < limit) {
    list.push(value);
  }
}

function truncate(text, maxLength = 140) {
  const normalized = normalizeWhitespace(text);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function collectSearchTerms(...parts) {
  const sourceText = parts.filter(Boolean).join(" ");
  const wholePhrases = [];
  for (const part of parts) {
    const normalized = normalizeWhitespace(part || "");
    if (normalized.length >= 4) {
      wholePhrases.push(normalized);
    }
  }

  const tokenMatches = sourceText.match(/[\u4E00-\u9FFF]{2,}|[A-Za-z0-9]{3,}/gu) || [];
  const unique = new Set();
  for (const token of [...wholePhrases, ...tokenMatches]) {
    const cleaned = token.trim();
    if (!cleaned || STOP_TERMS.has(cleaned)) {
      continue;
    }
    unique.add(cleaned);
  }

  return [...unique].sort((a, b) => b.length - a.length).slice(0, 12);
}

function paragraphize(text, sourceFile) {
  const paragraphs = [];
  const blocks = text.split(/\n{2,}/u);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed.length < 18) {
      continue;
    }
    paragraphs.push({
      source: sourceFile,
      text: trimmed,
      normalized: normalizeSearchText(trimmed),
    });
  }
  return paragraphs;
}

function searchEvidence(paragraphs, fragments, limit = 3) {
  const normalizedFragments = fragments
    .map((item) => ({
      raw: item,
      normalized: normalizeSearchText(item),
    }))
    .filter((item) => item.normalized.length >= 2);

  const scored = [];
  for (const paragraph of paragraphs) {
    let score = 0;
    const matched = [];

    for (const fragment of normalizedFragments) {
      if (!fragment.normalized) {
        continue;
      }
      if (paragraph.normalized.includes(fragment.normalized)) {
        score += Math.min(fragment.normalized.length, 18);
        matched.push(fragment.raw);
        continue;
      }
      if (fragment.normalized.length >= 8) {
        const prefix = fragment.normalized.slice(0, 8);
        if (paragraph.normalized.includes(prefix)) {
          score += 6;
          matched.push(fragment.raw);
        }
      }
    }

    if (score > 0) {
      scored.push({
        source: paragraph.source,
        text: paragraph.text,
        score,
        matched,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.source.localeCompare(b.source, "zh-Hans-CN"));
  return scored.slice(0, limit);
}

function questionFileLikely(filePath) {
  return QUESTION_FILE_HINTS.some((hint) => filePath.includes(hint));
}

function splitQuestionBlocks(text) {
  const lines = text.split("\n");
  const blocks = [];
  let buffer = [];

  for (const line of lines) {
    if (QUESTION_LINE_RE.test(line.trim())) {
      if (buffer.length > 0) {
        blocks.push(buffer.join("\n").trim());
      }
      buffer = [line];
      continue;
    }
    if (buffer.length > 0) {
      buffer.push(line);
    }
  }

  if (buffer.length > 0) {
    blocks.push(buffer.join("\n").trim());
  }

  return blocks;
}

function parseAnswerLetters(answerText) {
  if (!answerText) {
    return [];
  }
  return [...answerText.toUpperCase().matchAll(/[A-E]/g)].map((match) => match[0]);
}

function extractOptions(blockText) {
  const answerMatch = blockText.match(ANSWER_RE);
  const parseTarget = answerMatch ? blockText.slice(0, answerMatch.index) : blockText;
  const options = [];
  let current = null;

  for (const rawLine of parseTarget.split("\n")) {
    const line = stripInlineNoise(rawLine.trim());
    if (!line) {
      continue;
    }
    if (OPTION_LINE_RE.test(line)) {
      if (current) {
        options.push(current);
      }
      current = {
        label: line[0],
        text: line.replace(OPTION_LINE_RE, "").trim(),
      };
      continue;
    }
    if (current && !ANSWER_RE.test(line) && !EXPLANATION_RE.test(line)) {
      current.text = `${current.text} ${line}`.trim();
    }
  }

  if (current) {
    options.push(current);
  }

  return options;
}

function normalizeQuestionCandidate(stem) {
  return normalizeSearchText(stem).slice(0, 220);
}

function parseQuestionBlock(blockText, sourcePath) {
  const answerMatch = blockText.match(ANSWER_RE);
  const explanationMatch = blockText.match(EXPLANATION_RE);
  const options = extractOptions(blockText);

  const optionStart = options.length > 0
    ? blockText.indexOf(`${options[0].label}.`)
    : -1;
  const optionStartAlt = options.length > 0 && optionStart < 0
    ? blockText.indexOf(`${options[0].label}．`)
    : optionStart;
  const optionStartAlt2 = options.length > 0 && optionStartAlt < 0
    ? blockText.indexOf(`${options[0].label}、`)
    : optionStartAlt;
  const firstOptionOffset = optionStartAlt2;

  let stemPart = blockText;
  if (firstOptionOffset > 0) {
    stemPart = blockText.slice(0, firstOptionOffset);
  } else if (answerMatch) {
    stemPart = blockText.slice(0, answerMatch.index);
  }

  stemPart = stemPart
    .replace(/^\d{1,3}[.．、]\s*/u, "")
    .replace(/(?:【?\s*答案\s*】?|答案[:：])[\s\S]*$/u, "")
    .trim();

  const answer = parseAnswerLetters(answerMatch ? answerMatch[1] : "");
  if (!stemPart || stemPart.length < 8) {
    return null;
  }

  const questionType =
    answer.length > 1 || /多选|多项/u.test(sourcePath) || /多选/u.test(blockText)
      ? "multiple"
      : "single";

  return {
    stem: normalizeWhitespace(stemPart),
    normalizedStem: normalizeQuestionCandidate(stemPart),
    options: options.map((option) => option.text),
    answer,
    explanation: explanationMatch ? truncate(explanationMatch[1], 260) : "",
    source: sourcePath,
    raw: truncate(blockText, 420),
    type: questionType,
    confidence:
      answer.length > 0 && options.length >= 4
        ? "high"
        : answer.length > 0
          ? "medium"
          : "low",
  };
}

function dedupeQuestionCandidates(candidates) {
  const byStem = new Map();
  for (const candidate of candidates) {
    const current = byStem.get(candidate.normalizedStem);
    if (!current) {
      byStem.set(candidate.normalizedStem, candidate);
      continue;
    }
    const currentScore = current.answer.length * 10 + current.options.length * 2 + current.stem.length;
    const nextScore = candidate.answer.length * 10 + candidate.options.length * 2 + candidate.stem.length;
    if (nextScore > currentScore) {
      byStem.set(candidate.normalizedStem, candidate);
    }
  }
  return [...byStem.values()];
}

function extractQuestionCandidates(fileEntries) {
  const candidates = [];
  for (const entry of fileEntries) {
    if (!questionFileLikely(entry.relativeSource)) {
      continue;
    }
    const blocks = splitQuestionBlocks(entry.cleanedText);
    for (const block of blocks) {
      const parsed = parseQuestionBlock(block, entry.relativeSource);
      if (parsed) {
        candidates.push(parsed);
      }
    }
  }
  return dedupeQuestionCandidates(candidates);
}

function buildKnowledgeCandidates(subject, fileEntries) {
  const aggregate = new Map();

  for (const entry of fileEntries) {
    const lines = entry.cleanedText.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const title = lines[i].trim();
      if (!title || title.length > 60 || title.length < 4) {
        continue;
      }
      if (QUESTION_LINE_RE.test(title) || OPTION_LINE_RE.test(title)) {
        continue;
      }
      if (/单选题|多选题|答案解析|习题|真题/u.test(title)) {
        continue;
      }
      if (!HEADING_RE.test(title)) {
        continue;
      }

      let summary = "";
      for (let j = i + 1; j < lines.length; j += 1) {
        const nextLine = lines[j].trim();
        if (!nextLine) {
          continue;
        }
        if (HEADING_RE.test(nextLine) || QUESTION_LINE_RE.test(nextLine) || OPTION_LINE_RE.test(nextLine)) {
          break;
        }
        summary = nextLine;
        break;
      }

      const key = title.replace(/\s+/gu, "");
      const record = aggregate.get(key) || {
        title,
        count: 0,
        sourceFiles: [],
        samples: [],
      };
      record.count += 1;
      uniquePush(record.sourceFiles, entry.relativeSource, 6);
      uniquePush(record.samples, truncate(summary || entry.sample, 120), 3);
      aggregate.set(key, record);
    }
  }

  const sorted = [...aggregate.values()]
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, "zh-Hans-CN"))
    .slice(0, 120);

  return sorted.map((item, index) => ({
    id: `${subject.id}-auto-kp-${String(index + 1).padStart(3, "0")}`,
    subjectId: subject.id,
    title: item.title,
    summary: item.samples[0] || `${subject.label} PDF 自动抽取候选知识点`,
    details: `自动抽取候选知识点。出现次数：${item.count}。来源：${item.sourceFiles.join("；")}`,
    tags: [
      subject.label,
      "PDF候选",
      `出现${item.count}次`,
    ],
    sourceFiles: item.sourceFiles,
    count: item.count,
  }));
}

function loadExamData(sampleDataPath) {
  const scriptText = fs.readFileSync(sampleDataPath, "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(scriptText, sandbox, { filename: sampleDataPath });
  if (!sandbox.window || !sandbox.window.EXAM_DATA) {
    throw new Error(`无法从 ${sampleDataPath} 读取 EXAM_DATA。`);
  }
  return sandbox.window.EXAM_DATA;
}

function questionMatchScore(sampleQuestion, candidate) {
  const sampleStem = normalizeQuestionCandidate(sampleQuestion.stem);
  const candidateStem = candidate.normalizedStem;
  if (!sampleStem || !candidateStem) {
    return 0;
  }

  let score = 0;
  if (sampleStem === candidateStem) {
    score += 100;
  } else if (candidateStem.includes(sampleStem) || sampleStem.includes(candidateStem)) {
    score += 70;
  } else {
    const prefix18 = sampleStem.slice(0, 18);
    const prefix12 = sampleStem.slice(0, 12);
    if (prefix18 && candidateStem.includes(prefix18)) {
      score += 42;
    } else if (prefix12 && candidateStem.includes(prefix12)) {
      score += 24;
    }
  }

  const optionOverlap = (sampleQuestion.options || []).filter((option) =>
    candidate.options.some((candidateOption) =>
      normalizeSearchText(candidateOption).includes(normalizeSearchText(option).slice(0, 8))
    )
  ).length;
  score += optionOverlap * 5;

  if (candidate.answer.length > 0) {
    score += 8;
  }

  return score;
}

function selectedOptionTexts(question, answers) {
  return (answers || [])
    .map((answer) => "ABCDE".indexOf(answer))
    .filter((index) => index >= 0 && index < (question.options || []).length)
    .map((index) => normalizeSearchText(question.options[index]))
    .sort();
}

function answersMatch(sampleQuestion, candidate) {
  const sampleAnswers = (sampleQuestion.answer || []).slice().sort().join("");
  const candidateAnswers = (candidate.answer || []).slice().sort().join("");
  if (sampleAnswers === candidateAnswers) {
    return true;
  }
  const sampleTexts = selectedOptionTexts(sampleQuestion, sampleQuestion.answer);
  const candidateTexts = selectedOptionTexts(candidate, candidate.answer);
  return sampleTexts.length > 0 && JSON.stringify(sampleTexts) === JSON.stringify(candidateTexts);
}

function loadManualVerifications() {
  if (!fs.existsSync(MANUAL_VERIFICATION_PATH)) {
    return new Map();
  }
  const records = JSON.parse(fs.readFileSync(MANUAL_VERIFICATION_PATH, "utf8"));
  return new Map(records.map((record) => [record.id, record]));
}

function loadManualKnowledgeVerifications() {
  if (!fs.existsSync(MANUAL_KNOWLEDGE_VERIFICATION_PATH)) {
    return new Map();
  }
  const records = JSON.parse(fs.readFileSync(MANUAL_KNOWLEDGE_VERIFICATION_PATH, "utf8"));
  return new Map(records.map((record) => [record.id, record]));
}

function verifySubjectData(examData, subject, fileEntries, questionCandidates, outputDir) {
  const knowledgePoints = (examData.knowledgePoints || []).filter((item) => item.subjectId === subject.id);
  const questionBank = (examData.questionBank || []).filter((item) => item.subjectId === subject.id);
  const paragraphs = fileEntries.flatMap((entry) => paragraphize(entry.cleanedText, entry.relativeSource));

  const kpStatuses = [];
  const kpStatusById = new Map();

  for (const kp of knowledgePoints) {
    const terms = collectSearchTerms(kp.title, kp.summary, kp.details, ...(kp.tags || []));
    const evidence = searchEvidence(paragraphs, terms, 3).map((item) => ({
      source: item.source,
      score: item.score,
      matched: item.matched.slice(0, 4),
      snippet: truncate(item.text, 180),
    }));

    const topScore = evidence[0] ? evidence[0].score : 0;
    const status = topScore >= 18 ? "supported" : topScore >= 8 ? "weak" : "needs_review";
    const record = {
      id: kp.id,
      title: kp.title,
      status,
      score: topScore,
      evidence,
    };
    kpStatuses.push(record);
    kpStatusById.set(kp.id, record);
  }

  const manualKnowledgeVerifications = loadManualKnowledgeVerifications();
  for (const record of kpStatuses) {
    const manual = manualKnowledgeVerifications.get(record.id);
    if (!manual) {
      continue;
    }
    record.automatedStatus = record.status;
    record.status = "reviewed";
    record.basis = manual.basis;
    record.manualVerification = {
      reviewedAt: manual.reviewedAt,
      evidence: manual.evidence,
    };
  }

  const questionStatuses = [];

  for (const question of questionBank) {
    const candidates = questionCandidates
      .map((candidate) => ({
        candidate,
        score: questionMatchScore(question, candidate),
      }))
      .filter((item) => item.score >= 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const bestMatch = candidates[0] || null;
    const expectedAnswer = (question.answer || []).join("");
    let status = "needs_review";
    let basis = "未找到直接题目证据";
    let directMatchResolved = false;

    if (bestMatch && bestMatch.candidate.answer.length > 0 && bestMatch.score >= 60) {
      if (answersMatch(question, bestMatch.candidate)) {
        status = "verified";
        basis = "在 PDF 题目中直接匹配到同题并且答案一致";
        directMatchResolved = true;
      } else if (bestMatch.score >= 95) {
        status = "conflict";
        basis = "在 PDF 题目中匹配到相近题目，但答案不一致";
        directMatchResolved = true;
      }
    }

    if (!directMatchResolved) {
      const linkedStatuses = (question.knowledgePointIds || [])
        .map((id) => kpStatusById.get(id))
        .filter(Boolean);
      const explanationEvidence = searchEvidence(
        paragraphs,
        collectSearchTerms(question.stem, question.explanation),
        2
      ).map((item) => ({
        source: item.source,
        score: item.score,
        snippet: truncate(item.text, 180),
      }));

      const supportedKpCount = linkedStatuses.filter((item) => item.status === "supported").length;
      const explanationSupported = explanationEvidence[0] && explanationEvidence[0].score >= 10;

      if (supportedKpCount > 0 && explanationSupported) {
        status = "supported";
        basis = "未匹配到原题，但知识点和解析能在 PDF 中找到支撑";
      } else if (supportedKpCount > 0) {
        status = "weak";
        basis = "知识点能找到支撑，但题目答案仍需人工复核";
      }

      questionStatuses.push({
        id: question.id,
        stem: question.stem,
        expectedAnswer: question.answer,
        status,
        basis,
        matchedQuestion: bestMatch
          ? {
              score: bestMatch.score,
              source: bestMatch.candidate.source,
              answer: bestMatch.candidate.answer,
              stem: truncate(bestMatch.candidate.stem, 140),
            }
          : null,
        linkedKnowledgePoints: linkedStatuses.map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
        })),
        evidence: explanationEvidence,
      });
      continue;
    }

    questionStatuses.push({
      id: question.id,
      stem: question.stem,
      expectedAnswer: question.answer,
      status,
      basis,
      matchedQuestion: bestMatch
        ? {
            score: bestMatch.score,
            source: bestMatch.candidate.source,
            answer: bestMatch.candidate.answer,
            stem: truncate(bestMatch.candidate.stem, 140),
          }
        : null,
      linkedKnowledgePoints: (question.knowledgePointIds || [])
        .map((id) => kpStatusById.get(id))
        .filter(Boolean)
        .map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
        })),
      evidence: [],
    });
  }

  const manualVerifications = loadManualVerifications();
  for (const record of questionStatuses) {
    const manual = manualVerifications.get(record.id);
    if (!manual || (manual.answer || []).slice().sort().join("") !== (record.expectedAnswer || []).slice().sort().join("")) {
      continue;
    }
    record.automatedStatus = record.status;
    record.status = "reviewed";
    record.basis = manual.basis;
    record.manualVerification = {
      reviewedAt: manual.reviewedAt,
      evidence: manual.evidence,
    };
  }

  for (const knowledgePoint of kpStatuses) {
    if (knowledgePoint.status !== "weak") {
      continue;
    }
    const linkedQuestions = questionStatuses.filter((question) =>
      question.linkedKnowledgePoints.some((linked) => linked.id === knowledgePoint.id)
    );
    const hasUnresolvedQuestion = linkedQuestions.some((question) =>
      ["needs_review", "conflict"].includes(question.status)
    );
    if (linkedQuestions.length > 0 && !hasUnresolvedQuestion) {
      knowledgePoint.automatedStatus = knowledgePoint.status;
      knowledgePoint.status = "question_supported";
      knowledgePoint.basis = `由 ${linkedQuestions.length} 道已核验关联题反向支撑`;
    }
  }

  const resolvedKnowledgePointIds = new Set(
    kpStatuses
      .filter((knowledgePoint) => ["supported", "reviewed", "question_supported"].includes(knowledgePoint.status))
      .map((knowledgePoint) => knowledgePoint.id)
  );
  for (const question of questionStatuses) {
    if (question.status !== "weak" || question.linkedKnowledgePoints.length === 0) {
      continue;
    }
    if (question.linkedKnowledgePoints.every((linked) => resolvedKnowledgePointIds.has(linked.id))) {
      question.automatedStatus = question.status;
      question.status = "knowledge_supported";
      question.basis = "题目答案与解析由已核验知识点和PDF教材内容支撑";
    }
  }

  const summary = {
    knowledgePoints: summarizeStatuses(kpStatuses),
    questions: summarizeStatuses(questionStatuses),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    subjectId: subject.id,
    subjectLabel: subject.label,
    summary,
    knowledgePoints: kpStatuses,
    questions: questionStatuses,
  };

  writeJson(path.join(outputDir, "verification-report.json"), report);
  fs.writeFileSync(
    path.join(outputDir, "verification-report.md"),
    renderVerificationReportMarkdown(report),
    "utf8"
  );
}

function summarizeStatuses(records) {
  const counts = {};
  for (const record of records) {
    counts[record.status] = (counts[record.status] || 0) + 1;
  }
  return {
    total: records.length,
    counts,
  };
}

function renderVerificationReportMarkdown(report) {
  const lines = [
    `# ${report.subjectLabel} PDF 核对报告`,
    "",
    `- 生成时间：${report.generatedAt}`,
    `- 知识点总数：${report.summary.knowledgePoints.total}`,
    `- 题目总数：${report.summary.questions.total}`,
    "",
    "## 知识点状态",
    "",
  ];

  for (const [status, count] of Object.entries(report.summary.knowledgePoints.counts)) {
    lines.push(`- ${status}: ${count}`);
  }

  lines.push("", "## 题目状态", "");
  for (const [status, count] of Object.entries(report.summary.questions.counts)) {
    lines.push(`- ${status}: ${count}`);
  }

  const conflicts = report.questions.filter((item) => item.status === "conflict");
  const weakQuestions = report.questions.filter((item) => item.status === "weak" || item.status === "needs_review");
  const weakKnowledgePoints = report.knowledgePoints.filter((item) => item.status !== "supported");

  lines.push("", "## 重点复核题目", "");
  if (conflicts.length === 0 && weakQuestions.length === 0) {
    lines.push("- 暂无高优先级异常。");
  } else {
    for (const item of [...conflicts, ...weakQuestions].slice(0, 25)) {
      lines.push(`- [${item.status}] ${item.id} | ${truncate(item.stem, 70)} | ${item.basis}`);
      if (item.matchedQuestion) {
        lines.push(`  来源：${item.matchedQuestion.source} | 参考答案：${(item.matchedQuestion.answer || []).join("")}`);
      }
    }
  }

  lines.push("", "## 待复核知识点", "");
  if (weakKnowledgePoints.length === 0) {
    lines.push("- 暂无。");
  } else {
    for (const item of weakKnowledgePoints.slice(0, 25)) {
      const evidence = item.evidence[0] ? ` | 证据：${item.evidence[0].source}` : "";
      lines.push(`- [${item.status}] ${item.id} | ${item.title}${evidence}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function buildSubjectSeed(subject, questionCandidates, knowledgeCandidates, outputDir) {
  const seed = {
    generatedAt: new Date().toISOString(),
    subject: {
      id: subject.id,
      label: subject.label,
      sourceRoot: relativeProjectPath(subject.rootDir),
    },
    notes: [
      "本文件只基于 PDF 自动抽取，不读取 Word/HTML。",
      "知识点和题目为候选结果，适合继续人工筛选后并入正式题库。",
    ],
    knowledgePoints: knowledgeCandidates,
    questionBank: questionCandidates.map((item, index) => ({
      id: `${subject.id}-auto-q-${String(index + 1).padStart(3, "0")}`,
      subjectId: subject.id,
      type: item.type,
      stem: item.stem,
      options: item.options,
      answer: item.answer,
      explanation: item.explanation,
      knowledgePointIds: [],
      difficulty: "medium",
      source: item.source,
      confidence: item.confidence,
    })),
  };

  writeJson(path.join(outputDir, "pack-seed.json"), seed);
}

function writeSubjectSummary(subject, manifest, knowledgeCandidates, questionCandidates, outputDir) {
  const okEntries = manifest.filter((item) => item.status === "ok");
  const failedEntries = manifest.filter((item) => item.status === "failed");
  const lines = [
    `# ${subject.label} PDF 处理摘要`,
    "",
    `- 科目：${subject.label}`,
    `- 来源目录：\`${relativeProjectPath(subject.rootDir)}\``,
    `- 处理 PDF：${okEntries.length}`,
    `- 失败 PDF：${failedEntries.length}`,
    `- 候选知识点：${knowledgeCandidates.length}`,
    `- 候选题目：${questionCandidates.length}`,
    "",
    "## 文本量较大的 PDF",
    "",
  ];

  for (const item of [...okEntries].sort((a, b) => b.chars - a.chars).slice(0, 15)) {
    lines.push(`- \`${item.file}\` | ${item.pages || "?"} 页 | ${item.chars} chars | ${item.quality}`);
  }

  if (failedEntries.length > 0) {
    lines.push("", "## 失败文件", "");
    for (const item of failedEntries.slice(0, 20)) {
      lines.push(`- \`${item.file}\` | ${item.error}`);
    }
  }

  fs.writeFileSync(path.join(outputDir, "summary.md"), `${lines.join("\n")}\n`, "utf8");
}

function processSubject(subject, limit) {
  mkdirp(subject.outputDir);
  mkdirp(path.join(subject.outputDir, "texts"));

  const pdfFiles = listPdfFiles(subject.rootDir);
  const targetFiles = limit ? pdfFiles.slice(0, limit) : pdfFiles;
  const manifest = [];
  const fileEntries = [];
  const corpusParts = [];

  for (const pdfPath of targetFiles) {
    const relativeSource = relativeProjectPath(pdfPath);
    try {
      const rawText = extractPdfText(pdfPath);
      const cleanedText = cleanText(rawText);
      const pages = getPdfPageCount(pdfPath);
      const { quality, score } = assessQuality(cleanedText);
      const outputPath = path.join(subject.outputDir, "texts", safeOutputName(subject.rootDir, pdfPath));

      fs.writeFileSync(outputPath, `${cleanedText}\n`, "utf8");

      const entry = {
        sourcePath: pdfPath,
        relativeSource,
        outputPath,
        cleanedText,
        pages,
        quality,
        score: Number(score.toFixed(4)),
        sample: truncate(cleanedText, 140),
      };
      fileEntries.push(entry);
      corpusParts.push(`===== 文件：${relativeSource} =====\n${cleanedText}\n`);

      manifest.push({
        file: relativeSource,
        status: "ok",
        output: relativeProjectPath(outputPath),
        pages,
        quality,
        score: entry.score,
        chars: cleanedText.length,
        lines: cleanedText ? cleanedText.split("\n").length : 0,
        sample: entry.sample,
      });
    } catch (error) {
      manifest.push({
        file: relativeSource,
        status: "failed",
        error: error.message,
      });
    }
  }

  writeJson(path.join(subject.outputDir, "manifest.json"), manifest);
  fs.writeFileSync(path.join(subject.outputDir, "corpus.txt"), `${corpusParts.join("\n")}\n`, "utf8");

  const knowledgeCandidates = buildKnowledgeCandidates(subject, fileEntries);
  const questionCandidates = extractQuestionCandidates(fileEntries);

  writeJson(path.join(subject.outputDir, "knowledge-point-candidates.json"), knowledgeCandidates);
  writeJson(path.join(subject.outputDir, "question-candidates.json"), questionCandidates);
  buildSubjectSeed(subject, questionCandidates, knowledgeCandidates, subject.outputDir);
  writeSubjectSummary(subject, manifest, knowledgeCandidates, questionCandidates, subject.outputDir);

  return {
    manifest,
    fileEntries,
    knowledgeCandidates,
    questionCandidates,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  ensureCommand("pdftotext");
  ensureCommand("pdfinfo");

  const subjectIds =
    args.subject === "all"
      ? Object.keys(SUBJECTS)
      : [args.subject].filter((id) => SUBJECTS[id]);

  if (subjectIds.length === 0) {
    throw new Error(`未知科目参数: ${args.subject}`);
  }

  const examData = loadExamData(args.sampleData);

  const overall = [];
  for (const subjectId of subjectIds) {
    const subject = SUBJECTS[subjectId];
    const result = processSubject(subject, args.limit);
    overall.push({
      subjectId,
      pdfs: result.manifest.filter((item) => item.status === "ok").length,
      failed: result.manifest.filter((item) => item.status === "failed").length,
      knowledgeCandidates: result.knowledgeCandidates.length,
      questionCandidates: result.questionCandidates.length,
    });

    verifySubjectData(examData, subject, result.fileEntries, result.questionCandidates, subject.outputDir);
  }

  writeJson(path.join(PROJECT_ROOT, "data", "processed", "build-summary.json"), {
    generatedAt: new Date().toISOString(),
    subjects: overall,
  });
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
