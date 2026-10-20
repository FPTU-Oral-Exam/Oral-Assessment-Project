# PTE Academic Speaking Question Bank (Archived Benchmark Dataset)

> [!NOTE]
> **TÀI LIỆU LƯU TRỮ (ARCHIVED DATASET):**
> Bộ dữ liệu 1,254 câu hỏi PTE này được lưu trữ phục vụ mục đích nghiên cứu, benchmark và đối sánh kỹ thuật.
> Kể từ phiên bản chuẩn hóa khảo thí FPTU (ENTs 5-criteria grading), hệ thống đã chuyển sang sử dụng Ngân hàng câu hỏi chuẩn hóa ENTs FPTU (4 dạng bài: `GENERAL_INTERVIEW`, `PICTURE_DESCRIPTION`, `TOPIC_MONOLOGUE`, `DEEP_DISCUSSION`). Bảng câu hỏi khảo thí trực tiếp trong database không còn nạp dữ liệu PTE này.

## 1. Overview
This directory contains the cleaned, standardized, and verified dataset of **1,254** PTE Academic Speaking test items scraped and prepared for the **FPTU Oral Assessment Platform**.

## 2. Dataset Distribution Summary

| Exercise Code | Exercise Name | Total Questions | Media Type | Storage Path |
| :--- | :--- | :---: | :--- | :--- |
| **RA** | Read Aloud | 300 | Text Prompt | `Read_Aloud/questions.json` |
| **RS** | Repeat Sentence | 360 | Audio (`.mp3`) | `Repeat_Sentence/audio/` |
| **DI** | Describe Image | 79 | Image (`.jpg`, `.png`) | `Describe_Image/images/` |
| **RL** | Re-tell Lecture | 100 | Audio / Transcript | `Re_tell_Lecture/` |
| **ASQ** | Answer Short Question | 300 | Audio Prompt | `Answer_Short_Question/audio/` |
| **RTS** | Respond to a Situation | 70 | Text Scenario | `Respond_to_a_Situation/questions.json` |
| **SGD** | Summarize Group Discussion | 45 | Audio (`.mp3`) | `Summarize_Group_Discussion/audio/` |
| **TOTAL** | | **1,254** | Multi-modal | `speaking_summary.json` |

> *Note: 51 incomplete records with missing audio or broken transcripts were discarded during data cleaning pipeline.*

## 3. Data Schema

Each exercise's `questions.json` conforms to the following standardized JSON schema:

```json
{
  "uid": "SRA1000",
  "transcript": "For any marketing course that requires...",
  "section": "Speaking",
  "exercise": "Read Aloud",
  "tested": 95,
  "has_media": false,
  "media_type": null,
  "media_path": null
}
```

## 4. Usage in Backend Engine
- **Grading Engines**: `services/api/app/pte_read_aloud.py`, `pte_repeat_sentence.py`, `pte_describe_image.py`.
- **Live Portal**: Live assessment simulation on `apps/staff-portal/app/(teacher)/grading/live/page.tsx`.
