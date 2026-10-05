import { describe, it, expect, vi } from 'vitest';
import { measureNoise } from '../src/lib/noise-check';

describe('noise-check module', () => {
  it('throws an error if no audio tracks are found in stream', async () => {
    const fakeStreamWithoutAudio = {
      getAudioTracks: () => [],
      getVideoTracks: () => [{}],
    } as unknown as MediaStream;

    const controller = new AbortController();
    await expect(
      measureNoise(fakeStreamWithoutAudio, controller.signal, () => {})
    ).rejects.toThrow('Không tìm thấy tín hiệu Microphone để kiểm tra âm thanh');
  });

  it('isolates audio tracks into audioStream for MediaRecorder and AudioContext', async () => {
    const fakeAudioTrack = { kind: 'audio', id: 'mic-1' };
    const fakeVideoTrack = { kind: 'video', id: 'cam-1' };

    let mediaStreamConstructorArg: any = null;
    let mediaRecorderStreamArg: any = null;
    let audioSourceStreamArg: any = null;

    // Mock MediaStream
    class MockMediaStream {
      tracks: any[];
      constructor(tracks: any[] = []) {
        this.tracks = tracks;
        mediaStreamConstructorArg = tracks;
      }
      getAudioTracks() {
        return this.tracks.filter((t) => t.kind === 'audio');
      }
      getVideoTracks() {
        return this.tracks.filter((t) => t.kind === 'video');
      }
    }
    vi.stubGlobal('MediaStream', MockMediaStream);

    // Mock AudioContext
    class MockAudioContext {
      state = 'running';
      createMediaStreamSource(s: any) {
        audioSourceStreamArg = s;
        return {
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
      }
      createAnalyser() {
        return {
          fftSize: 2048,
          connect: vi.fn(),
          disconnect: vi.fn(),
          getFloatTimeDomainData: vi.fn(),
        };
      }
      resume() {
        return Promise.resolve();
      }
      close() {
        this.state = 'closed';
        return Promise.resolve();
      }
    }
    vi.stubGlobal('AudioContext', MockAudioContext);

    // Mock MediaRecorder
    class MockMediaRecorder {
      state = 'inactive';
      ondataavailable: any = null;
      onstop: any = null;
      static isTypeSupported() {
        return true;
      }
      constructor(stream: any) {
        mediaRecorderStreamArg = stream;
      }
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        if (this.onstop) this.onstop();
      }
    }
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);

    const controller = new AbortController();
    // Abort early so we don't have to wait the full 10s warmup/duration
    setTimeout(() => controller.abort(), 10);

    const inputMixedStream = new MockMediaStream([fakeAudioTrack, fakeVideoTrack]) as unknown as MediaStream;

    try {
      await measureNoise(inputMixedStream, controller.signal, () => {});
    } catch {
      // AbortError expected
    }

    // Verify track isolation occurred:
    expect(mediaStreamConstructorArg).toEqual([fakeAudioTrack]);
    expect(mediaRecorderStreamArg).toBeInstanceOf(MockMediaStream);
    expect(mediaRecorderStreamArg.tracks).toEqual([fakeAudioTrack]);
    expect(audioSourceStreamArg.tracks).toEqual([fakeAudioTrack]);

    vi.unstubAllGlobals();
  });
});
