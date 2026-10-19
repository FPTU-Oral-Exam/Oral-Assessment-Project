import sys
import time
from sqlalchemy import select
from app.db import SessionLocal
from app.models import Rubric, AcademicMatrix

PTE_SPEAKING_CRITERIA = [
    {
        "id": "content",
        "name": "Content",
        "description": "Độ chính xác nội dung, độ bao phủ ý và từ khóa chính",
        "max_score": 5.0,
        "weight": 34.0,
        "guiding_question": "Does your response include all the words in the reading text and only these words?",
        "scoring_method": "Content is scored by counting the number of correct words in your response. Replacements insertions and omissions of words will negatively affect your score.",
        "descriptors": [
            {"level": "5 điểm", "score_range": "5 đ", "description": "All words in the response from the prompt"},
            {"level": "4 điểm", "score_range": "4 đ", "description": "At least 75% of words in the response from the prompt"},
            {"level": "3 điểm", "score_range": "3 đ", "description": "At least 50% of words in the response from the prompt"},
            {"level": "2 điểm", "score_range": "2 đ", "description": "At least 25% of words in the response from the prompt"},
            {"level": "1 điểm", "score_range": "1 đ", "description": "Less than 25% of words in the response from the prompt"},
            {"level": "0 điểm", "score_range": "0 đ", "description": "Almost nothing from the prompt in the response"},
        ],
    },
    {
        "id": "oral_fluency",
        "name": "Oral Fluency",
        "description": "Độ trôi chảy, nhịp điệu phát âm, ngắt nghỉ câu tự nhiên",
        "max_score": 5.0,
        "weight": 33.0,
        "guiding_question": "Does your response demonstrate a smooth, effortless and natural rate of Speech?",
        "scoring_method": "Oral fluency is scored by determining if your rhythm, phrasing and stress are smooth. The best responses are spoken at a constant and natural rate of speech with appropriate phrasing. Hesitations, repetitions and false starts will negatively affect your score.",
        "descriptors": [
            {
                "level": "5 điểm",
                "score_range": "5 đ",
                "description": "Speech shows smooth rhythm and phrasing. There are no hesitations, repetitions, false starts or non-native phonological simplifications",
            },
            {
                "level": "4 điểm",
                "score_range": "4 đ",
                "description": "Speech has an acceptable rhythm with appropriate phrasing and word emphasis. There is no more than one hesitation, one repetition or a false start. There are no significant non-native phonological simplifications",
            },
            {
                "level": "3 điểm",
                "score_range": "3 đ",
                "description": "Speech is at an acceptable speed but may be uneven. There may be more than one hesitation, but most words are spoken in continuous phrases. There are few repetitions or false starts. There are no long pauses and speech does not sound staccato",
            },
            {
                "level": "2 điểm",
                "score_range": "2 đ",
                "description": "Speech may be uneven or staccato. Speech (if >= 6 words) has at least one smooth three-word run, and no more than two or three hesitations, repetitions or false starts. There may be one long pause, but not two or more",
            },
            {
                "level": "1 điểm",
                "score_range": "1 đ",
                "description": "Speech has irregular phrasing or sentence rhythm. Poor phrasing, staccato or syllabic timing, and/or multiple hesitations, repetitions, and/or false starts make spoken performance notably uneven or discontinuous. Long utterances may have one or two long pauses and inappropriate sentencelevel word emphasis",
            },
            {
                "level": "0 điểm",
                "score_range": "0 đ",
                "description": "Speech is slow and labored with little discernable phrase grouping, multiple hesitations, pauses, false starts, and/or major phonological simplifications. Most words are isolated, and there may be more than one long pause",
            },
        ],
    },
    {
        "id": "pronunciation",
        "name": "Pronunciation",
        "description": "Độ chuẩn xác nguyên âm, phụ âm và trọng âm từ",
        "max_score": 5.0,
        "weight": 33.0,
        "guiding_question": "Does your response demonstrate your ability to produce speech sounds in a similar way to most regular speakers of the language?",
        "scoring_method": "Pronunciation is scored by determining if your speech is easily understandable to most regular speakers of the language. The best responses contain vowels and consonants pronounced in a native-like way, as well as words and phrases stressed correctly. Responses should also be immediately understandable to a regular speaker of the language.",
        "descriptors": [
            {
                "level": "5 điểm",
                "score_range": "5 đ",
                "description": "All vowels and consonants are produced in a manner that is easily understood by regular speakers of the language. The speaker uses assimilation and deletions appropriate to continuous speech. Stress is placed correctly in all words and sentence-level stress is fully appropriate",
            },
            {
                "level": "4 điểm",
                "score_range": "4 đ",
                "description": "Vowels and consonants are produced clearly and unambiguously. A few minor consonant, vowel or stress distortions do not affect intelligibility. All words are easily understandable. A few consonants or consonant sequences may be distorted. Stress is placed correctly on all common words, and sentence level stress is reasonable",
            },
            {
                "level": "3 điểm",
                "score_range": "3 đ",
                "description": "Most vowels and consonants are pronounced correctly. Some consistent errors might make a few words unclear. A few consonants in certain contexts may be regularly distorted, omitted or mispronounced. Stressdependent vowel reduction may occur on a few words",
            },
            {
                "level": "2 điểm",
                "score_range": "2 đ",
                "description": "Some consonants and vowels are consistently mispronounced in a nonnative like manner. At least 2/3 of speech is intelligible, but listeners might need to adjust to the accent. Some consonants are regularly omitted, and consonant sequences may be simplified. Stress may be placed incorrectly on some words or be unclear",
            },
            {
                "level": "1 điểm",
                "score_range": "1 đ",
                "description": "Many consonants and vowels are mispronounced, resulting in a strong intrusive foreign accent. Listeners may have difficulty understanding about 1/3 of the words. Many consonants may be distorted or omitted. Consonant sequences may be non-English. Stress is placed in a non-English manner; unstressed words may be reduced or omitted and a few syllables added or missed",
            },
            {
                "level": "0 điểm",
                "score_range": "0 đ",
                "description": "Pronunciation seems completely characteristic of another language. Many consonants and vowels are mispronounced, misordered or omitted. Listeners may find more than 1/2 of the speech unintelligible. Stressed and unstressed syllables are realized in a non-English manner. Several words may have the wrong number of syllables",
            },
        ],
    },
]


def seed_pte_rubric():
    db = SessionLocal()
    try:
        rubric_name = "PTE Academic Speaking Official Rubric"
        rubric = db.scalar(
            select(Rubric).where(Rubric.name == rubric_name).limit(1)
        )

        now = time.time()
        if not rubric:
            rubric = Rubric(
                name=rubric_name,
                description="Bộ Tiêu chuẩn Chấm điểm Speaking chuẩn hóa PTE Academic (Thang điểm 5, gồm 3 tiêu chí: Content, Oral Fluency, Pronunciation với đầy đủ 6 mức điểm chi tiết).",
                criteria=PTE_SPEAKING_CRITERIA,
                version=1,
                updated_at=now,
            )
            db.add(rubric)
            db.commit()
            db.refresh(rubric)
            print(f"[OK] Đã tạo mới Rubric: '{rubric.name}' (ID: {rubric.id})")
        else:
            rubric.criteria = PTE_SPEAKING_CRITERIA
            rubric.description = "Bộ Tiêu chuẩn Chấm điểm Speaking chuẩn hóa PTE Academic (Thang điểm 5, gồm 3 tiêu chí: Content, Oral Fluency, Pronunciation với đầy đủ 6 mức điểm chi tiết)."
            rubric.updated_at = now
            db.commit()
            print(f"[OK] Đã cập nhật Rubric: '{rubric.name}' (ID: {rubric.id})")

        # Đồng bộ gắn rubric_id vào Ma trận đề thi mặc định PTE-STD-SPEAKING
        matrix = db.scalar(
            select(AcademicMatrix).where(
                AcademicMatrix.code == "PTE-STD-SPEAKING",
                AcademicMatrix.deleted_at.is_(None),
            ).limit(1)
        )
        if matrix:
            matrix.rubric_id = rubric.id
            matrix.updated_at = now
            db.commit()
            print(f"[OK] Đã liên kết Rubric vào Ma trận '{matrix.code}'")
        else:
            print("[INFO] Chưa tìm thấy ma trận PTE-STD-SPEAKING (sẽ được liên kết khi khởi động)")

    finally:
        db.close()


if __name__ == "__main__":
    seed_pte_rubric()
