#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(projectRoot, "data", "sample-data.js"), "utf8"), sandbox);

const examData = sandbox.window.EXAM_DATA;
const audit = JSON.parse(fs.readFileSync(path.join(projectRoot, "data", "full-manual-audit.json"), "utf8"));
const questionsById = new Map(examData.questionBank.map((question) => [question.id, question]));
const reviewedIds = new Set();

for (const record of audit.reviewed) {
  if (!questionsById.has(record.id)) {
    throw new Error(`人工台账包含不存在的题目：${record.id}`);
  }
  if (reviewedIds.has(record.id)) {
    throw new Error(`人工台账包含重复题目：${record.id}`);
  }
  if (!record.reviewedAt || !record.result || !record.evidence || !record.checks) {
    throw new Error(`人工台账记录不完整：${record.id}`);
  }
  reviewedIds.add(record.id);
}

const subjects = examData.subjects.map((subject) => {
  const questions = examData.questionBank.filter((question) => question.subjectId === subject.id);
  const reviewed = questions.filter((question) => reviewedIds.has(question.id)).length;
  return { id: subject.id, label: subject.label, total: questions.length, reviewed, pending: questions.length - reviewed };
});

console.log(JSON.stringify({ total: examData.questionBank.length, reviewed: reviewedIds.size, pending: examData.questionBank.length - reviewedIds.size, subjects }, null, 2));
