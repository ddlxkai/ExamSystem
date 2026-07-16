(function () {
  const STORAGE_KEY = "safety-exam-system-v1";
  const QUESTION_SAMPLE = {
    exam: {
      title: "中级注册安全工程师练习系统",
      dailyTarget: 20,
      knowledgeRotateSeconds: 20,
    },
    subjects: [
      { id: "law", label: "法规", description: "法律法规与主体责任" },
      { id: "management", label: "管理", description: "安全管理与应急治理" },
      { id: "technology", label: "技术", description: "安全技术基础与防护" },
      { id: "construction", label: "建筑", description: "建筑施工安全实务" },
    ],
    levels: [
      { id: "l1", label: "入门", min: 0, max: 29, description: "基础还在建立。" },
      { id: "l2", label: "夯基", min: 30, max: 49, description: "已经具备基础题感。" },
    ],
    knowledgePoints: [
      {
        id: "kp-001",
        subjectId: "law",
        title: "知识点标题",
        summary: "知识点摘要",
        details: "详细说明",
        sourcePath: "data/example.pdf",
        tags: ["标签一", "标签二"],
      },
    ],
    questionBank: [
      {
        id: "q-001",
        subjectId: "law",
        type: "single",
        stem: "题干内容",
        options: ["选项 A", "选项 B", "选项 C", "选项 D"],
        answer: ["A"],
        explanation: "答案解析",
        knowledgePointIds: ["kp-001"],
        difficulty: "easy",
        source: "正式题库来源",
      },
    ],
  };

  const elements = {
    views: document.querySelectorAll("[data-view]"),
    navButtons: document.querySelectorAll("[data-view-target]"),
    metricsGrid: document.getElementById("metrics-grid"),
    dashboardTitle: document.getElementById("dashboard-title"),
    dashboardSummary: document.getElementById("dashboard-summary"),
    rankLabel: document.getElementById("rank-label"),
    rankDetail: document.getElementById("rank-detail"),
    knowledgeSpotlight: document.getElementById("knowledge-spotlight"),
    nextKnowledgeButton: document.getElementById("next-knowledge-button"),
    dailyStatus: document.getElementById("daily-status"),
    startDailyButton: document.getElementById("start-daily-button"),
    reviewMistakesButton: document.getElementById("review-mistakes-button"),
    browseKnowledgeButton: document.getElementById("browse-knowledge-button"),
    practiceDailyButton: document.getElementById("practice-daily-button"),
    practiceRandomButton: document.getElementById("practice-random-button"),
    practiceMistakesButton: document.getElementById("practice-mistakes-button"),
    practiceStatus: document.getElementById("practice-status"),
    questionCard: document.getElementById("question-card"),
    mistakesPracticeButton: document.getElementById("mistakes-practice-button"),
    mistakeSummary: document.getElementById("mistake-summary"),
    mistakeList: document.getElementById("mistake-list"),
    knowledgeList: document.getElementById("knowledge-list"),
    knowledgeSearch: document.getElementById("knowledge-search"),
    ttsStatusText: document.getElementById("tts-status-text"),
    ttsPlayAllButton: document.getElementById("tts-play-all-button"),
    ttsPlayCurrentButton: document.getElementById("tts-play-current-button"),
    ttsPrevButton: document.getElementById("tts-prev-button"),
    ttsNextButton: document.getElementById("tts-next-button"),
    ttsStopButton: document.getElementById("tts-stop-button"),
    ttsStatus: document.getElementById("tts-status"),
    ttsAudio: document.getElementById("tts-audio"),
    importFile: document.getElementById("import-file"),
    importButton: document.getElementById("import-button"),
    importFeedback: document.getElementById("import-feedback"),
    exportButton: document.getElementById("export-button"),
    resetProgressButton: document.getElementById("reset-progress-button"),
    formatPreview: document.getElementById("format-preview"),
    dataBanner: document.getElementById("data-banner"),
    resetSessionButton: document.getElementById("reset-session-button"),
    subjectSwitcher: document.getElementById("subject-switcher"),
    subjectHeading: document.getElementById("subject-heading"),
    subjectSummary: document.getElementById("subject-summary"),
  };

  let examData = sanitizeExamData(window.EXAM_DATA || QUESTION_SAMPLE);
  let state = loadState();
  let rotationTimer = null;
  const ttsState = {
    currentIndex: 0,
    autoContinue: false,
    isPlaying: false,
    activeRequestId: null,
    activeSocket: null,
    currentAudioUrl: null,
  };

  init();

  function init() {
    ensureQuestionProgress();
    ensureSelectedSubjectValid();
    bindEvents();
    renderFormatPreview();
    startKnowledgeRotation();
    renderApp();
  }

  function bindEvents() {
    elements.navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        switchView(button.dataset.viewTarget);
      });
    });

    elements.nextKnowledgeButton.addEventListener("click", () => {
      advanceKnowledgeSpotlight(true);
    });

    elements.startDailyButton.addEventListener("click", () => {
      startDailyPractice();
    });

    elements.reviewMistakesButton.addEventListener("click", () => {
      startMistakePractice();
    });

    elements.browseKnowledgeButton.addEventListener("click", () => {
      switchView("knowledge");
    });

    elements.practiceDailyButton.addEventListener("click", () => {
      startDailyPractice();
    });

    elements.practiceRandomButton.addEventListener("click", () => {
      startRandomPractice();
    });

    elements.practiceMistakesButton.addEventListener("click", () => {
      startMistakePractice();
    });

    elements.mistakesPracticeButton.addEventListener("click", () => {
      startMistakePractice();
    });

    elements.knowledgeSearch.addEventListener("input", () => {
      renderKnowledgeList();
      renderTtsPanel();
    });

    elements.ttsPlayAllButton.addEventListener("click", () => {
      playKnowledgeSequenceFrom(0);
    });

    elements.ttsPlayCurrentButton.addEventListener("click", () => {
      playKnowledgeSequenceFrom(ttsState.currentIndex);
    });

    elements.ttsPrevButton.addEventListener("click", () => {
      const points = getFilteredKnowledgePoints();
      if (!points.length) {
        updateTtsStatus("当前没有可播放的知识点。");
        return;
      }
      playKnowledgeAtIndex(Math.max(ttsState.currentIndex - 1, 0), {
        autoContinue: ttsState.autoContinue,
      });
    });

    elements.ttsNextButton.addEventListener("click", () => {
      const points = getFilteredKnowledgePoints();
      if (!points.length) {
        updateTtsStatus("当前没有可播放的知识点。");
        return;
      }
      playKnowledgeAtIndex(Math.min(ttsState.currentIndex + 1, points.length - 1), {
        autoContinue: ttsState.autoContinue,
      });
    });

    elements.ttsStopButton.addEventListener("click", () => {
      stopTtsPlayback("已停止播放。");
    });

    elements.ttsAudio.addEventListener("ended", () => {
      handleTtsAudioEnded();
    });

    elements.importButton.addEventListener("click", handleImport);
    elements.exportButton.addEventListener("click", exportBackup);
    elements.resetProgressButton.addEventListener("click", resetProgress);
    elements.resetSessionButton.addEventListener("click", clearSession);
  }

  function renderApp() {
    renderSubjectSwitcher();
    renderDashboard();
    renderKnowledgeSpotlight();
    renderDailyStatus();
    renderPractice();
    renderMistakes();
    renderKnowledgeList();
    renderTtsPanel();
    renderDataBanner();
  }

  function renderDataBanner() {
    const notice =
      examData.exam.notice ||
      "当前使用的是本地题库。请确保导入的正式题库内容已经过你自己核验。";
    elements.dataBanner.textContent = notice;
  }

  function renderSubjectSwitcher() {
    const subjects = examData.subjects || [];
    const selectedSubject = getSelectedSubject();

    if (!subjects.length || !selectedSubject) {
      elements.subjectHeading.textContent = "当前没有可用科目";
      elements.subjectSummary.textContent = "";
      elements.subjectSwitcher.innerHTML = "";
      return;
    }

    const questionCount = getQuestionsForSubject(selectedSubject.id).length;
    const knowledgeCount = getKnowledgePointsForSubject(selectedSubject.id).length;

    elements.subjectHeading.textContent = `当前练习科目：${selectedSubject.label}`;
    elements.subjectSummary.textContent = `本题库已按四大类拆分。当前科目共 ${questionCount} 题，关联 ${knowledgeCount} 个知识点。`;

    elements.subjectSwitcher.innerHTML = subjects
      .map((subject) => {
        const count = getQuestionsForSubject(subject.id).length;
        return `
          <button
            class="subject-button${subject.id === selectedSubject.id ? " is-active" : ""}"
            data-subject-id="${escapeHtml(subject.id)}"
            type="button"
          >
            <strong>${escapeHtml(subject.label)}</strong>
            <span>${escapeHtml(subject.description || "")}</span>
            <span>当前题数：${escapeHtml(String(count))}</span>
          </button>
        `;
      })
      .join("");

    elements.subjectSwitcher.querySelectorAll("[data-subject-id]").forEach((button) => {
      button.addEventListener("click", () => {
        setSelectedSubjectId(button.dataset.subjectId);
      });
    });
  }

  function switchView(targetView) {
    elements.views.forEach((view) => {
      view.classList.toggle("is-visible", view.dataset.view === targetView);
    });

    elements.navButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.viewTarget === targetView);
    });
  }

  function renderDashboard() {
    const selectedSubject = getSelectedSubject();
    const subjectQuestions = getQuestionsForSelectedSubject();
    const metrics = getMetrics(subjectQuestions.map((question) => question.id));
    const todayPlan = getDailyPlan();
    const rating = getRating(metrics.masteryPercent);

    elements.dashboardTitle.textContent = `${examData.exam.title} · ${selectedSubject.label}训练`;
    elements.dashboardSummary.textContent = `${selectedSubject.label}当前计划 ${todayPlan.assignedIds.length} 题，已完成 ${todayPlan.answeredIds.length} 题。系统会优先安排该科目的到期复习题、错题和未练习新题。`;
    elements.rankLabel.textContent = rating.label;
    elements.rankDetail.textContent = `已掌握 ${metrics.masteryPercent}% · ${rating.description}`;

    const cards = [
      { label: "当前科目题数", value: subjectQuestions.length, hint: selectedSubject.description },
      { label: "掌握题数", value: metrics.masteredCount, hint: `掌握率 ${metrics.masteryPercent}%` },
      { label: "累计正确率", value: `${metrics.accuracyPercent}%`, hint: `答题 ${metrics.totalAnswers} 次` },
      { label: "错题数量", value: metrics.mistakeCount, hint: `${selectedSubject.label}仍需反复复练` },
    ];

    elements.metricsGrid.innerHTML = cards
      .map(
        (card) => `
          <article class="metric-card">
            <span>${escapeHtml(card.label)}</span>
            <strong>${escapeHtml(String(card.value))}</strong>
            <span>${escapeHtml(card.hint)}</span>
          </article>
        `
      )
      .join("");
  }

  function renderDailyStatus() {
    const plan = getDailyPlan();
    const selectedSubject = getSelectedSubject();
    const dueCount = getDueQuestionIds(selectedSubject.id).length;
    const completed = plan.answeredIds.length;
    const target = plan.assignedIds.length;
    const remaining = Math.max(target - completed, 0);

    elements.dailyStatus.innerHTML = `
      <div class="meta-row">
        <span class="tag">今日已完成 ${completed} / ${target}</span>
        <span class="tag">当前到期复习 ${dueCount} 题</span>
        <span class="tag">剩余 ${remaining} 题</span>
        <span class="tag">当前科目 ${escapeHtml(selectedSubject.label)}</span>
      </div>
      <p>当前只针对 ${escapeHtml(selectedSubject.label)} 科目安排计划。如果当天答错，题目会在本次训练结束前再次出现；如果连续多次答对，系统会自动延长下次复习间隔。</p>
    `;
  }

  function renderKnowledgeSpotlight() {
    const points = getKnowledgePointsForSelectedSubject();
    if (!points.length) {
      elements.knowledgeSpotlight.innerHTML = "<p>当前没有知识点数据。</p>";
      return;
    }

    const index = state.settings.knowledgeSpotlightIndex % points.length;
    const point = points[index];
    const content = getKnowledgePointDisplayContent(point);

    elements.knowledgeSpotlight.innerHTML = `
      <p class="panel-label">知识点 ${index + 1} / ${points.length}</p>
      <h4>${escapeHtml(point.title)}</h4>
      ${content.summary ? `<p>${escapeHtml(content.summary)}</p>` : ""}
      ${content.details ? `<p>${escapeHtml(content.details)}</p>` : ""}
      ${content.sourcePath ? `<p class="knowledge-source">PDF 来源：${escapeHtml(content.sourcePath)}</p>` : ""}
      <div class="tag-row">
        ${(point.tags || [])
          .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
          .join("")}
      </div>
    `;
  }

  function startKnowledgeRotation() {
    if (rotationTimer) {
      window.clearInterval(rotationTimer);
    }

    rotationTimer = window.setInterval(() => {
      advanceKnowledgeSpotlight(false);
    }, getKnowledgeRotateSeconds() * 1000);
  }

  function advanceKnowledgeSpotlight(saveImmediately) {
    const total = getKnowledgePointsForSelectedSubject().length || 1;
    state.settings.knowledgeSpotlightIndex = (state.settings.knowledgeSpotlightIndex + 1) % total;
    if (saveImmediately) {
      persistState();
    }
    renderKnowledgeSpotlight();
  }

  function renderPractice() {
    const session = state.currentSession;
    if (!session) {
      const subject = getSelectedSubject();
      elements.practiceStatus.innerHTML =
        `${subject.label}当前没有进行中的训练。你可以开始今日计划、随机练习，或直接进入错题复练。`;
      elements.questionCard.className = "question-card empty-card";
      elements.questionCard.textContent = `请选择 ${subject.label} 的训练模式开始练习。`;
      return;
    }

    const subject = getSubjectById(session.subjectId) || getSelectedSubject();
    const progressText = `科目：${subject.label} · 模式：${getSessionLabel(session.mode)} · 已答 ${session.askedCount} 题 · 队列剩余 ${
      session.queue.length + session.reviewQueue.length
    } 题`;
    elements.practiceStatus.innerHTML = `<div class="meta-row"><span class="tag">${escapeHtml(
      progressText
    )}</span></div>`;

    const currentQuestion = getQuestionById(session.currentQuestionId);
    if (!currentQuestion) {
      finishSession();
      return;
    }

    elements.questionCard.className = "question-card";
    elements.questionCard.innerHTML = buildQuestionMarkup(
      currentQuestion,
      session.lastResult,
      session.peekedQuestionId === currentQuestion.id,
      session.correctAnsweredCount || 0
    );
    bindQuestionActions(currentQuestion);
  }

  function buildQuestionMarkup(question, lastResult, isPeeked, correctAnsweredCount) {
    const typeLabel = getQuestionTypeLabel(question.type);
    const progress = getQuestionProgress(question.id);
    const linkedPoints = question.knowledgePointIds
      .map((id) => getKnowledgePointById(id))
      .filter(Boolean);
    const isResolved = lastResult && lastResult.questionId === question.id;
    const isAnswerLocked = Boolean(isResolved || isPeeked);
    const shouldAutoSubmit = question.type !== "multiple";

    return `
      <div class="question-meta">
        <span class="tag">${escapeHtml(getSubjectLabel(question.subjectId))}</span>
        <span class="tag">${escapeHtml(typeLabel)}</span>
        <span class="tag">本轮累计答对 ${correctAnsweredCount} 题</span>
        <span class="tag">错误 ${progress.wrongCount} 次</span>
        <span class="tag">下次复习 ${formatReviewDate(progress.nextReviewAt)}</span>
      </div>
      <p class="question-stem">${escapeHtml(question.stem)}</p>
      <form id="practice-form">
        <div class="option-list">
          ${buildOptionsMarkup(question, isAnswerLocked, lastResult, isPeeked)}
        </div>
        <div class="practice-footer">
          ${
            isResolved
              ? '<button class="primary-button" type="button" id="next-question-button">下一题</button>'
              : `
                ${
                  shouldAutoSubmit
                    ? ""
                    : `<button class="primary-button" type="submit" ${
                        isPeeked ? "disabled" : ""
                      }>提交答案</button>`
                }
                <button class="ghost-button" type="button" id="skip-question-button">跳过本题</button>
                <button class="ghost-button" type="button" id="show-answer-button">查看解析</button>
              `
          }
        </div>
      </form>
      ${
        isResolved
          ? `
            <div class="answer-panel ${lastResult.correct ? "correct" : "wrong"}">
              <strong>${lastResult.correct ? "回答正确" : "回答错误"}</strong>
              <p>正确答案：${escapeHtml(lastResult.answerText)}</p>
              <p>${escapeHtml(lastResult.explanation)}</p>
            </div>
          `
          : ""
      }
      ${
        !isResolved && isPeeked
          ? `
            <div class="answer-panel">
              <strong>题目解析</strong>
              <p>正确答案：${escapeHtml(formatAnswerText(question))}</p>
              <p>${escapeHtml(question.explanation || "暂无解析。")}</p>
            </div>
          `
          : ""
      }
      <div class="footer-meta">
        关联知识点：${linkedPoints.map((item) => escapeHtml(item.title)).join("、") || "未关联"}
      </div>
    `;
  }

  function buildOptionsMarkup(question, isAnswerLocked, lastResult, isPeeked) {
    const inputType = question.type === "multiple" ? "checkbox" : "radio";
    const selectedAnswers = getResolvedSelectedAnswers(lastResult, question, isPeeked);
    const correctAnswers = question.answer || [];
    const optionLabels = question.options.map((option, index) => {
      const optionCode = getOptionCode(index);
      const isSelected = selectedAnswers.includes(optionCode);
      const isCorrect = correctAnswers.includes(optionCode);
      const stateClass = getOptionStateClass({
        isAnswerLocked,
        isSelected,
        isCorrect,
      });
      return `
        <label class="option-card${isAnswerLocked ? " is-disabled" : ""}${stateClass}">
          <input type="${inputType}" name="answer" value="${optionCode}" ${
            isSelected ? "checked" : ""
          } ${
            isAnswerLocked ? "disabled" : ""
          } />
          <span><strong>${optionCode}.</strong> ${escapeHtml(option)}</span>
        </label>
      `;
    });

    return optionLabels.join("");
  }

  function bindQuestionActions(question) {
    const form = document.getElementById("practice-form");
    const skipButton = document.getElementById("skip-question-button");
    const showAnswerButton = document.getElementById("show-answer-button");
    const nextButton = document.getElementById("next-question-button");

    if (nextButton) {
      nextButton.addEventListener("click", () => {
        advanceSession();
      });
    } else {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        handleQuestionSubmit(question, collectSelectedAnswers(form));
      });

      if (question.type !== "multiple") {
        form.querySelectorAll('input[name="answer"]').forEach((input) => {
          input.addEventListener("change", () => {
            handleQuestionSubmit(question, collectSelectedAnswers(form));
          });
        });
      }
    }

    if (skipButton) {
      skipButton.addEventListener("click", () => {
        const session = state.currentSession;
        if (!session) {
          return;
        }
        session.queue.push(question.id);
        session.lastResult = null;
        session.peekedQuestionId = null;
        session.currentQuestionId = pullNextQuestionId(session);
        persistState();
        renderPractice();
      });
    }

    if (showAnswerButton) {
      showAnswerButton.addEventListener("click", () => {
        const session = state.currentSession;
        if (!session) {
          return;
        }
        session.peekedQuestionId = question.id;
        persistState();
        renderPractice();
      });
    }
  }

  function handleQuestionSubmit(question, selectedAnswers) {
    if (!selectedAnswers.length) {
      window.alert("请先选择答案。");
      return;
    }

    const session = state.currentSession;
    if (!session) {
      return;
    }

    const correct = compareAnswers(selectedAnswers, question.answer);
    const progress = getQuestionProgress(question.id);
    const alreadyCountedToday = session.countedQuestionIds.includes(question.id);

    updateQuestionProgress(progress, correct);
    session.correctStreak = correct ? (session.correctStreak || 0) + 1 : 0;
    if (correct) {
      session.correctAnsweredCount = (session.correctAnsweredCount || 0) + 1;
    }
    if (!alreadyCountedToday) {
      session.countedQuestionIds.push(question.id);
      session.askedCount += 1;
      updateDailyPlanProgress(question.id, correct, session.mode, session.subjectId);
    }

    if (!correct) {
      session.reviewQueue.push(question.id);
    }

    const nextQuestionId = pullNextQuestionId(session);
    session.lastResult = {
      questionId: question.id,
      correct,
      selectedAnswers,
      answerText: formatAnswerText(question),
      explanation: question.explanation || "暂无解析。",
    };
    session.peekedQuestionId = null;
    session.pendingNextQuestionId = nextQuestionId;
    persistState();
    renderApp();
  }

  function collectSelectedAnswers(form) {
    return Array.from(form.querySelectorAll('input[name="answer"]:checked'))
      .map((input) => input.value)
      .sort();
  }

  function startDailyPractice() {
    const plan = getDailyPlan();
    const remainingIds = plan.assignedIds.filter((id) => !plan.answeredIds.includes(id));
    const queue = remainingIds.length ? remainingIds : plan.assignedIds.slice();

    state.currentSession = createSession("daily", queue, getSelectedSubjectId());
    switchView("practice");
    persistState();
    renderPractice();
  }

  function startRandomPractice() {
    const subjectQuestions = getQuestionsForSelectedSubject();
    const size = Math.min(20, subjectQuestions.length);
    const queue = shuffle(subjectQuestions.map((question) => question.id)).slice(0, size);
    state.currentSession = createSession("random", queue, getSelectedSubjectId());
    switchView("practice");
    persistState();
    renderPractice();
  }

  function startMistakePractice() {
    const subject = getSelectedSubject();
    const queue = getMistakeQuestionIds(subject.id);
    if (!queue.length) {
      window.alert(`当前 ${subject.label} 还没有错题。`);
      switchView("mistakes");
      return;
    }

    state.currentSession = createSession("mistake", queue, subject.id);
    switchView("practice");
    persistState();
    renderPractice();
  }

  function createSession(mode, questionIds, subjectId) {
    const queue = questionIds.slice();
    return {
      mode,
      subjectId,
      queue,
      reviewQueue: [],
      currentQuestionId: queue.shift() || null,
      pendingNextQuestionId: null,
      peekedQuestionId: null,
      countedQuestionIds: [],
      askedCount: 0,
      correctStreak: 0,
      correctAnsweredCount: 0,
      startedAt: new Date().toISOString(),
      lastResult: null,
    };
  }

  function advanceSession() {
    const session = state.currentSession;
    if (!session) {
      return;
    }

    session.currentQuestionId = session.pendingNextQuestionId;
    session.pendingNextQuestionId = null;
    session.lastResult = null;
    session.peekedQuestionId = null;
    persistState();

    if (!session.currentQuestionId) {
      finishSession();
      return;
    }

    renderPractice();
  }

  function pullNextQuestionId(session) {
    if (session.queue.length) {
      return session.queue.shift();
    }

    if (session.reviewQueue.length) {
      return session.reviewQueue.shift();
    }

    return null;
  }

  function updateDailyPlanProgress(questionId, correct, mode, subjectId) {
    if (mode !== "daily") {
      return;
    }

    const plan = getDailyPlan(subjectId);
    if (!plan.answeredIds.includes(questionId)) {
      plan.answeredIds.push(questionId);
    }
    if (correct && !plan.correctIds.includes(questionId)) {
      plan.correctIds.push(questionId);
    }
  }

  function finishSession() {
    const session = state.currentSession;
    if (!session) {
      return;
    }

    const answered = session.askedCount;
    const summary = session.lastResult
      ? `本次练习结束，共完成 ${answered} 题。`
      : `练习队列已经完成，共处理 ${answered} 题。`;

    state.currentSession = null;
    persistState();
    renderApp();
    elements.practiceStatus.innerHTML = `<div class="meta-row"><span class="tag">${escapeHtml(
      summary
    )}</span></div>`;
    elements.questionCard.className = "question-card empty-card";
    elements.questionCard.textContent = "本轮练习已结束，可重新开始今日计划或错题复练。";
  }

  function clearSession() {
    state.currentSession = null;
    persistState();
    renderPractice();
  }

  function renderMistakes() {
    const subject = getSelectedSubject();
    const mistakeIds = getMistakeQuestionIds(subject.id);
    elements.mistakeSummary.textContent = mistakeIds.length
      ? `${subject.label} 当前共有 ${mistakeIds.length} 道需要重点复练的题目，按错误次数和掌握状态排序。`
      : `${subject.label} 当前没有需要重点复练的错题。`;

    elements.mistakeList.innerHTML = mistakeIds.length
      ? mistakeIds
          .map((id) => {
            const question = getQuestionById(id);
            const progress = getQuestionProgress(id);
            return `
              <article class="mistake-item">
                <div class="meta-row">
                  <span class="tag">${escapeHtml(getSubjectLabel(question.subjectId))}</span>
                  <span class="tag">${escapeHtml(getQuestionTypeLabel(question.type))}</span>
                  <span class="tag">错误 ${progress.wrongCount} 次</span>
                  <span class="tag">正确率 ${getQuestionAccuracy(progress)}%</span>
                  <span class="tag">状态 ${escapeHtml(getStatusLabel(progress.status))}</span>
                </div>
                <h4>${escapeHtml(question.stem)}</h4>
                <p>${escapeHtml(question.explanation || "暂无解析。")}</p>
              </article>
            `;
          })
          .join("")
      : '<article class="mistake-item">继续保持，当前没有错题。</article>';
  }

  function renderKnowledgeList() {
    const subject = getSelectedSubject();
    const points = getFilteredKnowledgePoints();
    syncTtsIndex(points.length);

    elements.knowledgeList.innerHTML = points.length
      ? points
          .map((point, index) => {
            const content = getKnowledgePointDisplayContent(point);
            return `
              <article class="knowledge-item${
                index === ttsState.currentIndex ? " is-current" : ""
              }" data-knowledge-index="${index}">
                <h4>${escapeHtml(point.title)}</h4>
                ${content.summary ? `<p>${escapeHtml(content.summary)}</p>` : ""}
                ${content.details ? `<p>${escapeHtml(content.details)}</p>` : ""}
                ${content.sourcePath ? `<p class="knowledge-source">PDF 来源：${escapeHtml(content.sourcePath)}</p>` : ""}
                <div class="tag-row">
                  ${(point.tags || [])
                    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
                    .join("")}
                </div>
              </article>
            `;
          })
          .join("")
      : `<article class="knowledge-item">在 ${escapeHtml(subject.label)} 科目下没有匹配到相关知识点。</article>`;

    elements.knowledgeList.querySelectorAll("[data-knowledge-index]").forEach((item) => {
      item.addEventListener("click", () => {
        ttsState.currentIndex = Number(item.dataset.knowledgeIndex) || 0;
        renderKnowledgeList();
        renderTtsPanel();
      });
    });
  }

  function handleImport() {
    const file = elements.importFile.files && elements.importFile.files[0];
    if (!file) {
      elements.importFeedback.textContent = "请先选择一个 JSON 文件。";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result));

        if (imported.data && imported.state) {
          examData = sanitizeExamData(imported.data);
          state = normalizeState(imported.state);
        } else {
          examData = sanitizeExamData(imported);
          state = createFreshState();
        }

        ensureQuestionProgress();
        ensureSelectedSubjectValid();
        persistState();
        startKnowledgeRotation();
        renderApp();
        elements.importFeedback.textContent = `导入成功：共载入 ${examData.questionBank.length} 道题、${examData.knowledgePoints.length} 个知识点。`;
      } catch (error) {
        elements.importFeedback.textContent = `导入失败：${error.message}`;
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function exportBackup() {
    const backup = {
      exportedAt: new Date().toISOString(),
      data: examData,
      state,
    };

    downloadJson(
      backup,
      `safety-exam-backup-${formatDateKey(new Date()).replaceAll("-", "")}.json`
    );
  }

  function resetProgress() {
    const confirmed = window.confirm("确定要清空当前设备上的学习进度吗？题库本身不会被删除。");
    if (!confirmed) {
      return;
    }

    state = createFreshState();
    ensureQuestionProgress();
    persistState();
    renderApp();
  }

  function renderFormatPreview() {
    elements.formatPreview.textContent = JSON.stringify(QUESTION_SAMPLE, null, 2);
  }

  function getMetrics(questionIds) {
    const targetIds = questionIds || examData.questionBank.map((question) => question.id);
    const entries = targetIds.map((id) => getQuestionProgress(id));
    const masteredCount = entries.filter((item) => item.status === "mastered").length;
    const totalAnswers = entries.reduce((sum, item) => sum + item.totalAttempts, 0);
    const totalCorrect = entries.reduce((sum, item) => sum + item.correctCount, 0);
    const mistakeCount = getMistakeQuestionIds(getSelectedSubjectId()).length;
    const masteryPercent = targetIds.length ? Math.round((masteredCount / targetIds.length) * 100) : 0;
    const accuracyPercent = totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

    return {
      masteredCount,
      totalAnswers,
      totalCorrect,
      mistakeCount,
      masteryPercent,
      accuracyPercent,
    };
  }

  function getRating(masteryPercent) {
    const level =
      examData.levels.find((item) => masteryPercent >= item.min && masteryPercent <= item.max) ||
      examData.levels[examData.levels.length - 1];
    return level;
  }

  function getDailyPlan(subjectId = getSelectedSubjectId()) {
    const planKey = getDailyPlanKey(subjectId);
    let plan = state.dailyPlans[planKey];
    const shouldRebuildUnstartedPlan = plan && !plan.answeredIds.length && plan.selectionVersion !== 2;

    if (!plan || shouldRebuildUnstartedPlan) {
      const assignedIds = buildDailyQueue(subjectId);
      plan = {
        dateKey: formatDateKey(new Date()),
        subjectId,
        assignedIds,
        answeredIds: [],
        correctIds: [],
        selectionVersion: 2,
        createdAt: new Date().toISOString(),
      };
      state.dailyPlans[planKey] = plan;
      persistState();
    }

    return plan;
  }

  function buildDailyQueue(subjectId) {
    const questions = getQuestionsForSubject(subjectId);
    const target = Math.min(getDailyTarget(), questions.length);
    const dueIds = shuffle(getDueQuestionIds(subjectId));
    const mistakeIds = shuffle(getMistakeQuestionIds(subjectId).filter((id) => !dueIds.includes(id)));
    const freshIds = shuffle(
      questions
        .filter((question) => getQuestionProgress(question.id).totalAttempts === 0)
        .map((question) => question.id)
        .filter((id) => !dueIds.includes(id) && !mistakeIds.includes(id))
    );
    const reviewIds = questions
      .map((question) => question.id)
      .filter((id) => !dueIds.includes(id) && !mistakeIds.includes(id) && !freshIds.includes(id))
      .sort((a, b) => compareReviewPriority(getQuestionProgress(a), getQuestionProgress(b)));

    const queue = uniqueIds([...dueIds, ...mistakeIds, ...freshIds, ...reviewIds]).slice(0, target);
    return shuffle(queue);
  }

  function getDueQuestionIds(subjectId) {
    const now = new Date();
    return getQuestionsForSubject(subjectId)
      .map((question) => question.id)
      .filter((id) => isQuestionDue(getQuestionProgress(id), now))
      .sort((a, b) => compareReviewPriority(getQuestionProgress(a), getQuestionProgress(b)));
  }

  function getMistakeQuestionIds(subjectId) {
    return getQuestionsForSubject(subjectId)
      .map((question) => question.id)
      .filter((id) => {
        const progress = getQuestionProgress(id);
        return progress.wrongCount > 0 && progress.status !== "mastered";
      })
      .sort((a, b) => {
        const progressA = getQuestionProgress(a);
        const progressB = getQuestionProgress(b);
        if (progressB.wrongCount !== progressA.wrongCount) {
          return progressB.wrongCount - progressA.wrongCount;
        }
        return getQuestionAccuracy(progressA) - getQuestionAccuracy(progressB);
      });
  }

  function compareReviewPriority(progressA, progressB) {
    const nextA = progressA.nextReviewAt ? new Date(progressA.nextReviewAt).getTime() : 0;
    const nextB = progressB.nextReviewAt ? new Date(progressB.nextReviewAt).getTime() : 0;
    if (nextA !== nextB) {
      return nextA - nextB;
    }
    if (progressA.streak !== progressB.streak) {
      return progressA.streak - progressB.streak;
    }
    return getQuestionAccuracy(progressA) - getQuestionAccuracy(progressB);
  }

  function isQuestionDue(progress, now) {
    if (progress.totalAttempts === 0) {
      return false;
    }
    if (!progress.nextReviewAt) {
      return true;
    }
    return new Date(progress.nextReviewAt).getTime() <= now.getTime();
  }

  function updateQuestionProgress(progress, correct) {
    const now = new Date();
    progress.totalAttempts += 1;
    progress.lastAnsweredAt = now.toISOString();
    progress.recentResults.push(correct ? 1 : 0);
    progress.recentResults = progress.recentResults.slice(-8);

    if (correct) {
      progress.correctCount += 1;
      progress.streak += 1;
      progress.easeFactor = clamp(progress.easeFactor + 0.05, 1.3, 3);
      progress.intervalDays = calculateNextInterval(progress.streak, progress.intervalDays, progress.easeFactor);
      progress.nextReviewAt = addDays(now, progress.intervalDays).toISOString();
      progress.status =
        progress.streak >= 4 && getQuestionAccuracy(progress) >= 80
          ? "mastered"
          : progress.streak >= 2
          ? "review"
          : "learning";
      if (progress.status === "mastered" && !progress.masteredAt) {
        progress.masteredAt = now.toISOString();
      }
    } else {
      progress.wrongCount += 1;
      progress.streak = 0;
      progress.easeFactor = clamp(progress.easeFactor - 0.2, 1.3, 3);
      progress.intervalDays = 1;
      progress.nextReviewAt = addDays(now, 1).toISOString();
      progress.status = "learning";
      progress.masteredAt = null;
    }
  }

  function calculateNextInterval(streak, currentInterval, easeFactor) {
    if (streak <= 1) {
      return 1;
    }
    if (streak === 2) {
      return 3;
    }
    if (streak === 3) {
      return 7;
    }
    return Math.max(14, Math.round(Math.max(currentInterval, 7) * easeFactor));
  }

  function ensureQuestionProgress() {
    const validIds = new Set(examData.questionBank.map((question) => question.id));
    Object.keys(state.questionProgress).forEach((id) => {
      if (!validIds.has(id)) {
        delete state.questionProgress[id];
      }
    });

    examData.questionBank.forEach((question) => {
      if (!state.questionProgress[question.id]) {
        state.questionProgress[question.id] = createQuestionProgress();
      }
    });
  }

  function createQuestionProgress() {
    return {
      totalAttempts: 0,
      correctCount: 0,
      wrongCount: 0,
      streak: 0,
      status: "new",
      intervalDays: 0,
      easeFactor: 2.5,
      nextReviewAt: null,
      lastAnsweredAt: null,
      masteredAt: null,
      recentResults: [],
    };
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return createFreshState();
      }
      return normalizeState(JSON.parse(raw));
    } catch (error) {
      return createFreshState();
    }
  }

  function normalizeState(raw) {
    const rawSession = raw.currentSession || null;
    return {
      dailyPlans: raw.dailyPlans || {},
      questionProgress: raw.questionProgress || {},
      currentSession: rawSession
        ? {
            ...rawSession,
            correctStreak: Number(rawSession.correctStreak || 0),
            correctAnsweredCount: Number(rawSession.correctAnsweredCount || 0),
            countedQuestionIds: Array.isArray(rawSession.countedQuestionIds)
              ? rawSession.countedQuestionIds.map(String)
              : [],
            queue: Array.isArray(rawSession.queue) ? rawSession.queue.map(String) : [],
            reviewQueue: Array.isArray(rawSession.reviewQueue)
              ? rawSession.reviewQueue.map(String)
              : [],
            lastResult: rawSession.lastResult
              ? {
                  ...rawSession.lastResult,
                  selectedAnswers: Array.isArray(rawSession.lastResult.selectedAnswers)
                    ? rawSession.lastResult.selectedAnswers.map(String)
                    : [],
                }
              : null,
          }
        : null,
      settings: {
        knowledgeSpotlightIndex: raw.settings?.knowledgeSpotlightIndex || 0,
        selectedSubjectId: raw.settings?.selectedSubjectId || null,
      },
    };
  }

  function createFreshState() {
    return {
      dailyPlans: {},
      questionProgress: {},
      currentSession: null,
      settings: {
        knowledgeSpotlightIndex: 0,
        selectedSubjectId: null,
      },
    };
  }

  function persistState() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function sanitizeExamData(data) {
    if (!data || typeof data !== "object") {
      throw new Error("题库数据格式无效。");
    }
    if (!Array.isArray(data.questionBank) || !Array.isArray(data.knowledgePoints)) {
      throw new Error("题库必须包含 questionBank 和 knowledgePoints 数组。");
    }

    const inferredSubjectIds = uniqueIds([
      ...((Array.isArray(data.subjects) ? data.subjects : []).map((subject) => subject.id).filter(Boolean)),
      ...data.questionBank.map((question) => question.subjectId).filter(Boolean),
      ...data.knowledgePoints.map((point) => point.subjectId).filter(Boolean),
    ]);
    const fallbackSubjectSet = inferredSubjectIds.length
      ? inferredSubjectIds.map((subjectId) => ({
          id: subjectId,
          label: getDefaultSubjectLabel(subjectId),
          description: "",
        }))
      : [{ id: "general", label: "综合", description: "未分类题库" }];
    const normalizedSubjects = (Array.isArray(data.subjects) && data.subjects.length
      ? data.subjects
      : fallbackSubjectSet
    ).map((subject, index) => ({
      id: String(subject.id || `subject-${index + 1}`),
      label: String(subject.label || getDefaultSubjectLabel(subject.id || `subject-${index + 1}`)),
      description: String(subject.description || ""),
    }));
    const validSubjectIds = new Set(normalizedSubjects.map((subject) => subject.id));
    const fallbackSubjectId = normalizedSubjects[0].id;

    const normalizedQuestions = data.questionBank.map((question, index) => {
      if (!question.id || !question.stem || !Array.isArray(question.answer)) {
        throw new Error(`第 ${index + 1} 道题缺少必要字段。`);
      }
      const subjectId = validSubjectIds.has(String(question.subjectId))
        ? String(question.subjectId)
        : fallbackSubjectId;
      return {
        id: String(question.id),
        subjectId,
        type: ["single", "multiple", "judge"].includes(question.type) ? question.type : "single",
        stem: String(question.stem),
        options: Array.isArray(question.options) ? question.options.map(String) : [],
        answer: question.answer.map(String).sort(),
        explanation: String(question.explanation || ""),
        knowledgePointIds: Array.isArray(question.knowledgePointIds)
          ? question.knowledgePointIds.map(String)
          : [],
        difficulty: String(question.difficulty || "medium"),
        source: String(question.source || "未标注来源"),
      };
    });

    const normalizedPoints = data.knowledgePoints.map((point, index) => {
      if (!point.id || !point.title) {
        throw new Error(`第 ${index + 1} 个知识点缺少必要字段。`);
      }
      const subjectId = validSubjectIds.has(String(point.subjectId))
        ? String(point.subjectId)
        : fallbackSubjectId;
      return {
        id: String(point.id),
        subjectId,
        title: String(point.title),
        summary: String(point.summary || ""),
        details: String(point.details || ""),
        sourcePath: String(point.sourcePath || ""),
        tags: Array.isArray(point.tags) ? point.tags.map(String) : [],
      };
    });

    const defaultLevels = QUESTION_SAMPLE.levels.concat([
      { id: "l3", label: "稳进", min: 50, max: 69, description: "基础较稳。" },
      { id: "l4", label: "冲刺", min: 70, max: 89, description: "掌握度较高。" },
      { id: "l5", label: "熟练", min: 90, max: 100, description: "整体掌握较好。" },
    ]);

    return {
      exam: {
        title: String(data.exam?.title || "中级注册安全工程师练习系统"),
        subtitle: String(data.exam?.subtitle || ""),
        dailyTarget: Number(data.exam?.dailyTarget || 20),
        knowledgeRotateSeconds: Number(data.exam?.knowledgeRotateSeconds || 20),
        notice: String(
          data.exam?.notice ||
            "当前使用的是本地题库。请确保导入的正式题库内容已经过你自己核验。"
        ),
      },
      levels: (Array.isArray(data.levels) && data.levels.length ? data.levels : defaultLevels).map(
        (item, index) => ({
          id: String(item.id || `level-${index + 1}`),
          label: String(item.label || `等级 ${index + 1}`),
          min: Number(item.min ?? 0),
          max: Number(item.max ?? 100),
          description: String(item.description || ""),
        })
      ),
      subjects: normalizedSubjects,
      knowledgePoints: normalizedPoints,
      questionBank: normalizedQuestions,
    };
  }

  function getQuestionById(questionId) {
    return examData.questionBank.find((question) => question.id === questionId) || null;
  }

  function getKnowledgePointById(pointId) {
    return examData.knowledgePoints.find((point) => point.id === pointId) || null;
  }

  function getSubjectById(subjectId) {
    return (examData.subjects || []).find((subject) => subject.id === subjectId) || null;
  }

  function getDefaultSubjectLabel(subjectId) {
    const labelMap = {
      law: "法规",
      management: "管理",
      technology: "技术",
      construction: "建筑",
      general: "综合",
    };
    return labelMap[String(subjectId)] || String(subjectId || "综合");
  }

  function getSubjectLabel(subjectId) {
    return getSubjectById(subjectId)?.label || getDefaultSubjectLabel(subjectId);
  }

  function ensureSelectedSubjectValid() {
    const selectedSubjectId = state.settings.selectedSubjectId;
    if (selectedSubjectId && getSubjectById(selectedSubjectId)) {
      return;
    }
    state.settings.selectedSubjectId = examData.subjects?.[0]?.id || null;
  }

  function getSelectedSubjectId() {
    ensureSelectedSubjectValid();
    return state.settings.selectedSubjectId;
  }

  function getSelectedSubject() {
    return getSubjectById(getSelectedSubjectId()) || examData.subjects[0];
  }

  function setSelectedSubjectId(subjectId) {
    if (!getSubjectById(subjectId)) {
      return;
    }
    state.settings.selectedSubjectId = subjectId;
    resetTtsIndex();
    persistState();
    renderApp();
  }

  function getQuestionsForSubject(subjectId) {
    return examData.questionBank.filter((question) => question.subjectId === subjectId);
  }

  function getQuestionsForSelectedSubject() {
    return getQuestionsForSubject(getSelectedSubjectId());
  }

  function getKnowledgePointsForSubject(subjectId) {
    return examData.knowledgePoints.filter((point) => point.subjectId === subjectId);
  }

  function getKnowledgePointsForSelectedSubject() {
    return getKnowledgePointsForSubject(getSelectedSubjectId());
  }

  function getFilteredKnowledgePoints() {
    const keyword = elements.knowledgeSearch.value.trim().toLowerCase();
    return getKnowledgePointsForSelectedSubject().filter((point) => {
      if (!keyword) {
        return true;
      }
      return [point.title, point.summary, point.details, point.sourcePath, ...(point.tags || [])]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }

  function getDailyPlanKey(subjectId) {
    return `${formatDateKey(new Date())}:${subjectId}`;
  }

  function renderTtsPanel() {
    const points = getFilteredKnowledgePoints();
    const config = getProjectTtsConfig();
    const isConfigured = Boolean(config.appId && config.apiKey && config.apiSecret);
    syncTtsIndex(points.length);
    const current = points[ttsState.currentIndex] || null;
    const currentLabel = current
      ? `当前第 ${ttsState.currentIndex + 1} / ${points.length} 条：${current.title}`
      : "当前没有可播放的知识点。";
    const statusLabel = ttsState.isPlaying
      ? `播放中 · 第 ${ttsState.currentIndex + 1} 条`
      : `待播放 · 共 ${points.length} 条`;

    elements.ttsStatusText.value = currentLabel;
    elements.ttsStatus.innerHTML = `
      <div class="meta-row">
        <span class="tag">${escapeHtml(statusLabel)}</span>
        <span class="tag">${escapeHtml(getSelectedSubject().label)}</span>
        <span class="tag">当前筛选 ${points.length} 条</span>
        <span class="tag">${isConfigured ? "讯飞已配置" : "讯飞未配置"}</span>
      </div>
      <p>${
        isConfigured
          ? "点击知识点卡片可切换当前条目，再从当前条继续顺序播放。"
          : "请先在 assets/app-config.js 中填写讯飞参数，再开始播放知识点。"
      }</p>
    `;
  }

  function normalizeInlineText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function isKnowledgePlaceholderDetails(text) {
    const normalized = normalizeInlineText(text);
    return (
      /^来源约 \d+ 份 .+ PDF。示例来源：/u.test(normalized) ||
      /^自动抽取候选知识点。出现次数：\d+。来源：/u.test(normalized)
    );
  }

  function getKnowledgePointDisplayContent(point) {
    const summary = normalizeInlineText(point.summary);
    const details = normalizeInlineText(point.details);
    return {
      summary,
      details: isKnowledgePlaceholderDetails(details) ? "" : details,
      sourcePath: normalizeInlineText(point.sourcePath),
    };
  }

  function getProjectTtsConfig() {
    const raw = window.APP_CONFIG?.tts || {};
    return {
      appId: String(raw.appId || "").trim(),
      apiKey: String(raw.apiKey || "").trim(),
      apiSecret: String(raw.apiSecret || "").trim(),
      voice: String(raw.voice || "xiaoyan").trim() || "xiaoyan",
      speed: clamp(Number(raw.speed ?? 50), 0, 100),
      pitch: clamp(Number(raw.pitch ?? 50), 0, 100),
      volume: clamp(Number(raw.volume ?? 50), 0, 100),
    };
  }

  function resetTtsIndex() {
    ttsState.currentIndex = 0;
  }

  function syncTtsIndex(total) {
    if (!total) {
      ttsState.currentIndex = 0;
      return;
    }
    ttsState.currentIndex = clamp(ttsState.currentIndex, 0, total - 1);
  }

  function playKnowledgeSequenceFrom(index) {
    const points = getFilteredKnowledgePoints();
    if (!points.length) {
      updateTtsStatus("当前没有可播放的知识点。");
      return;
    }
    playKnowledgeAtIndex(clamp(index, 0, points.length - 1), { autoContinue: true });
  }

  async function playKnowledgeAtIndex(index, options = {}) {
    const points = getFilteredKnowledgePoints();
    if (!points.length) {
      updateTtsStatus("当前没有可播放的知识点。");
      return;
    }

    const safeIndex = clamp(index, 0, points.length - 1);
    const point = points[safeIndex];
    const config = readTtsConfig();
    if (!config) {
      return;
    }

    ttsState.currentIndex = safeIndex;
    ttsState.autoContinue = Boolean(options.autoContinue);
    ttsState.isPlaying = false;
    cleanupCurrentAudio();
    closeActiveTtsSocket();
    renderKnowledgeList();
    updateTtsStatus(`正在合成第 ${safeIndex + 1} 条知识点：${point.title}`);

    try {
      const audioUrl = await requestIflytekTtsAudio(
        buildKnowledgeSpeechText(point, safeIndex, points.length),
        config
      );
      cleanupCurrentAudio();
      ttsState.currentAudioUrl = audioUrl;
      elements.ttsAudio.src = audioUrl;
      await elements.ttsAudio.play();
      ttsState.isPlaying = true;
      renderKnowledgeList();
      renderTtsPanel();
      updateTtsStatus(`正在播放第 ${safeIndex + 1} 条知识点：${point.title}`);
    } catch (error) {
      ttsState.isPlaying = false;
      renderKnowledgeList();
      renderTtsPanel();
      updateTtsStatus(`播放失败：${error.message}`);
    }
  }

  function stopTtsPlayback(statusMessage) {
    ttsState.autoContinue = false;
    ttsState.isPlaying = false;
    closeActiveTtsSocket();
    elements.ttsAudio.pause();
    elements.ttsAudio.removeAttribute("src");
    elements.ttsAudio.load();
    cleanupCurrentAudio();
    renderKnowledgeList();
    renderTtsPanel();
    if (statusMessage) {
      updateTtsStatus(statusMessage);
    }
  }

  function handleTtsAudioEnded() {
    const points = getFilteredKnowledgePoints();
    ttsState.isPlaying = false;
    renderKnowledgeList();

    if (!ttsState.autoContinue) {
      renderTtsPanel();
      updateTtsStatus("当前知识点播放完成。");
      return;
    }

    const nextIndex = ttsState.currentIndex + 1;
    if (nextIndex >= points.length) {
      ttsState.autoContinue = false;
      renderTtsPanel();
      updateTtsStatus("当前筛选知识点已经顺序播放完成。");
      return;
    }

    playKnowledgeAtIndex(nextIndex, { autoContinue: true });
  }

  function readTtsConfig() {
    const config = getProjectTtsConfig();

    if (!config.appId || !config.apiKey || !config.apiSecret) {
      updateTtsStatus("请先在 assets/app-config.js 中填写讯飞 AppID、APIKey 和 APISecret。");
      return null;
    }

    return config;
  }

  function buildKnowledgeSpeechText(point, index, total) {
    const parts = [`第${index + 1}条`, point.title]
      .map((value) => makeSpeechFriendlyText(value))
      .filter(Boolean);
    return parts.join("。");
  }

  async function requestIflytekTtsAudio(text, config) {
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    ttsState.activeRequestId = requestId;
    const url = await buildIflytekTtsUrl(config.apiKey, config.apiSecret);

    return new Promise((resolve, reject) => {
      const socket = new window.WebSocket(url);
      const audioChunks = [];
      let settled = false;

      ttsState.activeSocket = socket;

      socket.addEventListener("open", () => {
        socket.send(
          JSON.stringify({
            common: {
              app_id: config.appId,
            },
            business: {
              aue: "lame",
              sfl: 1,
              tte: "UTF8",
              vcn: config.voice,
              speed: config.speed,
              pitch: config.pitch,
              volume: config.volume,
            },
            data: {
              status: 2,
              text: encodeBase64Utf8(text),
            },
          })
        );
      });

      socket.addEventListener("message", (event) => {
        if (ttsState.activeRequestId !== requestId) {
          return;
        }

        let response;
        try {
          response = JSON.parse(event.data);
        } catch (error) {
          if (!settled) {
            settled = true;
            reject(new Error("讯飞返回了无法解析的响应。"));
          }
          socket.close();
          return;
        }

        if (response.code !== 0) {
          if (!settled) {
            settled = true;
            reject(new Error(response.message || `讯飞接口错误：${response.code}`));
          }
          socket.close();
          return;
        }

        if (response.data?.audio) {
          audioChunks.push(base64ToUint8Array(response.data.audio));
        }

        if (response.data?.status === 2) {
          if (!settled) {
            settled = true;
            resolve(URL.createObjectURL(new Blob(audioChunks, { type: "audio/mpeg" })));
          }
          socket.close(1000);
        }
      });

      socket.addEventListener("error", () => {
        if (!settled) {
          settled = true;
          reject(new Error("WebSocket 连接失败，请检查讯飞密钥、发音人和当前网络。"));
        }
      });

      socket.addEventListener("close", () => {
        if (ttsState.activeSocket === socket) {
          ttsState.activeSocket = null;
        }
        if (!settled && ttsState.activeRequestId === requestId) {
          settled = true;
          reject(new Error("连接已关闭，音频尚未完整返回。"));
        }
      });
    });
  }

  async function buildIflytekTtsUrl(apiKey, apiSecret) {
    const host = "tts-api.xfyun.cn";
    const date = new Date().toUTCString();
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/tts HTTP/1.1`;
    const signature = await signHmacSha256Base64(signatureOrigin, apiSecret);
    const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const params = new URLSearchParams({
      authorization: window.btoa(authorizationOrigin),
      date,
      host,
    });
    return `wss://${host}/v2/tts?${params.toString()}`;
  }

  async function signHmacSha256Base64(content, secret) {
    const encoder = new TextEncoder();
    const key = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await window.crypto.subtle.sign("HMAC", key, encoder.encode(content));
    return bytesToBase64(signature);
  }

  function encodeBase64Utf8(value) {
    return bytesToBase64(new TextEncoder().encode(value));
  }

  function makeSpeechFriendlyText(value) {
    return normalizeInlineText(value)
      .replace(/[“”"']/g, "")
      .replace(/《([^》]+)》/g, "$1")
      .replace(/PDF重建|PDF自动整理/g, "")
      .replace(/出现\d+次/g, "")
      .replace(/φ/g, "直径")
      .replace(/×/g, "乘")
      .replace(/≤/g, "小于等于")
      .replace(/≥/g, "大于等于")
      .replace(/~|～/g, "到")
      .replace(/%/g, "百分之")
      .replace(/kW/gi, "千瓦")
      .replace(/kV/gi, "千伏")
      .replace(/mA/g, "毫安")
      .replace(/mm/g, "毫米")
      .replace(/cm/g, "厘米")
      .replace(/m\b/g, "米")
      .replace(/V\b/g, "伏")
      .replace(/N·m/g, "牛米")
      .replace(/\bTN-S\b/g, "TN S")
      .replace(/\bPE\b/g, "PE")
      .replace(/\s*([、，。；：])\s*/g, "$1")
      .replace(/([。；]){2,}/g, "。")
      .replace(/^第(\d+)条，共(\d+)条。?/, "第$1条，共$2条。")
      .trim();
  }

  function bytesToBase64(value) {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
  }

  function base64ToUint8Array(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function cleanupCurrentAudio() {
    if (ttsState.currentAudioUrl) {
      URL.revokeObjectURL(ttsState.currentAudioUrl);
      ttsState.currentAudioUrl = null;
    }
  }

  function closeActiveTtsSocket() {
    if (ttsState.activeSocket) {
      try {
        ttsState.activeSocket.close(1000);
      } catch (error) {
        // Ignore already-closed sockets.
      }
      ttsState.activeSocket = null;
    }
    ttsState.activeRequestId = null;
  }

  function updateTtsStatus(message) {
    renderTtsPanel();
    elements.ttsStatus.innerHTML += `<p>${escapeHtml(message)}</p>`;
  }

  function getResolvedSelectedAnswers(lastResult, question, isPeeked) {
    if (lastResult && lastResult.questionId === question.id) {
      return Array.isArray(lastResult.selectedAnswers) ? lastResult.selectedAnswers : [];
    }
    if (isPeeked) {
      return [];
    }
    return [];
  }

  function getOptionStateClass({ isAnswerLocked, isSelected, isCorrect }) {
    if (!isAnswerLocked) {
      return "";
    }
    if (isCorrect) {
      return " is-correct";
    }
    if (isSelected && !isCorrect) {
      return " is-wrong";
    }
    return "";
  }

  function getQuestionProgress(questionId) {
    if (!state.questionProgress[questionId]) {
      state.questionProgress[questionId] = createQuestionProgress();
    }
    return state.questionProgress[questionId];
  }

  function getQuestionAccuracy(progress) {
    if (!progress.totalAttempts) {
      return 0;
    }
    return Math.round((progress.correctCount / progress.totalAttempts) * 100);
  }

  function compareAnswers(selected, answer) {
    const normalizedSelected = selected.slice().sort();
    const normalizedAnswer = answer.slice().sort();
    return JSON.stringify(normalizedSelected) === JSON.stringify(normalizedAnswer);
  }

  function formatAnswerText(question) {
    return question.answer
      .map((code) => {
        const index = code.charCodeAt(0) - 65;
        const optionText = question.options[index];
        return optionText ? `${code}. ${optionText}` : code;
      })
      .join("；");
  }

  function getQuestionTypeLabel(type) {
    if (type === "multiple") {
      return "多选题";
    }
    if (type === "judge") {
      return "判断题";
    }
    return "单选题";
  }

  function getSessionLabel(mode) {
    if (mode === "daily") {
      return "今日计划";
    }
    if (mode === "mistake") {
      return "错题复练";
    }
    return "随机练习";
  }

  function getStatusLabel(status) {
    if (status === "mastered") {
      return "已掌握";
    }
    if (status === "review") {
      return "复习中";
    }
    if (status === "learning") {
      return "学习中";
    }
    return "未开始";
  }

  function getOptionCode(index) {
    return String.fromCharCode(65 + index);
  }

  function getDailyTarget() {
    return Math.max(1, Number(examData.exam.dailyTarget || 20));
  }

  function getKnowledgeRotateSeconds() {
    return Math.max(5, Number(examData.exam.knowledgeRotateSeconds || 20));
  }

  function formatReviewDate(isoDate) {
    if (!isoDate) {
      return "待安排";
    }
    return formatDateKey(new Date(isoDate));
  }

  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function shuffle(items) {
    const copied = items.slice();
    for (let index = copied.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copied[index], copied[swapIndex]] = [copied[swapIndex], copied[index]];
    }
    return copied;
  }

  function uniqueIds(items) {
    return Array.from(new Set(items));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function downloadJson(content, filename) {
    const blob = new Blob([JSON.stringify(content, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
