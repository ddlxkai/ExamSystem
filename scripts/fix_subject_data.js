#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SAMPLE_DATA_PATH = path.join(PROJECT_ROOT, "data", "sample-data.js");

const MANAGEMENT_CHEMICAL_SOURCE_RE = /化工/u;
const DROPPED_QUESTION_IDS = new Set([
  "management-auto-q-044",
  "management-auto-q-008",
  "management-auto-q-012",
  "management-auto-q-019",
  "management-auto-q-002",
  "management-auto-q-071",
  "management-auto-q-073",
  "management-auto-q-065",
  "management-auto-q-080",
  "management-auto-q-089",
  "management-auto-q-094",
  "management-auto-q-095",
  "management-auto-q-092",
  "management-auto-q-105",
  "management-auto-q-106",
  "management-auto-q-113",
  "management-auto-q-151",
  "management-auto-q-163",
  "management-auto-q-164",
  "management-auto-q-179",
  "management-auto-q-176",
  "management-auto-q-187",
  "management-auto-q-183",
  "management-auto-q-185",
  "management-auto-q-193",
  "management-auto-q-194",
  "management-auto-q-196",
  "management-auto-q-202",
  "management-auto-q-204",
  "management-auto-q-219",
  "management-auto-q-228",
  "management-auto-q-229",
  "management-auto-q-405",
  "management-auto-q-429",
  "management-auto-q-445",
  "management-auto-q-613",
  "management-auto-q-618",
  "technology-auto-q-029",
  "technology-auto-q-173",
  "technology-auto-q-418",
  "technology-auto-q-577",
  "technology-auto-q-585",
  "technology-auto-q-599",
]);

const ADDED_KNOWLEDGE_POINTS = [
  {
    id: "management-auto-kp-001",
    subjectId: "management",
    title: "现场管理与相关方管理",
    summary: "归集现场管理、5S 管理、相关方准入和变更管理等题目。",
    details: "当前题目主要涉及作业现场基础管理、相关方准入控制、变更范围识别和现场秩序维护等内容。",
    tags: ["管理", "现场管理", "相关方"],
  },
  {
    id: "management-auto-kp-003",
    subjectId: "management",
    title: "安全生产管理基本理论",
    summary: "归集事故致因、能量意外释放、风险与隐患等管理基础理论题目。",
    details: "当前题目主要覆盖基础安全理论、事故与隐患辨析、风险概念和变更管理基础等内容。",
    tags: ["管理", "基础理论"],
  },
  {
    id: "management-auto-kp-020",
    subjectId: "management",
    title: "安全生产应急管理",
    summary: "归集应急演练、应急响应和应急管理要求相关题目。",
    details: "当前题目主要涉及应急演练组织、演练评估、现场处置和应急管理程序。",
    tags: ["管理", "应急管理"],
  },
  {
    id: "management-auto-kp-021",
    subjectId: "management",
    title: "事故统计分析与报表制度",
    summary: "归集事故统计指标、统计图表和报表制度相关题目。",
    details: "当前题目主要涉及事故统计口径、图表应用、事故指标计算和统计报送要求。",
    tags: ["管理", "统计分析"],
  },
  {
    id: "management-auto-kp-026",
    subjectId: "management",
    title: "事故、事故隐患、危险源与重大危险源",
    summary: "归集事故、隐患、危险源和重大危险源相关基础概念题目。",
    details: "当前题目主要涉及事故与隐患辨析、危险源分类、重大危险源识别及相关管理要求。",
    tags: ["管理", "危险源"],
  },
  {
    id: "management-auto-kp-031",
    subjectId: "management",
    title: "安全文化建设",
    summary: "归集企业安全文化建设、承诺和激励等题目。",
    details: "当前题目主要涉及安全文化建设路径、安全承诺表达和行为激励机制等内容。",
    tags: ["管理", "安全文化"],
  },
  {
    id: "management-auto-kp-037",
    subjectId: "management",
    title: "职业病危害预防与管理",
    summary: "归集职业病危害因素、防护措施和职业健康管理相关题目。",
    details: "当前题目主要涉及职业病危害识别、职业健康检查、防护用品和职业病防治要求。",
    tags: ["管理", "职业健康"],
  },
  {
    id: "management-auto-kp-038",
    subjectId: "management",
    title: "事故报告",
    summary: "归集生产安全事故报告程序和时限相关题目。",
    details: "当前题目主要涉及事故报告主体、报告时限、报告内容和补报要求。",
    tags: ["管理", "事故报告"],
  },
  {
    id: "management-auto-kp-039",
    subjectId: "management",
    title: "特种设备安全管理",
    summary: "归集特种设备档案、维保、检查和使用管理相关题目。",
    details: "当前题目主要涉及特种设备档案管理、维保周期、周排查要求和使用环节控制。",
    tags: ["管理", "特种设备"],
  },
  {
    id: "management-auto-kp-042",
    subjectId: "management",
    title: "事故调查统计与分析方法",
    summary: "归集事故调查、事故等级判定、故障树和事件树等分析方法题目。",
    details: "当前题目主要涉及事故调查分析、事故等级划分、安全分析方法和统计分析应用。",
    tags: ["管理", "事故调查", "分析方法"],
  },
  {
    id: "management-auto-kp-049",
    subjectId: "management",
    title: "安全检查与隐患排查治理",
    summary: "归集安全检查方式、隐患排查和整改治理相关题目。",
    details: "当前题目主要涉及安全检查方法、隐患闭环治理、排查频次和整改责任。",
    tags: ["管理", "隐患排查"],
  },
  {
    id: "management-auto-kp-051",
    subjectId: "management",
    title: "安全生产投入与责任保险",
    summary: "归集安全生产费用提取使用和安责险相关题目。",
    details: "当前题目主要涉及安全生产费用列支范围、提取办法和安全生产责任保险要求。",
    tags: ["管理", "安全投入", "安责险"],
  },
  {
    id: "management-auto-kp-071",
    subjectId: "management",
    title: "安全评价方法",
    summary: "归集预先危险性分析、HAZOP 和安全检查表等评价方法题目。",
    details: "当前题目主要涉及常见安全评价方法的适用场景、优缺点和分析重点。",
    tags: ["管理", "安全评价"],
  },
  {
    id: "management-auto-kp-076",
    subjectId: "management",
    title: "本质安全与失误-故障安全功能",
    summary: "归集本质安全概念及失误-安全、故障-安全功能相关题目。",
    details: "当前题目主要涉及通过设计提升系统安全性，以及在误操作或设备故障情况下维持安全状态的本质安全要求。",
    tags: ["管理", "本质安全"],
  },
  {
    id: "management-auto-kp-077",
    subjectId: "management",
    title: "安全评价程序与内容",
    summary: "归集安全评价分类、程序和报告内容相关题目。",
    details: "当前题目主要涉及安全预评价、验收评价、现状评价和评价报告要素。",
    tags: ["管理", "安全评价"],
  },
  {
    id: "management-auto-kp-078",
    subjectId: "management",
    title: "事故应急预案编制",
    summary: "归集事故应急预案编制、评审和备案相关题目。",
    details: "当前题目主要涉及综合预案、专项预案、现场处置方案及预案编制要求。",
    tags: ["管理", "应急预案"],
  },
  {
    id: "management-auto-kp-093",
    subjectId: "management",
    title: "危险化学品建设项目安全监管",
    summary: "归集危险化学品建设项目安全条件审查和安全设施管理题目。",
    details: "当前题目主要涉及危化品建设项目安全审查、试生产和安全设施监督管理要求。",
    tags: ["管理", "危化品", "建设项目"],
  },
  {
    id: "management-auto-kp-096",
    subjectId: "management",
    title: "安全发展观",
    summary: "归集安全发展理念和安全管理观念相关题目。",
    details: "当前题目主要涉及安全发展理念、安全观转变和管理理念辨析。",
    tags: ["管理", "理念"],
  },
  {
    id: "management-auto-kp-097",
    subjectId: "management",
    title: "安全管理综合应用",
    summary: "归集暂无法细分到单一专题的综合管理题目。",
    details: "当前题目涉及多项管理制度、现场管理和综合应用场景，后续可继续拆分细化。",
    tags: ["管理", "综合"],
  },
  {
    id: "management-auto-kp-098",
    subjectId: "management",
    title: "危险、有害因素与风险辨识",
    summary: "归集危险有害因素分类、风险辨识和风险概念相关题目。",
    details: "当前题目主要涉及危险有害因素分类、风险可接受程度和相关风险分析场景。",
    tags: ["管理", "风险辨识"],
  },
  {
    id: "management-auto-kp-116",
    subjectId: "management",
    title: "危险有害因素辨识",
    summary: "归集危险有害因素辨识和验收评价中辨识要求相关题目。",
    details: "当前题目主要涉及危险有害因素识别、辨识维度和验收评价中的辨识内容。",
    tags: ["管理", "危险有害因素"],
  },
  {
    id: "management-auto-kp-118",
    subjectId: "management",
    title: "作业环境与目视化管理",
    summary: "归集作业环境控制、安全色和现场目视化管理题目。",
    details: "当前题目主要涉及粉尘和温度等环境因素控制、安全色标识和目视化管理措施。",
    tags: ["管理", "作业环境", "目视化"],
  },
  {
    id: "management-auto-kp-119",
    subjectId: "management",
    title: "安全技术措施",
    summary: "归集安全技术措施计划和技术性控制措施相关题目。",
    details: "当前题目主要涉及安全技术措施计划编制、措施分类和工程技术控制要求。",
    tags: ["管理", "技术措施"],
  },
  {
    id: "management-auto-kp-120",
    subjectId: "management",
    title: "安全生产监管监察与执法",
    summary: "归集安全生产监管体制、监察方式和行政执法要求相关题目。",
    details: "当前题目主要涉及综合监管与行业监管体制、矿山安全监察特点、事前事中事后监管方式以及安全生产行政执法规范。",
    tags: ["管理", "监管监察", "行政执法"],
  },
  {
    id: "technology-auto-kp-001",
    subjectId: "technology",
    title: "机械安全基础概念与本质安全设计",
    summary: "归集机械危险因素分类、本质安全设计和机械安全基础原理题目。",
    details: "当前题目主要涉及机械性与非机械性危险辨析、机械本质安全设计、可靠性设计和基础安全原则。",
    tags: ["技术", "机械安全基础", "本质安全"],
  },
  {
    id: "technology-auto-kp-004",
    subjectId: "technology",
    title: "机械制造场所布置与通道安全",
    summary: "归集机械制造场所设备布局、间距和通道安全相关题目。",
    details: "当前题目主要涉及车间设备布置、安全距离、通道设置和作业空间配置要求。",
    tags: ["技术", "机械制造", "场所布置"],
  },
  {
    id: "technology-auto-kp-006",
    subjectId: "technology",
    title: "电气安全技术",
    summary: "归集电气安全基础、供配电和电气运行要求相关题目。",
    details: "当前题目主要涉及低压配电、电气运行、电气危险温度和一般电气安全要求。",
    tags: ["技术", "电气"],
  },
  {
    id: "technology-auto-kp-017",
    subjectId: "technology",
    title: "起重机械与游乐索道安全技术",
    summary: "归集起重机械、大型游乐设施和客运索道相关题目。",
    details: "当前题目主要涉及起重机械吊运、司索和检查要求，以及大型游乐设施、客运索道的安全装置与运行管理。",
    tags: ["技术", "起重机械", "游乐索道"],
  },
  {
    id: "technology-auto-kp-021",
    subjectId: "technology",
    title: "爆炸控制、抑爆与阻火",
    summary: "归集泄压、抑爆、隔爆、阻火和惰化控制相关题目。",
    details: "当前题目主要涉及爆炸控制原则、泄压面积、抑爆隔爆措施、阻火装置和惰性气体保护要求。",
    tags: ["技术", "爆炸控制", "抑爆隔爆"],
  },
  {
    id: "technology-auto-kp-022",
    subjectId: "technology",
    title: "火灾探测报警与灭火设施",
    summary: "归集火灾探测、报警、自动灭火系统和常用灭火器材相关题目。",
    details: "当前题目主要涉及火灾探测器类型与适用场合、报警系统构成、自动灭火系统以及灭火器和灭火剂选用要求。",
    tags: ["技术", "消防", "探测报警", "灭火设施"],
  },
  {
    id: "technology-auto-kp-023",
    subjectId: "technology",
    title: "锻压设备结构安全与防护要求",
    summary: "归集锻造、冲压等锻压设备结构与防护要求相关题目。",
    details: "当前题目主要涉及锻压机械部件安全、冲压作业防护措施以及热锻作业危险有害因素。",
    tags: ["技术", "锻压设备", "冲压"],
  },
  {
    id: "technology-auto-kp-024",
    subjectId: "technology",
    title: "烟花爆竹与民爆安全基础",
    summary: "归集烟花爆竹、烟火药和民用爆炸物品相关题目。",
    details: "当前题目主要涉及烟花爆竹工艺防火防爆、烟火药特性和民用爆炸物品分类与布置要求。",
    tags: ["技术", "烟花爆竹", "民爆"],
  },
  {
    id: "technology-auto-kp-033",
    subjectId: "technology",
    title: "危险化学品危害与个体防护",
    summary: "归集液氨泄漏、防毒用品和危化品应急个体防护相关题目。",
    details: "当前题目主要涉及泄漏处置时的呼吸防护用品选择和危化品危害防护要求。",
    tags: ["技术", "危化品", "个体防护"],
  },
  {
    id: "technology-auto-kp-037",
    subjectId: "technology",
    title: "危险化学品泄漏、污染与废弃物处置",
    summary: "归集危险化学品泄漏控制、污染预防和废弃物处置相关题目。",
    details: "当前题目主要涉及危化品泄漏扩散控制、污染事故预防、废弃物销毁和泄漏火灾处置要点。",
    tags: ["技术", "危化品", "泄漏处置"],
  },
  {
    id: "technology-auto-kp-039",
    subjectId: "technology",
    title: "承压类特种设备与安全泄放装置",
    summary: "归集压力容器、压力管道、移动式压力容器和安全泄放装置相关题目。",
    details: "当前题目主要涉及压力容器与压力管道分类检查、移动式压力容器管理，以及安全阀、爆破片、放散管和无损检测要求。",
    tags: ["技术", "承压设备", "安全泄放"],
  },
  {
    id: "technology-auto-kp-043",
    subjectId: "technology",
    title: "触电防护与电气防爆",
    summary: "归集保护接地、双重绝缘、漏电保护和电气防爆相关题目。",
    details: "当前题目主要涉及触电防护措施、绝缘等级、防爆电气和安全电源配置要求。",
    tags: ["技术", "触电防护", "电气防爆"],
  },
  {
    id: "technology-auto-kp-058",
    subjectId: "technology",
    title: "危险化学品安全基础",
    summary: "归集毒性、防毒面具、腐蚀性和惰性气体置换等危化品基础题目。",
    details: "当前题目主要涉及危险化学品的基础性质、泄漏处置和典型防护要求。",
    tags: ["技术", "危化品基础"],
  },
  {
    id: "technology-auto-kp-076",
    subjectId: "technology",
    title: "危险化学品燃烧爆炸与应急处置",
    summary: "归集危化品燃烧爆炸过程和急性中毒应急处置相关题目。",
    details: "当前题目主要涉及燃烧爆炸过程中的危害特征和危化品泄漏中毒应急处置要求。",
    tags: ["技术", "危化品", "应急处置"],
  },
  {
    id: "technology-auto-kp-085",
    subjectId: "technology",
    title: "危险化学品经营安全",
    summary: "归集危险化学品经营环节的合规和安全要求题目。",
    details: "当前题目主要涉及剧毒化学品经营许可、流向管理和经营行为合规要求。",
    tags: ["技术", "危化品经营"],
  },
  {
    id: "technology-auto-kp-090",
    subjectId: "technology",
    title: "场（厂）内专用机动车辆安全技术",
    summary: "归集叉车、观光车等场内机动车辆相关题目。",
    details: "当前题目主要涉及场内机动车辆速度限制、安全保护装置和关键部件要求。",
    tags: ["技术", "场内车辆"],
  },
  {
    id: "technology-auto-kp-099",
    subjectId: "technology",
    title: "气瓶安全技术",
    summary: "归集气瓶分类、附件、安全泄压装置和定期检验相关题目。",
    details: "当前题目主要涉及气瓶标志、分类、泄压装置配置和定期检验项目等要求。",
    tags: ["技术", "气瓶"],
  },
  {
    id: "technology-auto-kp-101",
    subjectId: "technology",
    title: "危险化学品危害识别与安全信息",
    summary: "归集 GHS、TDG、标签、信号词和安全技术说明书相关题目。",
    details: "当前题目主要涉及危化品危害分类、标签要素、安全技术说明书和典型危害识别。",
    tags: ["技术", "危化品", "安全信息"],
  },
  {
    id: "technology-auto-kp-073",
    subjectId: "technology",
    title: "金属切削机床及砂轮机安全",
    summary: "归集金属切削机床和砂轮机安全要求相关题目。",
    details: "当前题目主要涉及金属切削设备限位与夹持保护要求，以及砂轮机主轴、防护罩和托架安全要求。",
    tags: ["技术", "机床", "砂轮机"],
  },
  {
    id: "technology-auto-kp-119",
    subjectId: "technology",
    title: "危险化学品经营、储存与运输安全",
    summary: "归集危化品经营许可、仓储、运输和移动式压力容器相关题目。",
    details: "当前题目主要涉及危险化学品经营行为与许可要求、运输安全规定、仓库存储规则和移动式压力容器管理。",
    tags: ["技术", "危化品经营", "危化品运输", "危化品储存"],
  },
  {
    id: "construction-auto-kp-001",
    subjectId: "construction",
    title: "塔式起重机安全技术",
    summary: "归集塔式起重机结构、防护装置和使用要求相关题目。",
    details: "当前题目主要涉及塔式起重机工作机构、安全防护装置和安全操作要求。",
    tags: ["建筑", "塔式起重机"],
  },
  {
    id: "construction-auto-kp-005",
    subjectId: "construction",
    title: "建筑施工应急管理与演练",
    summary: "归集建筑施工应急预案、应急处置和应急演练相关题目。",
    details: "当前题目主要涉及施工现场应急管理、应急演练组织和处置要点。",
    tags: ["建筑", "应急管理"],
  },
  {
    id: "construction-auto-kp-006",
    subjectId: "construction",
    title: "脚手架、高处与交叉作业安全",
    summary: "归集脚手架、攀登作业、悬空作业和交叉作业防护相关题目。",
    details: "当前题目主要涉及脚手架搭设、高处攀登与悬空作业、防护隔离以及交叉作业上下层防护要求。",
    tags: ["建筑", "脚手架", "高处作业", "交叉作业"],
  },
  {
    id: "construction-auto-kp-011",
    subjectId: "construction",
    title: "区间隧道与盾构施工安全",
    summary: "归集区间隧道施工工法、盾构作业和适用特点相关题目。",
    details: "当前题目主要涉及区间隧道施工方法辨析、不同工法特点以及盾构换刀等高风险作业安全要求。",
    tags: ["建筑", "隧道", "盾构"],
  },
  {
    id: "construction-auto-kp-021",
    subjectId: "construction",
    title: "土石方与基坑支护安全",
    summary: "归集土石方开挖、基坑支护和截排水处理相关题目。",
    details: "当前题目主要涉及基坑土方开挖顺序、支护结构控制、高压喷射注浆帷幕和渗漏位移处置要求。",
    tags: ["建筑", "基坑工程", "土方开挖"],
  },
  {
    id: "construction-auto-kp-025",
    subjectId: "construction",
    title: "交叉作业安全防护",
    summary: "归集交叉作业防护层和警戒隔离相关题目。",
    details: "当前题目主要涉及交叉作业上下层防护、警戒区域和坠落半径控制。",
    tags: ["建筑", "交叉作业"],
  },
  {
    id: "construction-auto-kp-028",
    subjectId: "construction",
    title: "吊装、土方与装饰作业安全",
    summary: "归集吊装、土方开挖和装饰装修作业安全技术相关题目。",
    details: "当前题目主要涉及汽车起重机吊装、土方开挖安全措施和装饰高处作业要求。",
    tags: ["建筑", "专项施工"],
  },
  {
    id: "construction-auto-kp-038",
    subjectId: "construction",
    title: "爆破作业安全技术",
    summary: "归集深孔爆破和爆破作业控制要求相关题目。",
    details: "当前题目主要涉及深孔爆破前准备、网路试验和爆破作业安全控制要点。",
    tags: ["建筑", "爆破"],
  },
  {
    id: "construction-auto-kp-045",
    subjectId: "construction",
    title: "施工现场重大危险源管理",
    summary: "归集施工现场重大危险源辨识、建档和管理要求相关题目。",
    details: "当前题目主要涉及重大危险源档案、辨识结果管理和动态更新要求。",
    tags: ["建筑", "重大危险源"],
  },
  {
    id: "construction-auto-kp-048",
    subjectId: "construction",
    title: "施工风险处置策略",
    summary: "归集施工现场风险规避、减轻、转移和自留等处置策略相关题目。",
    details: "当前题目主要涉及施工项目面对火灾等风险时，如何在风险规避、损失控制、风险转移和风险自留等方案中进行优选。",
    tags: ["建筑", "风险管理"],
  },
  {
    id: "construction-auto-kp-056",
    subjectId: "construction",
    title: "建筑起重机械与吊装作业安全",
    summary: "归集建筑起重机械安拆职责、检查验收和吊装作业安全相关题目。",
    details: "当前题目主要涉及建筑起重机械安拆单位职责、验收使用、设备检查以及汽车式起重机吊装作业安全要求。",
    tags: ["建筑", "起重机械", "吊装作业"],
  },
  {
    id: "construction-auto-kp-061",
    subjectId: "construction",
    title: "危大工程管理与施工组织设计",
    summary: "归集危险性较大的分部分项工程和施工组织设计相关题目。",
    details: "当前题目主要涉及基坑危险等级、危大工程管理和施工组织设计编审要求。",
    tags: ["建筑", "危大工程"],
  },
  {
    id: "construction-auto-kp-062",
    subjectId: "construction",
    title: "盾构施工换刀安全",
    summary: "归集盾构法施工中换刀作业安全要求相关题目。",
    details: "当前题目主要涉及盾构换刀前准备、设备物资配置和现场安全控制要求。",
    tags: ["建筑", "盾构"],
  },
  {
    id: "construction-auto-kp-069",
    subjectId: "construction",
    title: "施工机械与有限空间作业安全",
    summary: "归集施工现场常用机械设备和有限空间作业安全要求相关题目。",
    details: "当前题目主要涉及铲运机、压路机、机动翻斗车等施工机械使用要求，以及有限空间通风检测控制要求。",
    tags: ["建筑", "施工机械", "有限空间"],
  },
  {
    id: "construction-auto-kp-099",
    subjectId: "construction",
    title: "临边与洞口作业安全防护",
    summary: "归集电梯井、竖向洞口和临边洞口防护相关题目。",
    details: "当前题目主要涉及电梯井水平网、硬质隔断、洞口栏杆和封闭防护要求。",
    tags: ["建筑", "洞口防护", "高处作业"],
  },
  {
    id: "construction-auto-kp-101",
    subjectId: "construction",
    title: "施工现场临时用电安全技术",
    summary: "归集施工现场配电系统、配电箱和临时用电组织设计相关题目。",
    details: "当前题目主要涉及三级配电、二级漏保、配电室布置和开关箱设置要求。",
    tags: ["建筑", "临时用电"],
  },
  {
    id: "construction-auto-kp-119",
    subjectId: "construction",
    title: "模板与拆除工程安全",
    summary: "归集模板拆除、隧道模拆除和人工拆除顺序相关题目。",
    details: "当前题目主要涉及模板拆除条件、现浇结构和隧道模拆除顺序，以及人工拆除工程的顺序控制要求。",
    tags: ["建筑", "模板工程", "拆除工程"],
  },
];

const MANAGEMENT_ALIAS_MAP = new Map([
  ["management-auto-kp-040", "management-auto-kp-042"],
  ["management-auto-kp-066", "management-auto-kp-039"],
  ["management-auto-kp-069", "management-auto-kp-031"],
  ["management-auto-kp-102", "management-auto-kp-021"],
  ["management-kp-general", "management-auto-kp-097"],
]);

function loadExamData(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: filePath });
  return sandbox.window.EXAM_DATA;
}

function writeSampleData(filePath, data) {
  fs.writeFileSync(filePath, `window.EXAM_DATA = ${JSON.stringify(data, null, 2)};\n`, "utf8");
}

function upsertKnowledgePoints(examData) {
  const existingById = new Map(examData.knowledgePoints.map((item) => [item.id, item]));
  for (const knowledgePoint of ADDED_KNOWLEDGE_POINTS) {
    const existing = existingById.get(knowledgePoint.id);
    if (existing) {
      Object.assign(existing, knowledgePoint);
    } else {
      examData.knowledgePoints.push(knowledgePoint);
      existingById.set(knowledgePoint.id, knowledgePoint);
    }
  }
}

function replaceId(list, fromId, toId) {
  return list.map((item) => (item === fromId ? toId : item));
}

function dedupeList(list) {
  return [...new Set(list)];
}

const VERIFIED_ANSWER_FIXES = new Map([
  ["management-auto-q-160", ["B"]],
  ["management-auto-q-078", ["A", "B", "D", "E"]],
  ["management-auto-q-087", ["C", "E"]],
  ["management-auto-q-162", ["A", "B", "E"]],
  ["management-auto-q-166", ["A", "B", "D", "E"]],
  ["management-auto-q-167", ["A", "B", "D", "E"]],
  ["management-auto-q-172", ["B", "C", "E"]],
  ["management-auto-q-218", ["A", "D", "E"]],
  ["management-auto-q-231", ["C", "E"]],
  ["management-auto-q-233", ["B", "C", "E"]],
  ["management-auto-q-311", ["B", "C", "E"]],
  ["management-auto-q-318", ["A", "E"]],
  ["management-auto-q-319", ["A", "C", "E"]],
  ["management-auto-q-544", ["B", "D", "E"]],
  ["management-auto-q-545", ["B", "E"]],
  ["management-auto-q-547", ["D", "E"]],
  ["management-auto-q-552", ["B", "D", "E"]],
  ["management-auto-q-553", ["C", "D", "E"]],
  ["management-auto-q-554", ["C", "D", "E"]],
  ["management-auto-q-555", ["A", "E"]],
]);

function repairQuestionContent(question) {
  if (VERIFIED_ANSWER_FIXES.has(question.id)) {
    question.answer = VERIFIED_ANSWER_FIXES.get(question.id).slice();
  }

  switch (question.id) {
    case "law-q-06":
      question.stem = "安全生产标准法律化是我国安全生产立法的重要趋势。关于法定安全生产标准技术要求的说法，正确的是哪一项？";
      question.explanation =
        "法定安全生产标准分为国家标准和行业标准，两者对生产经营单位均有约束力。对同一安全生产事项，行业标准的技术要求可以高于国家标准，但不得与其相抵触，因此选 C。";
      break;
    case "law-q-142":
      question.stem = "关于法定安全生产标准分类的说法，正确的是哪一项？";
      question.explanation = "法定安全生产标准的基本分类是国家标准和行业标准，因此选 B。";
      break;
    case "law-q-15":
      question.explanation =
        "《安全生产法》赋予从业人员知情权、建议权、批评检举控告权、拒绝违章指挥和强令冒险作业权，以及在发现直接危及人身安全的紧急情况时停止作业或者撤离危险场所的权利，因此四个选项均正确。";
      break;
    case "law-q-22":
      question.explanation =
        "取得安全生产许可证的法定条件包括建立健全安全生产责任制、设置安全管理机构并配备专职安管人员、依法参加工伤保险并为从业人员缴费，以及对重大危险源采取检测评估监控措施并制定应急预案，因此四项均应选。";
      break;
    case "law-q-41":
      question.explanation =
        "《安全生产法》要求生产经营单位对重大危险源登记建档，定期检测、评估、监控，制定应急预案并告知有关应急措施，同时按规定备案有关安全措施和应急措施，因此 A、B、C、D 均正确。";
      break;
    case "law-q-51":
      question.explanation =
        "《安全生产法》规定的提请关闭情形包括：重大事故隐患多次受罚仍不整改、停产停业整顿后仍不具备法定安全条件、不具备法定安全条件并导致重大或特别重大事故、以及拒不执行停产停业整顿决定，因此四项均属于应提请关闭的情形。";
      break;
    case "law-q-66":
      question.options = [
        "个人不得购买剧毒化学品（属于剧毒化学品的农药除外）和易制爆危险化学品",
        "禁止向个人销售剧毒化学品（属于剧毒化学品的农药除外）和易制爆危险化学品",
        "销售企业、购买单位应当在销售、购买后三日内，将品种、数量和流向信息报所在地县级人民政府公安机关备案",
        "使用单位可以自由出借其购买的剧毒化学品",
      ];
      question.explanation =
        "个人不得购买剧毒化学品（属于剧毒化学品的农药除外）和易制爆危险化学品，销售企业也不得向个人销售上述化学品；销售企业、购买单位应在销售、购买后 3 日内向所在地县级公安机关备案，购买单位不得出借、转让所购剧毒化学品和易制爆危险化学品。因此 A、B、C 正确。";
      break;
    case "law-q-88":
      question.stem =
        "根据《职业病防治法》及职业健康监护相关规范，关于职业健康检查和岗位变更告知义务的说法，正确的有？";
      question.explanation =
        "《职业病防治法》要求用人单位组织上岗前、在岗期间和离岗时的职业健康检查，并在岗位或工作内容变更后对未告知的职业病危害履行告知、协商变更合同义务；职业健康监护规范进一步明确，离岗前 30 日内应组织离岗检查，离岗前 90 日内的在岗期间检查可视为离岗检查。因此 A、B、C 正确，D 错误。";
      break;
    case "law-q-157":
      question.options = [
        "吊装作业和动火作业应当分别安排专门人员进行现场安全管理",
        "危险作业现场安全管理的责任主体是生产经营单位",
        "危险作业只需在作业前进行口头提醒，无需安排专门人员现场管理",
        "临时用电属于法规明确列举的危险作业类型之一",
      ];
      question.explanation =
        "《安全生产法》明确要求生产经营单位进行爆破、吊装、动火、临时用电等危险作业时安排专门人员进行现场安全管理，因此 A、B、D 正确；仅作口头提醒而不安排专门人员不符合法定要求，C 错误。";
      break;
    case "technology-auto-q-030":
      question.stem = "利用桥式起重机吊运钢水包时，司索工应选择的吊具是（ ）。";
      question.options = ["固定式龙门钩", "夹具吊钩", "万向吊钩", "C 型吊钩"];
      question.explanation =
        "吊运钢水包、铁水包等盛装高温熔融金属的容器时，应使用固定式龙门钩等专用吊具，以防吊运过程中发生摆动、脱钩或倾覆，因此应选 A。其余吊具不适用于本题所述钢水包吊运工况。";
      break;
    case "management-auto-q-025":
      question.stem =
        "某化工厂维修 15m 高的反应塔顶部钢结构平台。作业人员未携带安全带，作业时阵风风速 9m/s，检测显示作业区含氧量为 20.5%（体积分数），作业人员与下方监护人员未配备对讲机等通信联络工具。作业过程中发生高处坠落事故。关于造成该事故原因的说法，正确的是（ ）。";
      question.explanation =
        "作业人员未携带安全带是事故的直接原因，审批环节未确认高处作业安全措施落实属于间接原因，因此 A 正确。9m/s 阵风未达到六级强风标准，不是本题事故的直接原因；未配备通信工具与坠落没有直接因果关系；20.5% 的含氧量处于允许范围，因此 B、C、D 错误。";
      break;
    case "management-auto-q-109":
      question.options = question.options.map((option) =>
        option.replace("间性通风", "间歇性通风")
      );
      break;
    case "management-auto-q-100":
      question.explanation =
        "根据《化工过程安全管理导则》（AQ/T 3034—2022），变更管理通常依次经过申请、风险评估、审批、实施和验收。变更申请提出后，应先辨识评估变更可能引发的风险并制定管控措施，再按权限审批；批准后方可实施，实施完成后还应组织验收，确认相关措施落实。因此正确顺序为 D。";
      break;
    case "management-auto-q-033":
      question.stem =
        "某大型钢铁企业鉴于职工接触的放射性仪表设备日益增多，组织了全员职业健康体检，以辨识职工是否受到电离辐射伤害。下列不属于电离辐射引起的职业病是（ ）。";
      break;
    case "management-auto-q-034":
      question.stem =
        "某公司员工甲某在进行起重机械检修过程中不慎将扳手坠落，造成一名路过员工重伤。综合考虑起因物、引起事故的诱导性原因等，该事故属于（ ）。";
      break;
    case "management-auto-q-198":
      question.explanation =
        "可接受风险是指在规定的性能、时间和成本范围内达到的最佳可接受风险程度。可接受风险指标不是一成不变的，它会随着人们对危险根源的深入了解、技术进步和经济综合实力提高而变化。安全系数可以作为可接受风险的判别指标，因此应选 C。";
      break;
    case "management-auto-q-124":
      question.explanation =
        "故障树中，矩形符号表示顶上事件或中间事件，需要继续向下分析；圆形符号表示基本事件，不需要进一步展开；房形符号表示开关事件；菱形符号表示未探明事件；椭圆形符号表示条件事件。因此基本事件符号是圆形，应选 B。";
      break;
    case "management-auto-q-132":
      question.explanation =
        "长管呼吸器一般用于固定作业，不适合消防员火场移动救援，B 错误。潜水作业一般使用自给开路压缩空气呼吸器；自给闭路压缩氧气呼吸器使用接近 100% 的氧气，潜水时容易造成氧中毒，C 错误。电工攀登水泥电线杆可以使用登杆脚扣，D 错误。卫星地面站人员可使用微波辐射防护服，因此 A 正确。";
      break;
    case "management-auto-q-137":
      question.stem = "甲装修公司承接乙公司的陈列室装修改造工程，双方签订了承包合同及安全协议。甲公司又将部分抹墙工作交由徐某组织人员施工。关于该工程相关方安全管理的说法，正确的是（ ）。";
      question.options = ["乙公司应对承包单位的安全生产工作统一协调、管理，定期检查并督促整改", "甲公司将部分工作交由徐某后，其现场安全管理责任全部转移", "徐某组织的作业人员无需接受项目安全教育和交底", "只要签订安全协议，乙公司即可不再检查承包单位的安全生产工作"];
      question.answer = ["A"];
      question.explanation = "生产经营单位将项目发包给其他单位后，仍应对承包单位的安全生产工作统一协调、管理，定期进行安全检查，发现问题及时督促整改，因此 A 正确。发包、转包或签订安全协议均不能免除法定安全管理责任，作业人员也必须接受相应安全教育和交底，B、C、D 错误。";
      break;
    case "management-auto-q-138":
      question.stem = "某炼油厂使用危险指数方法对一套炼油装置进行安全评价。评价过程中辨识出主要反应物质的物质系数较高，同时该装置采用了先进工艺和完备的安全设施。关于使用危险指数方法进行安全评价的说法，正确的是（ ）。";
      break;
    case "management-auto-q-144":
      question.stem = "某化工企业拟更换一条横跨生产区主路的物料输送管道。为减少断路对白天交通的影响，企业决定在夜间 0：00～4：00 断路施工。关于此次断路作业安全措施的做法，错误的是（ ）。";
      break;
    case "management-auto-q-145":
      question.stem = "根据危险化学品企业特殊作业安全管理要求，下列事项中不属于作业审批人职责的是（ ）。";
      break;
    case "management-auto-q-150":
      question.options[1] = "设计审查单位应指出电极锅炉运行中产生氢气的可能";
      break;
    case "management-auto-q-153":
      question.stem = "某作业人员使用由系带、连接器、缓冲器和安全绳组成，发生坠落时可将其悬挂在空中的安全带。该安全带属于（ ）。";
      break;
    case "technology-auto-q-064":
      question.stem = "GHS 中健康危害的吸入危害分类，对应的 TDG 分类是（ ）。";
      question.explanation =
        "GHS 中通过吸入途径即可造成严重急性健康危害的物质，在危险货物运输分类（TDG）中通常对应第 2.3 项毒性气体，因此应选 A。毒性物质、腐蚀性物质和放射性物质都不对应本题所述吸入危害分类。";
      break;
    case "technology-auto-q-133":
      question.options[1] = "公称容积大于 100 L 的液化石油气瓶使用的液相瓶阀不宜设计成单向阀";
      question.options[3] = "盛装强氧化性气体的气瓶瓶阀的密封材料不得采用非金属材料";
      question.explanation = "A 选项错误：盛装助燃和不可燃气体的瓶阀出气口螺纹为右旋，可燃气体瓶阀的出气口螺纹为左旋。\nB 选项错误：公称容积大于 100 L 的液化石油气瓶使用的液相瓶阀宜设计成单向阀。\nC 选项正确：与乙炔接触的瓶阀材料应选用含铜量小于 65% 的铜合金，以防生成具有爆炸危险的乙炔铜。\nD 选项错误：盛装氧气或其他强氧化性气体的瓶阀可以使用非金属密封材料，但材料应具有阻燃性和抗老化性。";
      break;
    case "technology-auto-q-138":
      question.options[2] = "锚固装置";
      break;
    case "technology-auto-q-054":
      question.stem = "根据《大型游乐设施安全技术规程》（TSG 71—2023），大型游乐设施报废时，必须进行去功能化处理的是哪个系统？";
      question.explanation = "存在严重事故隐患且无改造、修理价值，或者达到安全技术规范规定报废期限或条件的大型游乐设施，应及时报废。运营使用单位应采取必要措施消除其使用功能，至少对电气系统进行去功能化处理，并办理报废手续，因此选 C。";
      break;
    case "technology-auto-q-142":
      question.explanation = "A 选项错误：约 50% 的直击雷具有重复放电性质。B 选项错误：球雷可能从门、窗、烟囱等通道侵入室内。C 选项正确：雷电流幅值可达数十千安至数百千安。D 选项错误：雷电流波头时间仅数微秒、陡度很大，具有高频特征。";
      break;
    case "technology-auto-q-143":
      question.stem = "关于铸造工艺安全技术要求的说法，正确的是（ ）。";
      question.explanation = "A 选项正确：产生粉尘污染的混砂机等定型铸造设备应配置密闭罩，非标准设备设计时应附有防尘设施。B 选项错误：造型、落砂、清砂、打磨、切割、焊补等工序宜固定作业工位或场地，以便采取防尘措施。C 选项错误：冲天炉熔炼不宜加萤石。D 选项错误：落砂、打磨、切割等作业条件较差的场合，宜采用机械手遥控隔离作业。";
      break;
    case "technology-auto-q-144":
      question.explanation = "A 选项错误：制动液压站和张紧液压站应设置手动泵，以便液压系统故障时临时操作。B 选项错误：只要求在个别有危树的地方装设树倒检测装置。C 选项错误：应配备至少两套不同类型、不同来源且独立控制的进站减速控制装置。D 选项正确：控制台上应设置能以机械或电气方式使安全制动器动作的手动装置。";
      break;
    case "technology-auto-q-146":
      question.explanation = "A 选项正确：严禁在装有避雷针的构筑物上架设通信线、广播线或低压线。B 选项错误：独立避雷针一般应单独设置接地装置。C 选项错误：可以利用照明灯塔作为独立避雷针支柱，但照明电源线必须采用铅皮电缆或穿入铁管，并埋地引入。D 选项错误：露天有爆炸危险的金属储罐和工艺装置壁厚不小于 4 mm 时，可不另装接闪器，但必须接地。";
      break;
    case "technology-auto-q-061":
      question.stem = "下列危险化学品事故预防和控制措施中，可能防止污染事故的措施是（ ）。";
      break;
    case "technology-auto-q-149":
      question.options[0] = "在城镇燃气管网中，放散管不得设在闸井中";
      question.explanation = "城镇燃气管网的放散管一般设在闸井中，并安装在阀门前后；单向供气管道的放散管安装在阀门之前，因此 A、B、D 错误。有分段阀门的中压燃气干管应在阀门两侧设置放散管，C 正确。";
      break;
    case "technology-auto-q-063":
      question.stem = "关于不同种类感温火灾探测器的说法，正确的是（ ）。";
      break;
    case "technology-auto-q-065":
      question.stem = "下列检验项目中，属于钢制无缝气瓶定期检验项目的是（ ）。";
      break;
    case "technology-auto-q-066":
      question.stem = "关于材质和杂质对静电影响的说法，正确的是（ ）。";
      question.options[1] = "电阻率 1.0×10⁹ Ω·m 以上的固体不容易积累静电";
      question.options[2] = "电阻率 1.0×10⁸ Ω·m 以下的液体不容易积累静电";
      break;
    case "technology-auto-q-067":
      question.stem = "根据《混合气体的分类 第 3 部分：可燃性分类》（GB/T 34710.3—2018），下列惰性气体按转换系数从大到小排序，正确的是（ ）。";
      question.explanation = "该标准采用的转换系数分别为二氧化碳 1.5、氦气 0.9、氩气 0.55，因此从大到小依次为 CO₂、He、Ar，应选 C。";
      break;
    case "technology-auto-q-068":
      question.stem = "下列建筑物破坏等级和破坏程度的对应关系中，正确的是（ ）。";
      break;
    case "technology-auto-q-069":
      question.stem = "如果人受到的热剂量为 280 kJ/m²，对人可造成的伤害效应是（ ）。";
      break;
    case "technology-auto-q-159":
      question.stem = "关于初始压力对可燃气体爆炸极限影响的说法，正确的是（ ）。";
      question.options = ["初始压力减小，爆炸极限范围一定增大", "任何可燃气体都不存在爆炸临界压力", "初始压力与爆炸极限范围始终呈线性关系", "初始压力低于爆炸临界压力时，混合气体不会爆炸"];
      question.answer = ["D"];
      question.explanation = "初始压力降低时，许多可燃气体的爆炸极限范围会缩小；当压力低于其爆炸临界压力时，混合气体不能发生爆炸，因此 D 正确。初始压力的影响因气体性质而异，并非必然增大或始终呈线性关系，A、C 错误；部分可燃气体存在爆炸临界压力，B 错误。";
      break;
    case "technology-auto-q-072":
      question.stem = "某低压配电系统的电源中性点直接接地，设备外露导电部分通过保护线与该接地点连接，且中性线 N 与保护线 PE 自电源端起始终分开。该系统属于（ ）。";
      break;
    case "technology-auto-q-074":
      question.stem = "移动式压力容器由压力容器罐体与行走装置、定型汽车底盘、无动力半挂行走机构或框架永久连接组成，适用于铁路、公路或水路运输。下列属于移动式压力容器的有（ ）。";
      break;
    case "technology-auto-q-077":
      question.stem = "三相鼠笼异步电动机在爆炸性气体环境 1 区使用时，可选择的防爆型式有（ ）。";
      break;
    case "technology-auto-q-084":
      question.stem = "关于危险化学品存放的做法，正确的有（ ）。";
      question.options[2] = "将氢气钢瓶与氮气钢瓶一起存放";
      question.answer = ["A", "B", "C", "D"];
      question.explanation = "A、B、D 选项正确：氧化性与还原性化学品、酸与碱、有机物与无机物应分开存放。C 选项正确：氮气为惰性气体，与氢气不发生反应，可以同库存放。E 选项错误：甲烷是易燃气体，一氧化氮具有助燃危险，不应混存。";
      break;
    case "technology-auto-q-087":
      question.stem = "机器工作可靠度为 0.95，两名监控操作人员所用开关的可靠度均为 0.90。机器异常时，任一操作人员可靠动作即可切断电源。下列可靠度计算结果中，正确的有（ ）。";
      break;
    case "technology-auto-q-088":
      question.answer = ["B", "D"];
      question.explanation = "B、D 选项正确。安全技术说明书的运输信息包括联合国危险货物编号、运输危险类别、包装类别和运输注意事项；接触控制和个体防护部分包括职业接触限值、工程控制及呼吸防护等要求。A 选项错误，说明书列明的是该化学品及其供应商信息，不是生产所用主要原料的供应商信息。C、E 所述内容也不属于 GB/T 16483 规定的 16 项安全技术说明书内容。";
      break;
    case "technology-auto-q-150":
      question.stem = "关于不同种类感温火灾探测器的说法，正确的是（ ）。";
      question.options[3] = "差温火灾探测器可分为电子差温探测器和低熔点合金感温探测器";
      break;
    case "technology-auto-q-153":
      question.stem = "关于材质和杂质对静电影响的说法，正确的是（ ）。";
      question.options[1] = "电阻率 1.0×10⁹ Ω·m 以上的固体不容易积累静电";
      question.options[2] = "电阻率 1.0×10⁸ Ω·m 以下的液体不容易积累静电";
      break;
    case "technology-auto-q-154":
      question.explanation = "依据《混合气体的分类 第 3 部分：可燃性分类》（GB/T 34710.3—2018），转换系数分别为 CO₂ 1.5、He 0.9、Ar 0.55，因此从大到小为 CO₂、He、Ar，应选 C。";
      break;
    case "technology-auto-q-156":
      question.stem = "下列危险货物与包装类别的对应关系中，正确的是（ ）。";
      question.options = ["易燃液体—Ⅰ类包装", "危险性大的自热物质—Ⅱ类包装", "中等危险性的货物—Ⅱ类包装", "退敏爆炸品—Ⅲ类包装"];
      question.answer = ["C"];
      question.explanation = "危险货物运输包装按危险程度分为三类：Ⅰ类包装适用于危险性大的货物，Ⅱ类包装适用于危险性中等的货物，Ⅲ类包装适用于危险性较小的货物，因此 C 正确。易燃液体的包装类别还要依据初沸点和闪点确定，不能笼统对应Ⅰ类；自热物质和退敏爆炸品也应按具体分类标准确定，A、B、D 的笼统对应不成立。";
      break;
    case "technology-auto-q-157":
      question.stem = "某建筑物内设有抽气通风设施的面粉倒袋站。正常运行时，料斗内部长期或频繁存在爆炸性粉尘云，该区域应划分为（ ）。";
      break;
    case "technology-auto-q-171":
      question.explanation = "危险化学品存放应遵循性质相容原则。氧化性与还原性、酸与碱、有机物与无机物应分开存放，A、B、D 正确；氮气为惰性气体，与氢气不发生反应，二者可以同库存放，C 正确；一氧化氮具有助燃危险，甲烷为易燃气体，二者不得混存，E 错误。";
      break;
    case "technology-auto-q-174":
      question.stem = "根据《化学品安全技术说明书 内容和项目顺序》（GB/T 16483），下列属于化学品安全技术说明书规定内容的有（ ）。";
      question.answer = ["B", "D"];
      question.explanation = "B、D 选项正确。运输信息包括联合国危险货物编号、运输危险类别、包装类别和运输注意事项；接触控制和个体防护部分包括职业接触限值、工程控制及呼吸防护等要求。A 所述生产原料供应商、C 所述碳排放认证及 E 所述海关核查用途均不属于 GB/T 16483 规定的安全技术说明书项目。";
      break;
    case "technology-auto-q-181":
      question.stem = "某建筑物内设有抽气通风设施的面粉倒袋站。正常运行时，料斗内部长期或频繁存在爆炸性粉尘云，该区域应划分为（ ）。";
      break;
    case "technology-auto-q-182":
      question.explanation = "体力劳动强度指数 I=10TMSW=10×(6/8)×4×1×1=30。按照分级标准，I≥25 属于Ⅳ级体力劳动，因此应选 D。";
      break;
    case "technology-auto-q-186":
      question.explanation = "旋转轴上的凸起物既可能挂住衣物造成缠绕，也可能在接触人体时直接造成伤害，因此应使用固定式防护罩对其全面封闭，D 正确。";
      break;
    case "technology-auto-q-190":
      question.answer = ["C"];
      question.explanation = "补充保护措施包括实现急停功能的组件和元件、被困人员逃生和救援、隔离与能量耗散、安全搬运及安全进入机器等措施。为防止急停按钮被意外操作而设置防护罩，属于急停功能的补充保护措施，因此 C 正确。振动联锁和超速停机属于控制保护，抽汽管道安全阀属于针对压力危险的本质安全设计措施。";
      break;
    case "technology-auto-q-200":
      question.options[3] = "油浸式变压器的油箱上层油温最高应不超过 95℃";
      break;
    case "technology-auto-q-208":
      question.stem = "根据《气瓶安全技术规程》（TSG 23），气瓶上的“WP XX.X”标志表示（ ）。";
      break;
    case "technology-auto-q-210":
      question.stem = "某雷电流在 2 μs 内由 0 上升至 80 kA。该雷电流波头的平均陡度为（ ）。";
      question.explanation = "雷电流陡度等于电流变化量与上升时间之比，即 80 kA÷2 μs=40 kA/μs，因此选 B。";
      break;
    case "technology-auto-q-216":
      question.answer = ["D"];
      question.explanation = "正常状况下，任一操作人员误动作都可能导致系统停止，因此两名人员按串联方式计算。人机系统可靠度为 0.9×0.8×0.95=0.684，应选 D。只有异常状况下需要至少一人成功切断电源时，人员可靠度才按并联方式计算。";
      break;
    case "technology-auto-q-219":
      question.stem = "下列低压控制电器中，具有分断负荷电流、灭弧和短路保护功能的是（ ）。";
      break;
    case "technology-auto-q-222":
      question.stem = "锅炉运行中应实时监控并调整水位。正常水位允许的上下波动范围是（ ）。";
      break;
    case "technology-auto-q-226":
      question.explanation = "A 选项错误：皮肤长时间浸湿后导电性增强，皮肤阻抗会显著减小。B 选项错误：电流持续时间越长，人体因出汗、发热等原因阻抗会下降。C 选项正确：通电瞬间皮肤电容呈现较小的容抗，人体阻抗接近体内阻抗。D 选项错误：表皮或角质层破损会削弱皮肤屏障，使人体阻抗减小。";
      break;
    case "technology-auto-q-232":
      question.explanation = "A 选项正确：筑（压）药过程中模具与药剂难以分离时，不得强行敲打，可采用酒精清洗。B 选项错误：含较大颗粒铝、钛、铁粉的烟火药不应筑压。C 选项错误：含笛音药的半成品不应采用筑压方式封口。D 选项错误：每栋笛音药筑（压）药工房的手工作业定量为 0.5 kg。";
      break;
    case "technology-auto-q-233":
      question.stem = "体力劳动强度按指数 I=10T·M·S·W 分级。某高铁车站行李推送女工净劳动 4 h，总工时 8 h，8 h 工作日能量代谢率为 3 kJ/（min·m²），女性系数 S=1.3，推/拉方式系数 W=0.05。该女工的体力劳动强度等级是（ ）。";
      break;
    case "technology-auto-q-234":
      question.options[3] = "作为主要束缚装置的安全挡杆应具有乘客不能自行打开的功能";
      break;
    case "technology-auto-q-242":
      question.options[0] = "扑救爆炸物品火灾时，切忌用沙土覆盖，以免增加爆炸物品的爆炸威力";
      break;
    case "technology-auto-q-247":
      question.stem = "分解爆炸性气体在温度和压力作用下发生分解反应，可产生大量分解热并引发爆炸。关于乙炔分解爆炸及其预防的说法，正确的是（ ）。";
      question.explanation = "A 选项正确：乙烯分解爆炸所需发火能大于乙炔。B 选项错误：一定的温度和压力是乙炔分解爆炸的外因，分解热是内因。C 选项错误：与乙炔接触的容器材料不得使用含铜量超过 65% 的铜合金。D 选项错误：压力升高会使乙炔分解爆炸所需的发火能降低。";
      break;
    case "technology-auto-q-255":
      question.explanation = "动臂式塔式起重机应设置臂架低位和高位幅度限位开关，并设置防止臂架反弹后翻的装置；规范未要求设置“防止臂架前倾的装置”，因此 C 正确。";
      break;
    case "technology-auto-q-260":
      question.stem = "盛装易燃、易爆介质或毒性程度为中度危害以上介质的移动式压力容器，紧急切断阀与罐体液相管、气相管接口可采用的连接形式有（ ）。";
      question.answer = ["A", "C"];
      question.explanation = "紧急切断阀与罐体液相管、气相管的接口应采用焊接或法兰连接，以保证连接强度和密封可靠性，因此选 A、C；螺纹、对夹和自紧连接不符合该接口要求。";
      break;
    case "technology-auto-q-263":
      question.stem = "瓶装气体品种多、性质复杂，具有可燃性、腐蚀性、毒性、窒息性和氧化性等特点。关于气瓶贮存场所的说法，正确的有（ ）。";
      break;
    case "technology-auto-q-265":
      question.stem = "放射性危险化学品的主要危险在于其放射性，人体受到过量射线照射会产生不同程度的损伤。关于放射伤害的说法，正确的有（ ）。";
      question.options[2] = "嗜睡、昏迷、痉挛属于中枢神经和大脑受伤害的症状";
      question.options[4] = "极高剂量放射对中枢神经的伤害在 2 天内可能致人死亡";
      break;
    case "technology-auto-q-269":
      question.explanation = "按本题题源，反拱鳄齿型、正拱带槽型、平板开缝型及锅炉烟道用爆破片的表述正确，应选 A、B、C、E。D 所述同时防止储罐超压和真空负压不属于本题所称双向爆破片的正确功能表述。";
      break;
    case "technology-auto-q-271":
      question.stem = "关于接地装置安装尺寸的说法，符合安全要求的有（ ）。";
      question.options = ["接地体与建筑物基础的水平距离为 0.2 m", "水平接地体的埋设深度为 0.7 m", "垂直接地体的长度为 2.0 m", "接地装置与独立避雷针接地装置的距离为 1.0 m", "接地装置与独立避雷针接地装置的距离为 4.0 m"];
      question.explanation = "接地体与建筑物基础的水平距离不应小于 0.3 m，A 错误；水平接地体埋深 0.7 m、垂直接地体长度 2.0 m 均符合题设要求，B、C 正确；相关接地装置间距 1.0 m 不足，4.0 m 符合安全距离要求，D 错误、E 正确。";
      break;
    case "technology-auto-q-272":
      question.answer = ["A", "C", "D"];
      question.explanation = "A、C、D 正确。粉尘粒子表面主要通过热辐射从热源获得能量并形成可燃气体；可燃挥发分与颗粒周围含氧气相层混合后易被引燃，燃烧又促使颗粒进一步分解，形成连锁反应。热扩散和热对流不是本题所述主要获能方式，B、E 错误。";
      break;
    case "technology-auto-q-275":
      question.stem = "机械安全可通过直接、间接和提示性安全技术措施实现。通过改变机器设计或优化性能来消除、减小风险，属于（ ）。";
      break;
    case "technology-auto-q-279":
      question.stem = "信号预警装置包括听觉信号、视觉信号和视听组合信号。关于视听信号安全要素的说法，正确的是（ ）。";
      question.explanation = "A 正确：听觉信号在接收区任何位置均不应低于 65 dB（A）。B 错误：警告视觉信号亮度至少为背景亮度的 5 倍，紧急视觉信号至少为 10 倍。C 错误：警告视觉信号应为黄色或橙黄色，红色用于紧急信号。D 错误：险情信号优先于其他视听信号，紧急信号又优先于警告信号，并非所有视听信号都优先。";
      break;
    case "technology-auto-q-280":
      question.stem = "有些介质仅在特定条件下才会腐蚀压力容器材料。下列防止碳钢压力容器腐蚀的措施中，正确的是（ ）。";
      break;
    case "technology-auto-q-281":
      question.options[0] = "静电能量大，静电电击会使人致命";
      break;
    case "technology-auto-q-282":
      question.stem = "场（厂）内专用机动车辆事故可能造成人员伤亡并影响生产秩序。下列安全措施中，属于事故应急措施的是（ ）。";
      break;
    case "technology-auto-q-286": question.explanation = "A 错误：炸药燃烧时气体产物所作的功属于能量特征。B 错误：加入少量二苯胺可改善炸药的安定性。C 错误：燃烧速率与炸药组成和物理结构有关，并随初始温度和工作压力升高而增大。D 正确：燃烧特性标志炸药释放能量的能力。"; break;
    case "technology-auto-q-288": question.stem = "爆炸危险环境中的电气线路应避免形成引燃电弧或危险温度。下列防火防爆电气线路安全要求中，正确的是（ ）。"; break;
    case "technology-auto-q-291": question.stem = "烟花爆竹危险品仓库按危险程度划分等级。下列仓库中，属于 1.1-2 级的是（ ）。"; break;
    case "technology-auto-q-292": question.stem = "大型游乐设施操作人员必须掌握相关知识并正确处理突发情况。关于安全操作要求的说法，错误的是（ ）。"; break;
    case "technology-auto-q-295": question.stem = "安全人机工程研究“人—机—环境”系统的安全匹配。下列功能中，机器优于人的是（ ）。"; question.explanation = "机器能够同时完成多种操作，并保持较高效率和准确度，因此 C 正确。高度灵活性、可塑性和应对突发事件的能力通常是人的优势。"; break;
    case "technology-auto-q-296": question.stem = "热继电器和熔断器通过动作或熔断保护电气设备。关于其功能、原理及使用情形的说法，正确的是（ ）。"; break;
    case "technology-auto-q-297": question.stem = "可燃气体、蒸气或粉尘的爆炸极限会随条件变化。关于惰性气体对甲烷爆炸极限影响的说法，正确的是（ ）。"; break;
    case "technology-auto-q-301": question.stem = "评价粉尘爆炸危险性的主要参数包括爆炸极限、最小点火能、最低着火温度、爆炸压力及压力上升速率。关于粉尘爆炸危险性的说法，正确的是（ ）。"; break;
    case "technology-auto-q-302": question.options[0] = "客运索道每天运送乘客前应进行 2 次试车"; break;
    case "technology-auto-q-303": question.stem = "火灾自动报警系统由触发装置、火灾报警装置、火灾警报装置和电源组成。下列元件中，属于火灾报警装置的是（ ）。"; break;
    case "technology-auto-q-305": question.stem = "防爆泄压设施可释放爆炸时系统骤增的压力，减少对设备、管道的破坏。关于防爆泄压设施的说法，正确的是（ ）。"; break;
    case "technology-auto-q-317": question.stem = "我国工作场所高温作业分级所依据的两个主要参数是（ ）。"; question.explanation = "高温作业分级依据接触时间率和 WBGT 指数。WBGT 指数即湿球黑球温度，是综合评价作业环境热负荷的基本参量；接触时间率是一个工作日内实际接触高温作业累计时间与 8 h 的比率，因此选 C。"; break;
    case "technology-auto-q-318": question.stem = "室外低压配电柜落地安装时，A 为柜底面离地高度，H 为操作手柄中心高度。下列安装尺寸符合安全要求的是（ ）。"; break;
    case "technology-auto-q-320": question.options[1] = "起重机械轨道和钢丝绳的安全状况都只属于每月检查内容"; break;
    case "technology-auto-q-325": question.options[0] = "使用专用吊篮配合起重设备吊运气瓶"; break;
    case "technology-auto-q-329": question.explanation = "A 错误：库房内不应使用碘钨灯、卤钨灯及 60 W 以上的白炽灯等高温灯具，不能以 100 W 为限。B 错误：有腐蚀性气体或蒸气的环境应选用防水型灯具。C 错误：照明配线应采用额定电压 500 V 的绝缘导线。D 正确：应急照明应设置独立供电线路。"; break;
    case "technology-auto-q-338": question.options[0] = "针对轧钢机，在对旋式轧辊处采用钳形防护罩防护"; break;
    case "technology-auto-q-346": question.stem = "压力机作业区应安装安全保护装置或安全保护控制装置。下列属于安全保护控制装置的是（ ）。"; break;
    case "technology-auto-q-350": question.explanation = "A 项错误，当叉装物件重量不明时，应将该物件叉起离地 100 mm 后检查机械稳定性，确认无超载现象后方可运送；B 项错误，两辆叉车同时装卸一辆货车时，应有专人指挥联系，保证安全作业；C 项错误，观光车不应在坡面上调头，也不应横跨坡道运行。"; break;
    case "technology-auto-q-365": question.stem = "根据《建筑设计防火规范》（GB 50016），有爆炸危险的甲、乙类厂房应设置泄压设施。对于存在相对空气较轻的可燃气体、可燃蒸气的甲类厂房，作为泄压设施的轻质屋面板单位面积质量不宜超过（ ）。"; break;
    case "technology-auto-q-368": question.stem = "某实验室测试乙醚蒸气在空气中的爆炸下限：相邻试验点中，浓度 1.68% 时未燃爆，浓度 2.02% 时发生燃爆。按两相邻试验浓度的算术平均值确定爆炸下限，本次试验结果为（ ）。"; question.explanation = "爆炸下限位于相邻的不燃爆浓度 1.68% 与燃爆浓度 2.02% 之间。按题定方法取算术平均值：（1.68%+2.02%）÷2=1.85%，因此选 D。"; break;
    case "technology-auto-q-380": question.stem = "大型游乐设施使用单位应进行每日、每月和年度检查。下列检查项目中，属于每日检查的是（ ）。"; break;
    case "technology-auto-q-382": question.explanation = "《危险货物运输包装通用技术条件》（GB 12463）将危险货物包装分为三类：Ⅰ类适用于危险性较大的货物，Ⅱ类适用于危险性中等的货物，Ⅲ类适用于危险性较小的货物。因此甲货物采用Ⅲ类包装，其危险性较小，选 B。"; break;
    case "technology-auto-q-385": question.stem = "某单向乙炔阻火器标注 F 端为阻火侧、G 端为进气侧，用于防止回火。关于其安装和维护要求的说法，错误的是（ ）。"; break;
    case "management-auto-q-035":
      question.stem =
        "2024 年 11 月 14 日，某工程公司在同一隧道重复爆破作业，在未制定爆破技术设计和施工组织设计的情况下，开展爆破作业。作业面技术员李某在未得到正式警戒完成指令的情况下，误以为警戒完成，违规按下本该由爆破员张某按动的起爆按钮，导致 3 人死亡。关于此次爆破作业许可要求的说法，错误的是（ ）。";
      break;
    case "management-auto-q-058":
      question.stem =
        "甲、乙、丙、丁 4 名安全评价人员对某化工企业新建的生产车间进行安全评价，在选择适用的评价方法时，各自表达了自己的观点。4 名安全评价人员表达的观点中，错误的是（ ）。";
      question.explanation =
        "FMEA 可以识别故障模式并计算风险优先数，但它通常归入按评价结果量化程度分类的方法，而不是按推理过程分类的方法，因此 A 错误。安全检查表法可用于辨识隐患，PHA 也可分析系统潜在危险及可能事故，C 所述事故致因因素评价方法按评价目的分类也成立。";
      break;
    case "management-auto-q-072":
      question.type = "single";
      question.stem = "根据《安全标志及其使用导则》，横写的警告标志文字辅助标志应使用哪种文字颜色？";
      question.options = ["黑色", "白色", "蓝色", "绿色"];
      question.answer = ["A"];
      question.explanation = "横写的文字辅助标志中，警告标志的文字应为黑色，因此应选 A。禁止标志和指令标志通常使用白色文字。";
      question.knowledgePointIds = ["management-auto-kp-118"];
      question.source =
        "233-注安管理-真题解析-2019-2025.pdf 提供 A 项“禁止启动”文本；HQ-注安管理-25年真题.pdf 提供答案 A 及 GB 2894 解析。";
      break;
    case "management-auto-q-162":
      question.explanation = "承包商准入应审查安全资质，建立安全业绩不佳承包商的黑名单制度，并核实施工资质证书、安全生产许可证等，因此 A、B、E 正确。安全业绩通常审查近两年且重点关注重大事故等记录，C 所述近三年和一般事故档案不符合题设依据；人员审查可涉及年龄、工种和健康状况，但不以性别、地区作为安全准入条件，D 错误。";
      break;
    case "management-auto-q-218":
      question.explanation = "由布尔代数吸收律和幂等律，T=X1+X2（X1+X2）+X3X4=X1+X1X2+X2X2+X3X4=X1+X2+X3X4。因此最小割集为{X1}、{X2}和{X3，X4}，对应选项 A、D、E。";
      break;
    case "management-auto-q-078":
      question.stem = "某金矿经过 3 年施工已完成全部生产系统建设，投产前委托安全评价机构编制了安全验收评价报告。该评价报告的主要内容应包括（ ）。";
      question.explanation = "安全验收评价报告应包括危险有害因素辨识与分析、评价单元划分、评价方法选择、提出安全对策措施以及安全评价结论等内容，因此 A、B、D、E 正确。项目安全措施投资来源及经济效果分析不属于其主要内容，C 错误。";
      break;
    case "management-auto-q-233":
      question.stem = "某企业针对受限空间作业可能引发窒息、中毒等事故，已采取制定作业方案、完成作业审批和安全交底、配备通风换气设备、检测受限空间内气体浓度等措施。该企业还应采取的管控措施有（ ）。";
      question.explanation = "受限空间作业应设专人监护，作业期间监护人员不得离开；低温环境应穿冷环境防护服；检测仪器应在有效期内且使用前确认工作正常，因此 B、C、E 正确。A 错在作业期间不得关闭出入口；D 中液碱罐作业应穿戴防酸碱防护服、防护鞋和防护手套等防腐蚀装备，而非绝缘鞋。";
      break;
    case "management-auto-q-085":
      question.stem = "某森工集团下属单位有家具厂和自有林场。其中林场每年对所属林地进行造林前割灌（清林），雇佣当地村民进行作业。下列该集团发生的病例中，属于职业病的有（ ）。";
      question.options = ["为林场提供清林劳务的村民甲，经诊断患森林脑炎", "为林场提供交通运输的村民乙，在运输途中因夜晚连续加班发生心肺功能衰竭", "在家具厂进行切割作业的职工丙，因长期接触木粉尘，经诊断为其他尘肺", "为林场提供餐饮服务的村民丁，被蜱虫叮咬，经诊断为莱姆病", "在森工集团总部工作的职工戊，长时间使用鼠标，经诊断为鼠标手"];
      question.answer = ["A", "C", "D"];
      question.explanation = "依据《职业病分类和目录》（国卫职健发〔2024〕39号），森林脑炎和莱姆病均属于职业性传染病；长期接触木粉尘导致的其他尘肺也属于职业病，因此 A、C、D 正确。连续加班导致的心肺功能衰竭和总部职工的鼠标手不符合目录所列职业病及其限定范围，B、E 错误。";
      break;
    case "management-auto-q-087":
      question.type = "multiple";
      question.stem = "某新能源汽车喷漆车间工人由于长期暴露于有机溶剂挥发的环境，引发头晕及皮肤刺激。该车间采取的下列控制措施中，属于安全技术措施的有（ ）。";
      break;
    case "management-auto-q-120":
      question.explanation = "电离辐射所致职业病包括急、慢性放射病，急、慢性放射性皮炎，放射性白内障以及放射所致白血病等。电光性眼炎由紫外线照射引起，不属于电离辐射所致职业病，因此应选 D。";
      break;
    case "management-auto-q-128":
      question.options[1] = "甲市的 GDP 较高，其亿元 GDP 生产安全事故死亡率较高";
      question.explanation = "甲市亿元 GDP 生产安全事故死亡率为15÷9875≈0.001519人/亿元；乙市为10÷6050≈0.001653人/亿元。甲市该指标低于乙市，即甲市每生产1亿元GDP付出的生命代价较低，因此应选 A。";
      break;
    case "management-auto-q-148":
      question.explanation = "依据《工贸企业粉尘防爆安全规定》第十五条，存在粉尘爆炸危险的工艺设备应采用泄爆、隔爆、惰化、抑爆、抗爆等一种或多种控爆措施，但不得单独采取隔爆措施。因此应选 A。";
      break;
    case "management-auto-q-154":
      question.explanation = "危险化学品库房按独立建筑物划分评价单元，三个防火分区仍属于同一独立建筑物，应作为一个评价单元。分级指标R=1×（1×30/500+1×25/10+5×2/1）=12.56，属于三级重大危险源，因此应选 D。";
      break;
    case "management-auto-q-166":
      question.explanation = "安全验收评价报告应包括危险有害因素辨识与分析、评价单元划分、评价方法选择、提出安全对策措施以及安全评价结论等内容，因此 A、B、D、E 正确。项目安全措施投资来源及经济效果分析不属于其主要内容，C 错误。";
      break;
    case "management-auto-q-172":
      question.explanation = "受限空间作业应设专人监护，作业期间监护人员不得离开；低温环境应穿冷环境防护服；检测仪器应在有效期内且使用前确认工作正常，因此 B、C、E 正确。A 错在作业期间应保持出入口畅通，不能关闭；D 中液碱罐作业应穿戴防酸碱防护服、防护鞋和防护手套等防腐蚀装备，而非绝缘鞋。";
      break;
    case "management-auto-q-173":
      question.stem = "某森工集团下属单位有家具厂和自有林场。其中林场每年对所属林地进行造林前割灌（清林），雇佣当地村民进行作业。下列该集团发生的病例中，属于职业病的有（ ）。";
      question.options[0] = "为林场提供清林劳务的村民甲，经诊断患森林脑炎";
      question.options[3] = "为林场提供餐饮服务的村民丁，被蜱虫叮咬，经诊断为莱姆病";
      question.explanation = "依据《职业病分类和目录》（国卫职健发〔2024〕39号），森林脑炎和莱姆病属于职业性传染病，长期接触木粉尘导致的其他尘肺也属于职业病，因此 A、C、D 正确。连续加班导致的心肺功能衰竭不属于职业病；腕管综合征仅限长时间腕部重复或用力作业的制造业工人，总部职工使用鼠标不符合限定范围，B、E 错误。";
      break;
    case "management-auto-q-182":
      question.explanation = "存在硫化氢等中毒风险的有限空间作业，应由工贸企业主要负责人或者其书面委托的人员审批，A 错误；企业应至少每年组织一次有限空间作业专题安全培训，B 错误；检测超标撤离后再次进入前，应重新通风、检测合格，C 正确；作业期间应持续通风，不得采用间断性通风，D 错误。";
      break;
    case "management-auto-q-197":
      question.stem = "某年2月10日14：05，某央企所属某县成品油公司发生储罐泄漏火灾，造成3人死亡、1人受伤，公司负责人于14：05接到事故报告。关于该起事故上报的做法，错误的是（ ）。";
      break;
    case "management-auto-q-188":
      question.explanation = "作业人员未携带安全带是事故的直接原因，审批环节未确认高处作业安全措施落实属于间接原因，因此 A 正确。9m/s阵风未达到六级强风标准，不是事故直接原因；未配备通信工具与本次坠落没有直接因果关系；20.5%的含氧量处于允许范围，B、C、D 错误。";
      break;
    case "management-auto-q-231":
      question.type = "multiple";
      question.explanation = "安装在线气体监测报警系统属于防止事故发生的安全技术措施；采用自动喷涂机器人可减少人员暴露，也属于安全技术措施，因此 C、E 正确。局部排风属于卫生技术措施，轮班属于管理措施，个人使用空气净化呼吸装备属于个体防护措施，A、B、D 不选。";
      break;
    case "management-auto-q-235":
      question.explanation = "系统安全理论认为，危险源包括可能意外释放能量或危险物质的根源，以及导致约束、限制措施失效的因素。可导致人员中毒的气体属于第一类危险源，失灵的报警仪属于第二类危险源；受技术经济条件限制，不可能根除所有危险源。仅表述“机械设备老化”而未说明其具有危险能量或导致控制失效，不能直接据此认定为危险源，因此 A 错误。";
      break;
    case "management-auto-q-236":
      question.explanation = "胆汁质通常表现为情绪兴奋性高、反应迅速、脾气急躁、冲动性强，与“路怒症”群体的情绪和行为特征最接近，因此应选 C。";
      break;
    case "management-auto-q-240":
      question.stem = "甲公司作为总承包单位承揽某大型商业综合体建设工程，并将部分工程分包给乙公司。根据《危险性较大的分部分项工程安全管理规定》，下列分项工程需要组织专家论证专项施工方案的是（ ）。";
      question.explanation = "搭设高度50m及以上的落地式钢管脚手架工程属于超过一定规模的危险性较大分部分项工程，需要专家论证，A 正确。开挖深度4m的基坑、高处作业吊篮和起重量200kN的起重机械安装拆卸工程均未达到本题所列专家论证门槛，B、C、D 错误。";
      break;
    case "management-auto-q-243":
      question.stem = "南方沿海城市某企业自7月15日起进行六层办公楼维修，更换外墙面砖。突遇五级风，企业决定中断作业，待风停后恢复施工。重新作业前应确认的作业条件是（ ）。";
      break;
    case "management-auto-q-241":
      question.stem = "某企业为降低生产安全事故风险，采取了相应的安全技术措施。下列措施中，属于减少事故损失的安全技术措施是（ ）。";
      break;
    case "management-auto-q-245":
      question.stem = "某集团审计下属石油生产企业2023年度安全生产费用，发现费用大部分用于完善、改造和维护安全防护设备，小部分用于安全奖励等。下列支出中，不应在安全生产费用中列支的是（ ）。";
      question.explanation = "安全生产费用可用于安全防护设备和安全设施的更新、改造、检测及维护等支出；可燃气体报警器、安全阀及具有安全维护性质的工艺管道防腐均可按规定列支。用于奖励安全先进个人的专项奖金不属于本题适用的安全生产费用列支范围，因此应选 A。";
      break;
    case "management-auto-q-248":
      question.stem = "某公司为加快发展新质生产力、推进高质量发展，投入800万元进行节能环保改造，李某为安全部门负责人。根据有关规定，下列安全职责中，属于李某法定职责的是（ ）。";
      question.explanation = "依据《安全生产法》第二十五条，安全生产管理机构及安全生产管理人员应组织开展危险源辨识和评估，督促落实重大危险源安全管理措施，因此 C 正确。A、D 中“组织制定并实施”属于主要负责人职责；B 将安全生产责任制与操作规程并列为管理人员拟订职责，表述不符合该条法定原文。";
      break;
    case "management-auto-q-251":
      question.explanation = "作业前应由危险化学品企业预先绘制盲板位置图并统一编号，而非作业单位，A 错误；一张安全作业票只能进行一块盲板的一项作业，B 的表述不准确；禁止的是同一管道同时进行两处及以上盲板抽堵，不同管线并非当然禁止同时作业，C 错误；在火灾爆炸危险场所进行盲板抽堵时应穿防静电工作服和工作鞋，D 正确。";
      break;
    case "management-auto-q-252":
      question.stem = "某化工园区制氢企业采用管道为其他企业供应氢气，并组织相关部门和人员辨识变更管理范围。下列现场作业中，无需履行变更手续的是（ ）。";
      question.explanation = "设备设施更新改造、非同类型替换以及型号、材质、用途或阀门类型改变等均属于变更，应履行变更手续。更换同类型、同规格且功能不变的管线安全阀属于同类替换，无需履行变更手续，因此应选 B。";
      break;
    case "management-auto-q-254":
      question.stem = "东北某地甲化工公司与乙工程公司签订破碎间设备拆装及钢结构拆除合同。工人丙在破碎车间坡屋面拆除彩钢板时，因脚手板不稳从离地18m的檐口坠落，导致骨盆粉碎性骨折。关于本次高处作业管理的说法，错误的是（ ）。";
      question.options[0] = "工人丙的防坠个体防护装备应使用围杆作业用安全带";
      question.options[3] = "高处作业票的有效期最长为7天";
      question.explanation = "坡屋面拆除存在坠落风险，应使用坠落悬挂用安全带，围杆作业用安全带不适用于该工况，因此 A 错误。甲公司应审查承包商相应资质；18m通常为三级高处作业，存在直接引起坠落的客观危险因素时应升级为Ⅳ级；高处作业票有效期最长为7天，B、C、D 正确。";
      break;
    case "management-auto-q-256":
      question.options[0] = "丧葬及抚恤费用";
      break;
    case "management-auto-q-257":
      question.explanation = "安全评价依次进行前期准备、危险有害因素辨识分析、划分评价单元、定性定量评价、提出安全对策措施建议和形成评价结论。李某所述根据事故发生的可能性及严重程度开展定性、定量风险评价符合程序，因此 D 正确。张某、王某颠倒了步骤；对策措施应合理、可行、具有针对性，并非要求越高越好。";
      break;
    case "management-auto-q-260":
      question.options[3] = "锁气卸灰阀门安装完成后，应由质检部门组织验收，验收合格后办理结算手续";
      break;
    case "management-auto-q-263":
      question.stem = "某企业停业检修时发生爆炸事故，导致4人死亡、30名周边群众轻伤。事故产生医疗费30万元、处理环境污染费10万元、死者家属食宿及交通费15万元、4名死者赔偿金800万元、设备修复费130万元、政府部门罚款150万元、重新投入使用前安全评价费10万元。该事故的直接经济损失是（ ）万元。";
      question.explanation = "直接经济损失包括医疗费30万元、死者家属食宿及交通费15万元、死亡赔偿金800万元、设备修复费130万元和事故罚款150万元，合计30+15+800+130+150=1125万元。环境污染处理费和重新投入使用前安全评价费不计入本题直接经济损失，因此应选 C。";
      break;
    case "management-auto-q-266":
      question.stem = "某市四家工贸企业的二级安全生产标准化定级有效期即将届满，均拟再次申请原等级。下列企业中，不具备经定级部门确认后直接予以公示和公告条件的是（ ）。";
      break;
    case "management-auto-q-267":
      question.explanation = "应急演练方案应事先明确参演人员，替补人员也应预先设置并接受相应培训，演练当天临时安排未经准备的人员替代不符合要求，因此 D 错误。事故信息及时报告、设置警戒隔离和交通管制均符合演练要求；遇持续降雨等可能影响安全的突发情况，总指挥可中止或结束演练，A、B、C 正确。";
      break;
    case "management-auto-q-270":
      question.stem = "某医药化工企业计划拆除燃油锅炉房外原供油管线及配套消防管道，并安装新管线。下列更换管道作业的做法中，正确的是（ ）。";
      question.explanation = "设备外壁动火应在动火点周围10m范围内进行气体分析并检测设备内部气体，A 所述“直径10m”范围不足；本题拆除原供油管线属于一级动火，作业票有效期不超过8h，B 错误；固定动火区内按规定实施动火可不办理动火安全作业票，C 正确；消防管道气割按本题场所条件实行一级动火管理，D 错误。";
      break;
    case "management-auto-q-273":
      question.stem = "根据《生产安全事故应急预案管理办法》（应急管理部令第2号），某县应急管理部门发现属地一家冶金企业在应急预案修订中存在问题，责令其改进。关于该企业应急预案修订的做法，错误的是（ ）。";
      break;
    case "management-auto-q-276":
      question.stem = "某炼铁厂发生高炉铁水泄漏并造成炉缸烧穿，大量渣铁及炉料喷至靠近高炉一侧主控楼的楼梯间，2名夜班工人疏散到此处时被烧伤。事故调查发现，现场处置方案未提及此类事故可能波及楼梯间，当班组长仍指挥工人从楼梯间疏散。上述事故暴露出的现场处置方案问题是（ ）。";
      break;
    case "management-auto-q-280":
      question.explanation = "安全帽应按有效防护功能最低指标和有效使用期判废，A 将“最低指标”误写为“最高指标”；经检验判定不合格的安全帽应立即报废并更换，B 正确；安全带缝制部分残损不得由使用人自行维修，C 错误；已经报废的安全帽不得因外观完好继续使用，D 错误。";
      break;
    case "management-auto-q-281":
      question.explanation = "事故最初造成2人死亡，属于一般事故，逐级上报至设区的市级部门即可。县级应急管理部门应在接报后2小时内报告市级部门，因此 B 正确。单位负责人应在接报后1小时内报告，A 的“立即”不符合法定表述；市级部门无需继续报告省级；火灾事故自发生之日起7日内伤亡人数变化才应补报，第8日死亡不在补报期限内，C、D 错误。";
      break;
    case "management-auto-q-282":
      question.explanation = "企业可针对重大危险源编制专项应急预案，并针对危险化学品库房泄漏、制氢装置爆炸等具体场所和事故情形编制现场处置方案。综合应急预案是企业总体预案类型，不按吊车、叉车等特种设备分别编制“特种设备综合应急预案”，因此 C 错误。";
      break;
    case "management-auto-q-283":
      question.explanation = "不得使用叉车等非专用方式协助将发酵罐固定在吊钩处，该做法危及人身安全，应停止作业，因此 A 正确。12t吊物属于三级吊装，题干未显示必须编制吊装方案的特殊条件；指挥人员佩戴明显标志符合要求；阳光刺眼可调整站位或采取遮光措施，B、C、D 不选。";
      break;
    case "management-auto-q-284":
      question.stem = "某芯片生产企业特气库内设三个隔间，分别存有A1、A2、A3危险化学品，设计储量分别为2t、2t和1t。厂区边界向外扩展500m范围内常住人口为102人，校正系数α=2。A1、A2、A3的临界量Q与校正系数β分别为5t、5；1t、20；5t、4。若三个隔间划为一个评价单元，该重大危险源等级为（ ）。";
      break;
    case "management-auto-q-285":
      question.explanation = "综合分析法将大量事故资料按事故级别、时间、地域、经济发展程度等方面汇总整理，使零散资料系统化，并从多种因素变化中找出事故发生规律，因此应选 B。";
      break;
    case "management-auto-q-286":
      question.stem = "某化肥生产企业开展露天大检修，需要拆除更换造粒塔部分管线，其中最大吊物质量为35t。下列吊装作业安全管理要求中，错误的是（ ）。";
      question.explanation = "长径比大的吊物即使质量不足40t，也应编制并审批吊装方案；六级及以上大风时不得露天吊装；指挥人员应佩戴明显标志并按联络信号指挥，A、B、C 正确。多台起重机械吊运同一吊物时，每台载荷不得超过额定能力的80%，40t起重机最大允许载荷为32t而非34t，因此 D 错误。";
      break;
    case "management-auto-q-287":
      question.explanation = "甲醇与硫化氢的急性毒性类别不同，不能均归为高毒；一氧化碳具有明显毒性，丙烯主要表现为易燃和窒息危险，两者毒性危害程度不同；物质毒性不能仅凭题述化学结构关系得出甲苯比甲醇毒性小，A、B、C 错误。二氧化硫和硫化氢均属于生产性毒物，D 正确。";
      break;
    case "management-auto-q-288":
      question.explanation = "主井提升钢丝绳的检验周期并非每2年一次，A 错误；主要负责人职责是组织制定并实施操作规程，而非仅参与制定，B 错误；地下矿山在用通风机及其电机应按规定每年进行一次检测检验，C 正确；应急预案评审不等同于必须通过推演方式进行，D 错误。";
      break;
    case "management-auto-q-289":
      question.explanation = "按损失工作日判定，拇指远端指骨截肢为300个工作日，脚部中趾中间趾骨截肢为350个工作日，内脏出血需手术治疗至少为200个工作日，均达到重伤范围；严重脑震荡住院一个月未达到上述重伤损失工作日标准，属于轻伤，因此应选 D。";
      break;
    case "management-auto-q-290":
      question.stem = "某石化公司检查下属加油站时发现，施工单位正在进行屋面防水维修，其临时用电作业管理不到位。下列临时用电做法中，不符合安全要求的是（ ）。";
      question.options[3] = "临时用电线路采用耐压等级500V的绝缘电线";
      question.explanation = "接引、拆除临时用电线路时，上级开关应断电、加锁并悬挂警示标牌，且接拆线路作业必须有监护人在场。视频显示仅一人完成接线，缺少监护，因此 A 不符合要求；设置接地保护、在加油站检测可燃气体以及使用耐压等级500V的绝缘电线均符合要求。";
      break;
    case "management-auto-q-291":
      question.explanation = "矿石振动筛操作岗位主要接触矿尘，应配备自吸过滤式防颗粒物呼吸器，因此 B 正确。防毒面具用于防护有毒气体或蒸气，自给式空气、氧气呼吸器用于缺氧或高浓度有毒环境，不是该岗位常规防尘装备。";
      break;
    case "management-auto-q-296":
      question.explanation = "应急预案编制程序还包括应急预案编制完成后的桌面推演，即成立编制工作组、资料收集、风险评估、应急资源调查、预案编制、桌面推演、预案评审、批准实施。B 遗漏桌面推演，错误；A、C、D符合编制工作组、风险评估和应急资源调查要求。";
      break;
    case "management-auto-q-298":
      question.options[3] = "某员工血压160/100mmHg";
      question.explanation = "阵风五级以上、平均气温5℃以下以及作业场所光线不足，均属于可直接引起高处坠落的客观危险因素。员工血压160/100mmHg属于作业人员自身健康状况，不属于客观环境危险因素，因此应选 D。";
      break;
    case "management-auto-q-301":
      question.options[3] = "处以A化工公司180万元罚款";
      question.explanation = "该事故造成3人死亡，属于较大事故。依照事故罚款规定，对负有责任的事故发生单位处100万元以上120万元以下罚款，因此对A公司罚款180万元错误，D 应选。出具虚假安全评价报告可依法吊销B公司资质并处罚直接责任人员；责令A公司停业整顿也符合事故处理要求。";
      break;
    case "management-auto-q-302":
      question.stem = "下列职责中，属于重大危险源操作负责人安全职责的是（ ）。";
      question.options[3] = "组织制定并实施重大危险源生产安全事故应急救援预案";
      break;
    case "management-auto-q-303":
      question.stem = "甲维保公司与乙化工公司签订日常维护服务外包协议。2023年10月23日，乙公司发现生产区道路下方供热管道漏水，联系甲公司维修。甲公司组织挖掘作业时发生基坑坍塌。关于本次动土作业安全管理要求的说法，正确的是（ ）。";
      question.explanation = "沟槽、基坑深度大于2m时即应设置人员上下梯子，A 所述2.5m错误；拆除固壁支撑应从下而上，B 错误；距管道边1m范围内应采用人工开挖，C 正确；道路动土作业仍应按规定设置交通警示设施和标志牌，不能因有人指挥而省略，D 错误。";
      break;
    case "management-auto-q-304":
      question.explanation = "事故风险描述应简述风险评估结果，可用列表形式在附件中体现，LEC风险评估属于事故风险描述内容，因此 B、C 正确。淹溺救援实操可能产生次生风险，方案验证可采用桌面推演，D 正确。视频监控属于监测预警设施，不是事故发生后的应急处置措施；现场处置方案仍应单独列明应急处置程序，A、E 错误。";
      break;
    case "management-auto-q-306":
      question.explanation = "建设单位应在合同中约定各方安全职责，并对承包商统一协调管理，A正确；交叉作业单位应相互告知作业内容和安全注意事项，平面交叉作业原则上由先进入现场的一方主动采取防护措施，C、E正确。安全生产管理协议应指定专职安全生产管理人员，B所述“专职或兼职”错误；不同施工单位不得简单共用用电线路，D错误。";
      break;
    case "management-auto-q-307":
      question.explanation = "事故调查组应提出对事故责任者的处理建议，并针对事故暴露出的经营性自建房风险加大监督检查、提出防范整改措施，因此 B、D 正确。A 是人民政府批复事故调查报告的法定时限，不是针对事故暴露问题提出的措施建议；C、E表述笼统，未准确对应本题事故调查组提出的针对性建议。";
      break;
    case "management-auto-q-308":
      question.explanation = "用去离子水替代酒精属于消除危险源；独立设置清洗间并采用防爆电气可控制点火风险；局部排风可降低酒精蒸气浓度，A、B、D均属于防止事故发生的安全技术措施。限制现场酒精存放量主要减轻火灾扩大后的损失，不直接消除挥发气体遇火源起火的条件；风险分析和完善规程属于管理措施，C、E不选。";
      break;
    case "management-auto-q-313":
      question.options[2] = "甲仅经专项培训考试合格并取得培训合格证，即可作为本次作业监护人";
      question.explanation = "监护人不得在无防护措施时将身体探入受限空间，A错误；受限空间内气体应连续检测并至少每2h记录，B所述每2h才开机检测错误；监护人除培训合格外还应具有生产或作业实践经验，C所述仅凭培训证即可错误。作业票有效期不超过24h，D正确；作业前应告知有毒物质等危险因素，E正确。";
      break;
    case "management-auto-q-314": question.options[3] = "煤矿百万吨死亡率下降10%"; break;
    case "management-auto-q-316":
      question.options[0] = "停产期间甲公司盈利减少300万元"; question.options[1] = "注塑机、成型机报废固定资产损失680万元"; question.options[2] = "生产车间厂房修复费用120万元"; break;
    case "management-auto-q-318":
      question.type = "multiple";
      question.stem = "某化工企业需更换污水池底部腐蚀排污管。5月23日9：00开始办理受限空间安全作业票，通风置换后10：00检测池底气体并完成审批，作业票有效期8h。12：20开始拆管，12：40检测氧含量为19.3%（体积分数），作业人员立即撤出。该作业过程中符合安全要求的有（ ）。";
      question.explanation = "受限空间作业票有效期不超过24h，本题8h符合要求，A正确。容积较大的受限空间应检测上、中、下等有代表性的部位，仅检测池底不足，B错误；作业现场应连续检测可燃、有毒气体和氧含量，题述检测方式不完整，C、D错误；氧含量19.3%低于合格范围时立即停止作业并撤离人员，E正确。"; break;
    case "management-auto-q-319": question.explanation = "建设单位甲应统一协调两家施工单位、通报安全信息，分别确认作业风险和许可要求，并对施工用电、个体防护装备使用等实施过程监督，因此A、C、E正确。不能因一方规模大就由其监督另一方；“四不放过”是事故处理原则，不是日常交叉作业原则，B、D错误。"; break;
    case "management-auto-q-320":
      question.stem = "某大型康养连锁机构为减少老年人摔倒事故，运用海因里希法则对历年摔倒事故数据进行统计分析。下列理解和应用中，错误的是（ ）。";
      question.options[3] = "每1次老人摔倒重伤事故，都对应29次老人摔倒轻伤事故和300次未遂事件";
      question.explanation = "海因里希法则的1∶29∶300是统计概率规律，提示应重视未遂和轻伤事件，但不能机械理解为每一次具体重伤必然对应固定数量事件，因此D错误。A、B、C均体现通过控制不安全因素预防严重事故。"; break;
    case "management-auto-q-324": question.stem = "某露天矿运输车在弯道行驶过程中，装载的矿石突然滑落。根据《企业职工伤亡事故分类》（GB 6441），该事故类型属于（ ）。"; break;
    case "management-auto-q-325": question.explanation = "爆破方案应明确炮孔和警戒范围；装药应用木质或竹质炮棍轻推药卷；PVC材料可能产生静电，不得作为炮棍，A、B、C正确。爆破作业人员资格由公安机关依法许可管理，并非国家矿山安全监察局颁发，因此D错误。"; break;
    case "management-auto-q-326": question.explanation = "行政执法人员执行公务时必须出示有效执法证件，B正确。对单位现场作出1万元罚款不符合简易程序条件；行政机关负责人或工作人员应依法出庭应诉，不能仅由律师代理；执法人员还须取得行政执法资格证件，A、C、D错误。"; break;
    case "management-auto-q-327":
      question.stem = "某产业园项目进行塔式起重机安装，安装单位严重违章。业主方安全员张某责令停止作业，负责人王某称顶升已开始，完成当前标准节后才能停止。完成后安装单位仍未停工，张某再次叫停并通知监理、向单位领导汇报，随后起重机坍塌造成5人死亡。关于张某履职情况的说法，错误的是（ ）。";
      question.explanation = "张某到场管理、指出严重违章并责令停工，在制止未果后通知监理并向单位领导报告，均属于履行现场安全管理职责，B、C、D成立。安装单位作业人员的安全教育培训主体是其用人单位，不能据此认定业主方安全员张某培训不到位，因此A错误。"; break;
    case "management-auto-q-330":
      question.stem = "某企业开展安全生产标准化建设。根据《企业安全生产标准化基本规范》（GB/T 33000），关于现场管理一级要素内容的说法，错误的是（ ）。";
      question.explanation = "安全设施和职业病防护设施不得随意拆除、挪用或弃置；检维修中应隔离能量和危险物质，完成后进行安全确认；企业应建立合格承包商、供应商名录和档案，A、B、D正确。同一区域两支作业队伍除与业主方明确职责外，相互之间也应签订安全管理协议并指定人员协调，C所述“只需”错误。"; break;
    case "management-auto-q-331": question.stem = "甲省乙市丙县某化工企业位于本省丁市戊县的分公司发生危险化学品爆炸事故，造成2人死亡、10人重伤，直接经济损失200余万元。负责组织此次事故调查的是（ ）。"; break;
    case "management-auto-q-332": question.explanation = "火灾事故自发生之日起7日内伤亡人数变化的，应及时补报并据此调整事故等级。本题5名重伤人员在第10日死亡，已超过7日补报期限，事故仍按最初5人死亡的较大事故处理，由事故发生地乙市人民政府组织调查，因此选C。"; break;
    case "management-auto-q-334": question.explanation = "危险化学品单位负责建立重大危险源监测监控体系，政府部门依法监督并实行属地监管与分级管理，A、C正确；储存剧毒物质且构成重大危险源的场所应设置监控系统，D正确。安全评估或评价报告应报所在地县级应急管理部门备案，不是公安部门，因此B错误。"; break;
    case "management-auto-q-339": question.stem = "某化工厂装置停机故障树化简后的最小割集为{X2}和{X1，X3}。基本事件概率分别为q1=0.03、q2=0.02、q3=0.05，且相互独立。顶上事件T发生的概率是（ ）。"; break;
    case "management-auto-q-341": question.stem = "某企业开展危险化学品重大危险源辨识。已知液氨、乙炔、汽油、金属钾、金属钠的临界量分别为10t、1t、200t、1t、10t。下列情形中，构成危险化学品重大危险源的是（ ）。"; break;
    case "management-auto-q-342": question.explanation = "注入信息是执行人员展示事故发生发展场景；提出问题是依据方案向参演人员提出处置任务；分析决策是参演人员讨论形成处置意见；表达结果是汇报或演示处置结果。对演练情况汇总点评属于演练评价，不属于注入信息，因此B错误；A、C、D分别对应提出问题、分析决策和表达结果。"; break;
    case "management-auto-q-343": question.stem = "某炼油厂拟在硫磺回收车间原料水罐罐顶切割排气管线。根据《危险化学品企业特殊作业安全规范》（GB 30871），关于该动火作业管理的说法，错误的是（ ）。"; break;
    case "management-auto-q-347": question.stem = "小王整理单位特种设备安全技术档案，已有设计文件、产品质量合格证明、安装及使用维护保养说明、监督检验证明、定期检验和自行检查记录、日常使用状况及维护保养记录等。还应纳入档案的是（ ）。"; break;
    case "management-auto-q-356":
      question.stem = "甲企业委托具有资质的乙企业进行污水厂排污改造，改造期间甲企业正常生产并负责现场供电。关于相关方作业安全管理的做法，正确的是（ ）。";
      question.options[0] = "甲企业仅安排品控部门员工对作业现场监督检查、协调事项";
      question.options[3] = "甲企业应与乙企业共同确认中毒、窒息、触电等作业危害，并明确作业许可要求";
      question.answer = ["D"];
      question.explanation = "甲、乙双方应共同确认中毒、窒息、触电等风险并明确作业许可要求，D正确。现场协调应由具备安全管理职责的人员承担，不能仅安排品控人员；恢复施工应针对相关隐患和作业条件确认，不能笼统要求所有隐患；临时用电实行作业审批许可制而非备案制，A、B、C错误。"; break;
    case "management-auto-q-357": question.stem = "使用三台额定起重能力均为50t的起重机共同吊运同一重物时，每台起重机允许承受的最大载荷是（ ）。"; break;
    case "management-auto-q-360":
      question.stem = "王某是铜矿企业安全生产管理人员，李某是建筑施工企业安全生产管理人员，刘某是电力企业安全生产管理人员，陈某是机械制造企业主要负责人。关于安全教育培训学时的说法，正确的是（ ）。";
      question.options[2] = "陈某初次安全培训时间不得少于24学时"; break;
    case "management-auto-q-368": question.stem = "某企业按照安全系统工程和人机工程原理编制了4类安全生产规章制度，属于综合安全管理制度的是（ ）。"; break;
    case "management-auto-q-375":
      question.stem = "某省某年共发生生产安全事故156起、死亡199人。其中交通运输行业58起、死亡60人，危险化学品行业20起、死亡35人，煤矿行业15起、死亡39人，建筑行业12起、死亡17人。关于事故统计的说法，错误的是（ ）。";
      question.options[0] = "煤炭开采量为3.5亿t，则煤炭百万吨死亡率为0.111"; question.options[1] = "该省统计人口为4500万人，事故千人死亡率为0.004";
      question.explanation = "煤炭百万吨死亡率为39÷350=0.111，事故千人死亡率为199÷4500万×1000=0.004，A、B正确；排列图用于显示各分类频次及累计比例，及时察觉异常应使用控制图，因此C错误；饼图可反映不同行业事故起数占比，D正确。"; break;
    case "management-auto-q-376": question.stem = "某制冷企业对设备进行风险辨识和危险源分类。根据第一、第二类危险源定义，属于第二类危险源的是（ ）。"; break;
    case "management-auto-q-379": question.explanation = "电焊作业通常需要护目镜或焊接面罩防弧光、绝缘鞋防触电，并根据烟尘和有害气体情况配备呼吸防护用品。题干未给出强噪声环境，耳塞不是电焊作业必需的常规防护用品，因此应选A。"; break;
    case "management-auto-q-384": question.stem = "生产性毒物可能对劳动者健康产生危害。关于生产性毒物存在形态的说法，正确的是（ ）。"; break;
    case "management-auto-q-387": question.stem = "2023年《职业病防治法》宣传周的主题是（ ）。"; question.options[2] = "改善工作环境和条件，保护劳动者身心健康"; break;
    case "management-auto-q-388": question.stem = "某企业使用数控车床加工钢质零件，并制定了相应安全操作规程。为适应市场需要，企业将该数控车床用于加工镁合金零件。关于安全操作规程的说法，错误的是（ ）。"; break;
    case "management-auto-q-392": question.stem = "某地下云母矿当月开采矿石5000t。根据《企业安全生产费用提取和使用管理办法》（财资〔2022〕136号），该企业月末应提取的安全生产费用为（ ）。"; break;
    case "management-auto-q-415": question.stem = "某企业制氯车间生产能力为100Nm³/h。企业安全检查发现下列隐患，其中属于重大事故隐患的是（ ）。"; break;
    case "management-auto-q-419":
      question.stem = "根据工贸和矿山行业重大事故隐患判定标准，下列企业所列隐患中，全部属于重大事故隐患的是（ ）。";
      question.options = ["汽车制造厂：喷漆区一处警示标志褪色、一个灭火器临近检验期", "白酒厂：酒库照明不足、个别防护栏杆锈蚀", "煤矿：办公区消防通道标线不清、培训记录填写不规范", "地下铁矿：作业面风量风质不符合标准，且未配齐合格便携式气体检测报警仪和自救器"]; break;
    case "management-auto-q-430":
      question.stem = "某建筑工地基坑区域需要同时设置警告、禁止、指令和提示标志。关于安全标志设置与分类的说法，正确的是（ ）。";
      question.options[0] = "多个安全标志同时设置时，宜按警告、禁止、指令、提示的顺序排列";
      question.explanation = "多个安全标志同时设置时，宜按警告、禁止、指令、提示的顺序，由左向右、由上到下排列，因此A正确。安全标志不能替代隐患治理；“必须佩戴安全帽”属于指令标志；“当心坑洞”属于警告标志，B、C、D错误。"; break;
    case "management-auto-q-437": question.stem = "某危险化学品生产企业以水淹危险化学品库为演练情景，根据需要编制演练脚本，帮助参演人员掌握演练进程和内容。关于演练脚本的说法，正确的是（ ）。"; break;
    case "management-auto-q-442": question.stem = "林某是机加工企业车床操作工，工作时佩戴企业选用的防护眼镜。该防护眼镜按劳动防护用品用途分类属于（ ）。"; break;
    case "management-auto-q-444": question.stem = "某集团下属有工程设计、建筑施工、投资置业和燃煤发电等公司。根据《安全生产责任保险实施办法》，其中应当投保安全生产责任保险的是（ ）。"; break;
    case "management-auto-q-446": question.stem = "某电梯剪切事故故障树中，顶上事件T=A1+A2，A1=B1B2，A2=B3B4。已知B1、B2、B3、B4相互独立，发生概率依次为0.1、0.05、0.05、0.1。顶上事件T发生的概率约为（ ）。"; break;
    case "management-auto-q-449": question.stem = "M省某建筑安装公司在N省承包项目，一名员工持有M省核发且在有效期内的特种作业操作证，现需办理复审。关于其复审的说法，正确的是（ ）。"; break;
    case "management-auto-q-454": question.stem = "重大危险源评价包括辨识以及生产单元、储存单元划分。根据《危险化学品重大危险源辨识》（GB 18218），下列说法错误的是（ ）。"; break;
    case "management-auto-q-455": question.stem = "某日14:10，甲企业发生危险化学品泄漏引发的火灾爆炸事故，造成2人死亡。现场负责人李某联系不上企业负责人，因危险化学品仍持续泄漏，于15:30向属地县级应急管理部门报告。县级部门18:00上报市级部门。根据《生产安全事故报告和调查处理条例》（国务院令第493号）等规定，符合要求的是（ ）。"; break;
    case "management-auto-q-458": question.stem = "某工厂发生火灾事故，立即启动火灾专项应急预案并向政府主管部门上报事故情况。按现行应急预案编制导则，上报事故情况属于专项应急预案的（ ）。"; question.options[2] = "响应启动"; question.explanation = "按现行《生产经营单位生产安全事故应急预案编制导则》，专项应急预案的响应启动内容包括信息上报、响应分级、应急程序启动等，因此应选C。"; break;
    case "management-auto-q-459": question.stem = "王某在东北林区某公司种羊场务工，不慎滑倒并被羊圈杂物刺伤左手，伤口逐渐出现水疱，经医院诊断为疑似职业病。王某最可能患有（ ）。"; question.explanation = "炭疽是由炭疽杆菌引起的人畜共患传染病，牧场工人、屠宰工、兽医等属于职业暴露高风险人群。皮肤炭疽常由破损皮肤感染并出现丘疹、水疱、焦痂和周围水肿，因此应选D。"; break;
    case "management-auto-q-460": question.stem = "某日13时，景区露天玻璃栈道维保员因热射病晕倒并滑下栈道，被三点式安全带悬吊。救援人员处置不当导致安全带脱落，维保员坠亡。根据《生产过程危险和有害因素分类与代码》（GB/T 13861），分类错误的是（ ）。"; question.explanation = "极端高温属于室外作业环境不良；不适用的三点式安全带属于防护缺陷；救援人员培训不到位属于应急管理缺陷，A、B、D分类正确。栈道湿滑属于作业环境因素，不属于物的外形缺陷，因此C分类错误。"; break;
    case "management-auto-q-466": question.stem = "使用个体防护装备是保障从业人员安全健康的重要措施。根据《个体防护装备配备规范 第1部分：总则》（GB 39800.1），关于用人单位配备、培训和使用管理的说法，正确的有（ ）。"; break;
    case "management-auto-q-001":
      question.stem =
        "某企业胶带机运转班长在巡检中发现机尾落料较多，便在胶带机运转时用铁锹清理落料，作业时其衣袖和铁锹一起被卷入皮带造成重伤。事故调查发现，该企业《胶带机运转工操作规程》缺少胶带机运转时禁止清理落料的相关内容。根据危险源在事故发生、发展中的作用，关于运转时清理落料行为的说法，正确的是（ ）。";
      question.explanation =
        "第二类危险源是指导致能量或危险物质约束、限制措施失效的各种因素，广义上包括人的失误、物的故障、环境不良和管理缺陷。题干中缺少“胶带机运转时禁止清理落料”的操作规程，属于管理缺陷，因此该行为涉及第二类危险源，应选 A。";
      question.source = "data/2026安全【管理】SVIP/03-习题精析✿实战特训✿模考通关/01-2026年安全管理-233网校-真题解析班-名师/233-注安管理-真题解析-2019-2025.pdf";
      break;
    case "management-auto-q-075":
      question.answer = ["B", "D", "E"];
      question.explanation =
        "B、D、E 正确。安全带连接器有裂纹属于关键受力部件损坏，应更换；反光警示服非反光条部分破损会影响服装完整性，应更换；防滑靴靴底磨平会明显削弱防滑性能，也应更换。A 错在绝缘手套到期后即使外观完好也不得继续使用，C 错在个别防静电服褪色不能直接推定同批次全部失效。";
      break;
    case "management-auto-q-081":
      question.stem =
        "某肉禽水产多业态集团公司依据有关标准对作业现场存在的各种危险有害因素进行分析和辨识。关于辨识结果的说法，正确的有（ ）。";
      question.options = [
        "家禽屠宰车间内高温属于物的因素",
        "制冷机房的巡检通道狭窄属于环境因素",
        "饲料含水率高的车间内湿度大属于环境因素",
        "氨制冷机房安全警示标志不清晰属于环境因素",
        "水产分割作业位置不符合人体工效学属于管理因素",
      ];
      question.explanation =
        "家禽屠宰车间内高温属于作业环境因素而非物的因素，因此 A 错；制冷机房巡检通道狭窄、车间湿度大均属于环境因素，因此 B、C 对；氨制冷机房安全警示标志不清晰属于物的因素中的标志标识缺陷，因此 D 错；作业位置不符合人体工效学属于环境因素中的其他环境不良，因此 E 错。故应选 B、C。";
      question.source = "data/2026安全【管理】SVIP/01-精华文档✿电子教材✿历年真题/02-历年真题PDF/HQ-注安管理-25年真题.pdf";
      break;
    case "management-auto-q-093":
      question.options = ["安全环保部总经理", "项目管理部总经理", "企业法定代表人", "法律部总经理"];
      question.answer = ["C"];
      question.explanation = "涉及全局性的综合管理制度，应由生产经营单位主要负责人签发。本题对应人员为企业法定代表人，因此选 C。";
      break;
    case "management-auto-q-091":
      question.explanation =
        "按时间阶段划分，事前监督包括安全条件审查、投入使用前审查等；事中监督是生产经营活动进行中的现场检查和执法检查；事后监督是事故调查处理。题干中市应急局对化工厂开展突击安全检查，属于事中监督管理，因此应选 B。";
      break;
    case "management-auto-q-097":
      question.options = [
        "临时用电应设置保护开关，所有的临时用电均应设置接地保护",
        "临时用电线路应采用耐压等级不低于 400V 的绝缘导线",
        "同一区域 3 个以内的移动电动工具可共用一个漏电保护器",
        "临时用电线路经过积水区域如确需接头，应采取相应的保护措施",
      ];
      question.answer = ["A"];
      question.explanation =
        "临时用电应设置保护开关，所有临时用电均应设置接地保护。其余选项中，绝缘导线耐压等级不应低于 500V；移动式电动工器具应逐个配置漏电保护器和电源开关；经过积水区域的临时用电线路不应有接头。";
      break;
    case "management-auto-q-098":
      question.stem =
        "某大型集团公司 EHS 部门对下属企业能引起职业病的生产性粉尘危害因素进行了辨识，关于粉尘危害因素与尘肺病分类的场景描述，正确的是（ ）。";
      question.explanation =
        "煤尘可导致煤工尘肺而非“煤粉肺”，高游离二氧化硅粉尘可导致矽肺而非“石英尘肺”，滑石粉尘可导致滑石尘肺而非“其他尘肺”。只有石棉制品厂工人长期接触石棉纤维粉尘易导致石棉肺，因此应选 C。";
      break;
    case "management-auto-q-101":
      question.explanation =
        "依据《企业安全生产费用提取和使用管理办法》，安全生产费用可用于事故隐患排查整改及从业人员发现、报告事故隐患的奖励支出，因此 B 属于列支范围。A 属于环保改造费用，C 属于常规供配电设备支出，D 属于新建项目的信息化网络建设费用，均不属于本题所指安全生产费用列支范围。";
      question.source =
        "data/2026安全【管理】SVIP/01-精华文档✿电子教材✿历年真题/02-历年真题PDF/2025年注安【管理】优路-2025年真题（完整版）.pdf";
      break;
    case "management-auto-q-105":
      question.stem = "关于盲板抽堵作业要求的说法，正确的是（ ）。";
      question.options = [
        "作业许可审批人可根据作业单位提交的施工图纸和施工方案在作业现场外完成审批工作",
        "作业前办理盲板抽堵作业许可，降低系统管道压力至 0.05MPa，保持作业现场通风良好",
        "作业许可提交给作业许可审批人后，作业审批人 24 小时无回复即视为默认同意作业",
        "距离盲板抽堵作业地点 30m 内不得有动火作业",
      ];
      question.explanation = question.explanation.replace(/距首板抽堵/gu, "距盲板抽堵");
      break;
    case "management-auto-q-107":
      question.explanation =
        "依据《防雷减灾管理办法》和《爆炸和火灾危险场所防雷装置检测技术规范》（GB/T 32937—2016），投入使用后的雷电防护装置应实行定期检测，其中爆炸和火灾危险环境场所至少每半年检测一次。液化石油气储罐区属于易燃易爆场所，因此每年至少检测 2 次，应选 C。";
      break;
    case "management-auto-q-110":
      question.explanation =
        "百分条图主要用于分析各部分占总体的构成比；条图适用于比较不同类别数值大小；散点图用于描述两个变量之间的关系；雷达图更适合多指标综合比较。题干要比较不同年份、不同季节的事故次数，最适宜采用条图，因此应选 B。";
      question.source =
        "data/2026安全【管理】SVIP/01-精华文档✿电子教材✿历年真题/02-历年真题PDF/2025年注安【管理】优路-2025年真题（完整版）.pdf";
      break;
    case "management-auto-q-118":
      question.explanation =
        "事故发生后，事故单位负责人应在 1 小时内向事故发生地县级以上应急管理部门报告。题干中事故发生于 14:05，15:10 才向县应急管理部门报告，已超过法定时限，因此 D 错误。";
      break;
    case "management-auto-q-104":
      question.stem =
        "某酿酒设备制造公司开展企业安全生产费用提取和使用的专项检查，对下属单位的各项安全生产费用使用情况进行了审计。不属于安全生产费用的是（ ）。";
      question.explanation =
        "有限空间配备正压式呼吸器、购置应急救援三脚架以及储气罐检验检测等支出，均属于安全生产费用的使用范围。建设项目安全预评价费用不属于安全生产费用，因此应选 C。";
      break;
    case "management-auto-q-127":
      question.answer = ["D"];
      question.explanation =
        "依据《电梯日常维护保养规则》，紧急电动运行属于半月维护保养项目；消防开关、减速机润滑油属于季度保养项目，电动机与减速机联轴器属于半年度保养项目，因此应选 D。";
      question.source =
        "data/2026安全【管理】SVIP/03-习题精析✿实战特训✿模考通关/01-2026年安全管理-233网校-真题解析班-名师/233-注安管理-真题解析-2019-2025.pdf";
      break;
    case "management-auto-q-129":
      question.explanation =
        "企业安全文化员工层行为指标主要包括安全态度、知识技能、行为习惯和团队合作。四个选项中，知识技能直接属于员工层行为指标，因此应选 A；安全报告更偏向管理活动或管理效果，全员劳动生产率属于经营绩效，企业员工特征也不属于员工层行为指标。";
      break;
    case "management-auto-q-130":
      question.answer = ["A"];
      question.explanation = "“5S”管理中，用完归位属于“整顿”；六面整洁属于“清洁”；保养设备属于“清扫”；区分有用无用属于“整理”。因此应选 A。";
      break;
    case "management-auto-q-133":
      question.explanation =
        "低温、高气压和高温都属于物理性职业病危害因素；金属熔化过程中产生的烟雾属于生产性粉尘或化学性有害因素，不属于物理性职业病危害因素，因此应选 B。";
      break;
    case "management-auto-q-147":
      question.explanation =
        "依据《安全色和安全标志》（GB 2894-2025），黑黄相间条纹用于表示机械运转或移动时容易碰撞的危险部位。红白相间多用于禁止越过或消防设施标识，蓝白相间多用于指令，绿色也不用于此类碰撞警示，因此应选 B。";
      break;
    case "management-auto-q-148":
      question.stem =
        "某食品加工企业为防止粉尘爆炸事故，对任何粉尘爆炸危险的工艺设备采用了泄爆、抑爆、隔爆和抗爆等安全技术措施。该企业防止面粉粉尘爆炸不能单独采用的控爆措施是（ ）。";
      break;
    case "management-auto-q-158":
      question.stem = "某化工企业对一条现有管道进行防锈处理。关于该企业对相关方进行准入管理的做法，错误的是（ ）。";
      question.explanation =
        "生产经营单位应当对承包商、供应商等相关方实施统一的安全协调管理，不能仅在合同中约定“施工单位自行管理现场”后由本单位被动监督，因此错误项是 B。";
      break;
    case "management-auto-q-160":
      question.explanation =
        "危险和有害因素分类中，传感器灵敏度过高可视为设备自身性能缺陷，属于物的因素；安全责任制不完善属于管理因素；玻璃加工车间的反射光属于作业环境中的物理性有害因素。电子围栏缺陷本质上属于设备设施缺陷，应归入物的因素，不属于环境因素，因此错误项是 B。";
      break;
    case "management-auto-q-151":
      question.stem =
        "2025 年 6 月 24 日，某化建公司在化工厂从事检维修作业，木工班班长徐某带领工人何某，登上尚未搭建完成的脚手架开展支撑模板测量作业，测量作业完成后，工人何某为尽快离开作业现场，自行爬下脚手架，不慎坠落受伤。事故发生后，该公司安全管理部门立即开展了事故调查。调查发现徐某在本月 16 日办理了此次作业的高处作业许可，期间因有其他作业，测量作业中断了两天。关于此次事故中高处作业许可管理的说法，正确的是（ ）。";
      break;
    case "management-auto-q-168":
      question.stem =
        "在生产系统的设计过程中，需要考虑能量隔离措施，以避免因能量意外释放触及人体，导致人身伤害事故。根据能量意外释放理论，下列观点中，符合该理论的有（ ）。";
      break;
    case "management-auto-q-153":
      question.stem = "下图所示的安全带类型是（ ）。";
      question.explanation =
        "坠落悬挂安全带用于高处作业人员发生坠落后将其悬挂并制动，图示安全带属于该类型，因此应选 D。围杆作业安全带主要用于杆塔等围杆定位，区域限制安全带用于限制作业人员进入坠落危险区域，缓降装置安全带则用于控制下降速度，均与图示用途不符。";
      break;
    case "management-auto-q-157":
      question.answer = ["D"];
      question.explanation =
        "依据《石油化工企业设计防火标准》（GB 50160）等规范，输送可燃、有毒介质的管道不宜埋地或设在管沟内，因此 A 错；剧毒气体不应直接放空，应送至收集处理装置，因此 B 错；氯气遇水会生成具有腐蚀性的盐酸，因此 C 错。VCM 装置临时停车时排空并惰化处理残余氯气属于合理安全措施，因此应选 D。";
      question.source =
        "data/2026安全【管理】SVIP/03-习题精析✿实战特训✿模考通关/01-2026年安全管理-233网校-真题解析班-名师/233-注安管理-真题解析-2019-2025.pdf";
      break;
    case "management-auto-q-161":
      question.stem =
        "某煤气（主要产品为 CO）公司开展安全验收评价，某安全评价机构核定危险化学品实际存量为 150t（CO 临界量为 20t）、计算出的重大危险源 R 值为 15，计算 R 值的校正系数正确的有（ ）。";
      question.type = "multiple";
      question.answer = ["C", "E"];
      question.explanation =
        "一氧化碳既属于毒性气体，其校正系数 β 需要参与计算；已知 R=150/20×2×α=15，可得 α=1.0，对应厂区边界向外扩展 500m 范围内常住人口 1~29 人，因此正确选项为 C、E。";
      break;
    case "management-auto-q-165":
      question.explanation =
        "年度安全技术措施计划通常分为安全技术措施、卫生技术措施、辅助措施和安全宣传教育措施四类。考核奖惩措施属于企业内部管理和激励约束内容，不属于该计划的项目范围，因此应选 A、B、C、D。";
      break;
    case "management-auto-q-203":
      question.stem =
        "某建筑施工单位所属工地发生一起物体打击事故，事故造成 1 人死亡、6 人受伤、直接经济损失 800 万元、间接经济损失 300 万元。此次事故等级是（ ）。";
      question.explanation =
        "根据《生产安全事故报告和调查处理条例》，造成 1 人死亡的事故属于一般事故。题干给出的直接经济损失 800 万元也未达到较大事故起点，因此应选 B。";
      break;
    case "management-auto-q-209":
      question.explanation =
        "依据《特种设备使用单位落实使用安全主体责任监督管理规定》第九十五条，起重机械使用单位应当建立安全周排查制度，由起重机械安全总监每周至少组织一次风险隐患排查并形成报告，因此应选 C。";
      break;
    case "management-auto-q-171":
    case "management-auto-q-232":
      question.stem =
        "某危险化学品企业在管廊上进行动火作业，作业人员办理了动火证。关于本次动火作业安全管理要求的说法，正确的有（ ）。";
      question.explanation =
        "管廊上动火至少属于一级动火，动火作业中断超过 30 分钟应重新进行气体分析，因此 A 错。特级动火和一级动火证有效期均不应超过 8 小时，因此 B 对。动火点 30 米范围内不得排放可燃气体，因此 C 错。动火点 10 米范围内及其上下方不得同时进行可燃溶剂清洗、喷漆等作业，因此 D 对。氧气瓶与乙炔瓶间距不应小于 5 米，二者与动火点间距均不应小于 10 米，因此 E 错。故选 B、D。";
      question.source =
        "data/2026安全【管理】SVIP/01-精华文档✿电子教材✿历年真题/02-历年真题PDF/2025年注安【管理】优路-2025年真题（完整版）.pdf";
      break;
    case "management-auto-q-261":
      question.explanation =
        "改善车间空气质量应优先从源头控制恶臭散发。原材料实现密闭存放可以直接减少恶臭物质在车间内扩散，因此 C 正确。为工人配口罩属于个体防护，喷洒空气清新剂只是掩盖气味，机械化投料并不能直接解决原料敞开放置导致的空气污染问题，因此 A、B、D 都不能有效改善车间空气质量。";
      break;
    case "management-auto-q-269":
      question.explanation =
        "离心机设置氮气故障联锁停机措施，属于故障一安全设计，可在保护条件失效时自动停机，从源头防止事故发生，因此 A 正确。反应釜车间设置轻质泄压屋顶属于减轻爆炸后果的措施，警示标志属于提示警示措施，设置两个通往地面的梯子属于疏散逃生措施，均不属于防止事故发生的安全技术措施。";
      break;
    case "management-auto-q-259":
      question.stem =
        "A 市某机械加工企业陈某连续从事焊接作业工作 4 年，8 个月后被调至管理部门，现重新回到原岗位从事焊接工作。张某是刚从 B 市调来的低压电工，持有有效的特种作业操作证。关于两人特种作业操作证取证及复审的说法，正确的是（ ）。";
      question.options = [
        "陈某重新上岗前需进行安全技术理论考试",
        "张某应在特种作业操作证到期前 60 日内向 A 市安全生产监督管理部门提出复审申请",
        "陈某特种作业操作证复审应参加不少于 6 学时的安全培训",
        "张某应重新向 A 市安全生产监督管理部门申请低压电工特种作业操作证考试",
      ];
      question.explanation =
        "依据《特种作业人员安全技术培训考核管理规定》，离开特种作业岗位 6 个月以上的人员重新上岗前，应重新进行实际操作考试而非理论考试，因此 A 错；申请复审或者延期复审前，安全培训时间不少于 8 学时，因此 C 错；特种作业操作证在全国范围内有效，不因跨市就业而重新取证，因此 D 错。张某可在期满前 60 日内向原考核发证机关或者从业所在地考核发证机关提出复审申请，因此 B 对。";
      break;
    case "management-auto-q-333":
      question.stem =
        "安全生产管理人员在企业中具有不可替代的重要作用，为员工的生命安全保驾护航。按照有关法律法规，属于其职责的是（ ）。";
      question.explanation =
        "安全生产管理人员的法定职责包括组织开展危险源辨识和评估、督促落实重大危险源安全管理措施，以及组织或者参与本单位应急救援演练，因此 B 正确。A、C、D 所述“组织制定并实施”教育培训计划、规章制度和操作规程，以及保证安全投入有效实施，属于生产经营单位主要负责人职责。";
      break;
    case "management-auto-q-266":
      question.options = [
        "前2年发生了3起重伤事故，总计重伤3人的乙企业",
        "前1年新建了5000m2厂房的甲企业",
        "前1年发生了一起直接经济损失300万元设备事故的丙企业",
        "本年内进行了一条生产线自动化技术提升的丁企业",
      ];
      question.explanation =
        "再次申请原等级时，二级、三级企业只要未发生死亡事故，且未发生总计重伤 5 人及以上或者直接经济损失总计 500 万元及以上的生产安全事故，经确认后可以直接公示公告。新建 5000m2 厂房属于生产条件发生较大变化，不具备直接公示公告条件，因此应选 B。";
      break;
    case "management-auto-q-300":
      question.explanation =
        "镁屑应专门存放，浇铸炉前设置应急储存坑、在半地下水煤气管道排污阀处安装具备远传功能的可燃气体报警仪，均属于针对隐患的有效整改。粗铁破碎机检修时仅“断电上锁”仍不完整，还应执行挂牌等检修控制要求，因此 B 的整改措施表述不完整，属于错误项。";
      break;
    case "management-auto-q-309":
      question.explanation =
        "“整顿”强调对整理后保留下来的物品实施定置、定位、定量管理，使取放快捷、状态有序。工人图方便把游标卡尺随手放在车床上，以及辅助台上混放各种型号铣刀，都说明定置定位不到位，属于整顿问题，因此应选 B、C。A 属于清扫不到位，D 属于整理或现场秩序问题，E 属于设备维护保养问题。";
      break;
    case "management-auto-q-310":
      question.answer = ["A", "D", "E"];
      question.explanation =
        "乙公司作为承包商，直接承担检维修作业实施责任。进入内浮顶储罐作业应使用防爆工具，气体检测分析合格后方可安排人员进入受限空间，因此 A、D 正确；作业内容发生重大变化而施工方案未及时变更时，应立即停止作业，因此 E 也属于承包商主体责任。B 属于作业票审批控制要求，C 不是该类检修作业的法定报备要求。";
      break;
    case "management-auto-q-314":
      question.type = "multiple";
      question.answer = ["B", "E"];
      question.explanation =
        "“十四五”国家安全生产规划中的绝对指标包括生产安全事故死亡人数下降 15% 和重特大生产安全事故起数下降 20%，因此应选 B、E。单位国内生产总值生产安全事故死亡率、营运车辆事故死亡人数和煤矿百万吨死亡率等属于相对指标或其他口径指标，不属于本题所问绝对指标。";
      break;
    case "management-auto-q-362":
      question.explanation =
        "提高灰斗设计荷载、设置高料位联锁、对钢结构焊接部位开展无损检测并修复缺陷，都是直接降低事故发生概率的工程技术措施。辨识异常工况下的安全风险属于风险识别与管理活动，本质上是安全管理措施而非防止事故发生的安全技术措施，因此应选 B。";
      break;
    case "management-auto-q-368":
      question.stem = "某企业按照安全系统工程和人机工程原理编制了 4 类安全生产规则制度，属于综合安全管理制度的是（ ）。";
      question.explanation =
        "综合安全管理制度主要面向企业整体安全运行，涵盖安全投入、设施、责任、检查、档案等综合管理内容。安全教育培训制度属于人员管理制度，安全操作规程属于操作行为制度，安全标志管理制度偏向现场管理制度；安全设施和费用管理制度属于综合安全管理制度，因此应选 C。";
      break;
    case "management-auto-q-395":
      question.explanation =
        "高处动火作业需要采用不燃、阻燃的接火措施，灭火毯可以有效承接熔渣火星并阻止引燃下方可燃物。蓬布、绝缘垫木、聚氨酯保温板本身均存在可燃风险，不能作为可靠接火措施，因此应选 C。";
      break;
    case "management-auto-q-396":
      question.stem =
        "某电解铝厂变电所由整流所、13.8kV 配电室等组成，该变电所配备有绝缘手套、绝缘靴、绝缘杆等电气安全防护用品。关于绝缘手套的维护、更换及检验的说法，错误的是（ ）。";
      question.explanation =
        "13.8kV 场所使用的绝缘手套应满足相应电压等级要求。3 级绝缘手套适用于更高电压等级，若更换成仅适用于 10kV 的 2 级绝缘手套，将不能满足 13.8kV 使用要求，因此 B 错误。其余关于专用存放、避免接触油酸碱和每 6 个月检验一次的要求均正确。";
      break;
    case "management-auto-q-398":
      question.explanation =
        "个体防护装备管理制度应明确岗位配备标准、高处作业等专项配备要求，以及到期报废规则，因此 A、B、C 正确。公用防护装备应由车间或班组统一管理，不能委托个人私自保管；劳务派遣工的个体防护装备应由用工单位配备，所以 D、E 错误。";
      break;
    case "management-auto-q-393":
      question.explanation =
        "根据《危险化学品建设项目安全监督管理办法》，危险化学品建设项目的安全设施设计应由具备石油化工医药行业相应资质的设计单位承担，因此 C 正确。A 错在安全设施设计审查权限并非题干所述甲市部门；B 错在应在形成安全设施设计后报审，而不是初步设计刚开始时申请；D 错在申请材料不要求建设单位运营资质证明。";
      break;
    case "management-auto-q-399":
      question.explanation =
        "《企业安全生产费用提取和使用管理办法》（财资〔2022〕136 号）新增纳入适用范围的行业包括电力生产与供应、民用爆炸品生产，因此应选 B、D。烟花爆竹生产和交通运输此前已纳入适用范围，武器装备研制生产与试验不属于本题所指新增行业。";
      break;
    case "management-auto-q-448":
      question.stem =
        "某市应急管理局在对一金属冶炼扩建项目进行检查时发现，该建设项目竣工投入生产前，安全设施未经验收合格。市应急管理局依法作出的处理，下列正确的是（ ）。";
      question.options = ["责令停业整顿", "边施工边整改", "处该企业 60 万元罚款", "处企业直接负责人 6 万元罚款"];
      question.explanation =
        "金属冶炼建设项目投入生产前安全设施未经验收合格的，应责令停止建设或者停产停业整顿、限期改正，因此 A 正确。只有逾期未改正时，才可对企业处 50 万元以上 100 万元以下罚款，并对直接责任人员处 2 万元以上 5 万元以下罚款，所以 C、D 均不符合本题情形；B“边施工边整改”也无法定依据。";
      break;
    case "management-auto-q-467":
      question.explanation =
        "商贸公司经理甲属于一般生产经营单位主要负责人，初次安全培训内容包括安全生产管理基础知识和安全生产技术，培训时间不少于 32 学时，因此 A、C 正确。石油冶炼企业属于危险物品生产单位，乙的初次培训时长高于 16 学时；“安全生产新知识、新技术”属于再培训内容，D 所述“重新培训取得资格证书”也不符合题意。";
      break;
    case "management-auto-q-528":
      question.stem =
        "某食品加工企业为增加产能，将原有高压蒸锅（压力容器）内部构件进行改造，增加额定蒸发量。设备安装调试结束后，生产车间便开始投入正常生产。关于变更要求的说法，错误的是（ ）。";
      question.explanation =
        "压力容器改造后，如需变更使用登记，应办理使用登记变更手续后方可继续使用，不需要重新办理新的使用登记手续，因此错误项是 C。应当使用取得许可生产的设备、制定相应操作规程，以及按规定办理使用登记变更手续，均属于正确要求。";
      break;
    case "management-auto-q-544":
      question.explanation =
        "安全措施分类中，有毒有害厂房安装轴流风机属于卫生技术措施，购置教育测试仪器属于安全宣传教育措施，因此 B、D 正确。高压氧仓急救装置和尘毒作业淋浴室都属于辅助措施，所以 A、C 错；E 虽然分类表述本身成立，但并非题干列示的该企业已采取措施，不属于本题应选项。";
      break;
    case "management-auto-q-508":
      question.explanation =
        "题干要求判断“错误的安全整改措施”。A 项完善预案并加强心肺复苏演练，属于事故发生后的应急准备和处置能力提升，不是针对本次中毒事故根因的直接整改。B、C、D 分别从有毒气体监测、防停电通风和员工防护教育入手，均属于能够降低同类事故再次发生概率的整改措施。";
      break;
    case "management-auto-q-608":
      question.explanation =
        "事故直接原因是人的不安全行为和物的不安全状态。刘某违章指挥、李某未系安全带、塔吊起升高度不足并撞击脚手架，都属于直接原因；项目部未培训、未巡查属于间接原因。因此把“李某未系安全带”认定为间接原因是错误的，应选 B。";
      break;
    case "management-auto-q-138":
      question.answer = ["B"];
      question.explanation =
        "危险指数方法强调补偿系数对最终评价结果的修正作用。A、C 错在将危险性简单归结为物质系数或“物质系数+补偿系数”的表述；危险性的大小取决于物质系数和工艺系数等综合因素。D 错在危险指数法并不适用于物质系数较低的装置。";
      break;
    case "management-auto-q-146":
      question.explanation =
        "道化火灾、爆炸危险指数法中，应先确定最大可能停工天数（MPDO），再据此估算停产损失（BI）。C 项把这两个步骤的先后关系颠倒了，因此错误。其余选项关于物质系数、工艺危险系数和危害系数的先后关系基本正确。";
      break;
    case "management-auto-q-141":
      question.answer = ["A"];
      question.stem =
        "甲、乙、丙、丁 4 名安全评价人员对某化工企业新建的生产车间进行安全评价，在选择适用的评价方法时，各自表达了自己的观点。4 名安全评价人员表达的观点中，错误的是（ ）。";
      question.options = [
        "乙认为采用 FMEA 方法可以识别出化工厂车间的故障模式，计算出 PRN，属于一种推理过程评价方法",
        "甲认为采用安全检查表法可以辨识出车间存在的隐患和隐患程度，属于一种量化程度评价方法",
        "丙认为采用事故致因因素评价方法由事故推论出最基本的危险因素方法，属于一种为达到预期目标的评价方法",
        "丁认为 PHA 方法可以分析系统中存在的潜在风险和可能发生的事故，属于量化程度评价方法",
      ];
      question.explanation =
        "FMEA 可以识别故障模式并计算风险优先数，但它通常归入按评价结果量化程度分类的方法，而不是按推理过程分类的方法，因此 A 错误。安全检查表法可用于辨识隐患，PHA 也可分析系统潜在危险及可能事故，C 所述事故致因因素评价方法按评价目的分类也成立。";
      break;
    case "management-auto-q-137":
      question.answer = ["D"];
      question.explanation =
        "乙公司作为发包方，对工程承包单位的安全生产工作负有统一协调、管理责任，因此 A 错。甲公司作为装修改造工程的承包单位，负责现场安全管理，因此 B 错。徐某作为雇主并非本题所述直接责任主体，C 错。李某、陈某在发现现场脚手架后直接使用，导致伤害后果发生，应承担主要责任，因此选 D。";
      question.source =
        "data/2026安全【管理】SVIP/03-习题精析✿实战特训✿模考通关/01-2026年安全管理-233网校-真题解析班-名师/233-注安管理-真题解析-2019-2025.pdf";
      break;
    case "management-auto-q-178":
      question.stem =
        "中国民用航空局规定，自 2025 年 6 月份起，禁止旅客携带无 3C 标识的充电宝乘坐境内航班。根据预防原理及原则，该规定遵循的原则是（ ）。";
      question.explanation =
        "事故的发生是多种因素相互作用、连续发展的结果。无 3C 标识的充电宝属于可能诱发事故的因素，对其禁止携带上机，是在切断致因链条，体现了因果关系原则。";
      break;
    case "management-auto-q-462":
      question.explanation =
        "2022 年开展的第 21 个“安全生产月”活动主题为“遵守安全生产法，当好第一责任人”，因此正确答案为 B。";
      break;
    case "management-auto-q-548":
      question.answer = ["B", "C", "D", "E"];
      question.explanation =
        "“5S”包括整理、整顿、清扫、清洁、素养。与员工签订安全生产责任状、组织开展班前班后会属于“素养”；完善安全标志标识属于“整顿”；组织员工对生产现场环境整理属于“整理”。组织制定设备操作规程不属于本题所述 5S 现场管理内容，因此应选 B、C、D、E。";
      break;
    case "management-auto-q-740":
      question.stem =
        "某集团公司为加强安全生产管理，在基层全面推进双重预防机制建设工作，公司下属工厂从总平面布置、道路运输、生产车间、安全管理组织等方面进行了危险源辨识。根据《生产过程危险和有害因素分类与代码》（GB/T 13861），关于工厂危险有害因素分类的说法，正确的是（ ）。";
      question.options = [
        "管理人员指挥失误属于管理因素",
        "车间疏散通道、安全出口设计缺陷属于室内作业场所环境不良",
        "夏季温度高，员工室外作业容易中暑，属于综合性作业场所环境不良",
        "运输车辆集中时段进出工厂，导致交通不畅属于室外作业场所环境不良",
      ];
      question.explanation =
        "按照《生产过程危险和有害因素分类与代码》，管理人员指挥失误属于人的行为性危险有害因素，不属于管理因素，因此 A 错；车间疏散通道、安全出口设计缺陷属于室内作业场所环境不良，因此 B 对；夏季高温导致中暑应归入室外作业场所环境不良，而不是“综合性作业环境不良”，因此 C 错；车辆进出拥堵本身不属于该分类中的危险有害因素，因此 D 也错。故应选 B。";
      break;
    case "management-auto-q-768":
      question.stem =
        "建筑施工单位在基坑开挖过程中，有土石方坍塌和支撑失稳高支模坍塌两种事故类型，其中土石方坍塌包括基坑坍塌、钻孔桩坍塌等造成的人员掩埋、物体打击、触电、透水、窒息等伤害。该施工单位针对防止土石方坍塌事故制定了专项应急预案。下列关于专项应急预案说法中，错误的是（ ）。";
      question.options = [
        "应说明专项应急预案适用范围，以及与综合应急预案的关系",
        "响应启动应包括应急会议召开、资源协调，但不包括后勤及财力保障工作",
        "针对可能发生的事故危险、危害程度和影响范围，明确应急处置指导原则，制定相应的应急处置措施",
        "应急组织结构可以设置相应的应急工作小组，各小组具体构成、职责分工及行动任务建议以工作方案的形式作为附件",
      ];
      break;
    case "management-auto-q-556":
      question.options = question.options.map((option) =>
        option === "型式选o，设备保护等级选Ma 网校" ? "型式选o，设备保护等级选Ma" : option,
      );
      break;
    case "management-auto-q-648":
      question.options = question.options.map((option) => {
        if (option === "设计万吨/年地下石膏矿建设项目") {
          return "设计100万吨/年地下石膏矿建设项目";
        }
        if (option === "设计总坝高100m的尾矿库建设项目 网校") {
          return "设计总坝高100m的尾矿库建设项目";
        }
        return option;
      });
      break;
    case "management-auto-q-649":
      question.stem = "某企业因产能扩大，在原危险化学品库房（独立建筑物）中间设置一道防火墙，将原库房分成1#、2#危险化学品库房。1#库房存放乙醇250t（β1=1，临界量500t）、乙炔5t（β2=1.5，临界量1t）；2#库房存放过氧乙酸25t（β3=1.5，临界量10t）、发烟硝酸10t（β4=1，临界量20t）。暴露人员校正系数α=2。根据《危险化学品重大危险源辨识》（GB 18218），对两个库房进行危险源辨识和评价，正确的有（ ）。";
      break;
    case "technology-auto-q-214":
      question.explanation =
        "氢气的最小点火能极低，明显低于甲烷，因此 C 正确。氢气爆炸极限范围虽大，但仍小于乙炔；氢气燃点高于硫化氢；氢气爆炸下限约为 4%，也高于汽油蒸气的爆炸下限，因此 A、B、D 均错误。";
      break;
    case "technology-auto-q-092":
      question.explanation =
        "机械运行状态的颜色标识中，红色表示危险或紧急停机，黄色表示注意、警告或异常，蓝色多用于必须遵守的指令，绿色表示正常或安全状态。因此黄色对应异常情况，应选 B。";
      break;
    case "technology-auto-q-093":
      question.explanation =
        "切削机床的运动部件在有限滑轨内运行或有明确行程要求时，应设置限位装置，防止超程碰撞、脱轨或挤压伤害，因此应选 C。隔离、平衡和缓冲装置都不能替代行程控制功能。";
      break;
    case "technology-auto-q-113":
      question.explanation =
        "并非所有爆炸都会同时产生高温、强光和毒气，但无论是物理爆炸还是化学爆炸，通常都会产生冲击波和机械破坏作用，可能造成人员伤亡，因此只有 B 正确。A、C、D 都把并非必然出现的后果绝对化了。";
      break;
    case "technology-auto-q-125":
      question.explanation =
        "能力主要受感觉、知觉、观察力、注意力、记忆力、思维想象力和操作能力等因素影响。四个选项中，免疫力几乎不属于影响能力的直接心理特性因素，因此应选 B。";
      break;
    case "technology-auto-q-115":
      question.explanation =
        "易燃、易爆液化气体等危险物品严禁使用叉车、铲车、翻斗车搬运，因此 D 的说法错误。装卸前对运输工具进行通风清扫、装卸时不得与普通货物混放，以及运输强氧化剂时需采取可靠安全措施，均属于正确要求。";
      break;
    case "technology-auto-q-126":
      question.explanation =
        "当事故现场毒性气体浓度较高，且可能伴随缺氧时，应选用与环境空气隔绝的呼吸防护用品，因此 A 正确。双罐式防毒口罩、头罩式过滤面具和导管式过滤面罩都不适用于本题所述救援场景。";
      break;
    case "technology-auto-q-130":
      question.explanation =
        "按锅炉蒸汽参数分类，出口蒸汽压力一般在 11.8～14.7 MPa 范围内的蒸汽锅炉属于超高压锅炉。题干给出的 13.7 MPa 落在该区间内，因此应选 D。";
      break;
    case "technology-auto-q-145":
      question.explanation =
        "办公室属于视觉作业较均匀、通常可只设置一般照明的典型场所，因此应选 C。机加车间、展览厅和计算机房往往还需要结合作业或展示要求设置局部照明或混合照明，不宜仅靠一般照明。";
      break;
    case "technology-auto-q-162":
      question.stem = "关于砂轮机各组成部分安全技术要求的说法，正确的有（ ）。";
      question.options = [
        "经第一次修整的砂轮可以不作平衡试验",
        "砂轮防护罩总开口角度应不大于 60°",
        "砂轮主轴端部螺纹旋向应与其工作旋向相反",
        "托架与砂轮圆周表面间隙应小于 3mm",
        "一般用途砂轮与卡盘的直径比应大于 3/5",
      ];
      break;
    case "technology-auto-q-163":
      question.stem = "关于带锯机安全技术要求的说法，正确的有（ ）。";
      question.options = [
        "带锯条的锯齿应锋利，锯齿深度应不超过锯条宽度的 1/4",
        "锯条焊段数应不超过 3 段，接头厚度应略大于锯条厚度",
        "上锯轮的机动升降机构应与带锯机启动操纵机构联锁",
        "空载运行条件下带锯机产生的噪声声压级应不超过 90 dB(A)",
        "上锯轮处于任何位置，防护罩应能罩住锯轮 1/2 以上表面",
      ];
      break;
    case "technology-auto-q-164":
      question.stem = "三相鼠笼异步电动机在爆炸危险环境 1 区使用时，可选择的防爆电气设备型式有（ ）。";
      question.explanation =
        "本题多套题源的答案均指向 C、D。三相鼠笼异步电动机在爆炸危险环境 1 区可选隔爆型和正压型；无火花型（n）设备强调正常条件下不产生点燃作用，通常不作为本题所述 1 区场景的选用型式，因此 E 不选。故本题按题源结论应选 C、D。";
      break;
    case "technology-auto-q-171":
      question.explanation =
        "危险化学品分库存放应遵循性质相容原则。氧化性与还原性、酸与碱均应分开存放，氢气钢瓶可与惰性气体氮气分开规范存放而不构成禁配，因此 A、B、C、D 正确；一氧化氮具有氧化性，甲烷为易燃气体，二者不得混存，所以 E 错误。";
      break;
    case "technology-auto-q-217":
      question.explanation =
        "三异丁基铝遇空气易自燃，分装时应采取密闭、充氮等隔绝空气的措施，并加强密封点检测。此类作业应避免空气倒灌，通常采用正压惰性气体保护而不是负压操作，因此错误项是 B。";
      break;
    case "technology-auto-q-220":
      question.stem =
        "化学品安全技术说明书为下游用户传递基本危害信息，同时也向公共机构、服务机构及其他相关方提供信息。关于化学品安全技术说明书主要用途的说法，错误的是（ ）。";
      question.explanation =
        "化学品安全技术说明书是化学品安全生产、安全流通和安全使用的指导性文件，可为危害预防措施设计提供技术依据，也可作为下游企业安全教育和应急人员处置作业的技术指南。B 将其表述为“上游企业制造和安全管理的指导文件”不符合本题考查的主要用途，因此错误项是 B。";
      break;
    case "technology-auto-q-229":
      question.stem =
        "燃气管道（GB1 级）依据设计压力，分为高压燃气管道、次高压燃气管道和中压燃气管道。某公用燃气管道设计压力为 0.4 MPa，设计温度为 -19℃~40℃。根据《压力管道定期检验规则——公用管道》（TSG D7004），该管道属于（ ）。";
      question.explanation =
        "按燃气管道设计压力分类，0.4 MPa 属于次高压燃气管道范围。结合《压力管道定期检验规则——公用管道》（TSG D7004）的公用燃气管道分级，本题对应 IV 级次高压燃气管道，因此应选 D。";
      break;
    case "technology-auto-q-245":
      question.stem =
        "电力线路接头接触不良或松脱，会增大接触电阻，使接头过热而导致绝缘强度降低，还可能产生火花，严重时会酿成火灾和触电事故。因此，导线连接必须牢固可靠。下列对同材质同截面导线接头的安全要求中，正确的是（ ）。";
      question.explanation =
        "导线连接处的力学强度原则上不得低于原导线力学强度的 80%，因此 C 正确。接头绝缘强度不得低于原导线绝缘强度，A 将其降为 80% 错误；接头部位电阻不得大于原导线电阻的 1.2 倍，B 表述为 80% 错误；环氧树脂浇注多用于 10kV 及以下中间接头，D 错误。";
      break;
    case "technology-auto-q-257":
      question.explanation =
        "移动式压力容器装卸用管应定期检验，其中耐压试验至少每年进行 1 次，因此 C 正确。液面计对照表并非题干所述必须随车携带内容，装卸后紧急切断阀不应保持开启状态，装卸过程中也不得随意使用随车自带装卸用管进行充装。";
      break;
    case "technology-auto-q-104":
      question.explanation =
        "双重绝缘由工作绝缘和保护绝缘共同构成，而加强绝缘是能够达到与双重绝缘相同防电击水平的单一绝缘，因此应选 C。工作绝缘、绕组绝缘和保护绝缘都只是其中某一部分，不能单独等同于双重绝缘。";
      break;
    case "technology-auto-q-237":
      question.explanation =
        "电流通过人体造成局部组织灼伤属于电流灼伤，因此 A 正确。手部触电后留下灼痕更符合电烙印而不是皮肤金属化，因此 B 错；电弧使金属微粒渗入皮肤属于皮肤金属化而非电烙印，因此 C 错；触电后被弹开碰伤属于触电导致的继发伤害，不属于电气机械性伤害，因此 D 错。";
      break;
    case "technology-auto-q-243":
      question.explanation =
        "抗静电添加剂主要适用于易产生静电的高绝缘体材料，而不是导体，因此 A 的说法错误。导体上的静电通常通过接地消除，静电消除器多用于非导体，增湿法也不适合高温绝缘体场景，因此 B、C、D 的表述均正确。";
      break;
    case "technology-auto-q-270":
      question.explanation =
        "对于设在户外地坪上、介质重于空气的固定式贮罐，贮罐内液面以上空间通常划为 0 区，地坪下堤内罐外沟内等不利通风处可划为 1 区，罐体外壁周围及罐体外壁至堤的范围可划为 2 区，因此 A、B、D、E 正确。呼吸口周围 1.5m 半径范围应划为 1 区而非 0 区，所以 C 错。";
      break;
    case "technology-auto-q-273":
      question.explanation =
        "机械制造厂区中，主要生产区、主要仓库区和主要动力区的道路应采用环形布置，以满足运输、检修和消防通行要求，因此应选 A、C、E。厂区主干道不必一律按环形设置，主要车间内通道也不属于本题所指厂区道路。";
      break;
    case "technology-auto-q-314":
      question.explanation =
        "尾部烟道二次燃烧通常发生在停炉后不久。其原因是停炉前燃烧不完全产生的可燃沉积物留在尾部烟道和受热面上，停炉后在一定温度和供氧条件下容易被点燃，因此 D 正确。A、B、C 都不是该现象的典型发生条件。";
      break;
    case "technology-auto-q-331":
      question.explanation =
        "依据《化学品安全标签编写规定》，化学品危险性说明应位于信号词下方，因此 B 的做法不符合要求。化学品标识通常位于安全标签上方，危险组分较多时可按规定选取主要组分列示，信号词位于化学品名称下方，因此 A、C、D 均可接受。";
      break;
    case "technology-auto-q-442":
      question.explanation =
        "可燃气体危险度按 H=(爆炸上限-爆炸下限)/爆炸下限 计算。本题 H=(44%-4%)/4%=10，因此应选 C。";
      break;
    case "technology-auto-q-433":
      question.explanation =
        "露天工作的桥架式或门式起重机可能受突发强风影响而沿轨道滑行，甚至撞毁轨道端部止挡，造成脱轨或跌落。夹轨钳、锚定装置和铁鞋均用于防止起重机在风力作用下滑移，属于抗风防滑装置，因此选B。";
      break;
    case "technology-auto-q-437":
      question.options[3] = "接地体上端应埋入地表面下，深度不应小于0.4m";
      break;
    case "technology-auto-q-438":
      question.stem =
        "圆锯机是以圆锯片对木材进行锯切加工的机械设备。锯片的切割伤害、木材的反弹抛射打击伤害是主要危险。手动进料圆锯机必须安装分料刀，分料刀应设置在出料端，以减少木材对锯片的挤压，防止木材反弹。关于分料刀安全要求的说法，正确的是（ ）。";
      break;
    case "technology-auto-q-440":
      question.stem =
        "电火花是电极之间的击穿放电呈现出的现象，其电弧温度高达8000℃，能使金属熔化、飞溅，构成二次引燃源。电火花可分为工作火花和事故火花。下列电火花中，属于事故火花的是（ ）。";
      break;
    case "technology-auto-q-446":
      question.stem =
        "机械产品设计应考虑维修性，以确保机械产品一旦出现故障时易发现、易检修。下列机械产品设计要求中，不属于维修性考虑的是（ ）。";
      break;
    case "technology-auto-q-447":
      question.stem = "依据《危险化学品安全管理条例》，下列剧毒化学品经营企业的行为中，正确的是（ ）。";
      break;
    case "technology-auto-q-466":
      question.explanation =
        "四个选项中，只有硫化氢同时具有可燃、爆炸和毒害危险特性，因此应选 B。氢气虽然可燃可爆，但无毒；光气有剧毒但不燃；硝酸属于强氧化性助燃物，本身不属于可燃物。";
      break;
    case "technology-auto-q-453":
      question.stem =
        "按照在生产流程中的作用，压力容器可分为反应压力容器、换热压力容器、分离压力容器和储存压力容器四类。下列容器中，属于反应压力容器的是（ ）。";
      break;
    case "technology-auto-q-457":
      question.options[1] = "对于恒定功率负载，电压过低，工作电流变小，发热增加，可能导致危险温度";
      question.options[2] = "对于恒定功率负载，电压过高，工作电流变大，发热增加，可能导致危险温度";
      break;
    case "technology-auto-q-459":
      question.explanation =
        "消防灭火器用气瓶、家用液化石油气钢瓶和车用压缩天然气气瓶分别属于消防灭火用气瓶、燃气气瓶和车用气瓶，应按照气瓶管理。公交车加气站的瓶式压力容器属于固定式压力容器，不属于气瓶，因此选B。";
      break;
    case "technology-auto-q-463":
      question.options = [
        "盛装压缩气体气瓶的公称工作压力，是指在基准温度（20℃）下，瓶内气体达到完全均匀状态时的限定（充）压力",
        "盛装高压液化气体气瓶的公称工作压力，是指温度为60℃时瓶内气体压力的下限值",
        "盛装溶解气体气瓶的公称工作压力，是指瓶内气体达到化学、热量以及扩散平衡条件下的静置压力（15℃）",
        "低温绝热气瓶的公称工作压力，是指在气瓶正常工作状态下，内胆顶部气相空间可能达到的最高压力",
      ];
      break;
    case "technology-auto-q-468":
      question.explanation =
        "多用干粉也称ABC干粉，包括磷酸铵盐干粉、聚磷酸铵干粉等，适用于扑救一般固体、可燃液体、可燃气体和带电设备火灾，但不能扑救镁粉等轻金属火灾，因此选A。";
      break;
    case "technology-auto-q-470":
      question.options[3] = "任何情况下叉车都不得叉装重量不明的物件";
      break;
    case "technology-auto-q-359":
      question.stem =
        "根据《民用爆破器材工程设计安全规范》（GB 50089-2007），民用爆炸危险品应采用专用运输工具进行运输，以保证运输环节的安全。根据该标准，下列专用运输工具中，符合民用爆炸危险品短途运输安全要求的是（ ）。";
      break;
    case "technology-auto-q-362":
      question.explanation =
        "危险性建筑物采暖系统设计应避免形成粉尘积聚和高温引燃条件，散热器不得装在壁龛内，因此 C 的说法错误。其余关于不采用带肋散热器、散热器颜色应便于发现积尘，以及热源管道入口和换热装置不设在危险工作间的要求，均符合规范。";
      break;
    case "technology-auto-q-253":
      question.explanation =
        "影响血液携氧能力、导致血液窒息的典型毒物是一氧化碳，而不是硫化氢。硫化氢主要抑制细胞呼吸酶系统，导致细胞内窒息，因此 B 的表述错误。其余选项所述危害与相应毒物基本对应。";
      break;
    case "technology-auto-q-328":
      question.explanation =
        "铝粉、镁粉、亚麻粉、玉米淀粉等粉尘在空气中分散后，与氧气发生快速氧化反应并释放大量能量，属于化学爆炸；从爆炸反应形态看，粉尘云与空气混合后实质表现为气相爆炸，因此应选 A。";
      break;
    case "technology-auto-q-579":
      question.explanation =
        "爆炸性粉尘环境中，料斗内部在正常运行时长期或频繁存在可燃性粉尘云，属于 20 区。21 区通常指正常运行时可能偶尔出现粉尘云的区域，22 区则是仅在异常情况下短时出现，因此应选 D。";
      break;
    case "technology-auto-q-586":
      question.explanation =
        "桥式起重机吊运钢水包时，应采用固定式龙门钩等专用吊具，保证高温熔融金属吊运过程中的稳定性和防脱钩安全，因此应选 A。夹具吊钩、万向吊钩和 C 型吊钩都不适用于本题所述钢水包吊运场景。";
      break;
    case "technology-auto-q-596":
      question.explanation =
        "皮肤金属化是电弧高温使金属熔化、气化后，细小金属微粒渗入皮肤表层造成的电伤，因此与电弧直接相关，应选 A。电气机械性伤害多为跌倒、碰撞等继发伤害，电流灼伤和电烙印的形成机理也不同于本题所述。";
      break;
    case "technology-auto-q-598":
      question.explanation =
        "钢制无缝气瓶定期检验项目包括重量和容积测定，因此 A 正确。固定装置检查主要见于车用或成套安装场景，静态蒸发率检测对应低温绝热气瓶；气瓶壁厚测定也不是本题所列钢制无缝气瓶的常规定期检验对应项。";
      break;
    case "technology-auto-q-493":
      question.explanation =
        "根据《机械工业职业安全卫生设计规范》（JBJ 18），中型机床之间操作面间距应不小于 1.3m，因此应选 B。";
      break;
    case "technology-auto-q-508":
      question.explanation =
        "储罐清洗作业中人员突然晕倒且原因不明，营救人员应优先选用隔绝式呼吸防护用品，避免因环境缺氧或毒物种类不明造成二次伤害。四个选项中，自给式氧气呼吸器最符合要求，因此应选 A。";
      break;
    case "technology-auto-q-003":
      question.stem = "机械保护装置通过自身结构功能限制或防止机器产生危险，常见类型包括联锁装置、双手操纵装置、能动装置和限制装置等。关于各种保护装置功能的说法，正确的是（ ）。";
      question.options[1] = "能动装置与启动控制一起使用，在不连续操作时可使机器执行预定功能";
      question.options[3] = "行程限制装置不与机器控制系统同时作用，以控制机器元件作有限运动";
      break;
    case "technology-auto-q-091":
      question.explanation = "同步带等传动部件在正常运行期间无需人员频繁进入，优先采用固定式防护装置，将危险区持续隔离并防止人员跨越或身体部位卷入，因此选C。只有确需频繁进入危险区时，才考虑活动式或联锁式防护装置。";
      break;
    case "technology-auto-q-009":
      question.stem = "根据《场（厂）内专用机动车辆安全技术规程》（TSG 81—2022），观光车行驶坡度不大于10%时，允许的最大行驶速度是（ ）。";
      break;
    case "technology-auto-q-099":
      question.explanation = "锻造生产的典型伤害包括机械伤害、火灾爆炸和灼烫。红热坯料、锻件及飞溅氧化皮可造成灼烫，并可能引燃可燃物；锻件、工具飞出或模具、冲头崩裂可造成机械伤害。振动主要导致职业危害或设备风险，不能据此直接推出高处坠落，因此错误的是C。";
      break;
    case "technology-auto-q-016":
      question.stem = "电气设备按防止间接接触电击的条件分类，具有双重绝缘的电气设备属于Ⅱ类设备。下列绝缘类型中，与双重绝缘具有相同绝缘水平的是（ ）。";
      break;
    case "technology-auto-q-020":
      question.stem = "关于危险化学品爆炸危害的说法，正确的是（ ）。";
      break;
    case "technology-auto-q-111":
      question.options[2] = "燃烧特性取决于火药有效成分的燃烧药量及其燃烧热";
      break;
    case "technology-auto-q-022":
      question.stem = "根据《危险货物运输包装通用技术条件》（GB 12463），下列危险货物与包装类别的对应关系中，正确的是（ ）。";
      break;
    case "technology-auto-q-115":
      question.explanation = "易燃、易爆液化气体等危险物品严禁使用翻斗车搬运，因此D错误。危险化学品装卸前应视情况对运输工具通风、清扫，装卸时不得与普通货物混放。强氧化剂原则上不应直接使用铁质底板车辆运输；采取可靠隔离衬垫等措施避免货物与铁质底板接触后，方可满足防摩擦撞击要求。";
      break;
    case "technology-auto-q-032":
      question.stem = "根据《金属和合金的腐蚀 术语》（GB/T 10123—2022），关于腐蚀对金属影响的说法，错误的是（ ）。";
      break;
    case "technology-auto-q-124":
      question.explanation = "隔离变压器二次侧线路过长会增加分布电容和绝缘故障风险，降低安全可靠性；线路较长时应装设绝缘监视装置，不是过电压监测装置。被隔离回路不得与其他回路或大地连接，但同一隔离回路中各设备可触及金属外壳之间应进行不接地的等电位联结，因此选D。";
      break;
    case "technology-auto-q-544":
      question.explanation =
        "锅炉防爆门主要用于在炉膛或烟道发生再次燃烧、压力骤增时及时泄压，因此通常装设在炉膛和烟道的易爆部位，应选 D。过热器、再热器、高压蒸汽管道以及锅筒锅壳都不是本题所问防爆门的典型安装位置。";
      break;
    case "technology-auto-q-502":
      question.explanation =
        "手动进料圆锯机为防止木材夹锯、回弹和抛射伤人，必须装设分料刀，因此应选 D。止逆器、压料装置和侧向挡板更常见于自动进料圆锯机或其他对应防护场景，不是本题所问“必须装设”的关键装置。";
      break;
    case "technology-auto-q-538":
      question.explanation =
        "司索工若仅凭目测估算吊物质量，为留出安全余量，所选吊具承载能力应在估算质量基础上增加 20%，即不少于 1.2 倍，因此应选 D。1.1 倍安全裕度不足，1.3 倍和 1.5 倍虽更保守，但不符合本题标准要求。";
      break;
    case "technology-auto-q-541":
      question.explanation =
        "对存在材质劣化倾向的压力容器进行检验时，必须检测硬度，必要时再结合金相分析判断材料劣化程度，因此应选 B。强度、刚度和密度都不是本题所对应的强制定期检测项目。";
      break;
    case "management-auto-q-306":
      question.stem =
        "某居民住宅小区建设项目进入精装修施工阶段，水电施工单位与装修单位同时在同一现场进行施工作业。关于水电施工单位与装修单位施工交叉作业时的安全管理要求的说法，正确的有（ ）。";
      question.options = [
        "该小区建设单位应与水电施工单位、装修单位在承包合同中约定各自的安全生产管理职责，对两个承包商的安全生产工作统一协调、管理",
        "水电施工单位与装修单位双方应当签订安全生产管理协议，明确各自的安全生产管理职责和应当采取的安全措施，并指定专职或兼职安全生产管理人员进行安全检查与协调",
        "水电施工单位与装修单位交叉作业施工前，应互相告知对方单位施工作业的内容、安全注意事项",
        "水电施工单位和装修单位同时施工用电时，可安装共用用电线路，避免现场用电线路过多引发触电",
        "水电施工单位与装修单位进行平面交叉作业时，原则上前进场方主动采取交叉作业防护措施，防患于未然",
      ];
      question.answer = ["A", "C", "E"];
      break;
    case "management-auto-q-250":
      question.stem =
        "铍及其盐类均具有较大的毒性，从事铍生产的作业人员作业时应配备防护用品，并定期进行职业病体检。职业病危害应重点关注的是（ ）。";
      question.explanation =
        "铍及其盐类可引起以肺部损害为主的职业危害，长期接触还可能导致慢性铍病，因此职业健康监护应重点关注肺功能检查，故选 C。肝功能、鼻和喉、甲状腺都不是本题对应的重点监护指标。";
      break;
    case "management-auto-q-258":
      question.explanation =
        "甲企业虽已明确告知危险区域和禁止入内要求，但乙企业未有效约束和管理本单位作业人员，导致王某违规进入楼内后坠落，说明乙企业作业过程控制不到位，应承担主要责任，因此选 C。";
      break;
    case "management-auto-q-273":
      question.stem =
        "根据《生产安全事故应急预案管理办法》（2 号令），某县应急局发现属地一家冶金企业在应急预案修订工作中存在问题，责令其及时改进。关于该企业应急预案修订的做法，错误的是（ ）。";
      question.explanation =
        "《生产安全事故应急预案管理办法》规定，参加应急预案评审的人员应当包括有关安全生产及应急管理方面的专家，与被评审单位有利害关系的人员应当回避。县应急部门工作人员不能作为企业预案评审的专家组长主持评审，因此错误项是 D。";
      break;
    case "management-auto-q-275":
      question.stem =
        "某公司管理人员26人，生产车间员工500人，动力辅助车间员工12人；每日工作8h，全年工作日数300d。2023年该公司发生3起生产安全事故，造成2名员工死亡。该公司2023年百万工时死亡率是（ ）";
      question.explanation =
        "百万工时死亡率=死亡人数÷实际总工时×10^6=2÷（538×300×8）×10^6≈1.548，按题目选项取 1.55，因此应选 A。";
      break;
    case "management-auto-q-243":
      question.explanation =
        "高处维修作业因大风中断后再次恢复施工，必须重新确认环境条件和安全措施是否满足要求，因此应选 A。材料、施工资质和原许可并不是本题在恢复作业前需要优先重新确认的直接生产条件。";
      break;
    case "management-auto-q-246":
      question.explanation =
        "防爆墙并不能阻止爆炸事故本身发生，而是在事故发生后通过隔离冲击波和破坏效应来减少损失，因此属于减少事故损失的隔离措施，应选 C。它既不属于限制能量措施，也不是设置薄弱环节。";
      break;
    case "management-auto-q-268":
      question.explanation =
        "消防疏散通道不畅属于作业环境中的室内安全通道缺陷，因此应归入环境因素，选 B。它不是人的不安全行为，也不是设备设施本体缺陷或单纯管理制度因素。";
      break;
    case "management-auto-q-293":
      question.explanation =
        "有限空间作业中断时间超过 60 分钟后重新作业，应重新通风并进行气体检测分析，确认合格后方可继续，因此 D 正确。仅重新交底、再次确认作业票或增加监护人员，均不能替代重新检测这一必要条件。";
      break;
    case "management-auto-q-292":
      question.explanation =
        "HAZOP 分析的偏差应围绕具体工艺节点的工艺参数展开。本题限定的是“本反应釜”节点，因此温度、氮气和搅拌速度都属于可分析偏差；“车间湿度高”属于车间环境条件，不是该反应釜工艺节点的偏差，因此选 B。";
      break;
    case "management-auto-q-276":
      question.explanation =
        "现场应急处置方案应当描述可能发生的事故风险及其影响范围。题干事故暴露出的关键问题是方案未识别高炉烧穿后渣铁喷出可能波及主控楼楼梯间，属于事故风险描述缺失，因此选 B。";
      break;
    case "management-auto-q-336":
      question.stem =
        "某企业发生一起安全责任事故，该起事故总损失工作日为 9600 工作日，企业上年税利额为 1150 万元，平均职工人数为 120 人，法定工作日为 250 日，则该起事故造成的工作损失为（ ）。";
      question.options = ["368万元", "184万元", "736万元", "575万元"];
      question.explanation = "工作损失价值=DM/(SD)=9600×1150/(120×250)=368万元。";
      break;
    case "management-auto-q-365":
      question.explanation =
        "“十五条硬措施”强调企业主要负责人必须亲自组织制定并实施本单位安全生产规章制度和操作规程。D 项把这一本应由主要负责人承担的职责错误地放在建设项目安全总监身上，说明责任落实不到位，因此属于未落实情形。";
      break;
    case "management-auto-q-500":
      question.stem = "某建筑公司持有高处作业特种作业操作证的工作人员甲，沿框架进行钢结构焊接时，因错误选用安全带，从20米高处坠落。根据《安全带》（GB 6095），关于甲高处作业过程中选用合适安全带的说法，正确的是（ ）。";
      question.options[1] = "选用坠落悬挂安全带";
      question.explanation =
        "沿框架进行钢结构焊接属于存在坠落风险的高处作业，应选用坠落悬挂安全带，以便人员失足后能够被及时制动和悬挂保护，因此 B 正确。区域限制型和围杆作业安全带都不适用于本题所述坠落防护场景。";
      break;
    case "management-auto-q-502":
      question.answer = ["C"];
      question.explanation = "员工希望得到表扬和认可，体现的是对尊重、自我价值感和能力认可的需要，属于个性倾向性中的“需要”，因此选 C。动机是需要推动个体为实现具体目标而行动时形成的内在动力；题干描述的是愿望本身，并未描述为获得认可而采取的具体行动。";
      break;
    case "management-auto-q-503":
      question.explanation = "根据海因里希事故因果连锁理论，第三块骨牌是人的不安全行为或物的不安全状态。③瓦工未佩戴安全帽属于人的不安全行为；④卸料平台使用不符合要求的毛竹脚手架、⑥20m高卸料平台未设安全防护设施属于物的不安全状态，因此选 B。";
      break;
    case "management-auto-q-511":
      question.explanation = "厂区管廊上的动火作业按一级动火管理，节假日应升级为特殊动火作业。作业高度5.7m原属Ⅱ级高处作业，但遇六级风等客观危险因素时高处作业应升级，且露天高处作业应停止，因此“属于二级高处作业”的说法错误，选 B。作业前还应通知厂区调度及有关单位。";
      break;
    case "management-auto-q-512":
      question.options[3] = "更换绝缘垫，使用B1级橡胶绝缘垫";
      question.explanation = "10kV供电线路的测温式电气火灾监控探测器宜采用光栅光纤测温式或红外测温式，不能采用题述接触式方案；高压配电室不宜配置二氧化碳灭火器；通风增湿不符合配电室防潮要求。更换为具有B1级阻燃性能的橡胶绝缘垫符合防火要求，因此选 D。";
      break;
    case "management-auto-q-517":
      question.options = ["某露天煤矿3月份开采原煤200万吨，提取1000万元用于隐患治理支出", "某炼油厂营业收入10亿元，提取500万元用于扩建项目安全设施“三同时”支出", "某石油化工工程施工企业工程造价1.5亿元，提取225万元用于安全生产检查和隐患整改支出", "某机床厂营业收入3200万元，提取32万元用于劳保和安全宣传教育"];
      question.explanation = "隐患排查治理支出可以使用安全生产费用，露天煤矿按每吨5元提取，200万吨应提取1000万元。扩建项目安全设施“三同时”支出应纳入建设项目投资，不能从企业安全生产费用中列支，因此 B 不符合规定。石油化工工程施工企业按工程造价1.5%提取，1.5亿元应提取225万元。机床厂按超额累退方法应提取42万元，其中使用32万元用于劳动防护和安全宣传教育未超过提取总额且属于允许支出范围。";
      break;
    case "management-auto-q-518":
      question.explanation = "改善作业环境空气质量的措施包括控制污染源头、加强环境通风和增强个体防护。将反应釜单端面密封改造为双端面机械密封，属于通过改进工艺技术从源头减少有毒物质泄漏，因此选 C。佩戴滤毒面罩属于个体防护；安装泄漏气体抽吸管路和增加排风机属于通风排毒措施。";
      break;
    case "management-auto-q-519":
      question.explanation = "K3包含K2，不是最小割集；最小割集为K1={X2，X3}和K2={X1，X3，X4}。X3“吊装工操作失误”同时出现在两个最小割集中，结构重要度最高，因此应优先加强安全操作规程培训，选 B。";
      break;
    case "management-auto-q-522":
      question.explanation = "发包单位对承包单位的安全生产工作负有统一协调、管理职责，应安排专人对承包作业进行安全检查与协调，及时制止拆除上升限位器后继续作业等行为，因此选 A。危害因素辨识和施工设备变更管理首先由承包单位负责；发包单位也不得监督或认可拆除安全装置。";
      break;
    case "management-auto-q-525":
      question.stem = "常用的事故统计分析方法有综合分析法、统计图表法等。某企业按事故频数由高到低排列事故类型，以直方柱表示各类事故频数，并以折线表示累计百分比。该图采用的事故统计分析方法是（ ）。";
      break;
    case "management-auto-q-531":
      question.explanation = "评价实施机构应制定《评价工作实施方案》并报评价组织机构批准，因此 A 错误；实施评价前应由评价组织机构向样本单位下达《评价通知书》，因此 B 错误；准则未要求必须建立仅由安全管理部门人员组成的安全文化办公室，因此 C 错误。评价报告报评价组织机构审核前，应反馈给被评价单位并沟通确认，因此选 D。";
      break;
    case "management-auto-q-532":
      question.stem = "某炼化企业拥有一套100万t/a柴油加氢装置，因扩充产能又新建了一套100万t/a柴油加氢装置。关于新建装置的安全操作规程管理的说法，正确的是（ ）。";
      question.options[1] = "采用原安全操作规程，应由设备部门审批";
      break;
    case "management-auto-q-533":
      question.stem = "某市危化品码头储运有限公司2018年通过评审取得安全生产标准化二级企业证书。2019年5月，因有害气体泄漏发生一起造成2人死亡的生产安全事故。根据安全生产标准化评审管理办法相关要求，正确的是（ ）。";
      break;
    case "management-auto-q-535":
      question.stem = "某金矿基建施工过程发生爆炸事故，为预防此类事故再次发生，矿山开展了安全理念、风险管控和隐患排查研讨会。安全员小王认为岩巷掘进应采取超前预防理念并引入风险指标；材料采购人员小李认为锚杆购置应考虑安全系数，施工应考虑工艺差异；宣传人员老张认为应将巷道掘进中各种事故频率作为安全指标；施工班长老江认为巷道掘进应以隐患排查为核心，并以危险为零作为安全标准。上述意见中，错误的是（ ）。";
      question.explanation = "系统安全理论认为不存在绝对安全，任何活动都潜伏着危险因素，安全工作的目标是辨识危险源并将风险控制在可接受范围，而不是追求“危险为零”。因此施工班长老江的说法错误，选 D。";
      break;
    case "management-auto-q-538":
      question.stem = "某污水处理厂在高效沉淀池检修过程中，由于天气炎热及沉积污泥散发有毒有害气体，发生4人死亡、1人受伤的事故。事故发生后，上级主管部门组织该厂进行事故反思。范主管提出“要把事故发生概率降低到零”；李主管要求“改善高效沉淀池相关设备的可靠性，从而避免失误造成事故”；王主管认为“任何事物都存在潜在危险，要把人员和沉淀池的危险全面辨识”；赵主管认为“只要从事故直接原因进行分析，就能制定对应措施”。符合系统安全理论的是（ ）。";
      break;
    case "management-auto-q-540":
      question.options[3] = "动火气体分析的取样点应具有代表性";
      question.explanation = "厂区管廊上的动火按一级动火作业管理，6m高处作业应办理高处作业票，动火气体分析取样点应具有代表性。动火分析与动火作业的时间间隔一般不超过30min，13:00开始动火而在12:20前完成分析会超过30min，因此错误的是 C。";
      break;
    case "management-auto-q-541":
      question.options[2] = "架子工使用带有救援功能标记“R”的安全带";
      question.options[3] = "架子工使用带有阻燃功能标记“F”的安全带";
      question.explanation = "架子工存在坠落风险，应采用坠落悬挂式安全带，B正确。根据《安全带》（GB 6095），附加救援功能和阻燃功能可分别用R、F标记，因此C、D正确；安全带作业类别标记应为Q（区域限制）、W（围杆作业）或Z（坠落悬挂），不存在以X表示作业类别的规范标记，故A、E错误。";
      break;
    case "management-auto-q-544":
      question.options[3] = "购置教育测试仪器属于安全宣传教育措施";
      question.explanation = "有毒有害厂房安装轴流风机属于卫生技术措施，购置教育测试仪器属于安全宣传教育措施，妇女卫生室属于辅助措施，因此B、D、E正确。高压氧舱急救装置和尘毒作业淋浴室均属于辅助措施，所以A、C错误。";
      break;
    case "management-auto-q-545":
    case "management-auto-q-547":
      question.type = "multiple";
      break;
    case "management-auto-q-549":
      question.answer = ["C", "D", "E"];
      question.explanation = "第一类危险源是可能意外释放的能量、能量载体或危险物质。超过3300rpm的汽轮机、从电网解列后仍高速旋转的汽轮机以及正常运行在3000rpm的汽轮机都具有旋转动能，均属于第一类危险源，因此选C、D、E。误设联锁参数和监护不到位属于人的失误或管理缺陷，是第二类危险源。";
      break;
    case "management-auto-q-551":
      question.answer = ["A", "C", "E"];
      question.explanation = "20L承压蒸汽锅炉未达到《特种设备目录》中承压蒸汽锅炉正常水位容积大于或等于30L的范围；100m³硫酸储罐属于常压储罐；额定起重量1t的电动葫芦未达到起重机械额定起重量大于或等于3t的目录门槛。这三类设备仍需经常性维护保养和定期检查，但不需要按特种设备实施法定定期检验，因此选A、C、E。甲醇罐车和电梯属于特种设备，需要定期检验。";
      break;
    case "management-auto-q-552":
      question.options[4] = "按照伤害程度划分，该事故是死亡事故";
      question.explanation = "按行业划分，该事故属于危险化学品事故；氯乙烯扩散后遇火源爆炸，按致损因素属于其他爆炸事故；按伤害程度属于死亡事故，因此选B、D、E。选项C所称“重大事故”属于按事故造成的人员伤亡或直接经济损失进行的等级划分，不是本题所问的伤害程度分类。";
      break;
    case "management-auto-q-555":
      question.type = "multiple";
      question.stem = "甲防腐公司5人在乙企业廊道内进行防腐作业，其中1人监护、4人作业。作业2h后，监护人离开，回来后发现4人在廊道内晕倒。事故发生后，乙企业启动专项应急预案，拨打110电话并将伤者送医；同时将参与救援的20多名职工送医留观。由于送医人员较多且企业未及时报告当地政府有关部门，造成一定社会恐慌。根据《生产经营单位生产安全事故应急预案编制导则》，该专项预案应完善的内容包括（ ）。";
      question.explanation = "事故造成较多人员送医并引发社会恐慌，专项应急预案应完善信息发布安排，并明确向当地政府有关部门及时报送事故信息，因此选A、E。启动预案、拨打报警电话和医疗救援保障在题干处置中已经实施，不属于本题所问需要补充的缺项。";
      break;
    case "management-auto-q-557":
      question.stem = "根据《中共中央 国务院关于推进安全生产领域改革发展的意见》，全国要构建重大危险源信息管理体系，对重点行业、重点区域、重点企业实行风险预警控制。重大危险源信息管理体系分为（ ）。";
      question.explanation = "《中共中央 国务院关于推进安全生产领域改革发展的意见》要求构建国家、省、市、县四级重大危险源信息管理体系，对重点行业、重点区域、重点企业实行风险预警控制，因此选C。";
      break;
    case "management-auto-q-558":
      question.explanation = "《推进安全宣传“五进”工作方案》明确，安全宣传“五进”是进企业、进农村、进社区、进学校、进家庭，因此选A。";
      break;
    case "management-auto-q-559":
      question.explanation = "应急管理部门依法实施安全生产综合监督管理，有关部门在各自职责范围内对相关行业、领域实施监督管理；煤矿安全监管实行国家监察与地方监管相结合。特种设备安全监察并非国家垂直管理，因此错误的是C。";
      break;
    case "management-auto-q-563":
      question.stem = "某大型冷冻企业的液氨储罐量为50t，属于一级危险化学品重大危险源，按照要求建立了危险化学品重大危险源监控系统。根据《危险化学品重大危险源监督管理暂行规定》（国家安全监管总局令第40号公布，第79号修正），关于液氨储罐重大危险源监督管理要求的说法，错误的是（ ）。";
      break;
    case "management-auto-q-565":
      question.options[0] = "货梯可在检验合格有效期届满后再申请定期检验";
      question.explanation = "电梯应由依法取得许可的安装、改造、修理单位或者制造单位进行维护保养，至少每15日进行一次清洁、润滑、调整和检查，因此C正确。使用单位应在检验合格有效期届满前1个月提出定期检验申请，不能等到有效期届满后；维保单位不只限于制造单位；使用标志应标明下次检验日期。";
      break;
    case "management-auto-q-566":
      question.options[1] = "千人死亡率0.016";
      question.explanation = "千人重伤率=3÷120000×1000=0.025，因此A正确。千人死亡率=3÷120000×1000=0.025，并非0.016；百万人火灾死亡率=2÷120000×10⁶≈16.67；全年未发生重大事故，重大事故率为0。";
      break;
    case "management-auto-q-568":
      question.explanation = "临边作业防护栏杆应由上下两道横杆及立杆组成，上杆离地高度应为1.2m，因此D所称1m错误。正在使用的脚手架下方不得开挖；密目式安全网应具有阻燃性能；停用超过1个月的脚手架在恢复使用前应检查验收。";
      break;
    case "management-auto-q-569":
      question.options[1] = "建筑施工企业与分包单位的安全生产费用由建筑施工企业统一管理使用";
      break;
    case "management-auto-q-576":
      question.options[0] = "焊接车间普通照明灯具的外观";
      question.explanation = "固定式5t电动葫芦达到起重机械目录的额定起重量门槛，属于依法需要监督检验和定期检验的特种设备，因此选C。普通照明灯具外观不是本题所称国家规定的强制检验项目；车间温度需结合具体职业危害条件检测；常压热水锅炉不属于承压锅炉特种设备。";
      break;
    case "management-auto-q-583":
      question.options[0] = "甲市负责安全生产监督管理的部门";
      break;
    case "management-auto-q-586":
      question.options[2] = "设计350万吨/年地下磷矿建设项目";
      question.explanation = "国家层面审查的非煤矿山建设项目包括设计生产能力300万吨/年及以上的金属非金属地下矿山建设项目。设计350万吨/年的地下磷矿达到该门槛，因此选C；年产10亿立方米天然气项目未达到20亿立方米门槛，钢铁冶炼和汽车制造项目不属于该项国家审查范围。";
      break;
    case "management-auto-q-594":
      question.stem = "某金属矿由于局地强降雨，尾矿库坝基渗水，洗选厂厂房漏水，露天矿积水2m，矿内山体土质松动。根据《安全生产事故隐患排查治理暂行规定》（国家安全生产监督管理总局令第16号），关于该矿事故隐患排查治理情况统计分析报送时限的说法，正确的是（ ）。";
      question.explanation = "生产经营单位应当每季、每年对事故隐患排查治理情况进行统计分析，并分别于下一季度15日前和下一年1月31日前向安全监管监察部门和有关部门报送书面统计分析表，因此C正确。重大事故隐患本身还应及时报告，不能以季度统计报送代替及时报告。";
      break;
    case "management-auto-q-595":
      question.options[0] = "将工具的定置管理等台账归入“现场管理”要素台账";
      question.explanation = "工具定置管理属于作业现场管理内容，应归入“现场管理”要素台账，因此A正确。隐患排查治理台账应归入“安全风险管控及隐患排查治理”；13t液氨储罐既属于设备设施，也构成重大危险源，其设备台账不应从现场管理中移出；安全生产现状评价资料也不归入现场管理。";
      break;
    case "management-auto-q-722":
      question.stem = "甲公司是一家生产消毒剂的民营企业。针对市场需求，甲公司决定扩大生产规模，新建一条生产线并成立项目部。项目部将新建项目发包给乙公司，同时聘请丙公司进行监理。关于项目及相关方安全管理的做法，正确的是（ ）。";
      question.options[2] = "乙公司对本项目从业人员进行安全教育后，甲公司不再进行入厂安全教育";
      question.explanation = "生产经营单位应明确发包工程归口管理部门，统一管理发包工程，因此A正确。工程应以甲公司名义发包，不能以项目部名义发包；甲公司仍应对进入本单位的承包商人员进行入厂安全教育和现场安全交底；乙公司主要负责人而非安全总监对本单位安全生产工作全面负责。";
      break;
    case "management-auto-q-619":
      question.explanation = "叉车属于场（厂）内专用机动车辆，应按安全技术规范接受定期检验，因此应检查其有效的定期检验报告，选A。维修租赁记录、培训学时数和司机工伤保险缴纳记录不属于本题所问的设备强制检验项目。";
      break;
    case "management-auto-q-589":
      question.stem = "某矿山过去10年平均年降水量为1765mm，尾矿库上游水平投影汇水面积约7km²。为做好防洪工作，矿山计划编制《尾矿库汛期防洪专项应急预案》。该预案除洪水可能造成的事故风险分析、应急组织机构和职责外，还应包含的内容是（ ）。";
      break;
    case "management-auto-q-590":
      question.stem = question.stem.replace("150汽车吊", "150t汽车吊");
      break;
    case "management-auto-q-622":
      question.stem = "某安全评价机构员工甲、乙、丙、丁对该市化工园区内的10⁶t丙酮生产线、罐区及储存库进行安全评价，四人对单元划分原则提出了不同看法。根据《危险化学品重大危险源辨识》（GB 18218），四人关于单元划分原则的看法中，错误的是（ ）。";
      break;
    case "management-auto-q-625":
      question.stem = "某安全评价机构对一石化企业开展危险化学品重大危险源评价工作，评价人员在进行重大危险源评价单元划分时产生了分歧。根据《危险化学品重大危险源辨识》（GB 18218），以下设备、设施、场所不能划分为同一危险化学品重大危险源评价单元的是（ ）。";
      break;
    case "management-auto-q-626":
      question.stem = "某企业计划建设年产1万吨乙醇的项目。在该项目安全设施设计审查阶段，企业应当按相关规定向负责安全生产监督管理的部门提出审查申请并提交有关文件。下列文件资料中，应当提交的是（ ）。";
      break;
    case "management-auto-q-637":
      question.stem = "2019年5月17日，某企业输煤栈桥发生火灾事故。事故调查发现电焊工在未办理动火许可手续的情况下，临时接电使用电焊机违章施焊运行中的传送带，造成托架开裂并引发火灾。根据相关规定，该作业除办理动火作业许可外，还需办理的作业许可是（ ）。";
      break;
    case "management-auto-q-639":
      question.stem = "甲公司是一家食用油脂生产加工企业，为扩大生产规模，在厂区扩建一条小包装生产线，并将该项目的土建工程、设备安装、装饰工程分别承包给乙公司、丙公司、丁公司，聘请戊公司负责项目工程监理。在项目实施过程中，乙公司的土建收尾、丙公司的设备安装和丁公司的防水保温需要进行交叉作业。关于交叉作业安全管理的做法，正确的有（ ）。";
      question.options[0] = "甲公司指定乙公司对丙公司、丁公司的交叉作业现场安全生产工作统一协调";
      question.options[2] = "甲公司、乙公司、丙公司及丁公司在交叉作业现场各自独立作业、互不协调";
      break;
    case "management-auto-q-641":
      question.stem = "某机械加工厂临时承接一段直径3m、长9m的容器直管段内部部件安装工作。焊工甲使用电焊在直管段内焊接，乙在外监护。因通风不良、焊接烟尘不易扩散，甲要求乙寻找风机。乙离开后，甲为完成工作量，打开附近氧气瓶并将氧气带引至作业位置。焊接过程中，焊渣引燃橡胶工作垫和工作服，甲受重伤。本次作业应办理的作业许可包括（ ）。";
      break;
    case "management-auto-q-642":
      question.stem = "某年产15万吨烧碱的生产企业扩建了两条生产线，按照《企业安全生产费用提取和使用管理办法》（财企〔2012〕16号）要求提取了安全生产费用，专用于安全生产支出。以下支出可以使用安全生产费用的有（ ）。";
      break;
    case "management-auto-q-643":
      question.answer = ["A", "C"];
      question.explanation = "甲公司作为塔吊使用单位，应逐台建立安全技术档案，因此A正确；乙公司负责安装和运行操作，应对其运行操作过程中因自身责任造成的事故负责，因此C正确。法定检验由特种设备检验机构实施，不由乙公司自行负责。使用登记可以在投入使用前或者投入使用后30日内办理，D仅表述“使用前30日内”，范围不完整。使用登记标志应置于设备显著位置，不能一概表述为必须置于司机室内。";
      break;
    case "management-auto-q-648":
      question.explanation = "根据安监总厅政法〔2013〕120号，海洋石油天然气建设项目的安全设施设计由国家层面负责审查，因此A正确；根据《危险化学品建设项目安全监督管理办法》，跨省长输天然气管道建设项目由国家层面实施安全审查，因此B正确。陆上新油田项目需达到年产100万吨及以上，C未达到；地下非金属矿山需达到300万吨/年及以上，D未达到；尾矿库需总坝高200m以上或总库容1亿m³以上，E未达到。";
      break;
    case "management-auto-q-652":
      question.options[3] = "丙单位在20m高度进行管架安装工作，应按照Ⅱ级高处作业制定安全措施";
      question.explanation = "错误项为C、D、E。受限空间氧含量应为19.5%～21%，因此C所称17%错误；20m高度作业属于Ⅲ级高处作业，不是Ⅱ级，D错误；利用两台150t汽车吊共同吊装属于一级吊装作业，不是三级，E错误。甲单位统一协调管理以及施工单位设置专人检查协调均符合要求。";
      break;
    case "management-auto-q-706":
      question.options[2] = "作业前仅将系统管道压力降至常压，作业人员按要求穿戴防护用品并使用防爆工具，但现场不设专人监护";
      question.explanation = "盲板抽堵作业应按位置图实施，对每个盲板进行标识，标牌编号与位置图一致，抽、堵作业分别办理安全作业票，结束后由作业单位和危险化学品企业专人共同确认，因此D正确。同一管道不得同时进行两处及以上盲板抽堵；作业现场必须设专人监护，故A、B、C错误。";
      break;
    case "management-auto-q-715":
      question.stem = "某化工企业在“国庆”期间将生产装置全部停车，装置经清洗、置换、分析合格并采取安全隔离措施后，在火灾、爆炸危险性较小的情况下准备进行动火作业。该企业制度规定节假日动火应升级管理。关于本次动火作业，下列说法中正确的是（ ）。";
      question.explanation = "装置全部停车、清洗、置换并分析合格后原可按二级动火管理，但企业制度规定节假日升级管理，因此本次按一级动火管理。一级动火作业票有效期不超过8h，6h符合要求，B正确。作业结束还应检查并确认无残留火种；30m内禁止排放的是可燃气体，可燃液体的限制范围为15m；一级动火作业票不由动火点所在车间审批。";
      break;
    case "management-auto-q-718":
      question.options[1] = "作业时，作业点保持原工作压力，并设专人监护";
      question.explanation = "正确项为D、E。同一盲板的抽、堵作业应分别办理作业票，一张作业票只能进行一块盲板的一项作业，A错误；作业点压力应降至常压，不能保持原工作压力，B错误；火灾爆炸危险场所应穿防静电工作服、工作鞋并使用防爆工具，不是绝缘防护用品，C错误。作业应使用防爆工具，且作业地点30m内不得有动火作业。";
      break;
    case "management-auto-q-721":
      question.stem = "某危险化学品企业的特殊作业制度规定，节日、假日或其他特殊情况动火应升级管理。根据《危险化学品企业特殊作业安全规范》（GB 30871），下列有关动火作业的说法，错误的有（ ）。";
      break;
    case "management-auto-q-724":
      question.stem = "某公司甲醇制聚丙烯项目在生产现场扩建2个甲醇储罐，招标两家施工单位在同一区域作业。该公司要求两家施工单位签订安全管理协议，并要求双方派出安全管理人员相互监督；公司另派生产岗位操作人员对生产、施工交叉作业现场进行监护。下列关于承包商管理的说法中，正确的是（ ）。";
      break;
    case "management-auto-q-730":
      question.options[1] = "检查项目竣工验收时事故应急救援预案的建立情况";
      question.explanation = "工业园区已经投入使用，随后开展的评价属于安全现状评价，应针对现实运行中的事故风险、安全管理等情况进行评价，因此C正确。规划设计危险因素辨识属于预评价；项目竣工验收时检查应急预案和判断建成后能否安全运行属于验收评价。";
      break;
    case "management-auto-q-734":
      question.options[3] = "只需对不可接受风险和事故隐患提出整改措施，无需判断项目是否具备安全验收条件";
      question.explanation = "新增生产线建设完成后、正式投产前开展的是安全验收评价。前期准备应明确评价对象和范围，评价结论应说明运行后可能存在的危险、有害因素及其程度，并最终判断是否具备安全验收条件。安全验收评价也可以提出整改建议，但不能只提措施而不作验收条件判断，因此D错误。";
      break;
    case "management-auto-q-743":
      question.stem = "某装置加氢爆炸故障树中，装置内爆炸由“环境异常”和“控制失效”同时发生导致，其中环境异常为q1或q2发生，控制失效为q3与q4同时发生；装置外爆炸由“氢气泄漏”和“存在火源”同时发生导致，其中氢气泄漏为q5或q6发生，存在火源为q7或q8发生。已知q1=q2=0.1，q3=q4=0.2，q5=q6=0.15，q7=q8=0.3，则正确的是（ ）。";
      break;
    case "management-auto-q-745":
      question.stem = "某煤矿掘进工作面瓦斯爆炸故障树的顶上事件由B、C、D三个中间事件通过与门连接；C由C1、C2、C3通过或门连接，D由D1、D2通过或门连接。下列组合中，能导致顶上事件（瓦斯爆炸）发生的是（ ）。";
      break;
    case "management-auto-q-748":
      question.explanation = "伤害（或破坏）范围评价法是依据事故数学模型，计算事故对人员的伤害范围或对设备、建筑物的破坏范围，常用模型包括泄漏扩散、池火辐射、火球、爆炸冲击波、蒸气云爆炸和TNT当量等，因此选D。";
      break;
    case "management-auto-q-749":
      question.stem = "安全现状评价报告对危险分析要求全面、具体，通常由熟悉工艺和操作的专家参与编制。报告包括：①目的；②评价项目概况；③评价依据；④危险、有害因素辨识与分析；⑤安全评价方法；⑥评价单元划分；⑦安全对策措施建议；⑧安全评价结论。下列安全现状评价报告内容顺序正确的是（ ）。";
      break;
    case "management-auto-q-756":
      question.stem = "生产性粉尘种类繁多、理化性质不同，对人体造成的危害也多种多样。就其病理性质而言，下列说法错误的是（ ）。";
      question.explanation = "铅、锰、砷化物等粉尘可引起全身中毒；生石灰、漂白粉、水泥、烟草等粉尘具有局部刺激性；大麻、黄麻、面粉、羽毛等粉尘可引起变态反应；沥青粉尘具有光感应性；谷粒等粉尘附有病原菌时可具有感染性。因此大麻粉尘不是局部刺激性粉尘，错误的是B。";
      break;
    case "management-auto-q-758":
      question.explanation = "烟草尘具有局部刺激性，铅尘可引起全身中毒，黄麻粉尘可引起变态反应；光感应性粉尘的典型代表是沥青粉尘。生石灰粉尘属于局部刺激性粉尘，不属于光感应性粉尘，因此错误的是C。";
      break;
    case "management-auto-q-763":
      question.options[2] = "漏警的原因可能是安全区设计过窄、危险区设计过宽";
      break;
    case "management-auto-q-766":
      question.stem = "在应急管理过程中，加大建筑物安全距离、减少危险物品存量、设置防护墙等措施，属于应急管理（ ）阶段所做的工作。";
      break;
    case "management-auto-q-767":
      question.options = ["编制程序包括资料收集、风险评估、应急资源调查、应急预案编制、桌面推演、应急预案评审和批准实施7个步骤", "结合本单位职能和分工，成立以单位有关负责人为组长、单位相关部门人员参加的应急预案编制工作组", "预案编制工作组中应邀请相关救援队伍以及周边相关企业、单位或社区代表参加", "应急预案编制工作组收集的资料包括属地政府及周边企业、单位应急预案"];
      question.explanation = "应急预案编制包括成立编制工作组、资料收集、风险评估、应急资源调查、应急预案编制、桌面推演、应急预案评审和批准实施共8个步骤，A漏掉“成立编制工作组”，因此错误。B、C符合编制工作组组成要求，D属于应收集的相关资料。";
      break;
    case "management-auto-q-772":
      question.explanation = "危险化学品生产企业、烟花爆竹批发经营企业以及中型规模以上的其他生产经营单位，应当组织应急预案评审并形成书面评审纪要，因此A、B、C正确。D为小型建筑施工企业，不属于题干所依据条款的强制评审对象；E未说明达到中型以上规模，不能据此选入。";
      break;
    case "management-auto-q-773":
      question.explanation = "调集医疗卫生专家和卫生应急队伍开展紧急医学救援、卫生监测，属于“医疗卫生”；对事故现场进行观察、分析或测定，确定事故严重程度、影响范围和变化趋势，属于“事故监测”。因此本次演练涉及事故监测与医疗卫生，选C。";
      break;
    case "management-auto-q-780":
      question.explanation = "事故调查组应自事故发生之日起60日内提交报告，特殊情况下经批准最长可再延长60日；技术鉴定所需20日不计入调查期限。合计可用140日，按事故发生日3月1日作为第1日计算，第140日为2025年7月18日，因此选C。";
      break;
    case "management-auto-q-787":
      question.options[1] = "没有度量衡单位，通过枚举或计数得来，多为间断性资料";
      question.options[2] = "每一个观察单位没有确切值，各组之间有性质上的差别或程度上的不同";
      break;
    case "management-auto-q-788":
      question.explanation = "抽样误差通常不可避免，随机测量误差没有固定倾向，多次测量取平均值只能减小其影响，不能保证完全消除，因此C错误。变量、变异和系统误差累加性的表述均正确。";
      break;
    case "management-auto-q-789":
      question.stem = "某航空公司为加强安全管控，统计近三年的重大事故和飞行总时长，三年内共飞行125×10⁴h，发生2次重大事故。该航空公司重大事故万时率为（ ）。";
      break;
    case "management-auto-q-790":
      question.answer = ["D"];
      question.explanation = "事故直接经济损失包括医疗费用、歇工工资、事故罚款和现场清理费用。计算为20+（0.3×5）+23+5=49.5万元。补充新职工培训费用属于间接经济损失，不计入本题，因此选D。";
      break;
    case "management-auto-q-793":
      question.explanation = "常用事故统计方法包括综合分析法、分组分析法、算术平均法、相对指标比较法、统计图表法、排列图和控制图，因此A、B、D正确。“描述统计法”是统计分析方法的大类，散点图属于具体统计图形，不是本题所列的独立事故统计方法。";
      break;
    case "management-auto-q-481":
      question.explanation = "本题考查企业安全文化建设评价。承包商人员熟悉企业安全文化且安全作业规程考试合格，说明安全文化传播和知识技能方面已落实；仍发生违章伤害事故，反映企业对承包商的制度执行和管理效果存在不足，应在“安全管理”指标中减分，因此选 C。";
      break;
    case "management-auto-q-485":
      question.explanation = "肉制品加工企业属于其他生产经营单位，其主要负责人和安全生产管理人员初次安全培训不得少于32学时，每年再培训不得少于12学时。张某2021年参加再培训应不少于12学时；王某属于内部调岗，再培训不少于12学时；李某属于初次培训，应不少于32学时；赵某2021年再培训不少于12学时，因此选 D。";
      break;
    case "management-auto-q-486":
      question.explanation = "根据《国家安全监管总局办公厅关于切实做好国家取消和下放投资审批有关建设项目安全监管工作的通知》（安监总厅政法〔2013〕120号），设计总坝高200米以上的尾矿库建设项目，其安全设施设计审查和竣工验收由国家安全监管总局负责实施。该尾矿库总坝高215米，因此选 C。";
      break;
    case "management-auto-q-488":
      question.explanation = "特种设备使用单位应当在特种设备投入使用前或者投入使用后30日内，向负责特种设备安全监督管理的部门办理使用登记，取得使用登记证书，因此选 D。登记标志应当置于该特种设备的显著位置。";
      break;
    case "management-auto-q-490":
      question.explanation = "根据《工作场所职业病危害作业分级 第4部分：噪声》（GBZ/T 229.4），8h等效声级达到85dB但低于90dB为轻度危害，90dB至低于95dB为中度危害，95dB至低于100dB为重度危害，达到100dB为极重危害。96dB属于重度危害，因此选 D。";
      break;
    case "management-auto-q-491":
      question.stem = "某危险化学品企业管理人员利用风险判别指标判定系统的危险和危害性，并根据《危险化学品生产、储存装置个人可接受风险标准和社会可接受风险标准（试行）》（原国家安全监管总局公告2014年第13号）确定某装置的社会可接受风险标准，通过累积频率和死亡人数之间的关系曲线（F-N曲线）表示社会风险。关于社会可接受风险曲线的说法，正确的是（ ）。";
      break;
    case "management-auto-q-492":
      question.stem = "用人单位在工作场所设置职业病危害警示标识是其法定义务。根据《工作场所职业病危害警示标识》（GBZ 158），关于职业病危害事故现场设置临时警示线的说法，错误的是（ ）。";
      break;
    case "management-auto-q-495":
      question.stem = "某企业安全生产管理部门牵头起草专项应急预案，组织各部门对预案内审，又邀请相关专家外审，由企业主要负责人签发实施。各相关部门组织人员对新颁布的应急预案进行培训，培训过程中设备部人员提出，应急预案中涉及设备部的相关职责与部门实际不符，认为该预案无法有效实施。关于该企业安全生产规章制度管理程序的说法，错误的是（ ）。";
      question.explanation = "应急预案应符合本单位安全生产实际情况，且应急组织和人员职责分工应明确并有具体落实措施。设备部职责与实际不符，说明预案不能继续原样保持有效，应根据问题程度按程序修订，必要时重新评审发布，因此错误的是 B。";
      break;
    case "management-auto-q-497":
      question.explanation = "安全气囊在碰撞时通过缓冲作用将乘员与碰撞能量隔开，属于减少事故损失技术措施中的隔离，因此选 C。个体防护是由人员佩戴的防护用品；设置薄弱环节是使能量经预设薄弱部位释放；避难与救援则是设置避难场所或救援措施。";
      break;
    case "management-auto-q-499":
      question.explanation = "离子膜电解岗位存在氢气等易燃气体，配备防静电工作服合理；4号滤毒罐可防护氨、硫化氢，适用于液氨相关岗位；空气压缩机岗位噪声较大，配备耳塞合理。煤气化岗位可能接触氨、硫化氢，不应配备主要用于酸性气体防护的7号滤毒罐，因此选 D。";
      break;
    case "management-auto-q-616":
      question.explanation =
        "题干要求用图表直观揭示事故多发频发的“区域分布”，最适合采用能够反映地理空间位置差异的统计地图，因此应选 A。条形图、散点图和对数线图都不擅长表达行政区域上的事故聚集特征。";
      break;
    case "management-auto-q-339":
      question.explanation = "简化后顶上事件发生的概率为 {X2} 或 {X1X3}=1-[(1-0.02)×(1-0.03×0.05)]=1-(0.98×0.9985)=0.02147。";
      break;
    case "management-auto-q-341":
      question.stem =
        "某企业安全环保部对本单位的重大危险源进行安全评估，汇总分析了各车间提交的重大危险源清单。根据《危险化学品重大危险源辨识》（GB 18218）中所列的临界量（如下表所示），构成危险化学品重大危险源的是（ ）";
      question.options = [
        "防火堤内2个6t的液氨储罐",
        "存有10只乙炔气瓶（每瓶充装乙炔约6.5kg）的临时库房",
        "最大可储存200t汽油的罐区，被防火堤分隔成2个存储能力相同的储罐",
        "库区内2个库房分别存有500kg金属钾和5t金属钠",
      ];
      question.explanation =
        "防火堤内两个 6t 液氨储罐属于同一储存单元，液氨临界量为 10t，因此（6+6）÷10=1.2＞1，构成重大危险源，应选 A。其余选项按各自物质的临界量和储存单元划分计算，不满足本题构成条件。";
      break;
    case "management-auto-q-358":
      question.explanation =
        "液相色谱分析岗位接触的试剂多具有腐蚀性、毒性或刺激性，通常应配备防腐蚀手套、防毒面罩和防护眼镜，而不是耐高温手套，因此 D 的说法错误。其余岗位所对应的防护用品与作业危害基本匹配。";
      break;
    case "management-auto-q-328":
      question.explanation =
        "依据《爆破作业单位资质条件和管理要求》，申请营业性爆破作业许可证的单位，爆破员人数不得少于 5 人，因此 A 项所列“爆破员不少于 2 人”不符合必备条件，属于错误项。其余选项所述专用仓库、技术负责人条件和专用设备均属于申请单位应具备的条件。";
      break;
    case "management-auto-q-331":
      question.explanation =
        "事故造成 2 人死亡、10 人重伤，属于较大事故。较大事故由事故发生地设区的市级人民政府负责调查；本题事故发生在丁市戊县，因此应由丁市人民政府组织调查，故选 A。";
      break;
    case "management-auto-q-337":
      question.options = ["皮肤癌", "间皮癌", "鼻癌", "白血病"];
      question.explanation =
        "煤焦油沥青、石油沥青等职业暴露与皮肤癌关系明确，因此本题应选 A。间皮癌多与石棉暴露相关，鼻癌常见于硬木粉尘等暴露，白血病则不是沥青职业暴露的典型对应肿瘤。";
      break;
    case "management-auto-q-344":
      question.explanation =
        "硬木粉尘是典型的职业性致癌因素，与鼻腔和鼻窦恶性肿瘤关系明确，因此本题应选 B。酒精、盐酸和润滑脂都不是鼻癌这一考点最典型的对应暴露因素。";
      break;
    case "management-auto-q-346":
      question.stem =
        "某化工企业在维修过程中，需要在靠近合成车间的公共管廊上进行电焊作业，作业维修人员清理了作业现场，在动火作业前进行了气体分析。在履行动火许可手续时，负责动火作业审批的是（ ）。";
      question.explanation =
        "靠近合成车间的公共管廊动火通常属于一级动火作业。一级动火作业票应由安全管理部门审批，具体审批责任一般由安全部门负责人承担，因此应选 C。车间安全员、维修部负责人和总工程师都不是本题对应的审批主体。";
      break;
    case "management-auto-q-347":
      question.explanation =
        "特种设备安全技术档案除设计、制造、安装、检验和日常维护记录外，还应包括设备运行故障和事故记录，因此应选 A。管理人员资质证书、安全教育培训记录和专项应急预案虽属管理资料，但不是本题所问安全技术档案的必备新增内容。";
      break;
    case "management-auto-q-372":
      question.explanation = "根据《企业安全生产标准化基本规范》（GB/T 33000），二级要素“预测预警”归属于一级要素“安全风险管控”，因此应选 A。";
      break;
    case "management-auto-q-378":
      question.explanation =
        "锅炉、高温高压管道、叉车和电梯属于特种设备目录范围，因此 A 正确。手动葫芦、电动葫芦和卷扬机不属于《特种设备目录》中的特种设备，不能据此入选其余选项。";
      break;
    case "management-auto-q-384":
      question.explanation =
        "生产性毒物可按气态、蒸汽、气溶胶等形态存在。A 说的是液态气溶胶，B 中氯气属于气体而非蒸汽，C 中生产性粉尘属于固态气溶胶，因此只有 D 正确。";
      break;
    case "management-auto-q-757":
      question.explanation =
        "各类尘肺中，矽肺分布最广、发病人数最多、进展较快且危害最严重，因此应选 A。煤工尘肺、铸工尘肺和电焊工尘肺虽然也属于常见尘肺类型，但典型危害程度考点仍以矽肺最为突出。";
      break;
    case "management-auto-q-765":
      question.stem =
        "某危险化学品生产企业为了预防和减少生产安全事故带来的人员伤亡、财产损失以及环境破坏，制定了相关生产安全事故应急预案。该项措施体现了事故应急管理理论框架中的准备程序，其中需要补充的是（ ）。";
      question.explanation =
        "事故应急管理是一个动态循环过程，通常包括预防、准备、响应和恢复四个阶段。题干已明确属于“准备”程序，因此与之配套的其余阶段应为预防、响应和恢复，故选 A。";
      break;
    case "management-auto-q-430":
      question.explanation =
        "题图中的标志排列顺序存在错误。安全标志的常见设置顺序应为警告、禁止、指令、提示，并按由左向右、自上而下排列；图中“禁止靠近”对应位置设置错误，因此选 A。B 把安全标志夸大为“最有力的工具”，C 把“必须佩戴安全帽”误写为指示标志，D 把“当心坑洞”误写为提示标志，均不正确。";
      break;
    case "management-auto-q-446":
      question.explanation = "顶上事件可表示为 A1 或 A2，其概率为1-（1-0.1×0.05）×（1-0.1×0.05）=0.009975，约为0.01。";
      break;
    case "management-auto-q-391":
      question.stem = "操作人员所处的位置和操作时的规范姿势是安全操作课程内容之一，关于操作位置和操作姿势的说法，正确的是（ ）";
      question.options = [
        "10kV 电气设备不停电时作业安全距离为 0.5m",
        "冲洗压力容器水位计时，应站在水位计的正面",
        "拆除压力螺栓作业时，人员应该站在下风口方向",
        "转动机械试运行启动时，人员应该站在转动机械的轴向位置",
      ];
      question.explanation = question.explanation.replace(/水设计/gu, "水位计");
      break;
    case "management-auto-q-642":
      question.type = "multiple";
      break;
    case "technology-auto-q-266":
      question.stem =
        "直击雷防护旨在保护建筑物本身不受雷电损害，以及减弱雷击时巨大的雷电流沿着建筑物滑入大地时对建筑物内部空间产生的各种影响，下列避雷设施中，能起到直击雷防护作用的有（ ）";
      question.explanation =
        "直击雷防护的主要措施包括装设避雷针、避雷线、避雷网和避雷带，因此应选 A、B、D、E。避雷器主要用于限制雷电过电压，属于感应雷或雷电侵入波防护措施，不属于本题所问直击雷防护设施。";
      break;
    case "technology-auto-q-271":
      question.explanation =
        "保护接地装置的安装尺寸中，a 不得小于 0.3m，d 不得小于 1.5m，因此 A、D 不符合要求。b=0.7m、c=2.0m、e=4.0m 均满足题图所示接地装置的安全间距要求，所以正确项为 B、C、E。";
      break;
    case "technology-auto-q-278":
      question.explanation =
        "封闭式防护装置能够将危险区从各个方向完全封闭，使人员无法从任一方向进入危险区域，因此应选 B。固定式、活动式或距离式防护并不必然实现全方向封闭，不能完全对应题干要求。";
      break;
    case "technology-auto-q-284":
      question.stem = "蓄力器是锻压机械的重要部件，其设置应能保证自身运行、拆卸和检修等各项工作的安全，因此蓄力器应设置（ ）。";
      question.explanation =
        "蓄力器属于承压部件，为防止内部压力异常升高造成爆裂事故，任何类型的蓄力器都应设置安全阀，因此应选 B。截止阀、减压阀和止逆阀都不能替代超压泄放这一核心保护功能。";
      break;
    case "technology-auto-q-293":
      question.stem =
        "某港口用于装卸作业的起重机，回转臂安装在门座支座上，沿地面轨道运行，下方可通过铁路或公路车辆，该起重机属于（ ）。";
      question.explanation =
        "门座式起重机安装在门座上，可沿地面轨道运行，回转部分下方还能通过铁路或公路车辆，完全符合题干描述，因此应选 D。桥式、门式和流动式起重机在结构特征上都与本题不符。";
      break;
    case "technology-auto-q-308":
      question.explanation =
        "危险化学品的主要危险特性通常包括燃烧性、爆炸性、毒害性、腐蚀性和放射性。四个选项中，只有 B 同时列出了两项典型主要危险特性；活泼性、敏感性和挥发性都不是本题所指的标准表述，因此应选 B。";
      break;
    case "technology-auto-q-336":
      question.explanation =
        "自动进料圆锯机应设置止逆器、压料装置和侧向防护挡板，以防木料反弹、偏移和锯切伤害，因此应选 A、B、D。可调式防护罩更常见于手动进料圆锯机，本题所述自动进料圆锯机不以此项作为对应答案。";
      break;
    case "technology-auto-q-386":
      question.explanation =
        "危险化学品标签中的信号词只有“危险”和“警告”两类，用于提示危害程度。四个选项中只有“危险”属于规范规定的信号词，因此应选 C；“有毒”“危害”“当心”都不是本题所指的标准信号词。";
      break;
    case "technology-auto-q-451":
      question.explanation =
        "依据《固定式压力容器安全技术监察规程》，压力容器出厂前进行以水为介质的耐压试验时，试验压力应取设计压力的 1.25 倍，因此应选 D。1.50 倍、1.75 倍和 2.00 倍都不符合该规程的规定。";
      break;
    case "technology-auto-q-461":
      question.explanation =
        "电击穿是绝缘材料在强电场作用下因碰撞电离迅速失去绝缘能力的过程，其特点是发生时间短、击穿电压高，因此应选 B。作用时间长通常更符合热击穿等其他击穿形式。";
      break;
    case "technology-auto-q-488":
      question.explanation =
        "爆破片的防爆效率主要取决于膜片厚度、膜片材质和泄压面积，因此应选 C、D、E。环境条件和系统压力会影响使用工况，但不是本题所考查的决定爆破片防爆效率的直接核心因素。";
      break;
    case "technology-auto-q-495":
      question.explanation =
        "剪板机的紧急停止按钮应设置在操作人员最容易迅速触及的位置，通常在设备前面和后面分别设置，以便发生危险时能及时停机，因此应选 A。其余布置方式都不如前后双向设置更符合紧急处置需求。";
      break;
    case "technology-auto-q-591":
      question.explanation =
        "体力劳动强度指数 I=10TMSW=10×(6/8)×4×1×1=30。按照分级标准，I≥25 属于Ⅳ级体力劳动，因此该搬运工的劳动强度等级为 IV 级，应选 D。";
      break;
    case "technology-auto-q-365":
      question.explanation =
        "依据《建筑设计防火规范》，作为泄压设施的轻质屋面板或轻质墙体，其单位面积质量不宜大于 60kg/㎡，因此应选 A。超过该限值会影响爆炸泄压效果，不符合轻质泄压构件的要求。";
      break;
    case "technology-auto-q-199":
      question.explanation =
        "提高冲压送取料安全性，应优先采用专用工具、机械化送料和防护装置。单纯增大上下模口间距会增加手部进入危险区的可能，不能作为安全改进措施，因此 B 错误。";
      break;
    case "technology-auto-q-203":
      question.options = ["梯恩梯属于工业炸药", "塑料导爆管属于工业雷管", "继爆管属于工业索类火工品", "起爆药属于原材料"];
      question.explanation =
        "《民用爆炸物品品名表》将起爆药列入原材料，因此 D 正确。塑料导爆管属于工业索类火工品而非工业雷管，继爆管也不属于工业索类火工品；其余选项均不符合本题所考查的分类对应关系。";
      break;
    case "technology-auto-q-136":
      question.answer = ["D"];
      question.explanation = "甲烷爆炸下限约为 5%，爆炸上限约为 15%。在空气中的浓度约为 9.5% 时，遇点火源燃爆最充分；四个选项中与其最接近的是 10%，因此选 D。";
      question.source =
        "data/2026安全【技术】SVIP/01-精华文档✿电子教材✿历年真题/02-历年真题PDF/2025年注安【技术】优路-2025年真题（完整版）.pdf";
      break;
    case "technology-auto-q-405":
      question.type = "single";
      question.stem =
        "根据《锅炉安全技术规程》（TSG 11），锅炉使用单位应制定月度检查计划。检查内容包括：1.承压部件、安全附件和仪表、联锁保护装置是否完好；2.安全与节能管理制度是否有效执行、作业人员证书是否在有效期内；3.是否定期进行水（介）质化验分析，水质未达标是否及时处理；4.燃烧器管路是否密封、运行是否正常；5.安全与控制装置是否齐全完好、功能是否缺失或失效。属于月度检查内容的序号是（ ）。";
      break;
    case "technology-auto-q-422":
      question.explanation = "依据《机械工业职业安全卫生设计规范》（JBJ 18），大型机床操作面之间的最小安全距离为 1.5m，因此应选 C。";
      break;
    case "technology-auto-q-458":
      question.explanation =
        "体力劳动强度分级中，指数 I<15 为Ⅰ级，15≤I<20 为Ⅱ级，20≤I<25 为Ⅲ级，I≥25 为Ⅳ级。因此 18 对应Ⅱ级，只有 D 正确。";
      break;
    case "technology-auto-q-485":
      question.type = "single";
      break;
    case "technology-auto-q-527":
      question.explanation =
        "图示标签对应 GHS 的氧化性危险象形图，适用于氧化性气体，因此应选 A。易燃气体、易燃气溶胶和爆炸性物质分别对应火焰或爆炸炸弹等其他象形图，不适用本题所示标签。";
      break;
    case "technology-auto-q-151":
      question.explanation =
        "GHS 中吸入危害类别 1 反映物质通过吸入途径即可造成严重急性毒性，在危险货物运输分类（TDG）中通常对应毒性气体，因此应选 A。毒性物质、腐蚀性物质和放射性物质都不对应本题所述吸入危害分类。";
      break;
    case "technology-auto-q-193":
      question.explanation =
        "依据《固定式压力容器安全技术监察规程》，安全状况等级为 3 级的压力容器，其定期检验周期一般为 3 年至 6 年，因此应选 B。1 级和 2 级的检验周期通常更长，4 级则属于应限制使用或进一步处理的状态。";
      break;
    case "technology-auto-q-157":
    case "technology-auto-q-181":
      question.explanation =
        "爆炸性粉尘环境中，料斗内部等设备内部区域在正常运行时长期或频繁存在可燃性粉尘云，属于 20 区，因此应选 D。0 区、1 区适用于爆炸性气体环境分区，21 区则是正常运行时可能偶尔出现粉尘云的区域。";
      break;
    case "technology-auto-q-250":
      question.explanation =
        "II 类设备依靠双重绝缘或加强绝缘防护，其外壳不应接地或接零，因此 A 错；保护绝缘的绝缘电阻不得低于 5MΩ，因此 B 正确；工作绝缘的绝缘电阻下限不是 3MΩ，C 错；绝缘电阻测试应按设备额定电压选用相应兆欧表，而不是统一使用 380V 兆欧表，因此 D 错。";
      break;
    case "technology-auto-q-251":
      question.explanation =
        "毒性危险化学品进入人体的主要途径包括呼吸道、消化道和皮肤，因此最全面的选项是 C。口腔、鼻腔并不是独立于这三类之外的主要分类途径，其余选项都不完整或存在重复表述。";
      break;
    case "technology-auto-q-276":
      question.explanation =
        "旋转轴上有凸起物时，最可靠的防护方式是采用固定式防护罩进行全面封闭，因此应选 C。护套式或开口式防护难以完全隔离凸起物造成的缠绕危险，移动式防护也不适合这类持续旋转部件的基础防护。";
      break;
    case "technology-auto-q-299":
      question.explanation =
        "强腐蚀性腐蚀品对应一级类别。四个选项中，一级无机酸性腐蚀化学品本身就是强腐蚀性类别，因此应选 B；其他无机腐蚀化学品和二级有机酸性腐蚀化学品不属于本题所问强腐蚀性代表类别。";
      break;
    case "technology-auto-q-307":
      question.explanation =
        "起吊前确应检查吊具、支腿和地面条件，但“尺寸、形状不同的物品不得混合捆绑”表述过于绝对。不同物品在采取可靠捆绑、平衡和防滑措施后并非一律不能混吊，因此错误项为 C。";
      break;
    case "technology-auto-q-311":
      question.explanation =
        "锅炉必须装设压力表的部位包括再热器进口和出口，因此 C 正确。省煤器、热水锅炉进出水相关部位并不都按题干所述方式设置压力表，本题考查的是法定必须装设的典型位置。";
      break;
    case "technology-auto-q-315":
      question.explanation =
        "气瓶贮存时空瓶和实瓶应分开存放，可燃气体气瓶不得与氧化性气瓶同库存放，因此 B 的说法错误。设警示标签、采用轻型屋顶并保证泄压条件，以及禁止在瓶库内设置地沟暗道和明火取暖，均属于正确的贮存要求。";
      break;
    case "technology-auto-q-326":
      question.explanation =
        "超声检测对内部缺陷定位较灵敏，但受边界效应等影响，通常难以准确定性缺陷形状，因此 B 的说法错误。射线检测适合体积型缺陷，磁粉检测可发现表面和近表面缺陷，渗透检测适用于表面开口缺陷，A、C、D 均正确。";
      break;
    case "technology-auto-q-374":
      question.explanation =
        "气瓶装卸和运输过程中严禁使用叉车、翻斗车或铲车搬运，因此 B 的说法错误。运输前检查瓶帽、防震圈，升降气瓶时双人配合，以及吊运时不得用金属链绳直接捆绑气瓶，都是正确的安全要求。";
      break;
    case "technology-auto-q-391":
      question.options[0] = "乙炔等分解爆炸性气体在受压等条件下可发生简单分解爆炸";
      question.explanation =
        "乙炔、乙烯、环氧乙烷等分解爆炸性气体，在受压、受热、冲击等条件下可发生简单分解爆炸，A正确。简单分解爆炸不一定需要外部环境供热，B错误；复杂分解爆炸物的危险性通常较简单分解爆炸物稍低，C错误；部分分解爆炸物本身就是可燃性气体，D错误。";
      break;
    case "technology-auto-q-394":
      question.stem =
        "漏电保护装置可用来防止间接接触触电、直接接触触电和漏电火灾，也可用于检测和切断各种单相接地故障。某单位选用的漏电保护装置额定动作电流不超过30mA，动作时间不超过0.1s。该装置属于（ ）。";
      question.explanation =
        "额定动作电流不超过30mA的漏电保护装置属于高灵敏度型，动作时间不超过0.1s属于快速型，因此该装置属于高灵敏度、快速型漏电保护装置，应选B。";
      break;
    case "technology-auto-q-396":
      question.explanation =
        "电气隔离要求隔离变压器的输入绕组与输出绕组之间具有双重绝缘或加强绝缘，以避免一次侧故障传导到二次侧，因此 B 错误。其余选项关于隔离回路不接地和外露导电部分等电位联结的表述均符合要求。";
      break;
    case "technology-auto-q-398":
      question.stem =
        "某单位的内燃叉车高压油管老化，维修人员更换油管后，叉车作业时油管突然破裂，货物随即掉落。根据现行《场（厂）内专用机动车辆安全技术规程》（TSG 81—2022），叉车液压系统用软管、硬管和接头至少应能承受液压回路工作压力的（ ）。";
      question.explanation =
        "根据现行《场（厂）内专用机动车辆安全技术规程》（TSG 81—2022），叉车液压系统用软管、硬管和接头至少应能承受液压回路3倍的工作压力，因此选D。";
      break;
    case "technology-auto-q-409":
      question.stem = "保护导体旨在防止间接接触电击，包括保护接地线、保护接零线和等电位联结线。关于保护导体类型的说法，正确的有（ ）。";
      question.options = [
        "主等电位联结线属于等电位联结线",
        "I类设备外露可导电部分与接地体相连的导体属于保护接地线",
        "TN系统中设备外露可导电部分与PE干线相连的导体属于保护接零线",
        "辅助等电位联结线属于保护接零线",
        "PE线属于等电位联结线",
      ];
      question.explanation =
        "主等电位联结线属于等电位联结线，I类设备外露可导电部分直接与接地体相连的导体属于保护接地线，TN系统中设备外露可导电部分与PE干线相连的导体属于保护接零线，因此A、B、C正确。辅助等电位联结线仍属于等电位联结线，PE线属于保护接零线，因此D、E错误。";
      break;
    case "technology-auto-q-493":
      question.stem =
        "某工厂为了扩大生产能力，在新建厂房内需安装一批设备，有大、中、小型机床若干，安装时要确保机床之间的间距符合《机械工业职业安全卫生设计规范》（JBJ 18）。其中，中型机床之间操作面间距应不小于（ ）。";
      break;
    case "technology-auto-q-494":
      question.options[3] = "砂轮防护罩的总开口角度一般不应大于125°";
      break;
    case "technology-auto-q-503":
      question.explanation =
        "重复接地可减轻零线断开或接触不良时的电击危险，降低漏电设备的对地电压，改善架空线路的防雷性能，并可增大故障回路电流、加速保护装置动作，从而缩短漏电故障持续时间。因此B正确；A、C、D均与重复接地的实际作用相反或不符。";
      break;
    case "technology-auto-q-509":
      question.stem =
        "塔式起重机随着作业高度的提升，需要进行顶升作业。顶升作业过程中容易发生倾翻事故，因此需严格遵守安全操作规程。下列塔式起重机顶升作业要求中，正确的是（ ）。";
      question.options[2] = "顶升套架应套装在新装标准节架外侧";
      break;
    case "technology-auto-q-510":
      question.stem =
        "危险化学品爆炸按照爆炸反应物质分为简单分解爆炸、复杂分解爆炸和爆炸性混合物爆炸。关于危险化学品分解爆炸的说法，正确的是（ ）。";
      question.explanation =
        "简单分解爆炸和复杂分解爆炸均可由爆炸物自身分解完成，不需要外界助燃性气体，因此A正确。简单分解爆炸不一定伴随燃烧，所需能量可由物质本身分解产生，B、C错误；乙炔、环氧乙烷等在一定压力下可发生简单分解爆炸。复杂分解爆炸物的危险性通常较简单分解爆炸物稍低，D错误。";
      break;
    case "technology-auto-q-513":
      question.stem =
        "烟花爆竹工厂的安全距离是危险性建筑物与周围建筑物之间的最小允许距离，包括外部距离和内部距离。关于外部距离和内部距离的说法，错误的是（ ）。";
      break;
    case "technology-auto-q-514":
      question.stem =
        "电力线路安全条件包括导电能力、力学强度、绝缘、间距、导线连接、线路防护、过电流保护和线路管理等。关于电力线路安全条件的说法，正确的是（ ）。";
      break;
    case "technology-auto-q-515":
      question.options[1] = "起重机械停用半年";
      break;
    case "technology-auto-q-516":
      question.stem =
        "火灾事故的发展过程分为初起期、发展期、最盛期和减弱至熄灭期。其中，发展期是火势由小到大发展的阶段，该阶段火灾热释放速率与时间的（ ）成正比。";
      question.explanation =
        "发展期是火势由小到大发展的阶段，一般采用t²特征火灾模型描述该阶段非稳态火灾热释放速率随时间的变化，即火灾热释放速率与时间的平方成正比，因此选A。";
      break;
    case "technology-auto-q-518":
      question.stem =
        "根据《化学品分类和危险性公示通则》（GB 13690），压力下气体是指在压力等于或大于（ ）MPa（表压）下装入贮器的气体，或者液化气体、冷冻液化气体。";
      break;
    case "technology-auto-q-523":
      question.stem =
        "压力管道年度检查是指使用单位在管道运行条件下对管道进行的自行检查，每年至少进行一次。根据《压力管道定期检验规则—工业管道》（TSG D7005），下列工业管道检查要求中，不属于年度检查的是（ ）。";
      question.explanation =
        "年度检查包括检查波纹管膨胀节表面及波间距，检查有蠕胀测量要求管道的蠕胀测点或测量带，并抽查易燃、易爆介质管道的防静电接地电阻和法兰间接触电阻，因此A、B、D均属于年度检查。对明显腐蚀部位进行表面磁粉检测属于进一步检验项目，不是常规年度检查内容，因此选C。";
      break;
    case "technology-auto-q-527":
      question.stem =
        "《全球化学品统一分类和标签制度》（GHS）使用危险象形图标示化学品危害。某化学品外包装标签采用“火焰位于圆圈上方”的象形图，该化学品类别是（ ）。";
      break;
    case "technology-auto-q-530":
      question.options[0] = "感光探测器适用于有阴燃阶段的燃料火灾场合";
      question.explanation =
        "感光探测器特别适用于没有阴燃阶段的燃料火灾，A错误。红外线波长较长，烟粒对其吸收和衰减较弱，因此红外火焰探测器可用于有大量烟雾的火场，B正确。紫外火焰探测器适用于有机化合物燃烧场合，C错误。光电式感烟探测器更适用于白烟，对黑烟灵敏度较低，D错误。";
      break;
    case "technology-auto-q-534":
      question.options[0] = "减少给水，同时开启排污阀放水，打开过热器、蒸汽管道上的疏水阀，加强疏水";
      question.options[3] = "降低负荷，调小主汽阀，开启过热器、蒸汽管道上的疏水阀，开启排污阀放水，同时给水";
      break;
    case "technology-auto-q-535":
      question.stem =
        "灭火剂是能够有效破坏燃烧条件、中止燃烧的物质。不同种类灭火剂的灭火机理不同，干粉灭火剂的主要灭火机理是（ ）。";
      break;
    case "technology-auto-q-539":
      question.stem =
        "某压力容器内的介质不洁净、易于结晶或聚合，为预防容器内压力过高导致爆炸，拟安装安全泄压装置。下列安全泄压装置中，该容器应安装的是（ ）。";
      break;
    case "technology-auto-q-541":
      question.stem =
        "压力容器在使用过程中，由于压力、温度、介质等工况条件的影响，可能导致材质劣化。根据《固定式压力容器安全技术监察规程》（TSG 21），对有材质劣化倾向的压力容器进行检验时，必须检测的项目是（ ）。";
      break;
    case "technology-auto-q-544":
      question.stem =
        "锅炉通常装设防爆门，以防止再次燃烧造成破坏。当作用在防爆门上的总压力超过其本身质量或强度时，防爆门会被冲开或冲破，达到泄压目的。防爆门通常装设在锅炉的（ ）易爆处。";
      break;
    case "technology-auto-q-546":
      question.explanation =
        "人具有较强的随机应变和归纳推理能力，处理偶然事件优于机器，因此D正确。机器在特定信息反应、重复操作稳定性和恶劣环境适应性方面通常优于人，A、B、C不选。";
      break;
    case "technology-auto-q-548":
      question.stem = "电极之间的击穿放电可产生电火花。关于电火花和电弧的说法，正确的是（ ）。";
      question.options[1] = "电气设备正常操作过程中不会产生电火花，更不会产生电弧";
      break;
    case "technology-auto-q-550":
      question.options[0] = "只要静电火花温度达到乳化炸药着火点，即使放电能量低于最小点火能也会引发燃烧爆炸";
      question.explanation =
        "静电放电能否引燃乳化炸药取决于放电能量是否达到相应最小点火能，不能仅凭火花温度达到着火点判断，因此A错误。硝酸铵自然分解放热并积聚可能引发燃烧爆炸，油相材料遇高温或氧化剂可能燃烧，运输中的翻车、碰撞和摩擦也可能引发乳化炸药燃烧爆炸，B、C、D正确。";
      question.knowledgePointIds = ["technology-auto-kp-024"];
      break;
    case "technology-auto-q-413":
      question.explanation =
        "管道布置应考虑压力和温度变化产生的应力，并避免在外围形成爆炸性气体滞留空间，A、B正确；限制管内气体流速可减少振动、静电及介质泄漏风险，对防爆具有重要作用，C错误；天然气进入长输管道前应脱硫、脱水，D正确；站场埋地管道仍应按要求设置静电释放和接地设施，E错误。";
      break;
    case "technology-auto-q-415":
      question.stem =
        "防爆叉车因其制动器和离合器在工作过程中的摩擦、撞击易产生火花和热表面，可能成为爆炸性环境的点燃源。因此，防爆叉车的制动器和离合器应具有防爆功能。根据《爆炸性环境用工业车辆防爆技术通则》（GB/T 19854），下列防爆等级为Gb级叉车的摩擦制动器和摩擦离合器要求中，正确的有（ ）。";
      break;
    case "technology-auto-q-416":
      question.options[1] = "低压液化气体指临界温度高于65℃的液化气体";
      question.explanation =
        "压缩气体在-50℃时加压后完全呈气态，A正确；低压液化气体的临界温度高于65℃，B正确；低温液化气体是经过深冷低温处理而部分呈液态、临界温度一般不高于-50℃的气体，C错误；溶解气体是在一定压力、温度下溶解于气瓶内溶剂中的气体，D正确；吸附气体是在一定压力、温度下吸附于吸附剂中的气体，并非由吸附剂产生，E错误。";
      break;
    case "technology-auto-q-419":
      question.stem =
        "隔爆装置主要有工业阻火器、主动式隔爆装置和被动式隔爆装置等类型。工业阻火器又分为机械阻火器、液封阻火器和料封阻火器等。根据机械阻火器的阻火原理，下列生产系统的管道中，适合使用机械阻火器的有（ ）。";
      break;
    case "technology-auto-q-425":
      question.options[2] = "安装在刀架上的刀片可以仅靠摩擦安装固定";
      break;
    case "technology-auto-q-395":
      question.explanation =
        "分料刀是木工圆锯机上的典型安全防护装置，用于防止工件夹锯和反弹，不属于木工带锯机的配置，因此 C 的说法错误。压刨床设止逆器、圆锯设防反弹装置、平刨设遮盖式安全装置，均属于常见正确做法。";
      break;
    case "technology-auto-q-478":
      question.stem =
        "电流对人体伤害的程度与电流通过人体的路径有关。电流从人体的一个部位流入、从另一个部位流出，流经路径决定人体受到的伤害程度。下列电流通过人体的路径中，最危险的是（ ）。";
      question.explanation =
        "电流经过心脏的路径最危险。左手至胸部这一途径的心脏电流系数较大，对心脏影响最明显，因此应选 D。其余路径虽然也可能造成伤害，但对心脏的直接危险性低于该路径。";
      break;
    case "technology-auto-q-477":
      question.stem = "接地保护是防止间接接触电击的技术措施。关于接地保护系统的说法，错误的是（ ）。";
      question.explanation =
        "IT系统适用于电源中性点不接地或经高阻抗接地的配电网，A正确。TT系统通常适用于电源中性点直接接地的星形低压配电网，并应装设能自动切断漏电故障线路的剩余电流保护装置，B、D正确。三角形连接没有中性点，不能表述为“中性点直接接地配电网”，因此C错误。";
      break;
    case "technology-auto-q-484":
      question.explanation =
        "危险化学品贮存设施的设置必须遵守国家法律、法规和有关规定，不能仅凭厂领导批准，A错误。爆炸物品、一级易燃物品、遇湿燃烧物品和剧毒物品不得露天堆放，B错误。同一区域贮存两种及以上不同级别的危险化学品时，应按最高等级危险化学品的性能设置标志，C正确。危险化学品应按性能分区、分类、分库贮存，不得与禁忌物料混合贮存，D错误。";
      break;
    case "technology-auto-q-485":
      question.stem =
        "工业生产过程中，存在多种引起火灾和爆炸的点火源，如明火、化学反应热、静电放电火花等。控制点火源对防止火灾和爆炸事故具有重要意义。下列控制点火源措施中，错误的是（ ）。";
      question.options[0] = "有飞溅火花的加热装置，应远离可能泄漏易燃气体或蒸气的工艺设备和储罐区，并布置在其侧风向";
      question.options[1] = "有飞溅火花的加热装置，应远离可能泄漏易燃气体或蒸气的工艺设备和储罐区，并布置在其上风向";
      break;
    case "technology-auto-q-486":
      question.stem =
        "安全阀和爆破片是压力容器常用的安全泄压装置，可以单独或组合使用。安全阀出口侧串联安装爆破片装置时，应满足的条件有（ ）。";
      break;
    case "technology-auto-q-487":
      question.options[3] = "阴极保护";
      break;
    case "technology-auto-q-489":
      question.explanation =
        "高温管道开工升温时需进行热紧，低温管道开工降温时需进行冷紧，A、B正确。管道接头泄漏时不得带压紧固连接件，C正确。巡回检查项目包括工艺参数、密封、防腐保温、振动、支吊架、安全附件以及静电跨接和静电接地状况，D正确。焊接时不得将管道或支架用作电焊接地线，E错误。";
      break;
    case "technology-auto-q-563":
      question.type = "multiple";
      break;
    case "technology-auto-q-573":
      question.stem =
        "根据《化学品分类、警示标签和警示性说明安全规范 易燃液体》（GB 20581），按照物质的理化性质将易燃液体分为4类。下列理化性质中，作为易燃液体分类依据的有（ ）。";
      question.explanation =
        "依据《化学品分类、警示标签和警示性说明安全规范 易燃液体》，易燃液体分类主要依据闪点和初沸点，因此应选 B、C。凝固点、燃点和气化点不是该标准划分易燃液体类别的直接依据。";
      break;
    case "technology-auto-q-574":
      question.stem =
        "劳动强度以作业过程中人体的能耗量、氧耗、心率、排汗率等指标为依据，从轻到重分为Ⅰ、Ⅱ、Ⅲ、Ⅳ级。根据我国常见职业体力劳动强度分级，下列操作中，属于Ⅱ级劳动强度的有（ ）。";
      question.explanation =
        "常见职业体力劳动强度分级中，摘水果、驾驶卡车和操作风动工具一般归为 II 级劳动强度，因此应选 A、B、C。搬重物通常达到 III 级及以上，操作仪器多属于 I 级轻劳动，不属于 II 级。";
      break;
    case "technology-auto-q-554":
      question.explanation =
        "被其他设备包围、压住的设备相当于埋置物，起吊时除设备自重外还会产生无法预知的附加阻力，造成实际载荷超过起重机能力并引发失稳、断臂，因此最可能的直接原因是吊物被埋置，选A。";
      break;
    case "technology-auto-q-560":
      question.stem =
        "为防止火灾爆炸事故发生、阻止其扩散并减少破坏，生产经营活动中广泛使用多种防火防爆安全装置及技术。关于防火防爆安全装置及技术的说法，正确的有（ ）。";
      question.options[3] = "主动式、被动式隔爆装置是靠装置某一元件的动作阻隔火焰";
      break;
    case "technology-auto-q-566":
      question.stem =
        "快开门式压力容器开关盖操作频繁，在容器泄压未尽前打开端盖，或端盖未完全闭合就升压，极易造成事故。根据《固定式压力容器安全技术监察规程》（TSG 21），快开门式压力容器的安全联锁装置应满足的要求有（ ）。";
      question.answer = ["C", "E"];
      question.explanation =
        "快开门式压力容器的安全联锁装置应保证：只有快开门达到预定关闭部位后，容器才能升压运行；只有容器内部压力完全释放后，快开门才能打开。因此C、E正确。A、B、D属于超温超压报警、切断或泄放措施，不是快开门安全联锁装置本身的法定联锁要求。";
      break;
    case "technology-auto-q-569":
      question.stem =
        "漏电保护装置主要用于防止间接接触电击和直接接触电击，也可用于防止漏电火灾及监视单相接地故障。关于漏电保护装置使用场合的说法，正确的有（ ）。";
      break;
    case "technology-auto-q-575":
      question.explanation =
        "联锁装置用于防止危险机器功能在特定条件下运行，可以是机械式、电气式或其他类型，A正确。能动装置只有在连续操作时才能使机器执行预定功能，B错误；限制装置防止机器状态超过空间、压力、载荷等设计限度，C仅说载荷限度，以偏概全；行程限制装置应与机器控制系统一起作用，D错误。";
      break;
    case "technology-auto-q-586":
      question.stem =
        "起重机械司索工主要从事准备吊具、捆绑挂钩、摘钩卸载等地面工作，其工作质量与作业安全关系极大。根据《起重机械安全技术规程》（TSG 51），利用桥式起重机吊运钢水包时，司索工应选择的吊具是（ ）。";
      break;
    case "technology-auto-q-591":
      question.stem =
        "体力劳动强度分为Ⅰ、Ⅱ、Ⅲ、Ⅳ级，依据体力劳动强度指数I（I=10T·M·S·W）确定。其中，T为劳动时间率，M为8h工作日能量代谢率，S为性别系数（男1，女1.3），W为体力劳动方式系数（搬1.00，扛0.40，推/拉0.05），10为计算常数。某男性搬运工工作日净劳动时间为6h，总工时为8h，8h工作日能量代谢率为4kJ/（min·m²），该工人的体力劳动强度等级是（ ）。";
      break;
    case "technology-auto-q-592":
      question.stem =
        "压力管道操作人员和维修人员应定期按巡回检查路线对压力管道各部位、各项目进行检查，并做好记录，发现异常情况及时汇报和处理。下列压力管道检查项目中，不属于巡检项目的是（ ）。";
      break;
    case "technology-auto-q-596":
      question.explanation =
        "皮肤金属化是电弧高温使金属熔化、气化后，细小金属微粒渗入皮肤表层造成的电伤，因此与电弧直接相关，应选A。电气机械性伤害是电流作用引起中枢神经强烈反射和肌肉强烈收缩，造成组织断裂、骨折等伤害；电流灼伤由电流热效应造成，电烙印是电流通过人体后留下的永久性斑痕。";
      break;
    case "technology-auto-q-602":
      question.options[0] = "测量额定电压500V以上的线路或设备应采用500V兆欧表";
      question.explanation =
        "测量额定电压500V以上的线路或设备应采用1000V或2500V兆欧表，A错误。测量运行中的线路或设备宜采用较低电压兆欧表，测量新的或大修后的线路、设备宜采用较高电压兆欧表，B、C错误。测量连接导线应采用绝缘良好的单股线分开连接，不得采用双股绝缘线，因此D正确。";
      break;
    case "technology-auto-q-610":
      question.explanation =
        "静电电压很高，可能击穿集成电路绝缘，A错误；在爆炸性混合物环境中，静电火花可能引起燃烧爆炸，B正确；带静电人体接近接地导体时可能发生火花放电，C错误；静电电击能量通常较小，一般不会直接致人死亡，但可能造成二次伤害，D错误。";
      break;
    case "technology-auto-q-608":
      question.explanation =
        "只设置一般照明通常适用于办公室这类视觉作业较均匀、无需重点局部照明的场所，因此应选 C。机加车间、展览厅和计算机房通常还需根据作业或展示要求配置局部照明或混合照明，不能简单只设一般照明。";
      break;
    case "technology-auto-q-613":
      question.stem = "三相鼠笼异步电动机在爆炸危险环境1区使用时，可选择的防爆电气设备型式有（ ）";
      question.explanation =
        "爆炸危险环境 1 区在正常运行时可能出现爆炸性气体混合物，三相鼠笼异步电动机可选隔爆型和正压型，因此应选 C、D。无火花型主要适用于 2 区，充砂型和油浸型通常不作为本题所述场景下该类电动机的常用选型。";
      break;
    case "technology-auto-q-618":
      question.options[2] = "保持运行控制装置，只有连续操作时，才能使机器执行预定功能";
      break;
    case "technology-auto-q-621":
      question.options[3] = "材料和物质的安全性";
      question.explanation =
        "本质安全设计的研究范围包括合理的结构型式、限制机械应力、使用本质安全工艺和动力源、控制系统的安全设计、材料和物质的安全性、机械的可靠性设计，以及遵循安全人机工程学原则。信号和警告装置属于安全防护或信息提示措施，不属于本质安全设计，因此选 B。";
      break;
    case "technology-auto-q-627":
      question.options[1] = "机床运转时，工件夹紧力低于安全值或超过允许值时，机动夹持装置应自动调整";
      break;
    case "technology-auto-q-628":
      question.options[1] = "应使用砂轮的圆周表面进行磨削作业，不宜使用侧面进行磨削";
      break;
    case "technology-auto-q-630":
      question.options[1] =
        "砂轮卡盘直径不得小于砂轮直径的 1/3，切断用砂轮卡盘直径不得小于砂轮直径的 1/4；卡盘各表面平滑无锐棱，夹紧装配后，与砂轮接触的环形压紧面应平整、不得翘曲";
      question.options[2] = "防护罩的总开口角度不大于 90°，在主轴水平面以上的开口角度不超过 65°";
      break;
    case "technology-auto-q-631":
      question.options[1] = "对于双手操作式保护装置，松开任一按钮时，滑块会立即停止在下死点";
      question.options[3] = "光电保护装置应保证当光线被挡住后滑块停止，光线恢复后滑块继续运动";
      break;
    case "technology-auto-q-632":
      question.options[3] = "在实现本质安全措施基础上，在操作区使用安全防护装置";
      break;
    case "technology-auto-q-633":
      question.options[2] = "双手操作装置在滑块下行过程中，同时松开两个按钮，滑块才能停止";
      question.options[4] = "对需多人协同配合操作的压力机，应为每位操作者都配置双手操纵装置";
      break;
    case "technology-auto-q-634":
      question.options[0] =
        "剪板机具备单次循环模式，当选择该模式后，即便控制装置持续起作用，刀架和压料脚仅执行一个工作行程";
      question.options[1] = "压料装置能在剪切前牢固压紧板材，剪切过程中板材无丝毫移动";
      question.options[3] = "剪板机的所有紧固件都已拧紧，并且设置了止动垫圈来防止松动";
      question.options[4] = "剪板机后部落料危险区域设置了阻挡装置，剪切板前托料能将其调整到刀口下方";
      break;
    case "technology-auto-q-636":
      question.options[3] =
        "分料刀顶部应不低于圆锯片圆周上的最高点，与锯片最近点的距离不超过 3mm，其他各点与锯片的距离不得超过 8mm";
      break;
    case "technology-auto-q-639":
      question.options[1] = "冲天炉、电炉产生的烟气中主要含二氧化碳，不会造成严重危害";
      question.options[2] = "利用焦炭熔化金属会产生二氧化硫气体，可能引发呼吸道疾病";
      break;
    case "technology-auto-q-641":
      question.options[2] = "颚式破碎机上部直接给料，落差小于 1m 时，可不做排风处理";
      question.explanation =
        "炼钢电弧炉可采用炉外、炉内或炉内外结合排烟；冲天炉也并非只能采用机械排烟净化。颚式破碎机上部直接给料且落差小于 1m 时，可只设密闭罩而不排风；球磨机旋转滚筒应设在全密闭罩内；砂处理设备应进行通风除尘。因此 C、D、E 正确。";
      break;
    case "technology-auto-q-644":
      question.options[0] = "消防员在火灾现场根据复杂多变的火势，灵活调整灭火策略";
      break;
    case "technology-auto-q-648":
      question.stem =
        "伴随着科技的发展和人工智能优化程度的不断提升，机器的特性在不断提高，但人与机器相比依然有许多优势。下列关于人与机器设备优势对比的说法中，错误的是（ ）。";
      question.options[0] =
        "人能运用多种通道接收信息，当一种信息通道发生障碍时可运用其他通道进行补偿，而机器只能按设计的固定结构和方法输入信息";
      question.options[2] = "机器学习能力差，灵活性差，只能理解特定事物，决策方式只能通过预先编程来确定";
      break;
    case "technology-auto-q-649":
      question.stem =
        "在某电子设备制造车间的人机系统中，工人 A 与生产机器 B 呈串联关系，工人 A 的可靠度为 RA=0.9，生产机器 B 的可靠度为 RB=0.92。为增强系统安全性，添加了独立的安全冗余设备 C 与原系统并联，安全冗余设备 C 的可靠度为 RC=0.91。该总系统可靠度 R总约为（ ）。";
      break;
    case "technology-auto-q-650":
      question.options = [
        "某工厂为避免工人在流水线作业中感到单调，定期更换工人的操作岗位，属于通过改善工作环境消除疲劳",
        "某企业将车间内的光照强度调整至符合标准的范围，同时合理规划作业区域的布局，属于从生理、心理因素角度消除疲劳",
        "某公司规定员工每天工作不超过 8 小时，且每周至少休息 2 天，避免员工过度劳累，这属于合理安排作息时间以消除疲劳",
        "某车间为缓解作业单调，在作业过程中播放轻柔舒缓的背景音乐，该方式能从根本上缓解生理疲劳，属于消除疲劳的有效途径",
      ];
      break;
    case "technology-auto-q-651":
      question.options = [
        "光通量是光源在给定方向上单位立体角内的光通量，单位是坎德拉（cd）",
        "照明条件与作业疲劳无关，无论照明好坏都不会影响工作效率",
        "眩光会导致瞳孔缩小，影响视网膜视物，造成视觉疲劳，甚至引发事故",
        "为满足照明需求，应在所有作业场所都采用高强度的单一照明方式",
      ];
      break;
    case "construction-auto-q-001":
      question.explanation =
        "《建筑施工安全技术统一规范》（GB 50870）将建筑施工危险等级划分为Ⅰ、Ⅱ、Ⅲ级，对应事故后果分别为很严重、严重、不严重，危险等级系数分别取 1.10、1.05、1.00。本题基坑深 7.25m，事故后果很严重，属于Ⅰ级，故系数取 1.10，选 A。";
      break;
    case "construction-auto-q-003":
      question.options[0] = "施工组织设计应由施工单位组织编制，不可分段编制和审批";
      question.options[2] = "单位工程施工组织设计应由施工单位技术负责人或技术负责人授权的技术人员审批";
      question.explanation =
        "施工组织设计应由施工单位组织编制，并可根据需要分阶段编制和审批，因此 A 错误。施工组织总设计应由总承包单位技术负责人审批；单位工程施工组织设计应由施工单位技术负责人或其授权的技术人员审批；一般分部（分项）工程或专项工程施工方案应由项目技术负责人审批。危险性较大的分部分项工程专项施工方案还应按规定审核、审查并加盖相应印章。";
      break;
    case "construction-auto-q-004":
      question.options[0] = "单位工程施工组织设计应当由总承包单位技术负责人审批";
      question.options[2] = "一般分部（分项）工程施工方案应当由项目技术负责人审批";
      break;
    case "construction-auto-q-008":
      question.options[3] = "司机室内应有照明设施，照度不应低于 30 lx";
      question.explanation =
        "根据《塔式起重机》（GB/T 5031），工作状态包括吊载运转、空载运转或间歇停机，因此 A 错。非工作状态下应切断动力电源并采取防风措施，因此 B 错。塔机工作时司机室内噪声应不大于 80dB(A)，不是 85dB(A)，因此 C 错。司机室应有照明设施，照度不应低于 30 lx，因此 D 正确。";
      break;
    case "construction-auto-q-014":
      question.explanation =
        "多台拖式铲运机联合作业时，各机前后距离一般不得小于 10m，铲土时不得小于 5m，左右距离不得小于 2m；多台自行式铲运机联合作业时，前后距离一般不得小于 20m，铲土时不得小于 10m，左右距离不得小于 2m。因此本题选 B。";
      break;
    case "construction-auto-q-015":
      question.options[0] = "在压路机未熄火、机下未支垫三角木的情况下进行机下检修";
      question.options[2] = "两台以上压路机同时作业，其前后距离不得小于 3m；在坡道上行驶时，其间距不得小于 20m";
      break;
    case "construction-auto-q-016":
      question.options[2] = "翻斗内的残留物，可以用车辆高速行驶、突然制动的办法来清除";
      break;
    case "construction-auto-q-017":
      question.stem =
        "某施工现场单独设置一台配电箱为钢筋加工区内的钢筋加工机械供电。根据《建筑与市政工程施工现场临时用电安全技术标准》（JGJ/T 46），钢筋加工机械开关箱与分配电箱的最远距离不得超过（ ）。";
      question.explanation =
        "根据《建筑与市政工程施工现场临时用电安全技术标准》（JGJ/T 46），分配电箱与开关箱的距离不应超过 30m；开关箱与其控制的固定式用电设备的水平距离不宜超过 3m。因此选 C。";
      break;
    case "construction-auto-q-018":
      question.explanation =
        "根据《建筑与市政工程施工现场临时用电安全技术标准》（JGJ/T 46），二级剩余电流动作保护器应分别装设在总配电箱和开关箱中，分配电箱并非必须装设，因此 B 错误。总配电箱中保护器的额定剩余动作电流应大于 30mA，额定剩余动作时间应大于 0.1s，但两者乘积不应大于 30mA·s。";
      break;
    case "construction-auto-q-019":
      question.options[2] = "交流弧焊机应选用具有一次侧漏电保护和二次侧空载降压保护功能的漏电保护器";
      break;
    case "construction-auto-q-021":
      question.options[1] =
        "配电箱、开关箱内的电器（含插座）应先紧固在金属或非木质阻燃绝缘电器安装板上，金属电器安装板与金属箱体应作电气连接";
      question.explanation =
        "根据《建筑与市政工程施工现场临时用电安全技术标准》（JGJ/T 46），移动式配电箱、开关箱应装设在坚固、水平的支架上，不是可移动支架。箱内电器应先安装在金属或非木质阻燃绝缘电器安装板上，再整体紧固入箱体，金属电器安装板应与 PE 做电气连接，因此 B 正确。N 端子板应与金属电器安装板绝缘，PE 端子板应与其做电气连接，箱内连接线应采用铜芯绝缘导线。";
      break;
    case "construction-auto-q-022":
      question.explanation = question.explanation.replace("（JGJT46）", "（JGJ/T 46）");
      break;
    case "construction-auto-q-025":
      question.explanation = question.explanation.replace("（JGJT46）", "（JGJ/T 46）");
      break;
    case "construction-auto-q-026":
      question.explanation = question.explanation.replace("（JGJT46）", "（JGJ/T 46）");
      break;
    case "construction-auto-q-027":
      question.options[0] = "使用固定式直梯攀登作业时，当攀登高度超过 3m 时，宜加设护笼";
      question.options[1] = "在坠落基准面 2m 及以上高处搭设与拆除柱模板及悬挑结构的模板时，应设置操作平台";
      question.options[2] = "在坡度大于 1:2.2 的屋面上作业，当无外脚手架时，应在屋檐边设置不低于 1.5m 高的防护栏杆";
      break;
    case "construction-auto-q-030":
      question.options[0] = "当竖向洞口的短边边长小于 1200mm 时，应采取封堵措施";
      break;
    case "construction-auto-q-034":
      question.explanation =
        "当吊装作业利用吊车梁等构件作为水平通道时，临空面一侧应设置连续栏杆等防护措施。采用钢索作安全绳时，一端应使用花篮螺栓收紧；采用钢丝绳作安全绳时，自然下垂度不应大于绳长的 1/20，且不应大于 100mm，因此选 C。";
      break;
    case "construction-auto-q-037":
      question.options[1] = "基坑开挖时，小王和老李的操作间距为 2m，两台挖掘机的间距为 12.5m";
      break;
    case "construction-auto-q-048":
      question.explanation =
        "一般现浇楼盖及框架结构的拆模顺序为：拆柱模斜撑与柱箍→拆柱侧模→拆楼板底模→拆梁侧模→拆梁底模，因此选 A。";
      break;
    case "construction-auto-q-049":
      question.explanation =
        "根据《建筑施工模板安全技术规范》（JGJ 162）7.7.2，拆除导墙模板应在新浇混凝土强度达到 1N/mm² 后方准拆模，因此 A 错。按 7.7.3，拆除隧道模时应先在强度达到承重模板拆模要求后，将隧道模分成 2 个半隧道模；再拔除穿墙螺栓，使隧道模脱离顶板和墙面；先将一边半隧道模推移至支卸平台，再推另一边半隧道模。";
      break;
    case "construction-auto-q-053":
      question.options[1] = "土舱内照明工具可选用 42V 以下的安全电压";
      question.explanation =
        "更换刀具前应将工具、设备及应急物品准备齐全，并对土舱内气体进行检测，在保证无有毒气体情况下才可换刀，因此 A 正确。土舱内照明工具（包括行灯等局部照明工具）应采用 24V 以下安全电压，因此 B 错。地质条件较稳定时一般采取常压换刀，因此 C 错；盾构机前方或上方土体不能自稳时，应进行气压换刀，因此 D 错。";
      break;
    case "construction-auto-q-056":
      question.options = [
        "风险消除，杜绝一切点火源，费用 5 万元",
        "风险降低，修改技术方案，费用 4 万元",
        "风险转移，购买工程一切险，费用 3.5 万元",
        "风险自留，灭火费用及相关损失 5000 元",
      ];
      break;
    case "construction-auto-q-061":
      question.explanation =
        "人工拆除施工应从上至下逐层、分段进行，不得垂直交叉作业。框架结构采用人工拆除时，应按楼板、次梁、主梁、结构柱的顺序依次进行，因此选 A。";
      break;
    case "construction-auto-q-062":
      question.explanation =
        "根据《生产经营单位生产安全事故应急预案编制导则》（GB/T 29639），现场应急处置包括应急处置程序、现场应急处置措施、明确报警负责人以及报警电话和联络方式等内容，不包括明确临时用电程序，因此选 D。";
      break;
    case "construction-auto-q-064":
      question.explanation = question.explanation.replace("（AQT9007）", "（AQ/T 9007）");
      break;
    case "construction-auto-q-071":
      question.options[1] = "制动块摩擦衬垫磨损量达原厚度的 30%";
      question.options[2] = "制动轮表面磨损量达 1.5mm～2mm";
      question.options[4] = "电磁铁杠杆系统空行程超过其额定行程的 10%";
      break;
    case "technology-auto-q-617":
      question.stem = "下列废弃物处置的方法中，适用于处置过苯甲酸废弃物的有（ ）。";
      question.explanation =
        "过苯甲酸废弃物属于有机过氧化物类危险废弃物，本题适用的处置方法是烧毁法和分解法，因此应选 B、C。水泥固化法、石灰固化法主要用于固化稳定化处理，化学溶解法也不是本题所对应的标准处置方法。";
      break;
    case "technology-auto-q-604":
      question.explanation =
        "大型游乐设施报废时，电气系统必须进行去功能化处理，以防设备在报废后被再次带电启用或误操作，因此应选 C。该题偏细，但对应规程中的直接要求就是电气系统必须去功能化。";
      break;
    case "technology-auto-q-638":
      question.explanation =
        "铸造作业中浇包盛装铁水不得过满，通常不应超过浇包容积的 80%。题干把 85% 写成正确措施，因此 C 错误。";
      break;
    case "technology-auto-q-346":
      question.explanation =
        "推手式、拉手式和栅栏式都属于安全保护装置；光电式安全装置属于安全保护控制装置，因此应选 D。";
      break;
    case "management-auto-q-562":
      question.stem =
        "某化工企业主营甲醇生产与销售。为保证原料供应，该企业收购了一家小型露天煤矿。2019年该企业生产甲醇3万吨、煤炭20万吨，甲醇营业收入2000万元，煤矿业务收入100万元。根据《企业安全生产费用提取和使用管理办法》（财企[2012]16号），该企业2019全年应提取安全生产费用为（ ）。";
      question.options = ["160万元", "100万元", "140万元", "180万元"];
      question.explanation =
        "混业经营企业如能按业务类别分别核算，应分别按对应标准提取安全生产费用。该题中煤炭业务提取费用为20万×5元=100万元，甲醇业务提取费用为1000万×4%+1000万×2%=60万元，全年应提取100+60=160万元。";
      break;
    case "management-auto-q-606":
      question.explanation =
        "安全生产标准化建设强调“四重”特点，即重在基础、重在基层、重在落实、重在治本，因此应选 C。其余选项虽然包含个别管理要求，但并不是标准化建设中“四重”特点的规范表述。";
      break;
    case "technology-auto-q-067":
      question.explanation =
        "惰性气体置换中常用转换系数大小规律为 CO2＞He＞Ar，因此从大到小的正确排序为 CO2、He、Ar，对应 C。其余排序都与常用换算关系不符。";
      break;
    case "management-auto-q-215":
      question.explanation =
        "高处作业票有效期最长为 7 天。题干中 6 月 16 日办理许可，到 6 月 24 日已超过最长有效期，因此 B 正确；同时作业中断后恢复前还应重新确认环境条件和安全措施，A、C、D 均不符合要求。";
      break;
    case "management-auto-q-274":
      question.explanation =
        "夜间照明不良属于典型的作业现场环境因素，因此应选 D。A 中警示标志缺陷更偏向物的因素，B 属于人的不安全行为，C 未设置监护人员属于管理或人的因素，不属于环境因素。";
      break;
    case "technology-auto-q-102":
      question.explanation =
        "防止危险化学品污染事故应优先从源头和工艺环节控制，变更生产工艺可能直接减少泄漏、逸散或污染物产生，因此 A 正确。消除点火源和惰性气体保护主要针对火灾爆炸，防毒面具属于个体防护，均不能直接防止污染事故。";
      break;
    case "technology-auto-q-123":
      question.explanation =
        "化学抑爆技术适用于泄爆可能引发二次爆炸、无法设置泄爆口或设备所处位置不利于泄爆的场景，因此 A、C、D 所述都正确。B 所称“适用于对力学强度要求较高的设备”并不是化学抑爆技术的典型适用条件，所以错误项为 B。";
      break;
    case "technology-auto-q-158":
      question.explanation =
        "280 kJ/m² 落在二度烧伤的热剂量区间内，因此应选 C。该剂量高于单纯皮肤疼痛和一度烧伤水平，但通常未达到三度烧伤所需的更高热剂量。";
      break;
    case "technology-auto-q-182":
      question.explanation =
        "体力劳动强度指数 I=10TMSW=10×(6/8)×4×1×1=30。按照分级标准，I＞25 属于Ⅳ级体力劳动，因此应选 D。";
      break;
    case "technology-auto-q-187":
      question.explanation =
        "配重块运行时可能形成挤压和剪切危险区，因此应对其全部行程进行封闭，直至地面或机械固定构件处，故 A 正确。只封闭局部行程无法消除整段运动范围内的伤害风险。";
      break;
    case "technology-auto-q-256":
      question.explanation =
        "起升高度超过 1.8m 的乘驾式叉车必须设置护顶架，以防货物高位坠落伤及驾驶员，因此应选 A。挡货架、货物稳定器和稳定支腿都不能替代对驾驶员头顶部的直接防护。";
      break;
    case "technology-auto-q-303":
      question.explanation =
        "火灾自动预警系统中，显示器用于接收并显示火灾信息，属于火灾报警装置，因此应选 C。火灾探测器和手动预警按钮属于触发装置，声光预警器则属于火灾警报装置。";
      break;
    case "technology-auto-q-306":
      question.explanation =
        "高压倒闸操作应先断开断路器，再断开隔离开关，因此 A 的说法错误。高压断路器常与隔离开关串联使用，负荷开关一般配合高压熔断器，跌开式熔断器也可用于操作空载变压器，其余选项均符合常规要求。";
      break;
    case "technology-auto-q-318":
      question.explanation =
        "落地安装的配电柜底面离地一般应为 50~100mm，操作手柄中心高度宜为 1.2~1.5m。四个选项中只有 A=60mm、H=1.4m 同时满足这两项要求，因此应选 D。";
      break;
    default:
      break;
  }
}

function stripTrailingWatermark(text) {
  return String(text || "")
    .replace(/\s*网校\s*$/u, "")
    .trim();
}

function sanitizeExplanation(text) {
  return stripTrailingWatermark(text).replace(/\n二[.、]?(?:多项选择题|多选题).*/su, "").trim();
}

function sanitizeQuestionText(question) {
  question.stem = stripTrailingWatermark(question.stem);
  question.stem = question.stem
    .replace(/（\s*\n\s*[）)]/gu, "（ ）")
    .replace(/\n\s*([）)])/gu, "$1");
  question.explanation = sanitizeExplanation(question.explanation);
  if (Array.isArray(question.options)) {
    question.options = question.options.map((option) => stripTrailingWatermark(option));
  }
}

function normalizeStemForDedup(stem) {
  return String(stem || "")
    .replace(/【\d+\s*分】/gu, "")
    .replace(/[（(]\s*[）)]/gu, "")
    .replace(/[\p{P}\p{S}]+/gu, "")
    .replace(/[\s　]+/gu, "")
    .trim();
}

function scoreQuestionForDedup(question) {
  const stem = String(question.stem || "");
  const options = Array.isArray(question.options) ? question.options.map((item) => String(item || "").trim()).filter(Boolean) : [];
  let score = 0;

  score += options.length * 4;
  if (options.length >= 4) {
    score += 3;
  }
  if (options.length > 0 && options.every((item) => item.length > 0)) {
    score += 2;
  }
  if (!/【\d+\s*分】/u.test(stem)) {
    score += 3;
  }
  if (question.explanation) {
    score += 1;
  }

  return score;
}

function pruneExactDuplicateQuestions(examData) {
  const bestByKey = new Map();
  let removedCount = 0;

  for (const [index, question] of examData.questionBank.entries()) {
    const dedupKey = [
      question.subjectId,
      normalizeStemForDedup(question.stem),
      JSON.stringify(question.answer || []),
    ].join("||");

    const score = scoreQuestionForDedup(question);
    const existing = bestByKey.get(dedupKey);

    if (existing) {
      removedCount += 1;
      if (score > existing.score) {
        existing.question = question;
        existing.score = score;
      }
    } else {
      bestByKey.set(dedupKey, {
        firstIndex: index,
        question,
        score,
      });
    }
  }

  examData.questionBank = [...bestByKey.values()]
    .sort((left, right) => left.firstIndex - right.firstIndex)
    .map((entry) => entry.question);
  return removedCount;
}

function refineManagementIds(question, ids) {
  let nextIds = ids.slice();
  const stem = question.stem || "";
  const compactStem = stem.replace(/\s+/gu, "");
  const compactOptions = Array.isArray(question.options) ? question.options.join("").replace(/\s+/gu, "") : "";
  const compactContext = compactStem + compactOptions;
  const explanation = question.explanation || "";

  if (question.id === "management-auto-q-092") {
    return ["management-auto-kp-026"];
  }

  if (question.id === "management-auto-q-292") {
    return ["management-auto-kp-071"];
  }

  if (question.id === "management-auto-q-035") {
    return ["management-auto-kp-036"];
  }

  if (question.id === "management-auto-q-421") {
    return ["management-auto-kp-120"];
  }

  if (question.id === "management-auto-q-549") {
    return ["management-auto-kp-026"];
  }

  if (question.id === "management-auto-q-640") {
    return ["management-auto-kp-003"];
  }

  for (const [fromId, toId] of MANAGEMENT_ALIAS_MAP.entries()) {
    nextIds = replaceId(nextIds, fromId, toId);
  }

  if (nextIds.includes("management-auto-kp-007")) {
    if (/教育培训|培训学时|上岗培训|岗位安全教育/u.test(stem) || /安全教育培训|安全培训规定/u.test(explanation)) {
      nextIds = replaceId(nextIds, "management-auto-kp-007", "management-auto-kp-023");
    } else if (/马斯洛|心理学家/u.test(stem) || /马斯洛|需求层次理论/u.test(explanation)) {
      nextIds = replaceId(nextIds, "management-auto-kp-007", "management-auto-kp-015");
    } else {
      nextIds = replaceId(nextIds, "management-auto-kp-007", "management-auto-kp-002");
    }
  }

  if (nextIds.includes("management-auto-kp-003")) {
    if (/言行表现出来的心理状态|心理状态是/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-003", "management-auto-kp-056");
    } else if (/隐患整改/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-003", "management-auto-kp-049");
    } else if (/重大风险告知牌/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-003", "management-auto-kp-098");
    }
  }

  if (nextIds.includes("management-auto-kp-023")) {
    if (/有限空间作业现场管理/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-023", "management-auto-kp-036");
    }
  }

  if (nextIds.includes("management-auto-kp-071")) {
    if (/变更管理程序/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-071", "management-auto-kp-003");
    }
  }

  if (nextIds.includes("management-auto-kp-057")) {
    if (/职业病/u.test(stem) || /职业病危害/u.test(explanation)) {
      nextIds = replaceId(nextIds, "management-auto-kp-057", "management-auto-kp-037");
    } else {
      nextIds = replaceId(nextIds, "management-auto-kp-057", "management-auto-kp-032");
    }
  }

  if (nextIds.includes("management-auto-kp-099")) {
    if (/教育培训|培训学时|上岗安全培训|安全培训/u.test(stem) || /安全培训规定|安全教育培训/u.test(explanation)) {
      nextIds = replaceId(nextIds, "management-auto-kp-099", "management-auto-kp-023");
    } else if (/责任制|横向到边|纵向到底/u.test(stem) || /整分合原则|安全生产分工/u.test(explanation)) {
      nextIds = replaceId(nextIds, "management-auto-kp-099", "management-auto-kp-017");
    } else if (/规章制度|编制程序/u.test(stem) || /规章制度/u.test(explanation)) {
      nextIds = replaceId(nextIds, "management-auto-kp-099", "management-auto-kp-027");
    } else if (/应急预案/u.test(stem) || /应急预案/u.test(explanation)) {
      nextIds = replaceId(nextIds, "management-auto-kp-099", "management-auto-kp-078");
    } else if (/隐患整改|重大事故隐患|双重预防/u.test(stem) || /重大事故隐患/u.test(explanation)) {
      nextIds = replaceId(nextIds, "management-auto-kp-099", "management-auto-kp-049");
    } else if (/本质安全|飞车|危险有害因素分类|第一类危险源/u.test(stem) || /本质安全|第一类危险源|危险有害因素分类/u.test(explanation)) {
      nextIds = replaceId(nextIds, "management-auto-kp-099", "management-auto-kp-076");
    } else if (/承包商|资质审查|发包给|施工现场/u.test(stem) || /资质审查|总承包|分包单位/u.test(explanation)) {
      nextIds = replaceId(nextIds, "management-auto-kp-099", "management-auto-kp-045");
    } else if (/安全生产投入|资金投入不足/u.test(stem) || /资金投入不足|安全生产费用/u.test(explanation)) {
      nextIds = replaceId(nextIds, "management-auto-kp-099", "management-auto-kp-051");
    } else if (/十五条硬措施/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-099", "management-auto-kp-017");
    } else {
      nextIds = replaceId(nextIds, "management-auto-kp-099", "management-auto-kp-097");
    }
  }

  if (nextIds.includes("management-auto-kp-026")) {
    if (/安全生产费用|安全费用|责任保险|资金投入/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-026", "management-auto-kp-051");
    } else if (/隐患|整改|排查|双重预防/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-026", "management-auto-kp-049");
    } else if (/重大危险源|R 值|R值|校正系数|包保|临界量/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-026", "management-auto-kp-053");
    } else if (/应急预案|现场应急处置方案|现场处置方案|疏散|撤离/u.test(stem)) {
      nextIds = replaceId(
        nextIds,
        "management-auto-kp-026",
        /编制|类型|方案/u.test(stem) ? "management-auto-kp-078" : "management-auto-kp-020"
      );
    } else if (/发包|承包商|相关方/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-026", "management-auto-kp-045");
    } else if (/预先危险|PHA|HAZOP/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-026", "management-auto-kp-071");
    } else if (/验收评价|安全评价机构|评价报告/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-026", "management-auto-kp-077");
    } else if (/风险告知|可接受风险|重大风险/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-026", "management-auto-kp-098");
    } else if (/安全职责|安全生产管理人员|主要负责人/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-026", "management-auto-kp-017");
    } else if (/执法|监督管理|监管部门/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-026", "management-auto-kp-097");
    } else if (/海因里希|系统安全理论|第一类危险源|第二类危险源|危险源在事故发生/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-026", "management-auto-kp-003");
    }
  }

  if (nextIds.includes("management-auto-kp-098")) {
    if (/动火|盲板|有限空间|吊装作业|特殊作业/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-098", "management-auto-kp-036");
    } else if (/验收评价|评价报告/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-098", "management-auto-kp-077");
    } else if (/道化|HAZOP|预评价|危险指数|安全评价机构|安全评价/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-098", "management-auto-kp-071");
    } else if (/劳动防护用品|防护用品|滤毒罐|化学防护服/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-098", "management-auto-kp-050");
    } else if (/职业病危害/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-098", "management-auto-kp-037");
    } else if (/危险有害因素|有害因素/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-098", "management-auto-kp-116");
    } else if (/安全标志/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-098", "management-auto-kp-118");
    } else if (/生产许可证|换证|自检自查/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-098", "management-auto-kp-097");
    } else if (/专家论证|施工方案/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-098", "management-auto-kp-097");
    }
  }

  if (nextIds.includes("management-auto-kp-042")) {
    if (/故障树|事件树|最小割集|最小径集|顶上事件|布尔代数/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-042", "management-auto-kp-071");
    } else if (/能量意外释放/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-042", "management-auto-kp-003");
    } else if (/应急处置卡|现场应急处置方案/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-042", "management-auto-kp-078");
    } else if (
      /统计图|统计图表|统计对比图|伤害率|工作损失价值|总损失工作日|综合类伤亡事故统计指标|统计指标体系|属于直接经济损失|属于间接经济损失|善后处理费用/u.test(
        stem
      )
    ) {
      nextIds = replaceId(nextIds, "management-auto-kp-042", "management-auto-kp-021");
    }
  }

  if (nextIds.includes("management-auto-kp-050")) {
    if (/安全生产费用|安全费用|责任保险|安责险/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-050", "management-auto-kp-051");
    } else if (/安全标志|警示标志/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-050", "management-auto-kp-118");
    } else if (
      /职业病危害|职业病防治法|物理性职业病危害因素|噪声|振动|电磁辐射|异常气象|粉尘|低温|高温|现状评价|控制污染源头/u.test(
        compactStem
      )
    ) {
      nextIds = replaceId(nextIds, "management-auto-kp-050", "management-auto-kp-037");
    } else if (/减少事故损失|安全技术措施|安全气囊/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-050", "management-auto-kp-119");
    } else if (/高处作业许可管理|高处坠落事故原因/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-050", "management-auto-kp-036");
    } else if (/承包商管理的说法/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-050", "management-auto-kp-045");
    } else if (/局部交叉作业|同一作业区域|同一区域现场施工作业/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-050", "management-auto-kp-001");
    } else if (/特殊作业安全管理制度中的规定|审批人职责|盲板抽堵作业是指/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-050", "management-auto-kp-036");
    } else if (/受限空间作业可能引发/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-050", "management-auto-kp-036");
    }
  }

  if (nextIds.includes("management-auto-kp-039")) {
    if (/特种作业操作证|培训取证|劳务派遣|实习学生/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-039", "management-auto-kp-023");
    } else if (/故障树|顶上事故|顶上事件|最小割集|最小径集/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-039", "management-auto-kp-071");
    } else if (/事故统计指标|千人重伤率|千人死亡率|百万人火灾死亡率|重大事故率/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-039", "management-auto-kp-021");
    } else if (/监管监察|监管体制|综合监督管理|垂直管理/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-039", "management-auto-kp-097");
    } else if (/发包给乙建筑公司|监理业务发包|停工阶段.*维保管理协调/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-039", "management-auto-kp-045");
    } else if (/动土作业/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-039", "management-auto-kp-036");
    } else if (/致损因素|伤害程度分类|事故分类中，正确/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-039", "management-auto-kp-042");
    }
  }

  if (nextIds.includes("management-auto-kp-036")) {
    if (/相关方施工交叉作业|承包商.*主体责任/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-036", "management-auto-kp-045");
    } else if (/浮盘更换作业过程中.*主体责任/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-036", "management-auto-kp-045");
    } else if (/施工现场临时用电方案|专项施工方案实施前|建设项目安全设施[“"]?三同时/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-036", "management-auto-kp-032");
    } else if (/高处作业进行危险因素辨识|直接引起高处坠落客观危险因素/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-036", "management-auto-kp-116");
    } else if (/作业现场环境因素/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-036", "management-auto-kp-116");
    } else if (/根据关于该起事故调查的说法|关于事故调查的说法，正确的是/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-036", "management-auto-kp-042");
    } else if (/上报事故情况属于应急预案内容/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-036", "management-auto-kp-078");
    } else if (/势能也不可能消失|危险源的危险性|安全管理基本理论中的/u.test(stem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-036", "management-auto-kp-003");
    } else if (
      /伤亡事故分类与编码|生产安全事故分类与编码|企业职工伤亡事故分类|综合考虑起因物|事故类型属于|事故类型有|下列有关事故类别的说法/u.test(
        compactStem
      )
    ) {
      nextIds = replaceId(nextIds, "management-auto-kp-036", "management-auto-kp-042");
    }
  }

  if (nextIds.includes("management-auto-kp-045")) {
    if (/液[氨氮]泄漏事故应急演练|演练评估报告应关注的内容/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-045", "management-auto-kp-020");
    } else if (/安全文化建设年度审核|企业安全文化建设评价准则|评价指标时，应减分的指标/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-045", "management-auto-kp-031");
    } else if (/危大工程|专项方案论证|施工单位拒不按照专项方案施工|应急抢险结束后，应对抢险工作进行评估/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-045", "management-auto-kp-032");
    }
  }

  if (nextIds.includes("management-auto-kp-032")) {
    if (/安全生产费用|安全奖励支出|安全先进个人的专项奖金/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-032", "management-auto-kp-051");
    } else if (/事前、事中和事后三种|属于事中监督管理/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-032", "management-auto-kp-097");
    } else if (/同一隧道重复爆破作业|爆破技术设计和施工组织设计|重复性爆破工作/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-032", "management-auto-kp-097");
    }
  }

  if (nextIds.includes("management-auto-kp-020")) {
    if (/马斯洛|人的需要按其强度的不同排列成5个等级层次/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-020", "management-auto-kp-015");
    } else if (/危险和有害因素分类与代码|危险有害因素分类的说法/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-020", "management-auto-kp-116");
    } else if (/安全现状评价报告给出的检查结论/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-020", "management-auto-kp-077");
    } else if (
      /应急预案修订工作中存在问题|生物池淹溺现场处置方案的说法|明确了应急保障内容|尾矿库汛期防洪专项应急预案|应急预案编制程序的描述中|根据应急预案体系，该预案属于/u.test(
        compactStem,
      )
    ) {
      nextIds = replaceId(nextIds, "management-auto-kp-020", "management-auto-kp-078");
    }
  }

  if (nextIds.includes("management-auto-kp-097")) {
    if (/危险性较大的分部分项工程安全管理规定|组织专家论证施工方案/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-032");
    } else if (/安全文化示范企业建设|企业安全承诺|安全文化功能中的|安全宣传[”"]?五进/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-031");
    } else if (/安全设施未经验收合格|竣工投入生产前/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-032");
    } else if (/职业性慢性轻度苯中毒|慢性毒物形态/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-037");
    } else if (/个性倾向动机的相关功能|产生了学习的动力/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-015");
    } else if (/年度安全生产培训时间|安全管理人员2021年度安全生产培训时间/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-023");
    } else if (/劳动防护用品管理的做法|采购了一批劳动防护用品/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-050");
    } else if (/安全生产投入资金予以决策|安全生产投入资金/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-051");
    } else if (/构成迟报瞒报|作为接报时上报/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-038");
    } else if (/重大危险源监督管理暂行规定|重大危险源监控系统|液氨储罐量为50t/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-053");
    } else if (/现场管理存在安全问题|液氯储罐|现场管理的工作做法/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-001");
    } else if (/操作位置和操作姿势|安全操作课程内容之一/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-029");
    } else if (/本质安全型防爆结构型式|设备保护等级/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-076");
    } else if (/老旧装置安全风险防控专项整治行动|普通离心泵应从密封、联轴器、使用场合和误操作等方面进行辨识/u.test(compactContext)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-116");
    } else if (/监护人应经专项培训考试合格|安全作业票有效期限|收回安全作业票、中止作业|收回安全作业票,中止作业/u.test(compactContext)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-036");
    } else if (/危险有害因素分类与代码|危险源辨识/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-116");
    } else if (/计量资料的定义|计量资料的特点|统计学的基本知识|事故统计的基本任务/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-021");
    } else if (/预警机制建设|预警预报体系/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-020");
    } else if (
      /监管执法监督工作|安全生产监管体制|事前、事中和事后三种|矿山安全监察体制|本次监管的方式属于/u.test(
        compactStem,
      )
    ) {
      nextIds = replaceId(nextIds, "management-auto-kp-097", "management-auto-kp-120");
    }
  }

  if (nextIds.includes("management-auto-kp-116")) {
    if (/应急预案编制工作|成立应急预案编制工作组|应急资源调查|桌面推演|批准实施/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-116", "management-auto-kp-078");
    }
  }

  if (nextIds.includes("management-auto-kp-118")) {
    if (
      /粉尘危害因素与尘肺病分类|属于职业病的有|职业致癌物|职业性肿瘤|生产性毒物|职业病危害作业分级第4部分：噪声|法定尘肺病和致残等级|职业病危害控制效果评价|生产性粉尘引起的职业病|尘肺最为严重|病理性质而言/u.test(
        compactStem,
      )
    ) {
      nextIds = replaceId(nextIds, "management-auto-kp-118", "management-auto-kp-037");
    } else if (/按职业病危害因素来源分类|劳动过程中的危害因素/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-118", "management-auto-kp-037");
    } else if (/安全技术措施计划编制原则和内容|属于卫生技术措施/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-118", "management-auto-kp-119");
    } else if (/必须进行强制性检查的项目|固定式5t电动葫芦|常压热水锅炉/u.test(compactContext)) {
      nextIds = replaceId(nextIds, "management-auto-kp-118", "management-auto-kp-039");
    } else if (/组织人员在下料车间进行演练|应急处置措施中，正确的是/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "management-auto-kp-118", "management-auto-kp-020");
    }
  }

  return dedupeList(nextIds);
}

function refineTechnologyIds(question, ids) {
  let nextIds = ids.slice();
  const stem = question.stem || "";
  const compactStem = stem.replace(/\s+/gu, "");

  if (nextIds.includes("technology-auto-kp-002")) {
    if (/木材机械加工|木材加工|木工|带锯|平刨|圆锯/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-027");
    } else if (/冲压|冲床|压力机|剪板机/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-016");
    } else if (/锻造|蓄力器/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-023");
    } else if (/铸造|冲天炉|电弧炉/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-029");
    } else if (/砂轮装置|砂轮主轴|砂轮卡盘|砂轮防护罩/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-073");
    } else if (/砂轮机|金属切削|数控机床|切削机床|机床/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-073");
    } else if (/起重机|吊运|司索|吊装/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-017");
    } else if (/叉车|观光车/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-090");
    } else if (/游乐设施|客运索道|索道|车厢/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-017");
    } else if (/锅炉/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-014");
    } else if (/压力容器|压力管道/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-039");
    } else if (/机械运行状况通常用红、黄、蓝、绿四种颜色|黄色表示/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-015");
    } else if (/照明|视觉疲劳|作业空间|人机/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-015");
    } else if (/布局|间距|通道/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-004");
    } else if (/危险化学品|中毒|化学品/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-037");
    } else if (/火灾|爆炸|灭火|抑爆|阻火|燃烧/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-018");
    } else if (/电气|配电|变压器|绝缘|触电|雷电|防雷/u.test(stem)) {
      if (/电伤|电弧烧伤|电流灼伤|电光眼/u.test(stem)) {
        nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-011");
      } else if (/雷电|防雷/u.test(stem)) {
        nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-010");
      } else if (/绝缘|触电/u.test(stem)) {
        nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-043");
      } else {
        nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-006");
      }
    } else if (/电伤|电弧|电烙印|电光眼|皮肤金属化/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-011");
    } else if (/客运缆车/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-017");
    } else if (/手动进料圆盘锯|分料刀/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-027");
    } else if (/实现金械本质安全有多种方法|按照机械本质安全的原则|优先顺序/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-001");
    } else if (/锻压机械不同部件安全措施|退火处理/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-023");
    } else if (/金属腐蚀物对金属影响/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-001");
    } else if (/烟火药|烟花爆竹/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-024");
    } else if (/本质安全设计|可靠性设计|维修性/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-001");
    } else if (/非机械性危险因素/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-002", "technology-auto-kp-007");
    }
  }

  if (nextIds.includes("technology-auto-kp-007")) {
    if (/机械危险部位安全措施|联轴器|固定式防护套|钳形防护条/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-007", "technology-auto-kp-002");
    } else if (/非机械性危险因素|机械性危险因素/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-007", "technology-auto-kp-001");
    }
  }

  if (nextIds.includes("technology-auto-kp-003")) {
    if (/冲压|锻压/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-003", "technology-auto-kp-023");
    } else {
      nextIds = replaceId(nextIds, "technology-auto-kp-003", "technology-auto-kp-002");
    }
  }

  if (nextIds.includes("technology-auto-kp-001")) {
    if (/大型游乐设施.*去功能化处理|报废时必须进行去功能化处理/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-001", "technology-auto-kp-017");
    } else if (/场（厂）内专用机动车辆.*应急措施|场厂内专用机动车辆.*应急措施/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-001", "technology-auto-kp-090");
    } else if (/消除精神疲劳|消除疲劳途径/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-001", "technology-auto-kp-015");
    } else if (/静电防护|静电危害/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-001", "technology-auto-kp-010");
    } else if (/压力管道.*使用和维护安全技术|压力容器腐蚀/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-001", "technology-auto-kp-039");
    } else if (/限制火灾爆炸(事故)?蔓延扩散措施|不属于控制点火源措施|带阻火装置的管道输送物料|使用密封管道运输送易燃液体/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-001", "technology-auto-kp-021");
    }
  }

  if (nextIds.includes("technology-auto-kp-018")) {
    if (/人优于机器|人机系统|劳动强度指数|疲劳|视觉疲劳|照明环境|色彩环境/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-015");
    } else if (/乳化炸药生产车间|含油硝铵析晶|装药机叶片泵/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-024");
    } else if (/木材加工过程中.*生物效应危险/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-027");
    } else if (/危险化学品.*燃烧|危险化学品.*爆炸|危险化学品.*火灾|分解爆炸|爆炸破坏作用|扑救行为/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-076");
    } else if (/爆炸危险区级别划分|料斗内部|抽吸口|20区|21区|22区/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-038");
    } else if (/火灾探测器|感温火灾探测器|火灾报警|自动灭火系统|火灾自动预警|灭火器|灭火剂/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-022");
    } else if (/低压电力线路的配线总截面积|配线总截面积占钢管内径截面积/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-038");
    } else if (/雷电危害|雷电具有/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-010");
    } else if (/木材加工.*生物效应危险/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-027");
    } else if (/危险化学品.*主要危险特性|危险化学品.*特性及效应|同时具有燃烧、爆炸和毒害危险特性/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-058");
    } else if (/架空线路间距|架空线路之间|架空线路/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-006");
    } else if (/包装类别|GHS|标签规范|安全技术说明书|MSDS/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-101");
    } else if (/烟花爆竹|烟火药|民用爆炸物品|工业炸药|雷管/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-024");
    } else if (/泄压|抑爆|隔爆|阻火|正压保护|惰性气体/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-021");
    } else if (/密封和正压措施|系统密闭和正压|氮气进行吹扫置换/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-021");
    } else if (/民用爆破器材工程设计安全规范|危险性建筑物采暖系统/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-024");
    } else if (/废弃物|销毁|污染事故|泄漏|中毒/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-037");
    } else if (/贮存|仓库|混存|存放/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-119");
    } else if (/0区|1区|2区|危险区域|防雷分类/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-018", "technology-auto-kp-038");
    }
  }

  if (nextIds.includes("technology-auto-kp-006")) {
    if (/大型游乐设施|游乐设施|客运索道|索道|缆车/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-017");
    } else if (/配电箱|配电柜|热继电器|熔断器|低压成套电器/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-019");
    } else if (/直击雷防护技术/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-010");
    } else if (/TNS系统|TNS接线方式|人体及其所携带工具与带电体之间最小距离/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-043");
    } else if (
      /危险温度|击穿放电|电火花和电弧|配线总截面积占钢管内径截面积|1区|2区|爆炸危险环境/u.test(compactStem)
    ) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-038");
    } else if (/烟花爆竹|烟火药|民用爆炸物品|工业炸药|雷管|炸药/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-024");
    } else if (/油气长输管道|输油管道|输气管道/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-039");
    } else if (/硫化氢|泄漏扩散|污染事故|废弃物|销毁|急性中毒/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-037");
    } else if (/灭火器|灭火剂|火灾自动预警|火灾报警|火灾探测器|自动灭火系统|燃烧条件|火灾发展/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-018");
    } else if (/阻火器|防爆泄压|抑爆|阻火|泄压/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-021");
    } else if (/人优于机器|人机系统|劳动强度指数|疲劳|视觉疲劳|照明环境|色彩环境|一般照明|照明条件/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-015");
    } else if (/压力管道/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-017");
    } else if (/雷电|静电|防雷|避雷/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-010");
    } else if (/危险区域|0区|1区|2区|防爆电气|电气引燃源|电气防火防爆/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-038");
    } else if (/手持电动工具|移动式电气设备|低压控制电器|低压断路器|刀开关|接触器|凸轮控制器|低压保护电器/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-019");
    } else if (/电伤|电弧烧伤|电流灼伤|电光眼|人体伤害|人体阻抗|人体电阻|触电事故/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-011");
    } else if (/保护接地|隔离变压器|绝缘电阻|双重绝缘|间接接触电击|漏电保护|接地装置|重复接地|保护导体|PE线|PEN线|接地（零）系统|接地线/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-006", "technology-auto-kp-043");
    }
  }

  if (nextIds.includes("technology-auto-kp-015")) {
    if (
      /保护装置是通过自身的结构功能限制或防止机器某种危险的装置|联锁装置、双手操纵装置、能动装置、限制装置/u.test(
        compactStem,
      )
    ) {
      nextIds = replaceId(nextIds, "technology-auto-kp-015", "technology-auto-kp-002");
    } else if (
      /人体阻抗|电流对人体作用|电流通过人体的路径|最危险的路径/u.test(compactStem)
    ) {
      nextIds = replaceId(nextIds, "technology-auto-kp-015", "technology-auto-kp-011");
    }
  }

  if (nextIds.includes("technology-auto-kp-043")) {
    if (
      /爆炸危险环境中的电气设备和电气线路.*防火防爆技术措施/u.test(compactStem)
    ) {
      nextIds = replaceId(nextIds, "technology-auto-kp-043", "technology-auto-kp-038");
    } else if (/手持电动工具和移动式电气设备/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-043", "technology-auto-kp-019");
    }
  }

  if (nextIds.includes("technology-auto-kp-033")) {
    if (/预案条款中，不符合危险化学品泄漏处置要求/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-033", "technology-auto-kp-037");
    }
  }

  if (nextIds.includes("technology-auto-kp-101")) {
    if (/可能防止污染事故的措施/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-101", "technology-auto-kp-037");
    }
  }

  if (nextIds.includes("technology-auto-kp-019")) {
    if (/电火花可分为工作火花和事故火花|属于事故火花/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-019", "technology-auto-kp-038");
    }
  }

  if (nextIds.includes("technology-auto-kp-017")) {
    if (/防爆泄压|抑爆|阻火器|阻火|防火防爆安全装置/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-017", "technology-auto-kp-021");
    } else if (/压力容器|压力管道|移动式压力容器|安全阀|爆破片|泄放装置|放散管|无损检测/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-017", "technology-auto-kp-039");
    } else if (/烟花爆竹|烟火药|民爆/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-017", "technology-auto-kp-024");
    } else if (/中毒|毒性化学品/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-017", "technology-auto-kp-033");
    } else if (/叉车|观光车/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-017", "technology-auto-kp-090");
    } else if (/气瓶|瓶阀/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-017", "technology-auto-kp-099");
    } else if (/锅炉/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-017", "technology-auto-kp-014");
    }
  }

  if (nextIds.includes("technology-auto-kp-045")) {
    nextIds = replaceId(nextIds, "technology-auto-kp-045", "technology-auto-kp-023");
  }

  if (nextIds.includes("technology-auto-kp-056")) {
    nextIds = replaceId(nextIds, "technology-auto-kp-056", "technology-auto-kp-029");
  }

  if (nextIds.includes("technology-auto-kp-073")) {
    if (/大型机床操作面间距|中型机床之间操作面间距|机械工业职业安全卫生设计规范/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-073", "technology-auto-kp-004");
    } else if (/木材加工|木工|圆锯/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-073", "technology-auto-kp-027");
    } else if (/配电箱|配电柜/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-073", "technology-auto-kp-006");
    } else if (/剪板机/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-073", "technology-auto-kp-016");
    } else if (/铸造/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-073", "technology-auto-kp-029");
    }
  }

  if (nextIds.includes("technology-auto-kp-078")) {
    nextIds = replaceId(nextIds, "technology-auto-kp-078", "technology-auto-kp-027");
  }

  if (nextIds.includes("technology-auto-kp-090") && /包装类别/u.test(stem)) {
    nextIds = replaceId(nextIds, "technology-auto-kp-090", "technology-auto-kp-101");
  }

  if (nextIds.includes("technology-auto-kp-100")) {
    nextIds = replaceId(nextIds, "technology-auto-kp-100", "technology-auto-kp-018");
  }

  if (nextIds.includes("technology-auto-kp-115")) {
    if (/静电/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-115", "technology-auto-kp-010");
    } else if (/屏护|电击|漏电|间接接触|绝缘|接地|安全电源|回路/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-115", "technology-auto-kp-043");
    } else {
      nextIds = replaceId(nextIds, "technology-auto-kp-115", "technology-auto-kp-002");
    }
  }

  if (nextIds.includes("technology-auto-kp-119")) {
    if (/安全技术说明书|MSDS|GHS/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-119", "technology-auto-kp-101");
    } else if (/变电站/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-119", "technology-auto-kp-006");
    } else if (/气瓶/u.test(stem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-119", "technology-auto-kp-099");
    }
  }

  if (nextIds.includes("technology-auto-kp-085")) {
    nextIds = replaceId(nextIds, "technology-auto-kp-085", "technology-auto-kp-119");
  }

  if (nextIds.includes("technology-auto-kp-058")) {
    if (/腐蚀性危险化学品按其酸碱性及有机物、无机物可分为八类|属于一级无机酸性腐蚀物质|属于强腐蚀性的是/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-058", "technology-auto-kp-101");
    } else if (/放射性危险化学品的主要危险特在于其放射性|高强度的放射线对人体造血系统造成伤害/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-058", "technology-auto-kp-101");
    } else if (/人与机器相比依然有许多优势|人与机器设备优势的对比/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-058", "technology-auto-kp-015");
    } else if (/惰性气体中，按转换系数从大到小排序正确|惰性气体保护或置换场景/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-058", "technology-auto-kp-021");
    } else if (/毒性危险化学品进入人体的途径中，最全面的是|毒性危险化学品不能直接侵入的是/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-058", "technology-auto-kp-033");
    } else if (/进入现场救援的人员，应该选择的防毒面具|应该选择的防毒面具/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-058", "technology-auto-kp-033");
    } else if (/预案条款中，不符合危险化学品泄漏处置要求/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-058", "technology-auto-kp-037");
    } else if (/危险化学品企业的下列经营行为中，符合/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-058", "technology-auto-kp-119");
    } else if (/办理危险化学品经营许可证不需要/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-058", "technology-auto-kp-119");
    } else if (/发生火灾.*灭火措施/u.test(compactStem)) {
      nextIds = replaceId(nextIds, "technology-auto-kp-058", "technology-auto-kp-076");
    } else if (
      /安全标签要素编写|安全标签编写规定|化学品安全标签|包装类别的对应关系|化学品分类和危险性公示通则|易燃液体分类根据/u.test(
        compactStem,
      )
    ) {
      nextIds = replaceId(nextIds, "technology-auto-kp-058", "technology-auto-kp-101");
    }
  }

  return dedupeList(nextIds);
}

function refineConstructionIds(question, ids) {
  let nextIds = ids.slice();
  const stem = question.stem || "";

  if (question.id === "construction-auto-q-029" || question.id === "construction-auto-q-030" || question.id === "construction-auto-q-031") {
    return ["construction-auto-kp-099"];
  }

  if (question.id === "construction-auto-q-004") {
    return ["construction-auto-kp-061"];
  }

  if (question.id === "construction-auto-q-034") {
    return ["construction-auto-kp-056"];
  }

  if (question.id === "construction-auto-q-038") {
    return ["construction-auto-kp-021"];
  }

  if (nextIds.includes("construction-auto-kp-007")) {
    nextIds = replaceId(nextIds, "construction-auto-kp-007", "construction-auto-kp-043");
  }

  if (nextIds.includes("construction-auto-kp-043")) {
    nextIds = replaceId(nextIds, "construction-auto-kp-043", "construction-auto-kp-005");
  }

  if (nextIds.includes("construction-auto-kp-068")) {
    nextIds = replaceId(nextIds, "construction-auto-kp-068", "construction-auto-kp-056");
  }

  if (nextIds.includes("construction-auto-kp-111")) {
    nextIds = replaceId(nextIds, "construction-auto-kp-111", "construction-auto-kp-056");
  }

  if (nextIds.includes("construction-auto-kp-062")) {
    nextIds = replaceId(nextIds, "construction-auto-kp-062", "construction-auto-kp-011");
  }

  if (nextIds.includes("construction-auto-kp-069")) {
    if (/漏电保护器的安装说法|漏电保护器/u.test(stem)) {
      nextIds = replaceId(nextIds, "construction-auto-kp-069", "construction-auto-kp-101");
    } else if (/安全网搭设|悬挑式操作平台/u.test(stem)) {
      nextIds = replaceId(nextIds, "construction-auto-kp-069", "construction-auto-kp-006");
    } else if (/现浇楼盖及框架结构的拆模顺序|关于模板拆除|框架结构采用人工拆除施工/u.test(stem)) {
      nextIds = replaceId(nextIds, "construction-auto-kp-069", "construction-auto-kp-119");
    } else if (/盾构法施工说法错误|盾构机高压用电系统/u.test(stem)) {
      nextIds = replaceId(nextIds, "construction-auto-kp-069", "construction-auto-kp-011");
    } else if (/高压喷射注浆帷幕施工要求|水泥土墙等重力式支护结构位移|基坑开挖过程中.*渗水或漏水/u.test(stem)) {
      nextIds = replaceId(nextIds, "construction-auto-kp-069", "construction-auto-kp-021");
    }
  }

  if (nextIds.includes("construction-auto-kp-028")) {
    if (/汽车式起重机|吊装作业/u.test(stem)) {
      nextIds = replaceId(nextIds, "construction-auto-kp-028", "construction-auto-kp-056");
    } else if (/土方|基坑/u.test(stem)) {
      nextIds = replaceId(nextIds, "construction-auto-kp-028", "construction-auto-kp-021");
    } else if (/装饰装修/u.test(stem)) {
      nextIds = replaceId(nextIds, "construction-auto-kp-028", "construction-auto-kp-099");
    }
  }

  if (nextIds.includes("construction-auto-kp-025")) {
    nextIds = replaceId(nextIds, "construction-auto-kp-025", "construction-auto-kp-006");
  }

  return dedupeList(nextIds);
}

function refineQuestionKnowledgePoints(question) {
  const ids = Array.isArray(question.knowledgePointIds) ? question.knowledgePointIds.slice() : [];

  if (question.subjectId === "management") {
    question.knowledgePointIds = refineManagementIds(question, ids);
    return;
  }

  if (question.subjectId === "technology") {
    question.knowledgePointIds = refineTechnologyIds(question, ids);
    return;
  }

  if (question.subjectId === "construction") {
    question.knowledgePointIds = refineConstructionIds(question, ids);
  }
}

function collectBrokenReferences(examData) {
  const knowledgePointIds = new Set(examData.knowledgePoints.map((item) => item.id));
  const brokenBySubject = new Map();

  for (const question of examData.questionBank) {
    const subjectId = question.subjectId;
    if (!brokenBySubject.has(subjectId)) {
      brokenBySubject.set(subjectId, new Set());
    }
    for (const id of question.knowledgePointIds || []) {
      if (!knowledgePointIds.has(id)) {
        brokenBySubject.get(subjectId).add(id);
      }
    }
  }

  return brokenBySubject;
}

function countEmptyKnowledgePoints(examData, subjectId) {
  return examData.questionBank.filter(
    (question) => question.subjectId === subjectId && (!question.knowledgePointIds || question.knowledgePointIds.length === 0)
  ).length;
}

function pruneUnusedKnowledgePoints(examData) {
  const usedIds = new Set();
  for (const question of examData.questionBank) {
    for (const id of question.knowledgePointIds || []) {
      usedIds.add(id);
    }
  }
  examData.knowledgePoints = examData.knowledgePoints.filter((knowledgePoint) => usedIds.has(knowledgePoint.id));
}

function main() {
  const examData = loadExamData(SAMPLE_DATA_PATH);
  const beforeQuestionCount = examData.questionBank.length;

  const afterChemicalFilter = examData.questionBank.filter(
    (question) => !(question.subjectId === "management" && MANAGEMENT_CHEMICAL_SOURCE_RE.test(question.source || ""))
  );
  const removedManagementChemicalQuestions = beforeQuestionCount - afterChemicalFilter.length;
  examData.questionBank = afterChemicalFilter.filter((question) => !DROPPED_QUESTION_IDS.has(question.id));

  const removedDroppedQuestionIds = afterChemicalFilter.length - examData.questionBank.length;

  upsertKnowledgePoints(examData);

  for (const question of examData.questionBank) {
    repairQuestionContent(question);
    sanitizeQuestionText(question);
    refineQuestionKnowledgePoints(question);
  }

  const removedExactDuplicateQuestions = 0;

  pruneUnusedKnowledgePoints(examData);

  writeSampleData(SAMPLE_DATA_PATH, examData);

  const brokenBySubject = collectBrokenReferences(examData);
  const summary = {
    removedManagementChemicalQuestions,
    removedDroppedQuestionIds,
    removedExactDuplicateQuestions,
    totalQuestions: examData.questionBank.length,
    knowledgePoints: examData.knowledgePoints.length,
    brokenManagementIds: [...(brokenBySubject.get("management") || [])],
    brokenTechnologyIds: [...(brokenBySubject.get("technology") || [])],
    brokenConstructionIds: [...(brokenBySubject.get("construction") || [])],
    emptyConstructionKnowledgePointQuestions: countEmptyKnowledgePoints(examData, "construction"),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();
