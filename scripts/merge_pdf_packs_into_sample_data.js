#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SAMPLE_DATA_PATH = path.join(PROJECT_ROOT, "data", "sample-data.js");

const PACKS = [
  { id: "management", label: "管理", path: path.join(PROJECT_ROOT, "data", "processed", "management", "pack-seed.json") },
  { id: "technology", label: "技术", path: path.join(PROJECT_ROOT, "data", "processed", "technology", "pack-seed.json") },
  { id: "construction", label: "建筑", path: path.join(PROJECT_ROOT, "data", "processed", "construction", "pack-seed.json") },
];

const SUBJECT_DESCRIPTIONS = {
  law: "法规已按 PDF 全量核对",
  management: "PDF 已导入，待继续精修",
  technology: "PDF 已导入，待继续精修",
  construction: "PDF 已导入，待继续精修",
};

const BAD_SUMMARY_RE = /^(?:[微信联系统一唯题准精押\d\s.-]+|[A-D]\.?|第?\d+页?)$/u;
const WATERMARK_RE = /[微信联系精准押题一唯系联信微题准精]{3,}/gu;
const MARKETING_LINE_RE = /中级注册安全工程师考试|免费约直播领资料|扫码刷题|咨询热线/u;
const GENERIC_KP_TERMS = new Set([
  "安全",
  "管理",
  "技术",
  "建筑",
  "第一章",
  "第二章",
  "第三章",
  "第四章",
  "第五章",
  "第六章",
  "第七章",
  "第八章",
  "第九章",
  "第十章",
  "导学",
  "讲义",
  "真题",
  "习题",
  "综合",
  "施工",
]);
const MATCH_STOP_TERMS = new Set([
  "知识点",
  "考点",
  "考情分析",
  "重要度星标",
  "考点数量",
  "分值分布",
  "基础直播课",
  "教材精讲班",
  "中级注册安全工程师考试",
  "学习指南",
  "学习方法介绍",
  "考试介绍",
  "科目介绍",
  "框架领航",
  "导学",
  "打印版",
  "在线版",
  "完整版",
  "讲义",
  "第一节",
  "第二节",
  "第三节",
  "第四节",
  "第五节",
  "第六节",
  "第七节",
  "第八节",
  "第九节",
  "第十节",
]);
const OPTION_LINE_RE = /^[A-E](?:[.．、\s]+|(?=[\u4E00-\u9FFF（(]))/u;
const EMPTY_TITLE_RE = /^(第[一二三四五六七八九十百0-9]+[章节节篇]\s*)+$/u;
const NOISY_SUMMARY_RE = /中级注册安全工程师考试|主讲老师|考试介绍|课前说明|学习方法介绍|目录 导学|考试时间|合格标准|周六|周日/u;
const SUBJECT_FALLBACKS = {
  management: [
    {
      kpTitle: /第十三节 个体防护装备管理|个体防护装备管理/u,
      cue: /个体防护|安全帽|呼吸器|绝缘鞋|绝缘手套|安全带|防静电服|反光警示服|防滑靴|护目镜|防化学品鞋|微波辐射|长管呼吸器|登杆脚扣|潜水/u,
    },
    {
      kpTitle: /第十一节 安全生产投入与安全生产责任保险|安全生产责任保险/u,
      cue: /安责险|责任限额|安全生产费用|责任保险/u,
    },
    {
      kpTitle: /第十节作业现场环境安全管理|作业现场环境安全管理/u,
      cue: /环境温度|降温措施|高温岗位|噪声|粉尘|源头管控|隔音板|工业空调|工业风扇|恒温|照度|安全色|对比色|安全目视化|恶臭|空气质量/u,
    },
    {
      kpTitle: /第八节 特种设备设施安全|特种设备设施安全|特种设备安全监察/u,
      cue: /电梯|特种设备|维保|维护保养|使用登记证|安全技术档案|锅炉|起重机械风险隐患排查|特种设备安全员|特种设备安全总监/u,
    },
    {
      kpTitle: /第八章 安全生产统计分析|统计基础知识|事故统计与报表制度/u,
      cue: /GDP|统计图表|统计图|条图|百分条图|散点图|雷达图|生产安全事故指标|死亡率|事故次数|统计分析/u,
    },
    {
      kpTitle: /第十四节特殊作业安全管理|特殊作业安全管理/u,
      cue: /断路作业|临时用电|高处坠落|高处作业|阵风|含氧量|通信联络工具|断路|动火|盲板|受限空间|有限空间作业票|重新作业|气体检测分析|吊装作业|动土作业|固壁支撑|两台起重机械|额定起重能力|六级以上大风/u,
    },
    {
      kpTitle: /第十二节 安全生产检查与隐患排查治理|安全生产检查与隐患排查治理|安全评价方法/u,
      cue: /安全检查表|仪器检查|数据分析法|蒙德法|安全检查方法|安全标志/u,
    },
    {
      kpTitle: /第十七节 安全生产标准化|安全生产标准化/u,
      cue: /安全生产标准化|标准化二级|定级部门|自评时间|再次申请原等级/u,
    },
    {
      kpTitle: /第二节 事故调查与分析|第六章 生产安全事故调查与分析|生产安全事故报告/u,
      cue: /事故等级|一般事故|较大事故|重大事故|特别重大事故|事故调查组|直接原因|间接原因|起因物|诱导性原因|故障树|最小割集|布尔代数|基本事件|顶事件|直接经济损失|工作损失价值|轻伤/u,
    },
    {
      kpTitle: /第九节 安全技术措施|安全技术措施/u,
      cue: /安全技术措施计划|卫生技术措施|辅助措施|安全宣传教育措施|在线气体监测报警系统|自动喷涂机器人|防爆墙|故障联锁停机|泄压屋顶|紧急停车系统/u,
    },
    {
      kpTitle: /第十五节 承包商管理|承包商管理/u,
      cue: /承包合同|分包|劳务市场|陈列室装修改造|脚手架安装不牢固|徐某|承包商/u,
    },
    {
      kpTitle: /第五节 安全文化|安全文化建设/u,
      cue: /安全文化评价|员工层行为|知识技能|团队合作|全员劳动生产率/u,
    },
    {
      kpTitle: /第五节 建设项目安全设施“三同时”|建设项目安全设施/u,
      cue: /专项施工方案|施工组织设计|安全验算结果|建设项目管理办法|法定代表人|三同时/u,
    },
    {
      kpTitle: /第四节 安全生产教育培训|安全生产教育培训/u,
      cue: /特种作业操作证|复审|低压电工|焊接作业|安全培训|学时/u,
    },
    {
      kpTitle: /第四节 安全评价方法|安全评价方法|第二节 安全评价的程序和内容/u,
      cue: /事件树|HAZOP|偏差=引导词|反应釜工艺节点/u,
    },
    {
      kpTitle: /安全生产应急管理/u,
      cue: /应急预案|应急演练|液氨泄漏|现场处置|应急指挥|抢险组/u,
    },
    {
      kpTitle: /第四章 职业病危害预防和管理|职业病危害预防和管理/u,
      cue: /职业病|尘肺|粉尘|职业性肿瘤|毛沸石|矽肺|间皮瘤|职业健康|电离辐射|放射性|沥青|鼻癌|硬木屑|二氧化硫|硫化氢/u,
    },
    {
      kpTitle: /安全生产管理基本理论|事故致因|安全心理与行为|安全原理/u,
      cue: /因果关系原则|本质安全化原则|事故致因|安全原理|侥幸|逆反|省能|凑兴|行为模式|安全哲学|风险|隐患|危险源|可接受风险|能量意外释放/u,
    },
    {
      kpTitle: /安全生产管理内容|责任制|规章制度|操作规程|相关方|重大危险源/u,
      cue: /责任制|规章制度|操作规程|相关方|变更管理|重大危险源|双重预防|准入管理|爆破作业|作业许可|风险分级管控|5S|综合安全管理制度|重大危险源包保|包保责任|不锈钢管线|截止阀|采样点|断电上锁|应急储存坑/u,
    },
  ],
  technology: [
    {
      kpTitle: /第一章 机械安全技术|机械的危险部位|机械安全基础知识|金属切削机床|冲压剪切机械|木工机械|锻造安全技术|铸造安全技术|机械制造生产场所安全技术/u,
      cue: /机械|机床|轧辊|磨边机|切削|砂轮|冲压|剪切|木工|圆锯机|剪板机|紧急停止按钮|锻造|铸造|压力机|光电式|光电感应保护|防护罩|防护装置|联锁|限位装置|机械运行状况|金属腐蚀/u,
    },
    {
      kpTitle: /第二章 电气安全技术|电气事故及危害|触电防护技术|雷击和静电防护技术|电气装置安全技术|保护接地|保护接零/u,
      cue: /电气|触电|接地|接零|漏电|静电|雷击|雷电|绝缘|电压|配电|电源|照明|一般照明|低压保护电器|熔断器|热继电器/u,
    },
    {
      kpTitle: /第三章 特种设备安全技术|锅炉安全技术|压力容器安全技术|气瓶|客运索道|大型游乐设施|场（厂）内专用机动车辆|安全泄放装置|起重机械安全技术/u,
      cue: /锅炉|压力容器|气瓶|客运索道|架空索道|缆车|游乐设施|观光车|叉车|厂内专用机动车辆|安全阀|爆破片|泄放装置|起重机司机|放散管|燃气管道|公用管道|门座式起重机|试吊|吊厢|抱索器|塔吊|司索工|吊钩|起重机械|无损检测|射线检测|超声检测|汽车吊|埋置|吊物质量不清/u,
    },
    {
      kpTitle: /第四章 防火防爆安全技术|火灾爆炸事故机理|民用爆炸物品安全技术|烟花爆竹安全技术/u,
      cue: /火灾|爆炸|燃烧|民用爆炸物品|民用爆破器材|烟花爆竹|炸药|爆轰|爆燃|热剂量|自动灭火|泡沫灭火|抑爆剂|过苯甲酸|有机过氧化物|引火线仓库|爆竹半成品|采暖系统|散热器|壁龛/u,
    },
    {
      kpTitle: /第五章 危险化学品安全基础知识|危险化学品|泄漏控制与销毁处置技术/u,
      cue: /危险化学品|MSDS|泄漏|化学品|包装类别|储存|运输|洗消|防毒面具|呼吸防护|毒性气体|惰性气体|转换系数|自给式氧气呼吸器|长管式送风呼吸器|呼吸道防毒/u,
    },
    {
      kpTitle: /安全人机工程|动态参数/u,
      cue: /动态参数|生理参数|生物力学参数|人体|人机|工效|体力劳动强度|能量代谢率|心理特性|能力|机器人|稳定性|灵活性|可塑性|能动性|性格类型|冷静型|急躁型|迟钝型|轻浮型|色彩|颜色设计|低饱和色|反射性强|肌肉疲劳|精神疲劳|主观疲劳感/u,
    },
  ],
  construction: [
    {
      kpTitle: /第一章 建筑施工安全基础/u,
      cue: /事故类型|施工组织设计|危大工程|文明施工|安全资料/u,
    },
    {
      kpTitle: /安全生产费用/u,
      cue: /安全生产费用/u,
    },
    {
      kpTitle: /第二章 建筑施工机械安全技术/u,
      cue: /塔式起重机|施工升降机|物料提升机|吊篮|起重机|施工机械/u,
    },
    {
      kpTitle: /第三章 建筑施工临时用电安全技术/u,
      cue: /临时用电|配电箱|漏电保护|TN-S|接地|电缆/u,
    },
    {
      kpTitle: /第六章 脚手架、模板工程安全技术|模板工程安全技术|脚手架安全技术/u,
      cue: /脚手架|模板|隧道模|扣件|立杆|盘扣/u,
    },
    {
      kpTitle: /第四章 安全防护技术/u,
      cue: /高处作业|临边|洞口|攀登|悬空|安全网|防护栏/u,
    },
    {
      kpTitle: /第五章 土石方及基坑工程安全技术/u,
      cue: /基坑|土石方|边坡|降水|支护/u,
    },
    {
      kpTitle: /第七章 城市轨道交通工程施工安全技术/u,
      cue: /城市轨道交通|盾构|暗挖|明挖|轨道交通/u,
    },
    {
      kpTitle: /第八章 专项工程施工安全技术|钢结构工程安全技术|建筑拆除工程安全技术/u,
      cue: /钢结构|拆除工程|幕墙|爆破拆除/u,
    },
    {
      kpTitle: /第九章 建筑施工应急管理/u,
      cue: /应急预案|应急演练|现场应急处置/u,
    },
  ],
};
const STRONG_FALLBACK_OVERRIDE_RE = {
  management: /个体防护|安全文化评价|断路作业|电梯维护|维护保养|GDP|统计图|安责险|责任限额|安全技术措施计划|特种设备安全技术档案|承包合同|高处坠落|临时用电|安全检查表|蒙德法|安全生产标准化|HAZOP|事件树|直接经济损失|工作损失价值|沥青|鼻癌|有限空间作业票|司索|布尔代数|基本事件|空气质量|安全色|对比色|特种作业操作证/u,
  technology: /放散管|燃气管道|热剂量|自动灭火|泡沫灭火|抑爆剂|过苯甲酸|抱索器|门座式起重机|试吊|塔吊|机器人|性格类型|惰性气体|无损检测|低压保护电器|司索工|烟花爆竹|压力机|光电式|颜色设计/u,
  construction: /隧道模|模板工程|脚手架|塔式起重机|施工升降机|物料提升机|安全生产费用/u,
};

function normalizeWhitespace(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/\f/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeText(text) {
  return normalizeWhitespace(text)
    .replace(WATERMARK_RE, "")
    .replace(/\b\d{2,3}\b/gu, (match) => (match.length >= 3 ? "" : match))
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanLines(text, { removeTrailingPageNumber = false } = {}) {
  const lines = normalizeWhitespace(text).split("\n");
  const kept = [];

  for (let rawLine of lines) {
    let line = sanitizeText(rawLine);
    if (!line) {
      continue;
    }
    if (MARKETING_LINE_RE.test(line)) {
      continue;
    }
    if (/^-\s*\d+\s*-$/u.test(line)) {
      continue;
    }
    if (/^\d{1,3}$/u.test(line)) {
      continue;
    }
    if (/^[【】]+$/u.test(line)) {
      continue;
    }
    if (/^[微信联]\s*\d+\s*$/u.test(line)) {
      continue;
    }
    if (/^\d+\s*\/\s*注册安全工程师/u.test(line)) {
      continue;
    }

    line = line
      .replace(/\s+-\s*\d+\s*-\s*$/u, "")
      .replace(/\s+第?\d{1,3}页\s*$/u, "")
      .replace(/\s*[微信联]\s*\d+\s*$/u, "")
      .replace(/\s*\d+\s*\/\s*注册安全工程师[^/\n]*$/u, "")
      .replace(/(?<=[\u4E00-\u9FFFA-Za-z）】])\s+\d{1,3}\s*$/u, "");

    if (removeTrailingPageNumber) {
      line = line.replace(/\s+\d{1,3}\s*$/u, "");
    }

    line = line.trim();
    if (!line) {
      continue;
    }
    kept.push(line);
  }

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function cleanOptionText(text) {
  let line = cleanLines(text, { removeTrailingPageNumber: true })
    .replace(/\s+/g, " ")
    .trim();

  line = line.replace(/\s+\d{1,3}\s*$/u, "").trim();
  return line;
}

function cleanStemText(text) {
  return cleanLines(text, { removeTrailingPageNumber: true });
}

function cleanExplanationText(text) {
  return cleanLines(text, { removeTrailingPageNumber: true })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeKey(text) {
  return sanitizeText(text).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function loadExamData(filePath) {
  const script = fs.readFileSync(filePath, "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(script, sandbox, { filename: filePath });
  return sandbox.window.EXAM_DATA;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function scoreSummary(text) {
  const cleaned = sanitizeText(text);
  if (!cleaned || cleaned.length < 6) {
    return 0;
  }
  if (BAD_SUMMARY_RE.test(cleaned)) {
    return 0;
  }
  let good = 0;
  for (const char of cleaned) {
    if (/[\u4E00-\u9FFF0-9A-Za-z，。；：、（）《》【】\s]/u.test(char)) {
      good += 1;
    }
  }
  return good / cleaned.length;
}

function simplifyTitleForQuality(title) {
  return title
    .replace(/第[一二三四五六七八九十百0-9]+[章节节篇]/gu, "")
    .replace(/[一二三四五六七八九十]+、/gu, "")
    .replace(/\s+/g, "")
    .trim();
}

function cleanKnowledgeTitle(title) {
  let cleaned = sanitizeText(title)
    .replace(/[（(][^）)]*(?:分值|重要度|简单|中等|困难|计算考点|考点数量|分值分布)[^）)]*[）)]/gu, "")
    .replace(/\b20\d{2}(?:\s+20\d{2})+\b/gu, "")
    .replace(/\s+[0-9]+(?:\s*[~～-]\s*[0-9]+)?\s*分(?:\s+\d+)*\s*$/u, "")
    .replace(/\s+(?:微|信|联)\s*[0-9/.\s-]+$/u, "")
    .replace(/\s+\d+\s*$/u, "")
    .replace(/\s+\d+(?:\s+\d+){2,}\s*\/?\s*$/u, "")
    .replace(/\s*(?:考点数量|分值分布|重要度星标|计算考点)\s*$/u, "")
    .replace(/\s*。.+$/u, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  cleaned = cleaned
    .replace(/[（(][^）)]*$/u, "")
    .replace(/[\/-]+$/u, "")
    .trim();

  return cleaned;
}

function isUsefulKnowledgeTitle(title) {
  const cleaned = cleanKnowledgeTitle(title);
  if (!cleaned || cleaned.length < 4 || cleaned.length > 60) {
    return false;
  }
  if (EMPTY_TITLE_RE.test(cleaned)) {
    return false;
  }
  const simplified = simplifyTitleForQuality(cleaned);
  if (simplified.length < 2) {
    return false;
  }
  if (/^(导学|讲义|课程|真题解析|章节专训|综合练习|科目介绍|考试介绍|学习技巧|学习方法介绍|课前说明)$/u.test(simplified)) {
    return false;
  }
  if (/(单项选择题|多项选择题|不要钻牛角尖)/u.test(cleaned)) {
    return false;
  }
  if (/^[一二三四五六七八九十]+、(?:单项选择题|多项选择题|备考建议|总则)$/u.test(cleaned)) {
    return false;
  }
  if (/^[一二三四五六七八九十]+、(?:事故经过|案例背景|背景资料|案例描述|参考答案|答案解析)$/u.test(cleaned)) {
    return false;
  }
  if (/(分值分布|考点数量|重要度星标)/u.test(cleaned)) {
    return false;
  }
  if (/(科目介绍|考试介绍|学习技巧|学习方法介绍|课前说明|导学)$/u.test(cleaned)) {
    return false;
  }
  if (/^第[一二三四五六七八九十百0-9]+节第[一二三四五六七八九十百0-9]+节$/u.test(cleaned.replace(/\s+/g, ""))) {
    return false;
  }
  return true;
}

function buildKnowledgeSummary(pack, title) {
  const cleaned = sanitizeText(title);
  if (/第[一二三四五六七八九十百0-9]+章/u.test(cleaned)) {
    return `${pack.label}${cleaned}相关高频考点与章节题目整理。`;
  }
  if (/第[一二三四五六七八九十百0-9]+节/u.test(cleaned)) {
    return `${pack.label}${cleaned}相关概念、规则和常考题已按 PDF 提取整理。`;
  }
  return `${pack.label}${cleaned}相关知识点与题目已按 PDF 整理。`;
}

function buildDefaultKnowledgePoint(pack) {
  return {
    id: `${pack.id}-kp-general`,
    subjectId: pack.id,
    title: `${pack.label}综合题库`,
    summary: `基于 ${pack.label} PDF 讲义与真题自动整理的综合知识点。`,
    details: `${pack.label}科目先按 PDF 自动导入题目和知识点，后续可以继续按章节人工精修。`,
    tags: [pack.label, "综合", "PDF自动整理"],
  };
}

function cleanKnowledgePoints(pack, rawPoints) {
  const results = [buildDefaultKnowledgePoint(pack)];
  const seen = new Set([normalizeKey(results[0].title)]);

  for (const raw of rawPoints) {
    const title = cleanKnowledgeTitle(raw.title);
    if (!isUsefulKnowledgeTitle(title)) {
      continue;
    }

    const key = normalizeKey(title);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);

    const summaryScore = scoreSummary(raw.summary);
    const summary =
      summaryScore >= 0.55 && !NOISY_SUMMARY_RE.test(sanitizeText(raw.summary))
        ? sanitizeText(raw.summary)
        : buildKnowledgeSummary(pack, title);

    const exampleSource = Array.isArray(raw.sourceFiles) && raw.sourceFiles[0]
      ? raw.sourceFiles[0]
      : `data/processed/${pack.id}/corpus.txt`;
    const sourceCount = raw.count || (Array.isArray(raw.sourceFiles) ? raw.sourceFiles.length : 1);

    results.push({
      id: raw.id,
      subjectId: pack.id,
      title,
      summary,
      details: `来源约 ${sourceCount} 份 ${pack.label} PDF。示例来源：${exampleSource}`,
      sourcePath: exampleSource,
      tags: Array.isArray(raw.tags) && raw.tags.length > 0
        ? raw.tags.slice(0, 4).map((item) => sanitizeText(item)).filter(Boolean)
        : [pack.label, "PDF候选"],
    });
  }

  return results;
}

function isMeaningfulKeyword(token) {
  const cleaned = sanitizeText(token)
    .replace(/^第[一二三四五六七八九十百0-9]+[章节节篇]\s*/u, "")
    .replace(/^[一二三四五六七八九十]+、/u, "")
    .replace(/^[A-E][.．、\s]+/u, "")
    .replace(/\s+/g, "");

  if (!cleaned || cleaned.length < 2 || cleaned.length > 24) {
    return false;
  }
  if (/^\d+(?:\.\d+)?$/u.test(cleaned)) {
    return false;
  }
  if (/^[A-E]+$/u.test(cleaned)) {
    return false;
  }
  if (GENERIC_KP_TERMS.has(cleaned) || MATCH_STOP_TERMS.has(cleaned)) {
    return false;
  }
  if (/^(第一章|第二章|第三章|第四章|第五章|第六章|第七章|第八章|第九章|第十章)$/u.test(cleaned)) {
    return false;
  }
  if (/^(第一节|第二节|第三节|第四节|第五节|第六节|第七节|第八节|第九节|第十节)$/u.test(cleaned)) {
    return false;
  }
  return true;
}

function collectKeywordCandidates(text) {
  const cleaned = sanitizeText(text)
    .replace(/\.pdf$/iu, "")
    .replace(/[0-9]{2,4}年/g, " ")
    .replace(/[【】\[\]()（）]/g, " ")
    .replace(/[&+]/g, " ");
  const candidates = [];

  for (const segment of cleaned.split(/[\n,，。；;：:、《》\/\\|]+/u)) {
    const piece = segment.trim();
    if (!piece) {
      continue;
    }
    candidates.push(piece);
    for (const sub of piece.split(/[、,，及与和或]/u)) {
      const token = sub.trim();
      if (token) {
        candidates.push(token);
      }
    }
    const matches = piece.match(/[\u4E00-\u9FFF]{2,12}|[A-Za-z]{3,}[A-Za-z0-9-]*/gu) || [];
    candidates.push(...matches);
  }

  const deduped = [...new Set(candidates.map((item) => sanitizeText(item)).filter(isMeaningfulKeyword))];
  deduped.sort((a, b) => b.length - a.length);
  return deduped.slice(0, 14);
}

function extractSourcePath(details, explicitSourcePath) {
  if (explicitSourcePath) {
    return explicitSourcePath;
  }
  const match = String(details || "").match(/示例来源：(.+)$/u);
  return match ? match[1].trim() : "";
}

function extractKeywords(kp) {
  const titleKeywords = collectKeywordCandidates(kp.title);
  const summaryKeywords = collectKeywordCandidates(kp.summary).slice(0, 8);
  const sourcePath = extractSourcePath(kp.details, kp.sourcePath);
  const sourceKeywords = collectKeywordCandidates(sourcePath).slice(0, 8);

  return {
    titleKeywords,
    summaryKeywords,
    sourceKeywords,
    sourcePath,
  };
}

function buildKnowledgeMatchers(knowledgePoints) {
  return knowledgePoints.map((kp) => {
    const keywordInfo = extractKeywords(kp);
    return {
      id: kp.id,
      title: kp.title,
      chapter: (kp.title.match(/第[一二三四五六七八九十百0-9]+章/u) || [null])[0],
      section: (kp.title.match(/第[一二三四五六七八九十百0-9]+节/u) || [null])[0],
      titleKeywords: keywordInfo.titleKeywords,
      summaryKeywords: keywordInfo.summaryKeywords,
      sourceKeywords: keywordInfo.sourceKeywords,
      sourcePath: keywordInfo.sourcePath,
      normalizedTitle: normalizeKey(kp.title),
    };
  });
}

function linkQuestion(question, matchers, defaultId) {
  const stemKey = normalizeKey(question.stem);
  const explanationKey = normalizeKey(question.explanation);
  const optionKey = normalizeKey((question.options || []).join(" "));
  const haystack = `${stemKey} ${explanationKey} ${optionKey}`;
  const source = String(question.source || "");
  const sourceKey = normalizeKey(source);

  let best = { id: defaultId, score: 0, hits: 0 };
  let secondBestScore = 0;
  for (const matcher of matchers) {
    if (matcher.id === defaultId) {
      continue;
    }
    let score = 0;
    let hits = 0;

    if (matcher.chapter) {
      const chapterKey = normalizeKey(matcher.chapter);
      if (source.includes(matcher.chapter) || stemKey.includes(chapterKey)) {
        score += 4;
      }
    }

    if (matcher.section) {
      const sectionKey = normalizeKey(matcher.section);
      if (source.includes(matcher.section) || stemKey.includes(sectionKey)) {
        score += 2;
      }
    }

    if (matcher.normalizedTitle && stemKey.includes(matcher.normalizedTitle)) {
      score += 10;
      hits += 2;
    } else if (matcher.normalizedTitle && haystack.includes(matcher.normalizedTitle)) {
      score += 6;
      hits += 1;
    }

    if (matcher.sourcePath) {
      const sourcePathKey = normalizeKey(matcher.sourcePath);
      if (sourcePathKey && sourceKey && sourceKey.includes(sourcePathKey)) {
        score += 4;
        hits += 1;
      }
    }

    for (const keyword of matcher.titleKeywords) {
      const normalizedKeyword = normalizeKey(keyword);
      if (!normalizedKeyword) {
        continue;
      }
      if (stemKey.includes(normalizedKeyword)) {
        score += Math.min(8, Math.max(3, normalizedKeyword.length));
        hits += 1;
        continue;
      }
      if (explanationKey.includes(normalizedKeyword)) {
        score += Math.min(6, Math.max(2, normalizedKeyword.length - 1));
        hits += 1;
        continue;
      }
      if (optionKey.includes(normalizedKeyword)) {
        score += Math.min(4, Math.max(2, normalizedKeyword.length - 1));
        hits += 1;
      }
    }

    for (const keyword of [...matcher.summaryKeywords, ...matcher.sourceKeywords]) {
      const normalizedKeyword = normalizeKey(keyword);
      if (!normalizedKeyword) {
        continue;
      }
      if (stemKey.includes(normalizedKeyword) || explanationKey.includes(normalizedKeyword) || optionKey.includes(normalizedKeyword)) {
        score += Math.min(4, Math.max(2, normalizedKeyword.length - 1));
        hits += 1;
      }
    }

    if (hits >= 2) {
      score += 3;
    }
    if (hits >= 3) {
      score += 2;
    }

    if (score > best.score) {
      secondBestScore = best.score;
      best = { id: matcher.id, score, hits };
      continue;
    }

    if (score > secondBestScore) {
      secondBestScore = score;
    }
  }

  if (best.score >= 8) {
    return [best.id];
  }
  if (best.score >= 6 && best.hits >= 2 && best.score - secondBestScore >= 2) {
    return [best.id];
  }
  return [defaultId];
}

function linkQuestionByFallback(question, matchers, defaultId) {
  const rules = SUBJECT_FALLBACKS[question.subjectId] || [];
  if (rules.length === 0) {
    return [defaultId];
  }

  const text = `${question.stem}\n${question.explanation}\n${(question.options || []).join(" ")}`;
  const textKey = normalizeKey(text);
  for (const rule of rules) {
    if (!rule.cue.test(text)) {
      continue;
    }

    const matched = matchers
      .filter((matcher) => matcher.id !== defaultId && rule.kpTitle.test(matcher.title))
      .map((matcher) => ({ matcher, score: scoreMatcherAgainstQuestion(matcher, textKey) }))
      .sort((a, b) => b.score - a.score || a.matcher.title.length - b.matcher.title.length);

    if (matched.length > 0) {
      return [matched[0].matcher.id];
    }
  }

  return [defaultId];
}

function scoreMatcherAgainstQuestion(matcher, textKey) {
  let score = /第[一二三四五六七八九十百0-9]+章/u.test(matcher.title) ? 1 : 0;
  if (matcher.normalizedTitle && textKey.includes(matcher.normalizedTitle)) {
    score += 12;
  }
  for (const keyword of matcher.titleKeywords || []) {
    const normalizedKeyword = normalizeKey(keyword);
    if (normalizedKeyword && textKey.includes(normalizedKeyword)) {
      score += Math.min(6, Math.max(2, normalizedKeyword.length));
    }
  }
  for (const keyword of matcher.summaryKeywords || []) {
    const normalizedKeyword = normalizeKey(keyword);
    if (normalizedKeyword && textKey.includes(normalizedKeyword)) {
      score += Math.min(3, Math.max(1, normalizedKeyword.length - 1));
    }
  }
  return score;
}

function dedupeQuestions(rawQuestions) {
  const byStem = new Map();
  for (const question of rawQuestions) {
    const key = normalizeKey(question.stem);
    if (!key) {
      continue;
    }
    const current = byStem.get(key);
    const currentScore = current ? (current.answer.length * 10 + current.options.length * 2 + current.stem.length) : -1;
    const nextScore = question.answer.length * 10 + question.options.length * 2 + question.stem.length;
    if (!current || nextScore > currentScore) {
      byStem.set(key, question);
    }
  }
  return [...byStem.values()];
}

function cleanQuestions(pack, rawQuestions, knowledgePoints) {
  const matchers = buildKnowledgeMatchers(knowledgePoints);
  const matcherById = new Map(matchers.map((matcher) => [matcher.id, matcher]));
  const defaultId = `${pack.id}-kp-general`;

  const filtered = rawQuestions
    .filter((item) => item.confidence === "high" || item.confidence === "medium")
    .map((item) => {
      const extracted = extractStemAndOptions(item.stem, item.options || []);
      const stem = cleanStemText(extracted.stem);
      const options = extracted.options.map((option) => cleanOptionText(option)).filter(Boolean);
      const answer = Array.isArray(item.answer) ? item.answer.filter(Boolean) : [];
      const explanation = cleanExplanationText(item.explanation);

      return sanitizeImportedQuestion({
        id: item.id,
        subjectId: pack.id,
        type: item.type === "multiple" || answer.length > 1 ? "multiple" : "single",
        stem,
        options,
        answer,
        explanation,
        knowledgePointIds: [],
        difficulty: item.confidence === "high" ? "medium" : "hard",
        source: item.source,
      });
    })
    .filter((item) => item.stem && item.options.length >= 2 && item.answer.length >= 1)
    .filter((item) => !item.options.some((option) => option.length <= 1));

  const deduped = dedupeQuestions(filtered);
  for (const question of deduped) {
    const exactIds = linkQuestion(question, matchers, defaultId);
    const fallbackIds = linkQuestionByFallback(question, matchers, defaultId);
    question.knowledgePointIds = exactIds;

    if (exactIds[0] === defaultId) {
      question.knowledgePointIds = fallbackIds;
      continue;
    }

    if (fallbackIds[0] !== defaultId && fallbackIds[0] !== exactIds[0]) {
      const rawText = `${question.stem}\n${question.explanation}\n${(question.options || []).join(" ")}`;
      const textKey = normalizeKey(rawText);
      const strongOverride = STRONG_FALLBACK_OVERRIDE_RE[question.subjectId];
      if (strongOverride && strongOverride.test(rawText)) {
        question.knowledgePointIds = fallbackIds;
        continue;
      }
      const exactMatcher = matcherById.get(exactIds[0]);
      const fallbackMatcher = matcherById.get(fallbackIds[0]);
      const exactScore = exactMatcher ? scoreMatcherAgainstQuestion(exactMatcher, textKey) : 0;
      const fallbackScore = fallbackMatcher ? scoreMatcherAgainstQuestion(fallbackMatcher, textKey) : 0;
      if (fallbackScore >= exactScore + 3) {
        question.knowledgePointIds = fallbackIds;
      }
    }
  }

  return deduped;
}

function extractStemAndOptions(rawStem, rawOptions) {
  const explicitOptions = (rawOptions || []).map((item) => sanitizeText(item)).filter(Boolean);
  if (explicitOptions.length >= 2) {
    return {
      stem: rawStem,
      options: explicitOptions,
    };
  }

  const lines = normalizeWhitespace(rawStem).split("\n");
  const stemLines = [];
  const options = [];
  let currentOption = null;
  let seenOption = false;

  for (const originalLine of lines) {
    const line = sanitizeText(originalLine);
    if (!line) {
      continue;
    }

    if (OPTION_LINE_RE.test(line)) {
      if (currentOption) {
        options.push(currentOption.trim());
      }
      currentOption = line.replace(OPTION_LINE_RE, "").trim();
      seenOption = true;
      continue;
    }

    if (seenOption) {
      if (currentOption) {
        currentOption = `${currentOption} ${line}`.trim();
      }
      continue;
    }

    stemLines.push(line);
  }

  if (currentOption) {
    options.push(currentOption.trim());
  }

  if (options.length >= 2) {
    return {
      stem: stemLines.join("\n"),
      options,
    };
  }

  return {
    stem: rawStem,
    options: explicitOptions,
  };
}

function trimQuestionLeadNoise(text) {
  const lines = normalizeWhitespace(text).split("\n").map((line) => sanitizeText(line)).filter(Boolean);
  if (lines.length < 4) {
    return text;
  }

  let candidateIndex = -1;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (
      /^\d{1,2}\s*[.．、]?\s*(下列|关于|依据|根据|某|现场|操作人员|机械|切削机床|塔式起重机|安全泄放装置|《)/u.test(line) ||
      /(?:下列|关于|依据|根据).{0,40}(?:的是|说法|措施|内容|要求|做法|不包括|正确|错误|不正确)/u.test(line)
    ) {
      candidateIndex = index;
      break;
    }
  }

  if (candidateIndex <= 0) {
    return text;
  }

  const prefix = lines.slice(0, candidateIndex).join("");
  const suffix = lines.slice(candidateIndex).join("\n");
  if (prefix.length >= 60 && /(?:第[一二三四五六七八九十百0-9]+条|（一）|（二）|（三）)/u.test(prefix) && suffix.length >= 12) {
    return suffix;
  }
  return text;
}

function trimTrailingNoise(text) {
  return sanitizeText(text)
    .replace(/^[:：】]+\s*/u, "")
    .replace(/[微信联精题微]\s*\d+/gu, "")
    .replace(/\s*\/\s*注册安全工程师[^\n]*/gmu, "")
    .replace(/(?:考点：|网校).+$/gmu, "")
    .replace(/\b(?:微|精|题)\s*(?=[。）；)】])/gu, "")
    .replace(/[（(][选项A-E][^（）()\n]{0,12}$/u, "")
    .replace(/[（(][^（）()\n]{0,6}$/u, "")
    .replace(/(?:\.\.\.|…)\s*$/u, "")
    .trim();
}

function splitMergedOptions(options) {
  const normalized = [];

  for (const rawOption of options) {
    let pending = sanitizeText(rawOption);
    if (!pending) {
      continue;
    }

    while (pending) {
      const nextLetter = String.fromCharCode(65 + normalized.length + 1);
      const mergedMatch = pending.match(new RegExp(`^(.+?)\\s+${nextLetter}[.．、\\s]?(\\S.+)$`, "u"));
      if (mergedMatch && mergedMatch[1].trim() && mergedMatch[2].trim()) {
        normalized.push(mergedMatch[1].trim());
        pending = mergedMatch[2].trim();
        continue;
      }
      normalized.push(pending);
      break;
    }
  }

  return normalized;
}

function sanitizeImportedQuestion(question) {
  const stem = trimTrailingNoise(trimQuestionLeadNoise(question.stem));
  const options = splitMergedOptions(question.options.map((option) => trimTrailingNoise(option)));
  const explanation = trimTrailingNoise(question.explanation);

  return {
    ...question,
    stem,
    options,
    explanation,
  };
}

function updateSubjects(subjects) {
  return subjects.map((subject) => ({
    ...subject,
    description: SUBJECT_DESCRIPTIONS[subject.id] || subject.description,
  }));
}

function main() {
  const base = loadExamData(SAMPLE_DATA_PATH);

  const mergedKnowledgePoints = [...base.knowledgePoints.filter((item) => item.subjectId === "law")];
  const mergedQuestions = [...base.questionBank.filter((item) => item.subjectId === "law")];

  for (const packMeta of PACKS) {
    const pack = readJson(packMeta.path);
    const knowledgePoints = cleanKnowledgePoints(packMeta, pack.knowledgePoints || []);
    const questions = cleanQuestions(packMeta, pack.questionBank || [], knowledgePoints);
    mergedKnowledgePoints.push(...knowledgePoints);
    mergedQuestions.push(...questions);
  }

  const nextExamData = {
    ...base,
    exam: {
      ...base.exam,
      subtitle: "四科 PDF 整理版",
      notice:
        "法规已基于 PDF 全量核对；管理、技术、建筑已按 PDF 导入中高置信题目与候选知识点。当前数据仍建议继续按章节做人工精修，低置信度候选题暂未并入正式题库。",
    },
    subjects: updateSubjects(base.subjects),
    knowledgePoints: mergedKnowledgePoints,
    questionBank: mergedQuestions,
  };

  const output = `window.EXAM_DATA = ${JSON.stringify(nextExamData, null, 2)};\n`;
  fs.writeFileSync(SAMPLE_DATA_PATH, output, "utf8");
}

main();
