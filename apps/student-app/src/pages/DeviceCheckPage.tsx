import React, { useState, useRef, useEffect } from 'react';
import { useMediaDevices } from '../hooks/useMediaDevices';
import { useAudioLevel } from '../hooks/useAudioLevel';
import { CameraPreview } from '../components/CameraPreview';
import { AudioLevel } from '../components/AudioLevel';
import { measureNoise, type NoiseResult } from '../lib/noise-check';

interface DeviceCheckPageProps {
  sessionId: string;
  onPass: () => void;
  onBack: () => void;
}

type AudioTestStatus = 'idle' | 'measuring' | 'passed' | 'failed' | 'skipped';

export const DeviceCheckPage: React.FC<DeviceCheckPageProps> = ({
  sessionId,
  onPass,
  onBack,
}) => {
  const {
    cameras,
    microphones,
    selectedCamera,
    selectedMicrophone,
    stream,
    error,
    warning,
    hasVideo,
    requestPermissions,
    selectCamera,
    selectMicrophone,
  } = useMediaDevices();

  const { level, isSpeaking } = useAudioLevel(stream);

  // Audio test states
  const [testStatus, setTestStatus] = useState<AudioTestStatus>('idle');
  const [testProgress, setTestProgress] = useState(0);
  const [testPeak, setTestPeak] = useState(-120);
  const [testStage, setTestStage] = useState<'ambient' | 'speaking'>('ambient');
  const [testResult, setTestResult] = useState<NoiseResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const hasAudio = !!stream && stream.getAudioTracks().length > 0;
  const hasPermissions = !!stream;
  const isAudioReady = testStatus === 'passed' || testStatus === 'skipped';
  const isReady = hasPermissions && hasAudio && isAudioReady;

  // Cleanup audio preview URLs and abort controllers on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (previewAudioUrl) {
        URL.revokeObjectURL(previewAudioUrl);
      }
    };
  }, [previewAudioUrl]);

  // Handle starting noise and audio test
  const handleStartNoiseCheck = async () => {
    if (!stream) return;

    abortControllerRef.current?.abort();
    if (previewAudioUrl) {
      URL.revokeObjectURL(previewAudioUrl);
      setPreviewAudioUrl(null);
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setTestStatus('measuring');
    setTestProgress(0);
    setTestPeak(-120);
    setTestStage('ambient');
    setTestError(null);
    setTestResult(null);

    try {
      const res = await measureNoise(
        stream,
        controller.signal,
        (percent, currentPeak, stage) => {
          if (!controller.signal.aborted) {
            setTestProgress(percent);
            setTestPeak(currentPeak);
            setTestStage(stage);
          }
        },
      );

      if (controller.signal.aborted) return;

      const url = URL.createObjectURL(res.audioBlob);
      setPreviewAudioUrl(url);
      setTestResult(res);

      // Business evaluation rules
      if (res.status === 'noisy') {
        setTestStatus('failed');
        setTestError(
          `Môi trường quá ồn (mức ồn nền ${res.averageDbfs.toFixed(1)} dBFS). Hãy tìm chỗ yên tĩnh hơn hoặc giảm tiếng ồn xung quanh.`,
        );
      } else if (res.status === 'no_signal' || res.peakDbfs < -40) {
        setTestStatus('failed');
        setTestError(
          `Âm lượng micro quá nhỏ (đỉnh ${res.peakDbfs.toFixed(1)} dBFS). Vui lòng nói to hơn hoặc đưa micro gần miệng hơn.`,
        );
      } else if (res.peakDbfs >= -1) {
        setTestStatus('failed');
        setTestError(
          `Âm thanh quá lớn (${res.peakDbfs.toFixed(1)} dBFS), có nguy cơ vỡ tiếng/rè. Hãy đưa micro ra xa một chút và thử lại.`,
        );
      } else {
        // Passed: Quiet room and good clear voice amplitude
        setTestStatus('passed');
        setTestError(null);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const errorMsg = err instanceof Error ? err.message : 'Lỗi đo âm thanh';
      setTestStatus('failed');
      setTestError(errorMsg);
    }
  };

  // Handle skipping the audio test
  const handleSkipNoiseCheck = () => {
    abortControllerRef.current?.abort();
    setTestStatus('skipped');
    setTestError(null);
  };

  const handleStartExam = () => {
    if (isReady) {
      onPass();
    }
  };

  return (
    <div className="device-check-page">
      <div className="device-check-page__header">
        <h1>Kiểm tra thiết bị & Âm thanh</h1>
        <p className="device-check-page__subtitle">
          Vui lòng kiểm tra Microphone và độ ồn phòng để đảm bảo kết quả thi vấn đáp tốt nhất
        </p>
      </div>

      {error && (
        <div className="device-check-page__error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {warning && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>ℹ️</span>
          <span>{warning}</span>
        </div>
      )}

      <div className="device-check-page__content">
        <div className="device-check-page__preview">
          <CameraPreview stream={stream} />

          {hasPermissions && (
            <div className="device-check-page__audio">
              <AudioLevel level={level} isSpeaking={isSpeaking} />
            </div>
          )}
        </div>

        <div className="device-check-page__controls">
          {!hasPermissions ? (
            <button
              className="device-check-page__permission-btn"
              onClick={requestPermissions}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              Cho phép truy cập thiết bị (Mic & Cam)
            </button>
          ) : (
            <>
              {cameras.length > 0 && (
                <div className="device-check-page__selector">
                  <label htmlFor="camera-select">Camera</label>
                  <select
                    id="camera-select"
                    value={selectedCamera || ''}
                    onChange={(e) => selectCamera(e.target.value)}
                  >
                    {cameras.map((camera) => (
                      <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="device-check-page__selector">
                <label htmlFor="mic-select">Microphone (Bắt buộc)</label>
                <select
                  id="mic-select"
                  value={selectedMicrophone || ''}
                  onChange={(e) => selectMicrophone(e.target.value)}
                >
                  {microphones.length === 0 ? (
                    <option value="">Không tìm thấy microphone</option>
                  ) : (
                    microphones.map((mic) => (
                      <option key={mic.deviceId} value={mic.deviceId}>
                        {mic.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Noise & Audio Quality Check Section */}
        {hasPermissions && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem',
              marginTop: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                Thu thử, đo độ ồn & kiểm tra micro
              </h3>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  background:
                    testStatus === 'passed'
                      ? '#dcfce7'
                      : testStatus === 'skipped'
                        ? '#fef3c7'
                        : testStatus === 'failed'
                          ? '#fee2e2'
                          : '#f1f5f9',
                  color:
                    testStatus === 'passed'
                      ? '#166534'
                      : testStatus === 'skipped'
                        ? '#92400e'
                        : testStatus === 'failed'
                          ? '#991b1b'
                          : '#64748b',
                }}
              >
                {testStatus === 'passed' && 'Đạt tiêu chuẩn'}
                {testStatus === 'skipped' && 'Đã bỏ qua'}
                {testStatus === 'failed' && 'Chưa đạt'}
                {testStatus === 'measuring' && 'Đang đo...'}
                {testStatus === 'idle' && 'Chưa kiểm tra'}
              </span>
            </div>

            <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#64748b' }}>
              Quy trình đo 6 giây: <strong>2 giây đầu giữ im lặng</strong> để đo độ ồn phòng,{' '}
              <strong>4 giây sau nói thử</strong> để kiểm tra độ rõ giọng nói.
            </p>

            {/* Measuring in progress */}
            {testStatus === 'measuring' && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, color: testStage === 'ambient' ? '#0369a1' : '#15803d' }}>
                    {testStage === 'ambient'
                      ? '🤫 2s đầu: Vui lòng giữ im lặng để đo độ ồn phòng...'
                      : '🗣️ 4s sau: Hãy nói thử vào micro (Alo 1 2 3...)...'}
                  </span>
                  <span style={{ color: '#64748b' }}>{testProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${testProgress}%`,
                      height: '100%',
                      background: testStage === 'ambient' ? '#0284c7' : '#16a34a',
                      transition: 'width 0.1s ease',
                    }}
                  />
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                  Mức âm lượng hiện tại: <strong>{testPeak.toFixed(1)} dBFS</strong>
                </div>
              </div>
            )}

            {/* Test Passed Box */}
            {testStatus === 'passed' && testResult && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  color: '#166534',
                }}
              >
                <div>
                  ✅ <strong>Môi trường & Micro đạt chuẩn thi vấn đáp!</strong>
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: '#15803d' }}>
                  Độ ồn nền: {testResult.averageDbfs.toFixed(1)} dBFS (Rất yên tĩnh) • Mức đỉnh giọng nói: {testResult.peakDbfs.toFixed(1)} dBFS (Rõ nét)
                </div>
              </div>
            )}

            {/* Test Failed Box */}
            {testStatus === 'failed' && testError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  color: '#991b1b',
                }}
              >
                <div>
                  ⚠️ <strong>{testError}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: '#b91c1c' }}>
                  Bạn có thể điều chỉnh micro và bấm &quot;Đo lại&quot;, hoặc bấm &quot;Bỏ qua đo âm thanh&quot; để tiếp tục vào thi.
                </div>
              </div>
            )}

            {/* Test Skipped Box */}
            {testStatus === 'skipped' && (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  color: '#92400e',
                }}
              >
                ℹ️ <strong>Bạn đã chọn bỏ qua kiểm tra độ ồn.</strong> Vui lòng tự đảm bảo không gian yên tĩnh để bài thi đạt kết quả chấm tốt nhất.
              </div>
            )}

            {/* Audio playback preview */}
            {previewAudioUrl && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                  🎧 Nghe lại giọng nói của bạn vừa thu thử:
                </div>
                <audio ref={audioPlayerRef} controls src={previewAudioUrl} style={{ width: '100%', height: '36px' }} />
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleStartNoiseCheck}
                disabled={testStatus === 'measuring'}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  cursor: testStatus === 'measuring' ? 'not-allowed' : 'pointer',
                  opacity: testStatus === 'measuring' ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>🎙️</span>
                <span>{testStatus === 'idle' ? 'Bắt đầu đo âm thanh' : 'Đo lại âm thanh'}</span>
              </button>

              <button
                type="button"
                onClick={handleSkipNoiseCheck}
                disabled={testStatus === 'skipped'}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'transparent',
                  color: testStatus === 'skipped' ? '#94a3b8' : '#64748b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: testStatus === 'skipped' ? 'default' : 'pointer',
                  textDecoration: 'none',
                }}
              >
                {testStatus === 'skipped' ? 'Đã bỏ qua đo âm thanh' : 'Bỏ qua đo âm thanh'}
              </button>
            </div>
          </div>
        )}

        <div className="device-check-page__checklist">
          <h3>Trạng thái kiểm tra</h3>
          <ul>
            <li className={hasVideo ? 'checklist-item--success' : (hasPermissions ? 'checklist-item--pending' : 'checklist-item--pending')}>
              <span className="checklist-item__icon">
                {hasVideo ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
              </span>
              Camera {hasVideo ? 'đã sẵn sàng' : (hasPermissions ? 'không khả dụng (chỉ ghi âm)' : 'chưa kiểm tra')}
            </li>
            <li className={hasAudio ? 'checklist-item--success' : 'checklist-item--pending'}>
              <span className="checklist-item__icon">
                {hasAudio ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
              </span>
              Microphone {hasAudio ? 'đã kết nối' : 'chưa kiểm tra (Bắt buộc)'}
            </li>
            <li className={isAudioReady ? 'checklist-item--success' : 'checklist-item--pending'}>
              <span className="checklist-item__icon">
                {isAudioReady ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
              </span>
              Kiểm tra âm thanh {testStatus === 'passed' ? 'đạt chuẩn chất lượng' : (testStatus === 'skipped' ? 'đã bỏ qua' : 'chưa kiểm tra (Bắt buộc đo hoặc bỏ qua)')}
            </li>
          </ul>
        </div>
      </div>

      <div className="device-check-page__footer">
        <button className="device-check-page__back-btn" onClick={onBack}>
          Quay lại
        </button>
        <button
          className="device-check-page__start-btn"
          onClick={handleStartExam}
          disabled={!isReady}
          title={!isReady ? 'Vui lòng đo âm thanh hoặc bấm Bỏ qua đo âm thanh để tiếp tục' : 'Bắt đầu bài thi'}
        >
          Bắt đầu thi
        </button>
      </div>
    </div>
  );
};
