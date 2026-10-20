import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SpeakingQuestionCard, PTEQuestionCard } from '../src/components/SpeakingQuestionCard';
import type { QuestionAttempt } from '@oralai/shared';

describe('SpeakingQuestionCard (ENTs Speaking & Legacy Compatibility)', () => {
  it('renders General Interview question correctly', () => {
    const attempt: QuestionAttempt = {
      id: 'att-ent-1',
      sequence: 1,
      type: 'GENERAL_INTERVIEW',
      instruction: 'Answer the question about your daily life and study habits in 45 seconds.',
      text: 'Could you tell me about your typical weekday routine at university?',
      prep_time: 10,
      speak_time: 45,
      status: 'READY',
    };

    const html = renderToString(
      <SpeakingQuestionCard
        attempt={attempt}
        phase="PREPARING"
        prepTimeRemaining={8}
        speakTimeRemaining={45}
        totalPrepTime={10}
        totalSpeakTime={45}
      />
    );

    expect(html).toContain('Part 1: Phỏng vấn Tổng quát (General Interview)');
    expect(html).toContain('Could you tell me about your typical weekday routine at university?');
    expect(html).toContain('CHUẨN BỊ (PREPARATION)');
    expect(html).toContain('8');
  });

  it('renders Picture Description question with prompt image correctly', () => {
    const attempt: QuestionAttempt = {
      id: 'att-ent-2',
      sequence: 2,
      type: 'PICTURE_DESCRIPTION',
      instruction: 'Describe the scene in the picture in detail.',
      prompt_image: 'https://minio.oralai.edu.vn/images/traffic_scene.jpg',
      text: 'Describe what people are doing in this bustling market scene.',
      prep_time: 15,
      speak_time: 60,
      status: 'READY',
    };

    const html = renderToString(
      <SpeakingQuestionCard
        attempt={attempt}
        phase="RECORDING"
        prepTimeRemaining={0}
        speakTimeRemaining={35}
        totalPrepTime={15}
        totalSpeakTime={60}
      />
    );

    expect(html).toContain('Part 2: Miêu tả Tranh (Picture Description)');
    expect(html).toContain('https://minio.oralai.edu.vn/images/traffic_scene.jpg');
    expect(html).toContain('ĐANG GHI ÂM (RECORDING)');
    expect(html).toContain('35');
  });

  it('renders Topic Monologue question with topic prompt correctly', () => {
    const attempt: QuestionAttempt = {
      id: 'att-ent-3',
      sequence: 3,
      type: 'TOPIC_MONOLOGUE',
      instruction: 'Deliver a structured 90-second talk addressing the topic prompt.',
      text: 'Talk about the benefits and drawbacks of online learning in higher education.',
      prep_time: 30,
      speak_time: 90,
      status: 'READY',
    };

    const html = renderToString(
      <SpeakingQuestionCard
        attempt={attempt}
        phase="PREPARING"
        prepTimeRemaining={25}
        speakTimeRemaining={90}
        totalPrepTime={30}
        totalSpeakTime={90}
      />
    );

    expect(html).toContain('Part 3: Thuyết trình theo Chủ đề (Topic Monologue)');
    expect(html).toContain('Talk about the benefits and drawbacks of online learning in higher education.');
    expect(html).toContain('CHUẨN BỊ (PREPARATION)');
  });

  it('renders Deep Discussion question correctly', () => {
    const attempt: QuestionAttempt = {
      id: 'att-ent-4',
      sequence: 4,
      type: 'DEEP_DISCUSSION',
      instruction: 'Provide in-depth critical arguments in response to the discussion inquiry.',
      text: 'Do you believe artificial intelligence will replace human educators in the near future? Why or why not?',
      prep_time: 10,
      speak_time: 60,
      status: 'READY',
    };

    const html = renderToString(
      <SpeakingQuestionCard
        attempt={attempt}
        phase="RECORDING"
        prepTimeRemaining={0}
        speakTimeRemaining={48}
        totalPrepTime={10}
        totalSpeakTime={60}
      />
    );

    expect(html).toContain('Part 4: Thảo luận Chuyên sâu (Deep Discussion)');
    expect(html).toContain('Do you believe artificial intelligence will replace human educators in the near future?');
    expect(html).toContain('ĐANG GHI ÂM (RECORDING)');
  });

  it('backward compatibility: supports PTEQuestionCard alias with Read Aloud and Repeat Sentence', () => {
    const attempt: QuestionAttempt = {
      id: 'att-legacy-1',
      sequence: 1,
      type: 'READ_ALOUD',
      instruction: 'In 40 seconds, you must read this text aloud.',
      text: 'Sleep behavior is also known as a sleep disorder.',
      prep_time: 40,
      speak_time: 40,
      status: 'READY',
    };

    const html = renderToString(
      <PTEQuestionCard
        attempt={attempt}
        phase="PREPARING"
        prepTimeRemaining={35}
        speakTimeRemaining={40}
        totalPrepTime={40}
        totalSpeakTime={40}
      />
    );

    expect(html).toContain('Part 1: Read Aloud (RA)');
    expect(html).toContain('In 40 seconds, you must read this text aloud.');
    expect(html).toContain('Sleep behavior is also known as a sleep disorder.');
  });
});
