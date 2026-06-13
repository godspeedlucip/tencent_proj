"""AI service with 5s timeout and JSON fallback for all LLM operations."""
import os
import httpx
from openai import OpenAI

FALLBACK_TIPS = [
    "今天的建议：尝试用'用户故事'的格式来梳理你手头的需求，这会让你的PRD更清晰。",
    "今天的建议：在评审会上主动记录其他人的反馈，这是快速学习产品思维的捷径。",
    "今天的建议：今天试着画一张你所负责模块的用户流程图，帮助理清逻辑。",
    "今天的建议：整理本周踩过的坑，写一小段反思——养成复盘的习惯比完成任何单一任务都重要。",
    "今天的建议：有卡点别憋着，在Check-in里写下来；导师看到卡点远比看到完美周报更愿意帮你。",
]

FALLBACK_OUTLINES = [
    {
        "recent_highlights": ["最近几周任务完成率保持在较高水平", "主动参与需求评审并提出有效建议"],
        "areas_to_discuss": ["某个技术工具的使用卡点可能需要额外培训", "下阶段的独立负责模块规划"],
        "suggested_questions": ["这周最有成就感的一件事是什么？", "需要我提供什么资源来帮助你跨越当前的卡点？", "你对下阶段想独立负责的方向有什么想法？"],
        "tone_hint": "以肯定成长为主线，针对技术卡点提供具体资源支持，不要让学生感到被指责。",
    }
]

FALLBACK_FEEDBACK_DRAFTS = [
    {"ai_draft": "本周在需求分析方面进步明显，用户访谈纪要质量高，逻辑清晰。建议下一步加强Figma原型制作能力，这会让你的方案表达更有说服力。"},
    {"ai_draft": "本周任务完成情况良好，对需求优先级的判断越来越准确。一个成长建议：在评审会上更主动地表达自己的观点，即使不完全正确也是学习过程。"},
    {"ai_draft": "本周进度有所放缓，主要在技术工具使用上遇到了卡点。不过能主动识别到自己的瓶颈并提出来，这本身就是成熟的表现。建议安排一次1:1专门聊聊工具培训资源。"},
]

FALLBACK_REPORT_ACTIONS = [
    "重点关注实习生[小胡]：连续情绪低落后首次出现周报逾期，建议HR主动介入沟通",
    "建议与导师[张哥]沟通，了解实习生Figma培训资源是否到位",
    "本周整体表现稳定，14名实习生任务完成率超过80%",
]


def _get_client():
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL") or os.getenv("LLM_BASE_URL")
    if not api_key:
        return None
    kwargs = {"api_key": api_key, "timeout": 4.0, "max_retries": 0}
    if base_url:
        kwargs["base_url"] = base_url
    return OpenAI(**kwargs)


def generate_daily_tip(intern_name: str, _context: dict | None = None) -> dict:
    """Generate one daily growth tip. Falls back to pre-baked tips."""
    client = _get_client()
    if client:
        try:
            resp = client.chat.completions.create(
                model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
                messages=[{"role": "user", "content": f"给一名叫{intern_name}的产品实习生写一条简短(<=50字)的成长建议，语气温暖鼓励。"}],
                max_tokens=80,
            )
            return {"tip": resp.choices[0].message.content.strip(), "source": "ai"}
        except Exception:
            pass
    import random
    return {"tip": random.choice(FALLBACK_TIPS), "source": "fallback"}


def generate_talking_points(intern_name: str, _context: dict | None = None) -> dict:
    """Generate 1:1 communication outline with fallback."""
    client = _get_client()
    if client:
        try:
            resp = client.chat.completions.create(
                model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
                messages=[{"role": "user", "content": f"为导师生成针对实习生{intern_name}的1:1沟通提纲，包含：recent_highlights(2-3条), areas_to_discuss(2-3条), suggested_questions(2-3条), tone_hint(1句话)。用JSON格式返回。"}],
                max_tokens=300,
            )
            import json
            outline = json.loads(resp.choices[0].message.content)
            return {"outline": outline, "source": "ai"}
        except Exception:
            pass
    import random
    outline = random.choice(FALLBACK_OUTLINES)
    return {"outline": outline, "source": "fallback"}


def generate_feedback_draft(intern_name: str, _context: dict | None = None) -> dict:
    """Generate mentor feedback draft with fallback."""
    client = _get_client()
    if client:
        try:
            resp = client.chat.completions.create(
                model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
                messages=[{"role": "user", "content": f"为一名叫{intern_name}的产品实习生写一段导师反馈(<=80字)，包含肯定和成长建议，语气专业温暖。"}],
                max_tokens=120,
            )
            return {"ai_draft": resp.choices[0].message.content.strip(), "source": "ai"}
        except Exception:
            pass
    import random
    draft = random.choice(FALLBACK_FEEDBACK_DRAFTS)
    draft["source"] = "fallback"
    return draft


def generate_weekly_report_actions(_context: dict | None = None) -> list[str]:
    """Generate weekly report action recommendations with fallback."""
    client = _get_client()
    if client:
        try:
            resp = client.chat.completions.create(
                model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
                messages=[{"role": "user", "content": "基于实习生风险数据生成3条HR周报行动建议(每条<=50字)，用JSON数组返回。"}],
                max_tokens=200,
            )
            import json
            return {"actions": json.loads(resp.choices[0].message.content), "source": "ai"}
        except Exception:
            pass
    return {"actions": FALLBACK_REPORT_ACTIONS, "source": "fallback"}


def generate_fit_report(intern_name: str, _context: dict | None = None) -> dict:
    """Generate fit report recommendation with fallback."""
    return {
        "growth_evidence": f"{intern_name}在实习期间从基础执行逐步展现出独立思考和需求洞察能力。",
        "ai_recommendation": "observe",
        "source": "fallback",
    }
