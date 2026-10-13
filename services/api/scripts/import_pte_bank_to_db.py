import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add services/api to sys.path so we can import app models and db engine
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "services" / "api"))

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine
from app.models import AcademicQuestion, QuestionTypeConfigModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("pte_importer")

EXERCISE_MAP = {
    "Read Aloud": {
        "type": "RA",
        "name": "Read Aloud",
        "dir": "Read_Aloud",
        "prep_time": 35,
        "response_time": 40,
        "instruction": "Look at the text below. In 35 seconds, you must read this text aloud as naturally and clearly as possible.",
    },
    "Repeat Sentence": {
        "type": "RS",
        "name": "Repeat Sentence",
        "dir": "Repeat_Sentence",
        "prep_time": 3,
        "response_time": 15,
        "instruction": "Please listen carefully to the recording and repeat the sentence exactly as you hear it.",
    },
    "Summarize Group Discussion": {
        "type": "GD",
        "name": "Summarize Group Discussion",
        "dir": "Summarize_Group_Discussion",
        "prep_time": 10,
        "response_time": 60,
        "instruction": "You will hear a group discussion. Summarize the main points and different viewpoints expressed.",
    },
    "Describe Image": {
        "type": "DI",
        "name": "Describe Image",
        "dir": "Describe_Image",
        "prep_time": 25,
        "response_time": 40,
        "instruction": "Look at the image below. In 25 seconds, please speak into the microphone and describe in detail what the image is showing.",
    },
    "Respond to a Situation": {
        "type": "SI",
        "name": "Respond to a Situation",
        "dir": "Respond_to_a_Situation",
        "prep_time": 20,
        "response_time": 40,
        "instruction": "Listen to and read the situation described. In 20 seconds, provide an appropriate response to the situation.",
    },
    "Re-tell Lecture": {
        "type": "RL",
        "name": "Re-tell Lecture",
        "dir": "Re_tell_Lecture",
        "prep_time": 10,
        "response_time": 40,
        "instruction": "You will hear a lecture. After listening to the lecture, in 10 seconds, please speak into the microphone and retell what you have just heard from the lecture in your own words.",
    },
    "Answer Short Question": {
        "type": "ASQ",
        "name": "Answer Short Question",
        "dir": "Answer_Short_Question",
        "prep_time": 3,
        "response_time": 10,
        "instruction": "You will hear a question. Please give a simple and short answer. Often just one or a few words is enough.",
    },
}


def parse_question_data(exercise_name: str, item: Dict[str, Any]) -> Dict[str, Any]:
    """Parse raw JSON question item from data/pte-speaking into AcademicQuestion dict."""
    config = EXERCISE_MAP.get(exercise_name, {
        "type": "RA",
        "name": exercise_name,
        "prep_time": 30,
        "response_time": 40,
        "instruction": "Follow instructions on screen.",
    })

    q_type = config["type"]
    code = item.get("uid") or f"{q_type}-{item.get('id', 'ITEM')}"
    tested_raw = item.get("tested")
    try:
        tested = int(tested_raw) if tested_raw is not None else 50
    except (ValueError, TypeError):
        tested = 50

    # Derive difficulty from tested frequency in PTE Real Exam Pool
    if tested >= 70:
        difficulty = "EASY"
    elif tested <= 25:
        difficulty = "HARD"
    else:
        difficulty = "MEDIUM"


    is_predicted = bool(tested >= 40)
    raw_transcript = (item.get("transcript") or "").strip()
    topic_text = (item.get("topic") or "").strip()

    # Determine prompt, audio_script, sample_answer based on type
    if q_type == "RA":
        prompt = raw_transcript
        audio_script = None
        sample_answer = None
    elif q_type == "SI":
        prompt = raw_transcript if raw_transcript else config["instruction"]
        audio_script = None
        sample_answer = item.get("sample_answer")
    elif q_type == "DI":
        prompt = config["instruction"]
        audio_script = None
        sample_answer = raw_transcript if raw_transcript else None
    elif q_type in ("RS", "GD", "RL"):
        prompt = config["instruction"]
        audio_script = raw_transcript if raw_transcript else None
        sample_answer = None
    elif q_type == "ASQ":
        prompt = topic_text if topic_text else (raw_transcript if raw_transcript else config["instruction"])
        audio_script = raw_transcript if raw_transcript else None
        sample_answer = None
    else:
        prompt = raw_transcript or config["instruction"]
        audio_script = None
        sample_answer = None

    media_url = item.get("media_path") if item.get("has_media") else None

    # Clean title
    title = f"{config['name']} #{code}"

    tags = [config["name"], "PTE", "PTE-Speaking"]
    if is_predicted:
        tags.append("Forecast")

    return {
        "code": code,
        "skill": "SPEAKING",
        "type": q_type,
        "title": title,
        "prompt": prompt,
        "media_url": media_url,
        "audio_script": audio_script,
        "prep_time": config["prep_time"],
        "response_time": config["response_time"],
        "difficulty": difficulty,
        "status": "APPROVED",
        "is_predicted": is_predicted,
        "tags": tags,
        "sample_answer": sample_answer,
        "key_points": [],
    }


def import_pte_bank(
    data_dir: Optional[Path | str] = None,
    db_session: Optional[Session] = None,
    limit_per_type: Optional[int] = None,
) -> Dict[str, Any]:
    """Import PTE questions into PostgreSQL database."""
    if data_dir is None:
        data_dir = PROJECT_ROOT / "data" / "pte-speaking"
    else:
        data_dir = Path(data_dir)

    close_session_at_end = False
    if db_session is None:
        Base.metadata.create_all(bind=engine)
        session = SessionLocal()
        close_session_at_end = True
    else:
        session = db_session

    total_imported = 0
    total_updated = 0
    breakdown: Dict[str, int] = {}

    try:
        for exercise_name, conf in EXERCISE_MAP.items():
            json_file = data_dir / conf["dir"] / "questions.json"
            if not json_file.exists():
                logger.warning(f"File not found: {json_file}, skipping.")
                continue

            with open(json_file, "r", encoding="utf-8") as f:
                items = json.load(f)

            if limit_per_type:
                items = items[:limit_per_type]

            count_for_type = 0
            for item in items:
                parsed = parse_question_data(exercise_name, item)
                existing = session.scalar(
                    select(AcademicQuestion).where(AcademicQuestion.code == parsed["code"])
                )

                if existing:
                    # Idempotent update
                    existing.title = parsed["title"]
                    existing.prompt = parsed["prompt"]
                    existing.media_url = parsed["media_url"]
                    existing.audio_script = parsed["audio_script"]
                    existing.prep_time = parsed["prep_time"]
                    existing.response_time = parsed["response_time"]
                    existing.difficulty = parsed["difficulty"]
                    existing.status = parsed["status"]
                    existing.is_predicted = parsed["is_predicted"]
                    existing.tags = parsed["tags"]
                    existing.sample_answer = parsed["sample_answer"]
                    existing.updated_at = time.time()
                    total_updated += 1
                else:
                    new_q = AcademicQuestion(**parsed, updated_at=time.time())
                    session.add(new_q)
                    total_imported += 1

                count_for_type += 1

            session.commit()
            breakdown[conf["type"]] = count_for_type
            logger.info(f"Processed {count_for_type} questions for {exercise_name} ({conf['type']})")

        return {
            "total_imported": total_imported,
            "total_updated": total_updated,
            "breakdown": breakdown,
        }

    finally:
        if close_session_at_end:
            session.close()


def main():
    logger.info("Starting PTE Speaking Bank Import to Database...")
    data_dir = PROJECT_ROOT / "data" / "pte-speaking"
    summary = import_pte_bank(data_dir=data_dir)
    print("\n" + "=" * 60)
    print("[REPORT] BAO CAO NAP KHO CAU HOI PTE SPEAKING VAO DATABASE:")
    print("=" * 60)
    print(f"Tong so cau nap moi: {summary['total_imported']}")
    print(f"Tong so cau cap nhat: {summary['total_updated']}")
    print("Chi tiet tung dang bai:")
    for q_type, count in summary["breakdown"].items():
        print(f"  - Dang bai {q_type:<4}: {count:>4} cau hoi")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()

