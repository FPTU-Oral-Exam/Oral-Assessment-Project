"""
Demo Grading Endpoint
Cho phép record audio và chấm điểm THẬT Part 1 và Part 2
"""

import io
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import numpy as np
import wave

from . import fluency, pronunciation_wer, metrics, pte_read_aloud, pte_repeat_sentence, pte_describe_image, pte_retell_lecture, pte_answer_short_question

STATIC_DIR = Path(__file__).parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/demo", tags=["demo-grading"])

DEFAULT_PTE_RA_TEXT = (
    "Before the discovery of Australia, people in the old world were convinced that all swans were white, "
    "an unassailable belief as it seemed completely confirmed by empirical evidence. "
    "The sighting of the first black swan might have been an interesting surprise for a few scientists, "
    "but that is not where the significance of the story lies."
)

DEFAULT_PTE_RS_TEXT = "At that time, people moved from towns to villages."


class Part1Request(BaseModel):
    question: Optional[str] = "PTE Read Aloud - Read the passage clearly and naturally."
    reference_text: str = DEFAULT_PTE_RA_TEXT


class Part2Request(BaseModel):
    reference_text: str = DEFAULT_PTE_RS_TEXT


class GradingResult(BaseModel):
    part_type: str
    transcript: str
    stt_confidence: float
    score: float
    fluency_metrics: dict
    pronunciation_metrics: Optional[dict] = None
    lexical_metrics: Optional[dict] = None
    feedback: str
    # PTE Academic Enhancements
    scores: Optional[dict] = None
    overall: Optional[dict] = None
    student_tokens: Optional[list] = None
    reference_tokens: Optional[list] = None
    reference_text: Optional[str] = None
    sample_answer: Optional[str] = None
    image_url: Optional[str] = None
    prompt_audio_url: Optional[str] = None
    matched_keywords: Optional[list] = None
    real_audio_url: Optional[str] = None
    alignment_stats: Optional[dict] = None


def convert_webm_to_wav(audio_data: bytes) -> tuple[bytes, int]:
    """Convert webm audio to WAV format for Whisper"""
    import subprocess
    import tempfile
    import os

    # Save webm to temp file
    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as f:
        f.write(audio_data)
        webm_path = f.name

    # Convert to wav
    wav_path = webm_path.replace('.webm', '.wav')

    try:
        # Try using ffmpeg
        subprocess.run([
            'ffmpeg', '-i', webm_path, '-ar', '16000', '-ac', '1',
            '-y', wav_path
        ], capture_output=True, check=True)

        with open(wav_path, 'rb') as f:
            wav_data = f.read()

        # Clean up
        os.unlink(webm_path)
        os.unlink(wav_path)

        return wav_data, 16000
    except Exception as e:
        # If ffmpeg not available, try pydub
        try:
            from pydub import AudioSegment
            audio = AudioSegment.from_file(webm_path)
            audio = audio.set_frame_rate(16000).set_channels(1)
            wav_data = audio.raw_data

            os.unlink(webm_path)

            return wav_data, 16000
        except:
            # Fallback: just return original data
            os.unlink(webm_path)
            return audio_data, 16000


async def transcribe_audio(audio_data: bytes, sample_rate: int = 16000) -> tuple[str, float, list]:
    """
    Transcribe audio using Whisper
    Returns: (transcript, confidence, segments)
    """
    try:
        from faster_whisper import WhisperModel

        # Create temp file for audio
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            # Write WAV header + data
            with wave.open(f, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_data)
            temp_path = f.name

        # Load Whisper model
        model = WhisperModel("small.en", device="cpu", compute_type="int8")

        # Transcribe
        segments, info = model.transcribe(
            temp_path,
            word_timestamps=True,
            condition_on_previous_text=False
        )

        # Get full transcript
        transcript_parts = []
        word_segments = []

        for segment in segments:
            transcript_parts.append(segment.text)
            for word in segment.words:
                word_segments.append({
                    'word': word.word,
                    'start': word.start,
                    'end': word.end,
                    'probability': word.probability
                })

        # Clean up
        os.unlink(temp_path)

        full_transcript = ' '.join(transcript_parts).strip()
        confidence = info.compression_ratio if hasattr(info, 'compression_ratio') else 0.9

        return full_transcript, confidence, word_segments

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/grade/part1", response_model=GradingResult)
@router.post("/grade/read-aloud", response_model=GradingResult)
@router.post("/grade/pte/read-aloud", response_model=GradingResult)
async def grade_part1_read_aloud(
    audio: UploadFile = File(...),
    reference_text: Optional[str] = Form(None),
    question: Optional[str] = Form(None),
    real_audio_url: Optional[str] = Form(None)
):
    """
    Grade PTE Part 1: Read Aloud (RA)

    Standardized 3 Enabling Skills:
    1. Content (0 - 5): Word accuracy & recall rate using Sequence Alignment
    2. Oral Fluency (0 - 5): Speech rate (wps), pauses, rhythm
    3. Pronunciation (0 - 5): Whisper confidence & acoustic phoneme clarity
    Visual token diffing: student_tokens (green/red) and reference_tokens
    """
    try:
        # Read audio data
        audio_data = await audio.read()

        # Convert to WAV
        wav_data, sample_rate = convert_webm_to_wav(audio_data)

        # Transcribe with Whisper
        transcript, confidence, segments = await transcribe_audio(wav_data, sample_rate)

        if not transcript or len(transcript.strip()) < 3:
            raise HTTPException(status_code=400, detail="Audio too short or unclear")

        # Determine reference text
        effective_ref = reference_text or DEFAULT_PTE_RA_TEXT

        # Duration
        duration = 0.0
        if segments:
            duration = max(float(s.get('end', 0)) for s in segments)

        # Evaluate using complete PTE Read Aloud Engine
        pte_result = pte_read_aloud.evaluate_pte_read_aloud(
            reference_text=effective_ref,
            student_transcript=transcript,
            segments=segments,
            duration_seconds=duration,
            stt_confidence=confidence,
            real_audio_url=real_audio_url
        )

        content_s = pte_result["scores"]["content"]["score"]
        fluency_s = pte_result["scores"]["oral_fluency"]["score"]
        pronun_s = pte_result["scores"]["pronunciation"]["score"]

        feedback = (
            f"PTE Score: {pte_result['overall']['score_90']}/90 "
            f"(Content: {content_s}/5, Fluency: {fluency_s}/5, Pronunciation: {pronun_s}/5). "
            f"{pte_result['scores']['content']['comment']}"
        )

        return GradingResult(
            part_type="PTE_READ_ALOUD",
            transcript=transcript,
            stt_confidence=round(confidence, 3),
            score=pte_result["overall"]["score_10"],
            fluency_metrics=pte_result["fluency_metrics"],
            pronunciation_metrics={
                "score": pronun_s * 20, # 0-100 scale for legacy panels
                "wer": pte_result["alignment_stats"]["wer"] / 100.0,
                "is_valid": True,
                "grade": "EXCELLENT" if pronun_s >= 5 else "GOOD" if pronun_s == 4 else "FAIR" if pronun_s == 3 else "POOR",
                "grade_description": pte_result["scores"]["pronunciation"]["comment"],
                "errors": {
                    "total": pte_result["alignment_stats"]["substitutions"] + pte_result["alignment_stats"]["deletions"] + pte_result["alignment_stats"]["insertions"],
                    "substitutions": pte_result["alignment_stats"]["substitutions"],
                    "deletions": pte_result["alignment_stats"]["deletions"],
                    "insertions": pte_result["alignment_stats"]["insertions"],
                },
                "feedback": pte_result["scores"]["pronunciation"]["comment"]
            },
            lexical_metrics=None,
            feedback=feedback,
            scores=pte_result["scores"],
            overall=pte_result["overall"],
            student_tokens=pte_result["student_tokens"],
            reference_tokens=pte_result["reference_tokens"],
            reference_text=effective_ref,
            real_audio_url=real_audio_url or "/audio/pte_ra_prompt.wav",
            alignment_stats=pte_result["alignment_stats"]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/grade/part2", response_model=GradingResult)
@router.post("/grade/repeat-sentence", response_model=GradingResult)
@router.post("/grade/pte/repeat-sentence", response_model=GradingResult)
async def grade_part2_repeat_sentence(
    audio: UploadFile = File(...),
    prompt_audio: Optional[UploadFile] = File(None),
    reference_text: Optional[str] = Form(None),
    real_audio_url: Optional[str] = Form(None)
):
    """
    Grade PTE Part 2: Repeat Sentence (RS)

    Standardized Pearson Enabling Skills:
    1. Content (0 - 3): Word sequence accuracy
    2. Oral Fluency (0 - 5): Speech rate, natural delivery
    3. Pronunciation (0 - 5): Acoustic clarity & phoneme correctness
    Visual token diffing: student_tokens (green/red) and reference_tokens
    """
    try:
        audio_data = await audio.read()
        wav_data, sample_rate = convert_webm_to_wav(audio_data)
        transcript, confidence, segments = await transcribe_audio(wav_data, sample_rate)

        if not transcript or len(transcript.strip()) < 2:
            raise HTTPException(status_code=400, detail="Audio too short or unclear")

        effective_ref = reference_text or DEFAULT_PTE_RS_TEXT

        duration = 0.0
        if segments:
            duration = max(float(s.get('end', 0)) for s in segments)

        effective_real_audio = real_audio_url or "/audio/pte_rs_prompt.wav"
        if prompt_audio:
            p_data = await prompt_audio.read()
            p_wav, _ = convert_webm_to_wav(p_data)
            custom_path = STATIC_DIR / "custom_prompt.wav"
            custom_path.write_bytes(p_wav)
            effective_real_audio = "/api/demo/audio/prompt-custom"

        rs_result = pte_repeat_sentence.evaluate_pte_repeat_sentence(
            reference_text=effective_ref,
            student_transcript=transcript,
            segments=segments,
            duration_seconds=duration,
            stt_confidence=confidence,
            real_audio_url=effective_real_audio
        )

        content_s = rs_result["scores"]["content"]["score"]
        fluency_s = rs_result["scores"]["oral_fluency"]["score"]
        pronun_s = rs_result["scores"]["pronunciation"]["score"]

        feedback = (
            f"PTE RS Score: {rs_result['overall']['score_90']}/90 "
            f"(Content: {content_s}/3, Fluency: {fluency_s}/5, Pronunciation: {pronun_s}/5). "
            f"{rs_result['scores']['content']['comment']}"
        )

        return GradingResult(
            part_type="PTE_REPEAT_SENTENCE",
            transcript=transcript,
            stt_confidence=round(confidence, 3),
            score=rs_result["overall"]["score_10"],
            fluency_metrics=rs_result["fluency_metrics"],
            pronunciation_metrics={
                "score": pronun_s * 20,
                "wer": rs_result["alignment_stats"]["wer"] / 100.0,
                "is_valid": True,
                "grade": "EXCELLENT" if pronun_s >= 5 else "GOOD" if pronun_s == 4 else "FAIR",
                "grade_description": rs_result["scores"]["pronunciation"]["comment"],
                "feedback": rs_result["scores"]["pronunciation"]["comment"]
            },
            lexical_metrics=None,
            feedback=feedback,
            scores=rs_result["scores"],
            overall=rs_result["overall"],
            student_tokens=rs_result["student_tokens"],
            reference_tokens=rs_result["reference_tokens"],
            reference_text=effective_ref,
            real_audio_url=effective_real_audio,
            alignment_stats=rs_result["alignment_stats"]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/grade/part3", response_model=GradingResult)
@router.post("/grade/describe-image", response_model=GradingResult)
@router.post("/grade/pte/describe-image", response_model=GradingResult)
async def grade_part3_describe_image(
    audio: UploadFile = File(...),
    sample_answer: Optional[str] = Form(None),
    image_url: Optional[str] = Form(None),
    keywords: Optional[str] = Form(None),
):
    """
    Grade PTE Part 3: Describe Image (DI)

    Standardized Pearson Enabling Skills:
    1. Content (0 - 6): Key features, relationships, and overview/conclusion
    2. Oral Fluency (0 - 5): Speech rate, continuous delivery, false start penalization
    3. Pronunciation (0 - 5): Acoustic clarity & intelligible speech sounds
    Visual diff: student_tokens with `is_relevant: true` (Relevant keywords in Green)
    """
    try:
        audio_data = await audio.read()
        wav_data, sample_rate = convert_webm_to_wav(audio_data)
        transcript, confidence, segments = await transcribe_audio(wav_data, sample_rate)

        if not transcript or len(transcript.strip()) < 2:
            raise HTTPException(status_code=400, detail="Audio too short or unclear")

        duration = 0.0
        if segments:
            duration = max(float(s.get('end', 0)) for s in segments)

        kw_list = [k.strip() for k in keywords.split(",")] if keywords else None

        di_result = pte_describe_image.evaluate_pte_describe_image(
            student_transcript=transcript,
            keywords=kw_list,
            sample_answer=sample_answer,
            image_url=image_url,
            segments=segments,
            duration_seconds=duration,
            stt_confidence=confidence,
        )

        content_s = di_result["scores"]["content"]["score"]
        fluency_s = di_result["scores"]["oral_fluency"]["score"]
        pronun_s = di_result["scores"]["pronunciation"]["score"]

        feedback = (
            f"PTE DI Score: {di_result['overall']['score_90']}/90 "
            f"(Content: {content_s}/6, Fluency: {fluency_s}/5, Pronunciation: {pronun_s}/5). "
            f"{di_result['scores']['content']['comment']}"
        )

        return GradingResult(
            part_type="PTE_DESCRIBE_IMAGE",
            transcript=transcript,
            stt_confidence=round(confidence, 3),
            score=di_result["overall"]["score_10"],
            fluency_metrics=di_result["fluency_metrics"],
            pronunciation_metrics={
                "score": pronun_s * 20,
                "is_valid": True,
                "grade": "EXCELLENT" if pronun_s >= 5 else "GOOD" if pronun_s == 4 else "FAIR",
                "grade_description": di_result["scores"]["pronunciation"]["comment"],
                "feedback": di_result["scores"]["pronunciation"]["comment"]
            },
            lexical_metrics=None,
            feedback=feedback,
            scores=di_result["scores"],
            overall=di_result["overall"],
            student_tokens=di_result["student_tokens"],
            sample_answer=di_result["sample_answer"],
            image_url=di_result["image_url"],
            matched_keywords=di_result["matched_keywords"],
            alignment_stats=di_result["alignment_stats"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/grade/part4", response_model=GradingResult)
@router.post("/grade/retell-lecture", response_model=GradingResult)
@router.post("/grade/pte/retell-lecture", response_model=GradingResult)
async def grade_part4_retell_lecture(
    audio: UploadFile = File(...),
    lecture_transcript: Optional[str] = Form(None),
    sample_notes: Optional[str] = Form(None),
    keywords: Optional[str] = Form(None),
):
    """
    Grade PTE Part 4: Re-tell Lecture (RL)

    Standardized Pearson Enabling Skills:
    1. Content (0 - 6): Ideas, characters, aspects, developments from lecture
    2. Oral Fluency (0 - 5): Constant, natural rate of speech, lack of hesitations
    3. Pronunciation (0 - 5): Acoustic clarity & intelligible speech sounds
    Visual diff: student_tokens with `is_relevant: true` (Lecture keywords in Green)
    """
    try:
        audio_data = await audio.read()
        wav_data, sample_rate = convert_webm_to_wav(audio_data)
        transcript, confidence, segments = await transcribe_audio(wav_data, sample_rate)

        if not transcript or len(transcript.strip()) < 2:
            raise HTTPException(status_code=400, detail="Audio too short or unclear")

        duration = 0.0
        if segments:
            duration = max(float(s.get('end', 0)) for s in segments)

        kw_list = [k.strip() for k in keywords.split(",")] if keywords else None

        rl_result = pte_retell_lecture.evaluate_pte_retell_lecture(
            student_transcript=transcript,
            lecture_transcript=lecture_transcript,
            keywords=kw_list,
            sample_notes=sample_notes,
            segments=segments,
            duration_seconds=duration,
            stt_confidence=confidence,
        )

        content_s = rl_result["scores"]["content"]["score"]
        fluency_s = rl_result["scores"]["oral_fluency"]["score"]
        pronun_s = rl_result["scores"]["pronunciation"]["score"]

        feedback = (
            f"PTE RL Score: {rl_result['overall']['score_90']}/90 "
            f"(Content: {content_s}/6, Fluency: {fluency_s}/5, Pronunciation: {pronun_s}/5). "
            f"{rl_result['scores']['content']['comment']}"
        )

        return GradingResult(
            part_type="PTE_RETELL_LECTURE",
            transcript=transcript,
            stt_confidence=round(confidence, 3),
            score=rl_result["overall"]["score_10"],
            fluency_metrics=rl_result["fluency_metrics"],
            pronunciation_metrics={
                "score": pronun_s * 20,
                "is_valid": True,
                "grade": "EXCELLENT" if pronun_s >= 5 else "GOOD" if pronun_s == 4 else "FAIR",
                "grade_description": rl_result["scores"]["pronunciation"]["comment"],
                "feedback": rl_result["scores"]["pronunciation"]["comment"]
            },
            lexical_metrics=None,
            feedback=feedback,
            scores=rl_result["scores"],
            overall=rl_result["overall"],
            student_tokens=rl_result["student_tokens"],
            reference_text=rl_result["reference_text"],
            sample_answer=rl_result["sample_answer"],
            prompt_audio_url=rl_result["prompt_audio_url"],
            matched_keywords=rl_result["matched_keywords"],
            alignment_stats=rl_result["alignment_stats"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/grade/part5", response_model=GradingResult)
@router.post("/grade/answer-short-question", response_model=GradingResult)
@router.post("/grade/pte/answer-short-question", response_model=GradingResult)
async def grade_part5_answer_short_question(
    audio: UploadFile = File(...),
    question_prompt: Optional[str] = Form(None),
    target_answers: Optional[str] = Form(None),
):
    """
    Grade PTE Part 5: Answer Short Question (ASQ)

    Standardized Pearson Enabling Skills:
    1. Content / Vocabulary (0 - 1): Appropriate target word choice
    2. Oral Fluency (0 - 5): Response speed and minimal hesitation
    3. Pronunciation (0 - 5): Target word clarity and intelligibility
    """
    try:
        audio_data = await audio.read()
        wav_data, sample_rate = convert_webm_to_wav(audio_data)
        transcript, confidence, segments = await transcribe_audio(wav_data, sample_rate)

        if not transcript or len(transcript.strip()) < 1:
            raise HTTPException(status_code=400, detail="Audio too short or unclear")

        duration = 0.0
        if segments:
            duration = max(float(s.get('end', 0)) for s in segments)

        targets_list = [t.strip() for t in target_answers.split(",")] if target_answers else None

        asq_result = pte_answer_short_question.evaluate_pte_asq(
            student_transcript=transcript,
            target_answers=targets_list,
            question_prompt=question_prompt,
            segments=segments,
            duration_seconds=duration,
            stt_confidence=confidence,
        )

        content_s = asq_result["scores"]["content"]["score"]
        fluency_s = asq_result["scores"]["oral_fluency"]["score"]
        pronun_s = asq_result["scores"]["pronunciation"]["score"]

        feedback = (
            f"PTE ASQ Score: {asq_result['overall']['score_90']}/90 "
            f"(Content: {content_s}/1, Fluency: {fluency_s}/5, Pronunciation: {pronun_s}/5). "
            f"{asq_result['scores']['content']['comment']}"
        )

        return GradingResult(
            part_type="PTE_ANSWER_SHORT_QUESTION",
            transcript=transcript,
            stt_confidence=round(confidence, 3),
            score=asq_result["overall"]["score_10"],
            fluency_metrics=asq_result["fluency_metrics"],
            pronunciation_metrics={
                "score": pronun_s * 20,
                "is_valid": True,
                "grade": "EXCELLENT" if pronun_s >= 5 else "GOOD" if pronun_s == 4 else "FAIR",
                "grade_description": asq_result["scores"]["pronunciation"]["comment"],
                "feedback": asq_result["scores"]["pronunciation"]["comment"]
            },
            lexical_metrics=None,
            feedback=feedback,
            scores=asq_result["scores"],
            overall=asq_result["overall"],
            student_tokens=asq_result["student_tokens"],
            reference_text=asq_result["reference_text"],
            sample_answer=asq_result["sample_answer"],
            matched_keywords=[asq_result["sample_answer"]] if content_s == 1 else [],
            alignment_stats=asq_result["alignment_stats"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audio/prompt-rl")
async def get_prompt_rl_audio():
    audio_path = STATIC_DIR / "pte_rl_prompt.mp3"
    if not audio_path.exists():
        audio_path = STATIC_DIR / "pte_rl_prompt.wav"
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Prompt audio not found")
    media = "audio/mpeg" if audio_path.suffix == ".mp3" else "audio/wav"
    return FileResponse(audio_path, media_type=media)


@router.get("/audio/prompt-rs")
async def get_prompt_rs_audio():
    wav_path = STATIC_DIR / "pte_rs_prompt.wav"
    if not wav_path.exists():
        raise HTTPException(status_code=404, detail="Prompt audio not found")
    return FileResponse(wav_path, media_type="audio/wav")


@router.get("/audio/prompt-ra")
async def get_prompt_ra_audio():
    wav_path = STATIC_DIR / "pte_ra_prompt.wav"
    if not wav_path.exists():
        raise HTTPException(status_code=404, detail="Prompt audio not found")
    return FileResponse(wav_path, media_type="audio/wav")


@router.get("/audio/prompt-custom")
async def get_custom_prompt_audio():
    wav_path = STATIC_DIR / "custom_prompt.wav"
    if not wav_path.exists():
        wav_path = STATIC_DIR / "pte_rs_prompt.wav"
    return FileResponse(wav_path, media_type="audio/wav")


@router.get("/health")
async def health_check():
    """Check if demo grading is available"""
    try:
        from faster_whisper import WhisperModel
        return {"status": "ready", "whisper": "available"}
    except ImportError:
        return {"status": "partial", "whisper": "not_installed"}
