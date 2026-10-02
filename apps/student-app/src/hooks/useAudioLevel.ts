import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseAudioLevelResult {
  level: number;
  isSpeaking: boolean;
}

const SPEAKING_THRESHOLD = 10;
const SMOOTHING_FACTOR = 0.3;

export function useAudioLevel(stream: MediaStream | null): UseAudioLevelResult {
  const [level, setLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const smoothedLevelRef = useRef(0);

  const updateLevel = useCallback(() => {
    if (!analyserRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateLevel);
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate RMS (Root Mean Square) for more accurate level measurement
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);

    // Convert to 0-100 scale (approximate)
    const rawLevel = Math.min(100, (rms / 128) * 100);

    // Apply smoothing
    smoothedLevelRef.current =
      SMOOTHING_FACTOR * rawLevel +
      (1 - SMOOTHING_FACTOR) * smoothedLevelRef.current;

    const currentLevel = Math.round(smoothedLevelRef.current);
    setLevel(currentLevel);
    setIsSpeaking(currentLevel > SPEAKING_THRESHOLD);

    animationFrameRef.current = requestAnimationFrame(updateLevel);
  }, []);

  useEffect(() => {
    if (!stream) {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      setLevel(0);
      setIsSpeaking(false);
      smoothedLevelRef.current = 0;
      return;
    }

    // Create AudioContext
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    // Create AnalyserNode
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;
    analyserRef.current = analyser;

    // Connect stream to analyser
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    sourceRef.current = source;

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(updateLevel);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream, updateLevel]);

  return { level, isSpeaking };
}
