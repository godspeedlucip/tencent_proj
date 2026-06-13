"""AI service with real LLM integration and context-rich prompts."""
import os
import json
import random
import datetime
import httpx  # kept for potential future use
from openai import OpenAI

# ============================================================================
# Fallback Data
# ============================================================================

FALLBACK_TIPS = [
    "今天的建议：尝试用'用户故事'的格式来梳理你手头的需求，这会让你的PRD更清晰。",
    "今天的建议：在评审会上主动记录其他人的反馈，这是快速学习产品思维的捷径。",
    "今天的建议：今天试着画一张你所负责模块的用户流程图，帮助理清逻辑。",
    "今天的建议：整理本周踩过的坑，写一小段反思——养成复盘的习惯比完成任何单一任务都重要。",
    "今天的建议：有卡点别憋着，在Check-in里写下来；导师看到卡点远比看到完美周报更愿意帮你。",
    "今天的建议：今天花15分钟复盘一下本周学到的新技能，写下来会让记忆更深刻。",
    "今天的建议：主动约一位同事喝杯咖啡聊聊他们的工作，跨职能的视角会让你成长更快。",
    "今天的建议：试着把你手头任务的优先级用数据量化，练习用数据而非感觉来做决策。",
    "今天的建议：收到反馈后先别急着解释或反驳，试着说'谢谢，我消化一下'——这是职业成熟度的体现。",
    "今天的建议：今天找一个你不太熟悉的工具或平台，花20分钟浏览官方文档，扩大你的工具箱。",
]

FALLBACK_OUTLINES = [
    {
        "recent_highlights": ["最近几周任务完成率保持在较高水平", "主动参与需求评审并提出有效建议"],
        "areas_to_discuss": ["某个技术工具的使用卡点可能需要额外培训", "下阶段的独立负责模块规划"],
        "suggested_questions": [
            "这周最有成就感的一件事是什么？",
            "需要我提供什么资源来帮助你跨越当前的卡点？",
            "你对下阶段想独立负责的方向有什么想法？",
        ],
        "tone_hint": "以肯定成长为主线，针对技术卡点提供具体资源支持，不要让学生感到被指责。",
    },
    {
        "recent_highlights": ["任务交付质量稳步提升，细节把控能力增强", "在团队分享会上主动提出问题"],
        "areas_to_discuss": ["跨团队协作的沟通方式优化", "对产品整体目标的理解深度"],
        "suggested_questions": [
            "最近哪个任务让你觉得最有挑战？你是怎么克服的？",
            "你觉得团队目前的工作方式有哪些可以改进的地方？",
            "如果让你独立负责一个小模块，你最想尝试什么？",
        ],
        "tone_hint": "鼓励实习生表达真实想法，营造安全对话空间，重点引导独立思考。",
    },
    {
        "recent_highlights": ["独立完成了首个功能模块的需求文档", "与设计师的协作越来越顺畅"],
        "areas_to_discuss": ["如何在需求评审中更好地表达自己的方案", "从执行到思考的角色切换"],
        "suggested_questions": [
            "你觉得自己这阶段最大的进步是什么？",
            "有没有遇到让你觉得不知道怎么办才好的情况？",
            "你希望半年后的自己具备什么能力？",
        ],
        "tone_hint": "关注实习生的心态成长，帮助其建立从执行者到思考者的过渡意识。",
    },
]

FALLBACK_FEEDBACK_DRAFTS = [
    {
        "ai_draft": "本周在需求分析方面进步明显，用户访谈纪要质量高，逻辑清晰。建议下一步加强Figma原型制作能力，这会让你的方案表达更有说服力。"
    },
    {
        "ai_draft": "本周任务完成情况良好，对需求优先级的判断越来越准确。一个成长建议：在评审会上更主动地表达自己的观点，即使不完全正确也是学习过程。"
    },
    {
        "ai_draft": "本周进度有所放缓，主要在技术工具使用上遇到了卡点。不过能主动识别到自己的瓶颈并提出来，这本身就是成熟的表现。建议安排一次1:1专门聊聊工具培训资源。"
    },
    {
        "ai_draft": "本周表现亮眼，不仅完成了既定任务，还主动优化了信息架构文档，体现了owner意识。下一步可以尝试对更模糊的需求进行拆解和定义，锻炼高阶产品思维。"
    },
    {
        "ai_draft": "本周在团队协作方面有明显成长，能主动同步进度、对齐预期。建议在撰写文档时增加竞品分析的维度，这会让你的方案更有深度。"
    },
]

FALLBACK_REPORT_ACTIONS = [
    "重点关注实习生[小胡]：连续情绪低落后首次出现周报逾期，建议HR主动介入沟通",
    "建议与导师[张哥]沟通，了解实习生Figma培训资源是否到位",
    "本周整体表现稳定，14名实习生任务完成率超过80%",
    "实习生[小李]连续三周任务完成率100%，可考虑安排更具挑战性的独立模块",
    "建议本周召开导师同步会，对齐实习生中期评估标准和反馈方式",
]

FALLBACK_CHECKIN_ANALYSIS = {
    "growth_keywords": ["主动学习", "需求理解", "工具掌握"],
    "risk_signals": [],
    "sentiment_summary": "本周情绪平稳，日常工作按计划推进。",
    "suggested_actions": ["继续关注日常任务完成质量", "鼓励在Check-in中多记录具体收获"],
}

FALLBACK_FIT_REPORT = {
    "growth_evidence": "实习期间从基础执行逐步展现出独立思考和需求洞察能力。",
    "ai_recommendation": "observe",
    "strengths": ["需求分析能力", "团队协作", "学习意愿强"],
    "gaps": ["独立决策的信心有待提升", "跨模块的系统性思维需加强"],
    "verification_points": ["连续四周任务完成率 > 80%", "导师反馈中至少2次提及主动沟通", "评审会上至少1次独立表达观点"],
}


# ============================================================================
# LLM Client Helpers
# ============================================================================

def _get_client():
    """Return OpenAI-compatible client or None if no API key configured.

    Reads API key from LLM_API_KEY or OPENAI_API_KEY.
    Reads base URL from LLM_BASE_URL or OPENAI_BASE_URL.
    """
    api_key = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("LLM_BASE_URL") or os.getenv("OPENAI_BASE_URL")
    if not api_key:
        return None
    kwargs = {"api_key": api_key, "timeout": 4.0, "max_retries": 0}
    if base_url:
        kwargs["base_url"] = base_url
    return OpenAI(**kwargs)


def _get_model(for_report: bool = False) -> str:
    """Return model name from environment variables.

    Uses LLM_REPORT_MODEL for weekly/fit reports (with fallback to LLM_MODEL).
    Uses LLM_MODEL for daily tips and check-in analysis (default gpt-4o-mini).
    """
    if for_report:
        return os.getenv("LLM_REPORT_MODEL") or os.getenv("LLM_MODEL", "gpt-4o-mini")
    return os.getenv("LLM_MODEL", "gpt-4o-mini")


def _ai_or_fallback(client, messages, max_tokens, model, fallback_data):
    """Call LLM with timeout; return fallback on error or missing client.

    Args:
        client: OpenAI client or None
        messages: list of chat messages
        max_tokens: max tokens for the response
        model: model name string
        fallback_data: data to return when AI is unavailable

    Returns:
        Tuple of (result, source) where result is parsed JSON dict, raw string,
        or the fallback_data itself.  source is "ai" or "fallback".
    """
    if client is None:
        return (fallback_data, "fallback")
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.7,
        )
        content = resp.choices[0].message.content.strip()
        # Attempt JSON parse; fall back to raw text if not valid JSON
        try:
            return (json.loads(content), "ai")
        except (json.JSONDecodeError, ValueError):
            return (content, "ai")
    except Exception:
        return (fallback_data, "fallback")


def _now_iso() -> str:
    """Return current UTC timestamp in ISO 8601 format."""
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


# ============================================================================
# Public Functions
# ============================================================================

def generate_daily_tip(intern_name: str, context: dict | None = None) -> dict:
    """Generate a personalized daily growth tip with fallback.

    Args:
        intern_name: Name of the intern
        context: Optional dict with task_completion_rate, recent_checkin, role, week

    Returns:
        dict with keys: tip, source, generated_at
    """
    client = _get_client()
    model = _get_model(for_report=False)
    fallback_tip = random.choice(FALLBACK_TIPS)

    # Build context-rich system prompt
    context_lines = [f"你是一位经验丰富的产品导师，正在指导一位名叫{intern_name}的产品实习生。"]
    if context:
        role = context.get("role", "产品实习生")
        week = context.get("week", "")
        rate = context.get("task_completion_rate")
        recent = context.get("recent_checkin", "")
        context_lines.append(f"该实习生当前角色：{role}。")
        if week:
            context_lines.append(f"当前是第{week}周。")
        if rate is not None:
            context_lines.append(f"本周任务完成率约为{rate}%。")
        if recent:
            context_lines.append(f"最近的Check-in记录：{recent}")
    context_lines.append("请生成一条温暖、鼓励的成长建议，不超过60字。不要使用编号或引用格式，直接给出建议文本。")

    system_prompt = " ".join(context_lines)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"给{intern_name}一条今天的产品成长建议。"},
    ]

    result, source = _ai_or_fallback(client, messages, max_tokens=90, model=model, fallback_data=fallback_tip)

    if source == "fallback":
        tip = result if isinstance(result, str) else random.choice(FALLBACK_TIPS)
    else:
        tip = result if isinstance(result, str) else str(result)

    return {"tip": tip, "source": source, "generated_at": _now_iso()}


def generate_talking_points(intern_name: str, context: dict | None = None) -> dict:
    """Generate a 1:1 communication outline for mentor-intern meetings.

    Args:
        intern_name: Name of the intern
        context: Optional dict with tasks, checkins, emotion_trend

    Returns:
        dict with keys: outline (dict), source, generated_at
    """
    client = _get_client()
    model = _get_model(for_report=False)
    fallback_outline = random.choice(FALLBACK_OUTLINES)

    context_lines = [
        f"你是一位经验丰富的产品导师，正在为与实习生{intern_name}的1:1沟通做准备。",
        "请生成一个沟通提纲，以JSON格式返回，包含以下字段：",
        "- recent_highlights: 2-3条近期值得肯定的亮点",
        "- areas_to_discuss: 2-3条需要讨论的成长领域",
        "- suggested_questions: 2-3条开放式提问建议",
        "- tone_hint: 1句话的沟通语气指引",
    ]
    if context:
        tasks = context.get("tasks", "")
        checkins = context.get("checkins", "")
        emotion = context.get("emotion_trend", "")
        if tasks:
            context_lines.append(f"近期任务情况：{tasks}")
        if checkins:
            context_lines.append(f"近期Check-in摘要：{checkins}")
        if emotion:
            context_lines.append(f"近期情绪趋势：{emotion}")
    context_lines.append("只返回JSON，不要包含markdown代码块标记或其他解释文字。")

    system_prompt = "\n".join(context_lines)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"请为{intern_name}生成1:1沟通提纲。"},
    ]

    result, source = _ai_or_fallback(client, messages, max_tokens=350, model=model, fallback_data=fallback_outline)

    if source == "fallback":
        outline = result if isinstance(result, dict) else random.choice(FALLBACK_OUTLINES)
    else:
        outline = result if isinstance(result, dict) else {"raw_content": result}

    return {"outline": outline, "source": source, "generated_at": _now_iso()}


def generate_feedback_draft(intern_name: str, context: dict | None = None) -> dict:
    """Generate a mentor feedback draft for an intern.

    Args:
        intern_name: Name of the intern
        context: Optional dict with recent_performance, tasks_completed, strengths, areas_for_growth

    Returns:
        dict with keys: ai_draft (str), source, generated_at
    """
    client = _get_client()
    model = _get_model(for_report=False)
    fallback_draft = random.choice(FALLBACK_FEEDBACK_DRAFTS)

    system_lines = [
        f"你是一位经验丰富的产品导师，正在为实习生{intern_name}撰写本周反馈。",
        "反馈要求：包含1-2句肯定进步的具体描述，1-2句成长建议，语气专业温暖。",
        "总长度不超过100字，不要使用编号或列表格式。",
    ]
    if context:
        performance = context.get("recent_performance", "")
        tasks = context.get("tasks_completed", "")
        strengths = context.get("strengths", "")
        gaps = context.get("areas_for_growth", "")
        if performance:
            system_lines.append(f"近期表现：{performance}")
        if tasks:
            system_lines.append(f"本周完成任务：{tasks}")
        if strengths:
            system_lines.append(f"已展现的优势：{strengths}")
        if gaps:
            system_lines.append(f"待成长方向：{gaps}")

    system_prompt = " ".join(system_lines)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"请为{intern_name}写一段本周导师反馈。"},
    ]

    result, source = _ai_or_fallback(client, messages, max_tokens=150, model=model, fallback_data=fallback_draft)

    if source == "fallback":
        draft = result if isinstance(result, dict) else random.choice(FALLBACK_FEEDBACK_DRAFTS)
    else:
        draft = result if isinstance(result, dict) else {"ai_draft": result}

    # Ensure ai_draft key exists
    if isinstance(draft, dict) and "ai_draft" not in draft:
        draft = {"ai_draft": json.dumps(draft, ensure_ascii=False)}

    return {"ai_draft": draft.get("ai_draft", str(draft)), "source": source, "generated_at": _now_iso()}


def analyze_checkin(checkin_text: str, intern_context: dict | None = None) -> dict:
    """Analyze a Check-in entry for growth keywords, risk signals, and sentiment.

    This function provides AI-powered or fallback analysis of intern daily/weekly
    Check-in text to surface growth indicators, potential risks, and emotional state.

    Args:
        checkin_text: The raw Check-in text content
        intern_context: Optional dict with intern_name, role, week, history_summary

    Returns:
        dict with keys:
            data: {growth_keywords, risk_signals, sentiment_summary, suggested_actions}
            source: "ai" | "fallback"
            generated_at: ISO 8601 timestamp
    """
    client = _get_client()
    model = _get_model(for_report=False)

    system_lines = [
        "你是一位富有洞察力的产品导师，正在分析实习生的Check-in记录。",
        "请以JSON格式返回分析结果，包含以下字段：",
        "- growth_keywords: 从文本中提取的3-5个成长关键词（如\"需求理解\"\"主动沟通\"\"工具学习\"）",
        "- risk_signals: 识别到的风险信号列表（如\"连续熬夜\"\"情绪低落\"\"任务阻塞\"），无则返回空数组",
        "- sentiment_summary: 1-2句话概括该实习生的情绪状态和工作状态",
        "- suggested_actions: 2-3条导师可采取的具体行动建议",
        "只返回JSON，不要包含markdown代码块标记。",
    ]

    if intern_context:
        name = intern_context.get("intern_name", "实习生")
        role = intern_context.get("role", "")
        week = intern_context.get("week", "")
        history = intern_context.get("history_summary", "")
        if role:
            system_lines.insert(1, f"该实习生角色：{role}。")
        if week:
            system_lines.insert(1, f"当前第{week}周。")
        if history:
            system_lines.insert(1, f"历史表现摘要：{history}")

    system_prompt = "\n".join(system_lines)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"请分析以下Check-in内容：\n\n{checkin_text}"},
    ]

    result, source = _ai_or_fallback(
        client, messages, max_tokens=300, model=model, fallback_data=FALLBACK_CHECKIN_ANALYSIS
    )

    if source == "fallback":
        data = result if isinstance(result, dict) else dict(FALLBACK_CHECKIN_ANALYSIS)
    else:
        data = result if isinstance(result, dict) else {"raw_analysis": result}

    # Ensure all expected keys exist
    for key in ("growth_keywords", "risk_signals", "sentiment_summary", "suggested_actions"):
        if key not in data:
            data[key] = FALLBACK_CHECKIN_ANALYSIS.get(key, [])

    return {"data": data, "source": source, "generated_at": _now_iso()}


def generate_weekly_report_actions(context: dict | None = None) -> dict:
    """Generate HR weekly report action recommendations.

    Args:
        context: Optional dict with summary_stats, risk_interns, completion_rates, highlights

    Returns:
        dict with keys: actions (list of str), source, generated_at
    """
    client = _get_client()
    model = _get_model(for_report=True)  # Tiered: uses LLM_REPORT_MODEL

    system_lines = [
        "你是一位HR数据分析师，正在撰写本周实习生管理周报的行动建议。",
        "请基于提供的统计数据生成3-4条本周HR应该执行的行动建议。",
        "每条建议不超过50字，具体可行，指向明确的人或事。",
        "以JSON数组格式返回，只返回数组，不要包含markdown代码块。",
    ]

    if context:
        stats = context.get("summary_stats", "")
        risks = context.get("risk_interns", "")
        rates = context.get("completion_rates", "")
        highlights = context.get("highlights", "")
        if stats:
            system_lines.append(f"本周整体统计：{stats}")
        if risks:
            system_lines.append(f"需关注的风险实习生：{risks}")
        if rates:
            system_lines.append(f"任务完成率数据：{rates}")
        if highlights:
            system_lines.append(f"本周亮点：{highlights}")

    system_prompt = "\n".join(system_lines)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "请生成本周HR周报行动建议。"},
    ]

    result, source = _ai_or_fallback(
        client, messages, max_tokens=250, model=model, fallback_data=FALLBACK_REPORT_ACTIONS
    )

    if source == "fallback":
        actions = result if isinstance(result, list) else list(FALLBACK_REPORT_ACTIONS)
    else:
        actions = result if isinstance(result, list) else [str(result)]

    return {"actions": actions, "source": source, "generated_at": _now_iso()}


def generate_fit_report(intern_name: str, context: dict | None = None) -> dict:
    """Generate a comprehensive fit assessment report for an intern.

    Used by recruiters to evaluate intern readiness for return offers or
    full-time conversion.  Provides structured evidence plus an AI-driven
    recommendation.

    Args:
        intern_name: Name of the intern
        context: Optional dict with scores, tasks, feedback, mentor_notes, peer_feedback

    Returns:
        dict with keys:
            data: {
                growth_evidence, ai_recommendation,
                strengths, gaps, verification_points
            }
            source: "ai" | "fallback"
            generated_at: ISO 8601 timestamp
    """
    client = _get_client()
    model = _get_model(for_report=True)  # Tiered: uses LLM_REPORT_MODEL

    system_lines = [
        f"你是一位资深招聘专家，正在对产品实习生{intern_name}进行留用评估。",
        "请以JSON格式返回评估报告，包含以下字段：",
        '- growth_evidence: 2-3句话描述该实习生的成长轨迹和关键证据',
        '- ai_recommendation: 评估建议，取值为 "strong_hire" | "hire" | "observe" | "risk"',
        "- strengths: 3-5个关键优势",
        "- gaps: 2-3个待提升领域",
        "- verification_points: 3-4个验证建议（用于在终面中进一步考察的关键问题或场景）",
        "只返回JSON，不要包含markdown代码块标记。",
    ]

    if context:
        scores = context.get("scores", "")
        tasks = context.get("tasks", "")
        feedback = context.get("feedback", "")
        mentor = context.get("mentor_notes", "")
        peers = context.get("peer_feedback", "")
        if scores:
            system_lines.append(f"评估评分：{scores}")
        if tasks:
            system_lines.append(f"完成任务概况：{tasks}")
        if feedback:
            system_lines.append(f"导师反馈摘要：{feedback}")
        if mentor:
            system_lines.append(f"导师笔记：{mentor}")
        if peers:
            system_lines.append(f"同事反馈：{peers}")

    system_prompt = "\n".join(system_lines)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"请为{intern_name}生成留用评估报告。"},
    ]

    result, source = _ai_or_fallback(
        client, messages, max_tokens=400, model=model, fallback_data=FALLBACK_FIT_REPORT
    )

    if source == "fallback":
        data = result if isinstance(result, dict) else dict(FALLBACK_FIT_REPORT)
    else:
        data = result if isinstance(result, dict) else {"raw_report": result}

    # Ensure all expected keys exist
    for key in ("growth_evidence", "ai_recommendation", "strengths", "gaps", "verification_points"):
        if key not in data:
            data[key] = FALLBACK_FIT_REPORT.get(key, "observe" if key == "ai_recommendation" else [])

    return {"data": data, "source": source, "generated_at": _now_iso()}
