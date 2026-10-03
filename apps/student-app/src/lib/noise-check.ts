/**
 * Noise Assessment & Audio Measurement algorithms.
 * Based on OralAI audio verification standards.
 */

export const NOISE_POLICY = {
  durationMs: 6000,
  ambientMs: 2000,
  warmupMs: 300,
  intervalMs: 100,
  thresholdDbfs: -40,
  noisyFraction: 0.25,
  minimumSignalDbfs: -80,
};

export type NoiseStatus = 'quiet' | 'noisy' | 'no_signal';

export interface NoiseResult {
  status: NoiseStatus;
  averageDbfs: number;
  noisyFraction: number;
  peakDbfs: number;
}

export function rmsDbfs(samples: Float32Array): number {
  if (!samples.length) return -120;
  let energy = 0;
  for (let i = 0; i < samples.length; i++) {
    energy += samples[i] * samples[i];
  }
  return Math.max(-120, 10 * Math.log10(energy / samples.length));
}

export function peakDbfs(samples: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  return Math.max(-120, 20 * Math.log10(peak));
}

export function assessNoise(levels: number[]): Omit<NoiseResult, 'peakDbfs'> {
  if (!levels.length || levels.some((level) => !Number.isFinite(level))) {
    throw new Error('Không đủ tín hiệu âm thanh để phân tích độ ồn.');
  }

  const averageDbfs =
    10 *
    Math.log10(
      levels.reduce((sum, level) => sum + 10 ** (level / 10), 0) / levels.length,
    );

  const noisyFraction =
    levels.filter((level) => level >= NOISE_POLICY.thresholdDbfs).length /
    levels.length;

  const maxLevel = Math.max(...levels);
  const status: NoiseStatus =
    maxLevel < NOISE_POLICY.minimumSignalDbfs
      ? 'no_signal'
      : noisyFraction >= NOISE_POLICY.noisyFraction
        ? 'noisy'
        : 'quiet';

  return {
    status,
    averageDbfs,
    noisyFraction,
  };
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      return reject(new DOMException('Đã hủy kiểm tra', 'AbortError'));
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Đã hủy kiểm tra', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export async function measureNoise(
  stream: MediaStream,
  signal: AbortSignal,
  onProgress: (percent: number, currentDbfs: number, stage: 'ambient' | 'speaking') => void,
): Promise<NoiseResult & { audioBlob: Blob }> {
  signal.throwIfAborted();

  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const mimeType = ['audio/webm;codecs=opus', 'audio/webm'].find((t) =>
    MediaRecorder.isTypeSupported(t),
  ) || 'audio/webm';

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingDone = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  try {
    await context.resume();
    signal.throwIfAborted();

    recorder.start(100);
    await wait(NOISE_POLICY.warmupMs, signal);

    const samples = new Float32Array(analyser.fftSize);
    const ambientLevels: number[] = [];
    let overallPeak = -120;

    const totalSteps = NOISE_POLICY.durationMs / NOISE_POLICY.intervalMs;

    for (let step = 0; step < totalSteps; step++) {
      await wait(NOISE_POLICY.intervalMs, signal);

      analyser.getFloatTimeDomainData(samples);
      const currentRms = rmsDbfs(samples);
      const currentPeak = peakDbfs(samples);
      overallPeak = Math.max(overallPeak, currentPeak);

      const elapsedTime = (step + 1) * NOISE_POLICY.intervalMs;
      const isAmbientStage = elapsedTime <= NOISE_POLICY.ambientMs;

      if (isAmbientStage) {
        ambientLevels.push(currentRms);
      }

      const percent = Math.round(((step + 1) / totalSteps) * 100);
      onProgress(percent, currentPeak, isAmbientStage ? 'ambient' : 'speaking');
    }

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }

    const audioBlob = await recordingDone;
    const baseAssessment = assessNoise(ambientLevels);

    return {
      ...baseAssessment,
      peakDbfs: overallPeak,
      audioBlob,
    };
  } finally {
    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
    source.disconnect();
    analyser.disconnect();
    if (context.state !== 'closed') {
      await context.close();
    }
  }
}
