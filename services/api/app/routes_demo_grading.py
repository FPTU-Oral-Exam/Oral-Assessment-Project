"""
Demo Grading Endpoint
Cho phép record audio và chấm điểm THẬT Part 1 và Part 2
"""

import io
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
import numpy as np
import wave

from . import fluency, pronunciation_wer, metrics

router = APIRouter(prefix="/demo", tags=["demo-grading"])


class Part1Request(BaseModel):
    question: str = "Tell me about your favorite hobby. Why do you enjoy it?"
    reference_text: Optional[str] = None


class Part2Request(BaseModel):
    reference_text: str = "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is commonly used for typing practice."


class GradingResult(BaseModel):
    part_type: str
    transcript: str
    stt_confidence: float
    score: float
    fluency_metrics: dict
    pronunciation_metrics: Optional[dict] = None
    lexical_metrics: Optional[dict] = None
    feedback: str


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
async def grade_part1(
    audio: UploadFile = File(...),
    question: str = Form("Tell me about your favorite hobby. Why do you enjoy it?")
):
    """
    Grade Part 1: Free Response

    Steps:
    1. Convert audio to WAV
    2. Transcribe with Whisper
    3. Analyze fluency metrics
    4. Analyze lexical diversity
    5. Calculate final score
    """
    try:
        # Read audio data
        audio_data = await audio.read()

        # Convert to WAV
        wav_data, sample_rate = convert_webm_to_wav(audio_data)

        # Transcribe
        transcript, confidence, segments = await transcribe_audio(wav_data, sample_rate)

        if not transcript or len(transcript.strip()) < 3:
            raise HTTPException(status_code=400, detail="Audio too short or unclear")

        # Calculate duration from segments
        duration = 0
        if segments:
            duration = max(s.get('end', 0) for s in segments)

        # Analyze fluency
        fluency_result = fluency.analyze_fluency(segments, duration)

        # Analyze lexical diversity
        lexical_result = metrics.analyze_lexical_diversity(transcript)

        # Calculate score (Part 1: Fluency 30% + Vocabulary 30% + Content 40%)
        fluency_score = fluency_result.get('fluency_score', 50) / 10
        lexical_score = lexical_result.get('ttr_score', 50) / 10

        # Content score based on transcript length
        word_count = len(transcript.split())
        if word_count >= 50:
            content_score = 8.0
        elif word_count >= 30:
            content_score = 7.0
        elif word_count >= 20:
            content_score = 6.0
        else:
            content_score = 4.0

        final_score = round(
            fluency_score * 0.30 +
            lexical_score * 0.30 +
            content_score * 0.40,
            2
        )

        # Generate feedback
        feedback_parts = []

        if fluency_result.get('speech_rate_status') == 'OPTIMAL':
            feedback_parts.append(f"Tốc độ nói tốt ({fluency_result.get('speech_rate_wps', 0):.1f} wps)")
        elif fluency_result.get('speech_rate_status') == 'SLOW':
            feedback_parts.append(f"Tốc độ hơi chậm ({fluency_result.get('speech_rate_wps', 0):.1f} wps)")
        else:
            feedback_parts.append(f"Tốc độ quá chậm ({fluency_result.get('speech_rate_wps', 0):.1f} wps)")

        if lexical_result.get('vocabulary_level') == 'RICH':
            feedback_parts.append("Vốn từ phong phú")
        elif lexical_result.get('vocabulary_level') == 'GOOD':
            feedback_parts.append("Vốn từ tốt")
        else:
            feedback_parts.append("Nên sử dụng đa dạng từ vựng hơn")

        if word_count < 20:
            feedback_parts.append("Câu trả lời hơi ngắn")

        feedback = ". ".join(feedback_parts)

        return GradingResult(
            part_type="FREE_RESPONSE",
            transcript=transcript,
            stt_confidence=round(confidence, 3),
            score=final_score,
            fluency_metrics=fluency_result,
            pronunciation_metrics=None,
            lexical_metrics=lexical_result,
            feedback=feedback
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/grade/part2", response_model=GradingResult)
async def grade_part2(
    audio: UploadFile = File(...),
    reference_text: str = Form("The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is commonly used for typing practice.")
):
    """
    Grade Part 2: Read Aloud

    Steps:
    1. Convert audio to WAV
    2. Transcribe with Whisper
    3. Calculate WER (Word Error Rate)
    4. Analyze fluency
    5. Calculate final score
    """
    try:
        # Read audio data
        audio_data = await audio.read()

        # Convert to WAV
        wav_data, sample_rate = convert_webm_to_wav(audio_data)

        # Transcribe
        transcript, confidence, segments = await transcribe_audio(wav_data, sample_rate)

        if not transcript or len(transcript.strip()) < 3:
            raise HTTPException(status_code=400, detail="Audio too short or unclear")

        # Calculate duration from segments
        duration = 0
        if segments:
            duration = max(s.get('end', 0) for s in segments)

        # Calculate WER
        pronunciation_result = pronunciation_wer.grade_reading_aloud(
            reference_text=reference_text,
            hypothesis_text=transcript,
            avg_logprob=confidence
        )

        # Analyze fluency
        fluency_result = fluency.analyze_fluency(segments, duration)

        # Calculate score (Part 2: WER 60% + Fluency 40%)
        wer_score = pronunciation_result.get('score', 0) / 10
        fluency_score = fluency_result.get('fluency_score', 50) / 10

        final_score = round(
            wer_score * 0.60 +
            fluency_score * 0.40,
            2
        )

        # Generate feedback
        feedback_parts = []

        wer = pronunciation_result.get('wer', 0)
        if wer <= 0.05:
            feedback_parts.append("Phát âm xuất sắc!")
        elif wer <= 0.10:
            feedback_parts.append("Phát âm tốt, có vài lỗi nhỏ")
        elif wer <= 0.20:
            feedback_parts.append("Phát âm khá, cần cải thiện")
        else:
            feedback_parts.append(f"Cần luyện tập thêm (WER: {wer*100:.0f}%)")

        if fluency_result.get('speech_rate_status') == 'OPTIMAL':
            feedback_parts.append(f"Tốc độ tốt ({fluency_result.get('speech_rate_wps', 0):.1f} wps)")
        elif fluency_result.get('speech_rate_status') == 'SLOW':
            feedback_parts.append(f"Tốc độ hơi chậm ({fluency_result.get('speech_rate_wps', 0):.1f} wps)")

        feedback = ". ".join(feedback_parts)

        return GradingResult(
            part_type="READ_ALOUD",
            transcript=transcript,
            stt_confidence=round(confidence, 3),
            score=final_score,
            fluency_metrics=fluency_result,
            pronunciation_metrics=pronunciation_result,
            lexical_metrics=None,
            feedback=feedback
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Check if demo grading is available"""
    try:
        from faster_whisper import WhisperModel
        return {"status": "ready", "whisper": "available"}
    except ImportError:
        return {"status": "partial", "whisper": "not_installed"}
