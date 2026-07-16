#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SAMPLE_DATA_PATH = path.join(PROJECT_ROOT, "data", "sample-data.js");
const MANUAL_QUESTION_PATH = path.join(PROJECT_ROOT, "data", "manual-verifications.json");
const MANUAL_KNOWLEDGE_PATH = path.join(PROJECT_ROOT, "data", "manual-knowledge-verifications.json");
const INDEX_PATH = path.join(PROJECT_ROOT, "index.html");
const APP_PATH = path.join(PROJECT_ROOT, "assets", "app.js");
const SUMMARY_PATH = path.join(PROJECT_ROOT, "data", "verification-summary.md");
const UNRESOLVED_STATUSES = new Set(["needs_review", "conflict", "weak"]);

function loadExamData() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(SAMPLE_DATA_PATH, "utf8"), sandbox, {
    filename: SAMPLE_DATA_PATH,
  });
  if (!sandbox.window.EXAM_DATA) {
    throw new Error("无法读取 data/sample-data.js 中的 EXAM_DATA。");
  }
  return sandbox.window.EXAM_DATA;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizedAnswer(answer) {
  return (answer || []).slice().sort().join("");
}

function assertUnique(records, label) {
  const ids = new Set();
  for (const record of records) {
    if (!record.id) {
      throw new Error(`${label}存在缺少 id 的记录。`);
    }
    if (ids.has(record.id)) {
      throw new Error(`${label}存在重复 id：${record.id}`);
    }
    ids.add(record.id);
  }
}

function validateQuestion(question, subjectIds, knowledgePointIds) {
  if (!question.id || !subjectIds.has(question.subjectId) || !question.stem) {
    throw new Error(`题目必要字段无效：${question.id || "未知题目"}`);
  }
  if (!Array.isArray(question.options) || question.options.length < 2) {
    throw new Error(`题目选项不足：${question.id}`);
  }
  if (!Array.isArray(question.answer) || question.answer.length === 0) {
    throw new Error(`题目答案为空：${question.id}`);
  }
  for (const answer of question.answer) {
    const optionIndex = "ABCDE".indexOf(answer);
    if (optionIndex < 0 || optionIndex >= question.options.length) {
      throw new Error(`题目答案超出选项范围：${question.id} -> ${answer}`);
    }
  }
  if (!question.explanation || !question.source) {
    throw new Error(`题目缺少解析或来源：${question.id}`);
  }
  for (const knowledgePointId of question.knowledgePointIds || []) {
    if (!knowledgePointIds.has(knowledgePointId)) {
      throw new Error(`题目引用不存在的知识点：${question.id} -> ${knowledgePointId}`);
    }
  }
}

function validateManualQuestions(examData, manualRecords) {
  const questionsById = new Map(examData.questionBank.map((question) => [question.id, question]));
  assertUnique(manualRecords, "人工题目核验记录");
  for (const record of manualRecords) {
    const question = questionsById.get(record.id);
    if (!question) {
      throw new Error(`人工题目核验记录指向不存在的题目：${record.id}`);
    }
    if (normalizedAnswer(question.answer) !== normalizedAnswer(record.answer)) {
      throw new Error(`人工题目核验记录已过期：${record.id}`);
    }
    if (!record.basis || !Array.isArray(record.evidence) || record.evidence.length === 0) {
      throw new Error(`人工题目核验记录缺少依据：${record.id}`);
    }
  }
}

function validateManualKnowledge(examData, manualRecords) {
  const knowledgePointIds = new Set(examData.knowledgePoints.map((item) => item.id));
  assertUnique(manualRecords, "人工知识点核验记录");
  for (const record of manualRecords) {
    if (!knowledgePointIds.has(record.id)) {
      throw new Error(`人工知识点核验记录指向不存在的知识点：${record.id}`);
    }
    if (!record.basis || !Array.isArray(record.evidence) || record.evidence.length === 0) {
      throw new Error(`人工知识点核验记录缺少依据：${record.id}`);
    }
  }
}

function validateReports(examData) {
  let reportQuestionCount = 0;
  let reportKnowledgePointCount = 0;
  const unresolved = [];

  for (const subject of examData.subjects) {
    const reportPath = path.join(
      PROJECT_ROOT,
      "data",
      "processed",
      subject.id,
      "verification-report.json"
    );
    if (!fs.existsSync(reportPath)) {
      throw new Error(`缺少核验报告：${reportPath}`);
    }
    const report = loadJson(reportPath);
    reportQuestionCount += report.questions.length;
    reportKnowledgePointCount += report.knowledgePoints.length;
    for (const question of report.questions) {
      if (UNRESOLVED_STATUSES.has(question.status)) {
        unresolved.push(question.id);
      }
    }
    for (const knowledgePoint of report.knowledgePoints) {
      if (UNRESOLVED_STATUSES.has(knowledgePoint.status)) {
        unresolved.push(knowledgePoint.id);
      }
    }
  }

  if (reportQuestionCount !== examData.questionBank.length) {
    throw new Error(`核验报告题目数不一致：${reportQuestionCount}/${examData.questionBank.length}`);
  }
  if (reportKnowledgePointCount !== examData.knowledgePoints.length) {
    throw new Error(
      `核验报告知识点数不一致：${reportKnowledgePointCount}/${examData.knowledgePoints.length}`
    );
  }
  if (unresolved.length > 0) {
    throw new Error(`仍有 ${unresolved.length} 个未决项：${unresolved.slice(0, 10).join("、")}`);
  }
}

function validateStaticPage() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const appSource = fs.readFileSync(APP_PATH, "utf8");
  const localReferences = [
    ...html.matchAll(/<(?:script|link)[^>]+(?:src|href)=["']([^"']+)["']/gu),
  ]
    .map((match) => match[1])
    .filter((reference) => !/^(?:https?:|data:|#)/u.test(reference));

  for (const reference of localReferences) {
    const cleanReference = reference.split(/[?#]/u)[0];
    const targetPath = path.resolve(PROJECT_ROOT, cleanReference);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`页面引用的本地资源不存在：${reference}`);
    }
  }

  const htmlIds = new Set([...html.matchAll(/\sid=["']([^"']+)["']/gu)].map((match) => match[1]));
  for (const match of appSource.matchAll(/\sid=["']([^"']+)["']/gu)) {
    htmlIds.add(match[1]);
  }
  const requiredIds = new Set(
    [...appSource.matchAll(/getElementById\(["']([^"']+)["']\)/gu)].map((match) => match[1])
  );
  const missingIds = [...requiredIds].filter((id) => !htmlIds.has(id));
  if (missingIds.length > 0) {
    throw new Error(`前端脚本依赖的页面元素不存在：${missingIds.join("、")}`);
  }
}

function validateSummary(examData) {
  const summary = fs.readFileSync(SUMMARY_PATH, "utf8");
  const expectedLines = [
    `- 题目总数：${examData.questionBank.length}`,
    `- 知识点总数：${examData.knowledgePoints.length}`,
    "- 未决题目或知识点：0",
  ];
  for (const line of expectedLines) {
    if (!summary.includes(line)) {
      throw new Error(`验收报告统计未同步：${line}`);
    }
  }
  for (const subject of examData.subjects) {
    const questionCount = examData.questionBank.filter((item) => item.subjectId === subject.id).length;
    const knowledgePointCount = examData.knowledgePoints.filter(
      (item) => item.subjectId === subject.id
    ).length;
    const row = `| ${subject.label} | ${questionCount} | ${knowledgePointCount} | 0 |`;
    if (!summary.includes(row)) {
      throw new Error(`验收报告科目统计未同步：${subject.label}`);
    }
  }
}

function main() {
  const examData = loadExamData();
  assertUnique(examData.subjects, "科目");
  assertUnique(examData.knowledgePoints, "知识点");
  assertUnique(examData.questionBank, "题目");

  const subjectIds = new Set(examData.subjects.map((subject) => subject.id));
  const knowledgePointIds = new Set(examData.knowledgePoints.map((item) => item.id));
  for (const question of examData.questionBank) {
    validateQuestion(question, subjectIds, knowledgePointIds);
  }

  validateManualQuestions(examData, loadJson(MANUAL_QUESTION_PATH));
  validateManualKnowledge(examData, loadJson(MANUAL_KNOWLEDGE_PATH));
  validateReports(examData);
  validateStaticPage();
  validateSummary(examData);

  console.log(
    JSON.stringify(
      {
        status: "passed",
        questions: examData.questionBank.length,
        knowledgePoints: examData.knowledgePoints.length,
        manualQuestionReviews: loadJson(MANUAL_QUESTION_PATH).length,
        manualKnowledgeReviews: loadJson(MANUAL_KNOWLEDGE_PATH).length,
        unresolved: 0,
        staticPage: "passed",
        verificationSummary: "passed",
      },
      null,
      2
    )
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
