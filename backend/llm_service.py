"""LLM-generated, educator-facing explanations for behavioral deviation signals.

Uses Claude Sonnet 4.6 via the Emergent universal key. Strict guardrails keep
the language non-accusatory and human-in-the-loop.
"""
import os
import logging

<<<<<<< HEAD
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
except ImportError:
    LlmChat = None
    class UserMessage:
        def __init__(self, text):
            self.text = text
    class TextDelta:
        pass
    class StreamDone:
        pass
=======
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
>>>>>>> 21a94e37f07a08c0383f267b7f4dcacd6fa198e7

logger = logging.getLogger(__name__)

SYSTEM = (
    "You are CONTINUUM's explanation engine for a university academic-integrity "
    "analytics platform. Your role is to write a short, neutral, educator-facing "
    "explanation of a behavioral deviation signal.\n\n"
    "STRICT RULES:\n"
    "- NEVER claim the student cheated, used AI, committed fraud, or is guilty.\n"
    "- NEVER use words: cheater, fraud, guilty, confirmed cheating, AI-generated, suspicious.\n"
    "- Describe ONLY statistical / behavioral deviations vs the student's own history.\n"
    "- Frame everything as a pattern change that requires human educator review.\n"
    "- Emphasize this is not a determination of misconduct.\n"
    "- 3-4 sentences. Calm, precise, professional. No headings, no markdown."
)


async def generate_llm_explanation(signal: dict) -> str:
<<<<<<< HEAD
    if LlmChat is None:
        # Fallback when emergentintegrations is not available
        logger.warning("emergentintegrations module not available. Returning placeholder explanation.")
        return f"This behavioral signal for {signal.get('student_name', 'student')} requires manual review."
    
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        logger.warning("EMERGENT_LLM_KEY not set. Returning placeholder explanation.")
        return f"This behavioral signal for {signal.get('student_name', 'student')} requires manual review."
    
=======
    key = os.environ["EMERGENT_LLM_KEY"]
>>>>>>> 21a94e37f07a08c0383f267b7f4dcacd6fa198e7
    f = signal["factors"]
    prompt = (
        f"Student: {signal['student_name']}. Course: {signal['course_code']} — {signal['course_name']}. "
        f"Semester: {signal['semester']}. Signal type: {signal['signal_type']}. Severity: {signal['severity']}.\n"
        f"Deviation factors (0-100, vs the student's own historical baseline over the previous 4 semesters):\n"
        f"- Writing-style deviation: {f['writing']}%\n"
        f"- Submission-pattern deviation: {f['submission']}%\n"
        f"- Performance deviation: {f['performance']}%\n"
        f"- Longitudinal change: {f['longitudinal']}%\n"
        f"Historical baseline: previous 4 semesters. Current observation: last 3 submissions.\n"
        f"Write the explanation now."
    )
    chat = LlmChat(api_key=key, session_id=f"explain-{signal['id']}", system_message=SYSTEM) \
        .with_model("anthropic", "claude-sonnet-4-6")
    out = ""
    async for ev in chat.stream_message(UserMessage(text=prompt)):
        if isinstance(ev, TextDelta):
            out += ev.content
        elif isinstance(ev, StreamDone):
            break
    return out.strip()
