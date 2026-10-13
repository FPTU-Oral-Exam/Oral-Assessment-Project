import {
  AcademicQuestionItem,
  ExamBlueprintMatrix,
  RubricSchema,
} from '@/types/academic';

export const INITIAL_MOCK_QUESTIONS: AcademicQuestionItem[] = [
  // ========================================================
  // 1. READ ALOUD (RA)
  // ========================================================
  {
    id: 'q-ra-01',
    code: 'RA-101',
    skill: 'SPEAKING',
    type: 'RA',
    title: 'Quantum Computing and Superposition',
    prompt:
      'Quantum computing harnesses the unique behavior of quantum physics to solve complex problems far beyond the reach of classical supercomputers. By utilizing quantum bits, or qubits, these machines can exist in multiple states simultaneously, enabling exponential gains in computational processing speed.',
    prep_time: 35,
    response_time: 40,
    difficulty: 'MEDIUM',
    status: 'APPROVED',
    is_predicted: true,
    usage_count: 18,
    tags: ['Physics', 'Quantum Technology', 'High Frequency'],
    sample_answer:
      'Quantum computing harnesses the unique behavior of quantum physics to solve complex problems far beyond the reach of classical supercomputers...',
    key_points: ['quantum physics', 'classical supercomputers', 'qubits', 'multiple states simultaneously', 'exponential gains'],
    created_at: Date.now() - 86400000 * 12,
    updated_at: Date.now() - 86400000 * 2,
  },
  {
    id: 'q-ra-02',
    code: 'RA-102',
    skill: 'SPEAKING',
    type: 'RA',
    title: 'Urban Heat Island Effect',
    prompt:
      'Urban heat islands occur when cities replace natural land cover with dense concentrations of pavement, buildings, and other surfaces that absorb and retain heat. This effect increases energy costs, air pollution levels, and heat-related illnesses among vulnerable metropolitan populations.',
    prep_time: 35,
    response_time: 40,
    difficulty: 'EASY',
    status: 'APPROVED',
    is_predicted: true,
    usage_count: 24,
    tags: ['Environment', 'Urban Planning', 'Prediction'],
    sample_answer:
      'Urban heat islands occur when cities replace natural land cover with dense concentrations of pavement, buildings...',
    key_points: ['urban heat islands', 'natural land cover', 'pavement and buildings', 'energy costs', 'air pollution levels'],
    created_at: Date.now() - 86400000 * 15,
    updated_at: Date.now() - 86400000 * 3,
  },
  {
    id: 'q-ra-03',
    code: 'RA-103',
    skill: 'SPEAKING',
    type: 'RA',
    title: 'Neuroplasticity and Lifelong Learning',
    prompt:
      'Neuroplasticity refers to the brain’s extraordinary ability to reorganize itself by forming novel neural connections throughout human life. This dynamic biological mechanism enables neurons to adjust their activities in response to environmental modifications, injuries, and cognitive stimulation.',
    prep_time: 35,
    response_time: 40,
    difficulty: 'HARD',
    status: 'APPROVED',
    is_predicted: false,
    usage_count: 9,
    tags: ['Neuroscience', 'Biology', 'Cognition'],
    key_points: ['neuroplasticity', 'novel neural connections', 'biological mechanism', 'environmental modifications', 'cognitive stimulation'],
    created_at: Date.now() - 86400000 * 20,
    updated_at: Date.now() - 86400000 * 5,
  },
  {
    id: 'q-ra-04',
    code: 'RA-104',
    skill: 'SPEAKING',
    type: 'RA',
    title: 'Renewable Energy Integration in Smart Grids',
    prompt:
      'Integrating variable renewable energy into existing electrical infrastructure requires sophisticated energy management algorithms and decentralized storage batteries. Smart grids constantly balance fluctuating electricity generation from solar panels and wind turbines with consumer demand in real time.',
    prep_time: 35,
    response_time: 40,
    difficulty: 'MEDIUM',
    status: 'DRAFT',
    is_predicted: false,
    usage_count: 0,
    tags: ['Renewable Energy', 'Engineering', 'Smart Grid'],
    key_points: ['renewable energy', 'electrical infrastructure', 'energy management algorithms', 'smart grids', 'fluctuating electricity'],
    created_at: Date.now() - 86400000 * 2,
    updated_at: Date.now() - 86400000 * 2,
  },

  // ========================================================
  // 2. REPEAT SENTENCE (RS)
  // ========================================================
  {
    id: 'q-rs-01',
    code: 'RS-201',
    skill: 'SPEAKING',
    type: 'RS',
    title: 'Campus Library Policy Announcement',
    prompt:
      'Students must submit their final project proposals to the department secretary before Friday noon.',
    audio_script:
      'Students must submit their final project proposals to the department secretary before Friday noon.',
    media_url: 'https://actions.google.com/sounds/v1/speech/person_speaking.ogg',
    prep_time: 3,
    response_time: 15,
    difficulty: 'EASY',
    status: 'APPROVED',
    is_predicted: true,
    usage_count: 35,
    tags: ['Campus Life', 'Deadlines', 'High Frequency'],
    key_points: ['students must submit', 'final project proposals', 'department secretary', 'before Friday noon'],
    created_at: Date.now() - 86400000 * 30,
    updated_at: Date.now() - 86400000 * 4,
  },
  {
    id: 'q-rs-02',
    code: 'RS-202',
    skill: 'SPEAKING',
    type: 'RS',
    title: 'Economics Lecture Hypothesis',
    prompt:
      'The consumer price index reflects price fluctuations of goods and essential services purchased by urban households.',
    audio_script:
      'The consumer price index reflects price fluctuations of goods and essential services purchased by urban households.',
    media_url: 'https://actions.google.com/sounds/v1/speech/person_speaking.ogg',
    prep_time: 3,
    response_time: 15,
    difficulty: 'MEDIUM',
    status: 'APPROVED',
    is_predicted: true,
    usage_count: 28,
    tags: ['Economics', 'Finance'],
    key_points: ['consumer price index', 'price fluctuations', 'essential services', 'urban households'],
    created_at: Date.now() - 86400000 * 25,
    updated_at: Date.now() - 86400000 * 2,
  },
  {
    id: 'q-rs-03',
    code: 'RS-203',
    skill: 'SPEAKING',
    type: 'RS',
    title: 'Laboratory Safety Regulations',
    prompt:
      'Protective eyeglasses and sterile gloves are mandatory inside the biochemical synthesis laboratory.',
    audio_script:
      'Protective eyeglasses and sterile gloves are mandatory inside the biochemical synthesis laboratory.',
    media_url: 'https://actions.google.com/sounds/v1/speech/person_speaking.ogg',
    prep_time: 3,
    response_time: 15,
    difficulty: 'HARD',
    status: 'APPROVED',
    is_predicted: false,
    usage_count: 14,
    tags: ['Chemistry', 'Safety Rules'],
    key_points: ['protective eyeglasses', 'sterile gloves', 'mandatory', 'biochemical synthesis laboratory'],
    created_at: Date.now() - 86400000 * 18,
    updated_at: Date.now() - 86400000 * 3,
  },

  // ========================================================
  // 3. SUMMARIZE GROUP DISCUSSION (GD)
  // ========================================================
  {
    id: 'q-gd-01',
    code: 'GD-301',
    skill: 'SPEAKING',
    type: 'GD',
    title: 'Discussion on Remote Work vs Office Attendance',
    prompt:
      'Listen to the 3-person panel debate regarding hybrid work policies. In your summary, clearly contrast the arguments in favor of employee autonomy against the challenges of team cohesion and junior mentorship.',
    audio_script:
      'Speaker A emphasizes productivity gains and work-life balance from working at home. Speaker B counters that spontaneous innovation happens near office watercoolers. Speaker C proposes a compromise of two designated mandatory collaboration days per week.',
    media_url: 'https://actions.google.com/sounds/v1/speech/person_speaking.ogg',
    prep_time: 10,
    response_time: 60,
    difficulty: 'MEDIUM',
    status: 'APPROVED',
    is_predicted: true,
    usage_count: 16,
    tags: ['Human Resources', 'Hybrid Work', 'Prediction'],
    key_points: [
      'Speaker A: individual flexibility and reduced commute stress',
      'Speaker B: spontaneous brainstorming and team culture erosion',
      'Speaker C: balanced hybrid compromise (2 fixed anchor days)',
    ],
    sample_answer:
      'The group discussed hybrid work models. While Speaker A highlighted productivity improvements and flexibility, Speaker B cautioned against the loss of mentorship and workplace culture. Finally, Speaker C recommended establishing two mandatory in-office collaboration days weekly.',
    created_at: Date.now() - 86400000 * 14,
    updated_at: Date.now() - 86400000 * 1,
  },
  {
    id: 'q-gd-02',
    code: 'GD-302',
    skill: 'SPEAKING',
    type: 'GD',
    title: 'Ethics of Generative AI in Academic Publishing',
    prompt:
      'Listen to two researchers and a journal editor discussing the permissible boundaries of Large Language Models in writing peer-reviewed papers. Synthesize their consensus recommendations.',
    audio_script:
      'Researcher 1 defends AI for language polishing for non-native speakers. Researcher 2 warns of fabricated citations and algorithmic bias. The Editor rules that full disclosure is required in methodology sections, but AI cannot hold copyright or author status.',
    media_url: 'https://actions.google.com/sounds/v1/speech/person_speaking.ogg',
    prep_time: 10,
    response_time: 60,
    difficulty: 'HARD',
    status: 'APPROVED',
    is_predicted: true,
    usage_count: 12,
    tags: ['Artificial Intelligence', 'Academic Ethics'],
    key_points: [
      'Language assistance vs hallucinated references',
      'Editorial transparency mandate in methodology',
      'AI models excluded from authorship credit',
    ],
    created_at: Date.now() - 86400000 * 22,
    updated_at: Date.now() - 86400000 * 2,
  },

  // ========================================================
  // 4. DESCRIBE IMAGE (DI)
  // ========================================================
  {
    id: 'q-di-01',
    code: 'DI-401',
    skill: 'SPEAKING',
    type: 'DI',
    title: 'Global Smartphone Market Share (Bar Chart)',
    prompt:
      'Look at the bar chart below showing global market shares of leading smartphone vendors over the last five years. In 40 seconds, describe the dominant leader, noticeable growth trends, and provide an analytical conclusion.',
    media_url:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    prep_time: 25,
    response_time: 40,
    difficulty: 'MEDIUM',
    status: 'APPROVED',
    is_predicted: true,
    usage_count: 31,
    tags: ['Bar Chart', 'Market Analysis', 'Prediction'],
    key_points: [
      'Title: Global Smartphone Market Share',
      'Highest value: Vendor A at 32%',
      'Rising competitor: Vendor C showing steady upward trajectory',
      'Conclusion: Market continues to consolidate among top three players',
    ],
    sample_answer:
      'The provided bar chart illustrates global smartphone market share from 2020 to 2025. It is evident that Vendor A maintained the highest market share hovering around 32%, while Vendor C exhibited remarkable growth, increasing from 12% to nearly 22%. In conclusion, the smartphone market remains highly concentrated among the top tier manufacturers.',
    created_at: Date.now() - 86400000 * 28,
    updated_at: Date.now() - 86400000 * 3,
  },
  {
    id: 'q-di-02',
    code: 'DI-402',
    skill: 'SPEAKING',
    type: 'DI',
    title: 'The Atmospheric Water Cycle (Process Diagram)',
    prompt:
      'Examine the circular diagram depicting the natural water cycle. Describe the sequential stages from solar evaporation and condensation to precipitation and surface runoff.',
    media_url:
      'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=800&q=80',
    prep_time: 25,
    response_time: 40,
    difficulty: 'EASY',
    status: 'APPROVED',
    is_predicted: true,
    usage_count: 42,
    tags: ['Diagram', 'Earth Science', 'Process'],
    key_points: ['Evaporation from oceans', 'Cloud condensation', 'Precipitation onto mountains', 'Surface and underground runoff'],
    created_at: Date.now() - 86400000 * 40,
    updated_at: Date.now() - 86400000 * 4,
  },
  {
    id: 'q-di-03',
    code: 'DI-403',
    skill: 'SPEAKING',
    type: 'DI',
    title: 'Renewable Electricity Generation by Source (Pie Chart)',
    prompt:
      'Analyze the pie chart breakdown of renewable electricity generation. Highlight the largest contributing source and contrast solar with hydroelectric capacity.',
    media_url:
      'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=800&q=80',
    prep_time: 25,
    response_time: 40,
    difficulty: 'HARD',
    status: 'DRAFT',
    is_predicted: false,
    usage_count: 2,
    tags: ['Pie Chart', 'Energy'],
    key_points: ['Hydroelectric 48%', 'Wind 28%', 'Solar 16%', 'Geothermal/Biomass 8%'],
    created_at: Date.now() - 86400000 * 5,
    updated_at: Date.now() - 86400000 * 1,
  },

  // ========================================================
  // 5. RESPOND TO A SITUATION (SI)
  // ========================================================
  {
    id: 'q-si-01',
    code: 'SI-501',
    skill: 'SPEAKING',
    type: 'SI',
    title: 'Requesting an Assignment Extension from a Professor',
    prompt:
      'Situation: You had a sudden medical emergency and were hospitalized for two days, causing you to fall behind on your capstone deliverable due tomorrow. Speak directly to Professor Miller: apologize, explain your circumstances politely, provide medical evidence, and request a 3-day extension.',
    audio_script:
      'Context narration: You knock on Professor Miller’s office door during office hours.',
    media_url: 'https://actions.google.com/sounds/v1/speech/person_speaking.ogg',
    prep_time: 20,
    response_time: 40,
    difficulty: 'MEDIUM',
    status: 'APPROVED',
    is_predicted: true,
    usage_count: 21,
    tags: ['Campus Communication', 'Politeness', 'Situational'],
    sample_answer:
      'Good morning, Professor Miller. I am sincerely sorry to disturb you, but I wanted to speak with you regarding tomorrow’s capstone assignment. Unfortunately, I was hospitalized unexpectedly for two days due to a sudden illness. I have the hospital discharge documentation right here with me. Would it be possible for me to receive a three-day extension so I can submit my completed work by Monday? Thank you so much for your understanding.',
    key_points: ['Polite greeting & apology', 'Honest medical explanation', 'Offer hospital verification', 'Specific extension request (3 days)'],
    created_at: Date.now() - 86400000 * 16,
    updated_at: Date.now() - 86400000 * 2,
  },
  {
    id: 'q-si-02',
    code: 'SI-502',
    skill: 'SPEAKING',
    type: 'SI',
    title: 'Reporting a Technical Glitch During an Online Exam',
    prompt:
      'Situation: Your exam portal froze midway through the listening section and lost your recording. You contact the invigilator immediately through the emergency hotline. Explain the issue concisely and ask how to proceed without penalty.',
    prep_time: 20,
    response_time: 40,
    difficulty: 'EASY',
    status: 'APPROVED',
    is_predicted: false,
    usage_count: 8,
    tags: ['Exam Support', 'Urgent Communication'],
    key_points: ['Identify candidate ID', 'Describe screen freeze and error timestamp', 'Request restart authorization'],
    created_at: Date.now() - 86400000 * 10,
    updated_at: Date.now() - 86400000 * 2,
  },

  // ========================================================
  // 6. RE-TELL LECTURE (RL)
  // ========================================================
  {
    id: 'q-rl-01',
    code: 'RL-601',
    skill: 'SPEAKING',
    type: 'RL',
    title: 'Professor Evans on Cellular Senescence and Longevity',
    prompt:
      'You will hear a short excerpt from an astrophysics lecture about dark matter detection in deep underground laboratories. After listening, summarize the main hypothesis and detection techniques.',
    audio_script:
      'Astronomers estimate that dark matter accounts for roughly eighty-five percent of the total matter in the observable universe. Because it does not interact with electromagnetic radiation, scientists must detect it indirectly through gravitational lensing or via sensitive cryogenic detectors placed deep beneath mountains to shield against cosmic rays.',
    media_url: 'https://actions.google.com/sounds/v1/speech/person_speaking.ogg',
    prep_time: 10,
    response_time: 40,
    difficulty: 'HARD',
    status: 'APPROVED',
    is_predicted: true,
    usage_count: 27,
    tags: ['Astrophysics', 'Dark Matter', 'Lecture Summary'],
    key_points: [
      'Dark matter constitutes 85% of cosmic matter',
      'Does not interact with light/electromagnetic force',
      'Indirect detection through gravitational lensing',
      'Cryogenic detectors placed underground to block cosmic rays',
    ],
    sample_answer:
      'The lecture explored dark matter detection. The speaker explained that dark matter comprises approximately eighty-five percent of all matter in the universe. Since it cannot be observed directly through electromagnetic radiation, researchers employ gravitational lensing and install cryogenic sensors deep underground to avoid cosmic ray interference.',
    created_at: Date.now() - 86400000 * 35,
    updated_at: Date.now() - 86400000 * 3,
  },
  {
    id: 'q-rl-02',
    code: 'RL-602',
    skill: 'SPEAKING',
    type: 'RL',
    title: 'Behavioral Economics: Nudge Theory',
    prompt:
      'Listen to the lecture on Richard Thaler’s Nudge Theory in public policy. Re-tell how small changes in choice architecture influence human decision-making.',
    audio_script:
      'Nudge theory proposes that indirect suggestions and subtle positive reinforcement can influence people’s motives and choices just as effectively as direct enforcement or legislation. For example, placing healthy foods at eye level in school cafeterias dramatically increases student fruit consumption without banning junk food.',
    media_url: 'https://actions.google.com/sounds/v1/speech/person_speaking.ogg',
    prep_time: 10,
    response_time: 40,
    difficulty: 'MEDIUM',
    status: 'APPROVED',
    is_predicted: true,
    usage_count: 19,
    tags: ['Behavioral Economics', 'Psychology'],
    key_points: [
      'Nudge theory alters choice architecture',
      'Indirect encouragement rather than bans or penalties',
      'School cafeteria fruit placement example',
    ],
    created_at: Date.now() - 86400000 * 20,
    updated_at: Date.now() - 86400000 * 1,
  },
];

export const INITIAL_MOCK_MATRICES: ExamBlueprintMatrix[] = [
  {
    id: 'matrix-pte-std-01',
    code: 'MTR-PTE-8Q',
    name: 'Ma trận Chuẩn PTE Academic Speaking 2026',
    description:
      'Cấu hình đề thi vấn đáp chuẩn quốc tế gồm đầy đủ 6 dạng bài với 8 câu hỏi, kiểm tra toàn diện năng lực phản xạ âm thanh, diễn đạt hình ảnh và thuyết trình học thuật.',
    rubric_id: 'rub-speaking-pte-01',
    total_questions: 8,
    estimated_duration: 15,
    difficulty_ratio: {
      easy: 25,
      medium: 50,
      hard: 25,
    },
    is_active: true,
    rules: [
      {
        type: 'RA',
        question_count: 2,
        prep_time: 35,
        response_time: 40,
        target_difficulty: 'MEDIUM',
        weight_percentage: 25,
      },
      {
        type: 'RS',
        question_count: 2,
        prep_time: 3,
        response_time: 15,
        target_difficulty: 'MEDIUM',
        weight_percentage: 20,
      },
      {
        type: 'DI',
        question_count: 1,
        prep_time: 25,
        response_time: 40,
        target_difficulty: 'MEDIUM',
        weight_percentage: 15,
      },
      {
        type: 'RL',
        question_count: 1,
        prep_time: 10,
        response_time: 40,
        target_difficulty: 'HARD',
        weight_percentage: 15,
      },
      {
        type: 'SI',
        question_count: 1,
        prep_time: 20,
        response_time: 40,
        target_difficulty: 'MEDIUM',
        weight_percentage: 10,
      },
      {
        type: 'GD',
        question_count: 1,
        prep_time: 10,
        response_time: 60,
        target_difficulty: 'HARD',
        weight_percentage: 15,
      },
    ],
    created_at: Date.now() - 86400000 * 10,
    updated_at: Date.now() - 86400000 * 1,
  },
  {
    id: 'matrix-quick-screen-02',
    code: 'MTR-QUICK-5Q',
    name: 'Ma trận Đánh giá Nhanh (Fast Screening Oral Exam)',
    description:
      'Cấu hình rút gọn 5 câu hỏi phục vụ kiểm tra đầu vào hoặc sơ tuyển học bổng trong 8 phút.',
    rubric_id: 'rub-speaking-pte-01',
    total_questions: 5,
    estimated_duration: 8,
    difficulty_ratio: {
      easy: 40,
      medium: 40,
      hard: 20,
    },
    is_active: false,
    rules: [
      {
        type: 'RA',
        question_count: 1,
        prep_time: 35,
        response_time: 40,
        target_difficulty: 'EASY',
        weight_percentage: 20,
      },
      {
        type: 'RS',
        question_count: 1,
        prep_time: 3,
        response_time: 15,
        target_difficulty: 'EASY',
        weight_percentage: 20,
      },
      {
        type: 'DI',
        question_count: 1,
        prep_time: 25,
        response_time: 40,
        target_difficulty: 'MEDIUM',
        weight_percentage: 20,
      },
      {
        type: 'RL',
        question_count: 1,
        prep_time: 10,
        response_time: 40,
        target_difficulty: 'MEDIUM',
        weight_percentage: 20,
      },
      {
        type: 'SI',
        question_count: 1,
        prep_time: 20,
        response_time: 40,
        target_difficulty: 'MEDIUM',
        weight_percentage: 20,
      },
    ],
    created_at: Date.now() - 86400000 * 8,
    updated_at: Date.now() - 86400000 * 2,
  },
];

export const INITIAL_MOCK_RUBRICS: RubricSchema[] = [
  {
    id: 'rub-speaking-pte-01',
    name: 'Tiêu chuẩn Đánh giá Vấn đáp PTE Academic Speaking (Chuẩn hóa 2026)',
    description:
      'Khung đo lường 4 tiêu chí cốt lõi: Phát âm & Âm vị học, Độ lưu loát và nhịp điệu, Mức độ bao quát nội dung, Vốn từ vựng và Ngữ pháp.',
    version: 3,
    updated_at: Date.now() - 86400000 * 2,
    created_at: Date.now() - 86400000 * 60,
    criteria: [
      {
        name: 'Phát âm & Âm vị học (Pronunciation)',
        description:
          'Độ rõ ràng của nguyên âm, phụ âm, trọng âm từ và nối âm chuẩn ngữ điệu người bản ngữ hoặc dễ hiểu trên bình diện quốc tế.',
        max_score: 90,
        weight: 30,
        descriptors: [
          {
            level: 'Xuất sắc (80-90)',
            score_range: '80 - 90',
            description: 'Phát âm chuẩn xác như người bản ngữ, trọng âm câu và ngữ điệu hoàn hảo, tất cả nguyên âm rõ ràng.',
          },
          {
            level: 'Khá (65-79)',
            score_range: '65 - 79',
            description: 'Phát âm rõ ràng, người nghe hiểu được ngay mà không cần cố gắng, đôi lúc có ngữ điệu địa phương nhẹ.',
          },
          {
            level: 'Đạt (50-64)',
            score_range: '50 - 64',
            description: 'Nhiều âm phát âm đúng nhưng có một số từ bị nuốt âm hoặc sai trọng âm; người nghe vẫn nắm được ý.',
          },
          {
            level: 'Cần cải thiện (<50)',
            score_range: '< 50',
            description: 'Phát âm sai nhiều âm cơ bản, ngắt quãng bất thường, gây cản trở nghiêm trọng cho việc hiểu ý.',
          },
        ],
      },
      {
        name: 'Độ lưu loát & Nhịp điệu (Oral Fluency)',
        description:
          'Tốc độ nói đều đặn tự nhiên, ngắt nghỉ đúng cụm nghĩa (chunking), không bị ngập ngừng, ậm ừ hoặc lặp lại từ.',
        max_score: 90,
        weight: 30,
        descriptors: [
          {
            level: 'Xuất sắc (80-90)',
            score_range: '80 - 90',
            description: 'Nhịp điệu nói mượt mà, ngắt nghỉ tự nhiên tại ranh giới ngữ pháp, hoàn toàn không có ngập ngừng.',
          },
          {
            level: 'Khá (65-79)',
            score_range: '65 - 79',
            description: 'Tốc độ nói ổn định, có vài lần dừng ngắn nhưng không làm gián đoạn dòng chảy ý tưởng.',
          },
          {
            level: 'Đạt (50-64)',
            score_range: '50 - 64',
            description: 'Tốc độ nói hơi chậm hoặc thất thường, có đôi chỗ ngập ngừng lặp từ để tìm ý.',
          },
          {
            level: 'Cần cải thiện (<50)',
            score_range: '< 50',
            description: 'Nói ngắt quãng liên tục, nhiều đoạn dừng chết (dead air) kéo dài trên 3 giây.',
          },
        ],
      },
      {
        name: 'Bao quát Nội dung & Luận điểm (Content Coverage)',
        description:
          'Bao hàm đầy đủ các ý chính, số liệu trọng yếu (đối với Describe Image) hoặc luận điểm của bài giảng (Re-tell Lecture).',
        max_score: 90,
        weight: 25,
        descriptors: [
          {
            level: 'Xuất sắc (80-90)',
            score_range: '80 - 90',
            description: 'Đề cập đầy đủ tất cả các thành phần cốt lõi và mối liên hệ logic giữa các ý.',
          },
          {
            level: 'Khá (65-79)',
            score_range: '65 - 79',
            description: 'Nêu được phần lớn các ý chính nhưng bỏ sót 1-2 chi tiết phụ.',
          },
          {
            level: 'Đạt (50-64)',
            score_range: '50 - 64',
            description: 'Chỉ trình bày được ý khái quát sơ lược, thiếu dẫn chứng cụ thể.',
          },
          {
            level: 'Cần cải thiện (<50)',
            score_range: '< 50',
            description: 'Lạc đề hoặc chỉ nêu được một phần rất nhỏ không bám sát đề bài.',
          },
        ],
      },
      {
        name: 'Vốn từ vựng & Cấu trúc Ngữ pháp (Lexical & Grammar)',
        description:
          'Sử dụng thuật ngữ học thuật chính xác, cấu trúc câu đa dạng, tránh lặp từ đơn điệu.',
        max_score: 90,
        weight: 15,
        descriptors: [
          {
            level: 'Xuất sắc (80-90)',
            score_range: '80 - 90',
            description: 'Sử dụng linh hoạt từ vựng chuyên ngành, ngữ pháp phức hợp chính xác.',
          },
          {
            level: 'Khá (65-79)',
            score_range: '65 - 79',
            description: 'Vốn từ phù hợp với ngữ cảnh, có một vài lỗi ngữ pháp nhỏ không ảnh hưởng nghĩa.',
          },
          {
            level: 'Đạt (50-64)',
            score_range: '50 - 64',
            description: 'Từ vựng cơ bản, cấu trúc câu đơn giản lặp lại.',
          },
          {
            level: 'Cần cải thiện (<50)',
            score_range: '< 50',
            description: 'Vốn từ hạn hẹp, sai ngữ pháp nghiêm trọng làm méo mó thông điệp.',
          },
        ],
      },
    ],
  },
];
