import { useState, useEffect, useCallback } from 'react';

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'videoinput';
}

export interface UseMediaDevicesResult {
  cameras: MediaDevice[];
  microphones: MediaDevice[];
  selectedCamera: string | null;
  selectedMicrophone: string | null;
  stream: MediaStream | null;
  error: string | null;
  warning: string | null;
  hasVideo: boolean;
  requestPermissions: () => Promise<void>;
  selectCamera: (deviceId: string) => void;
  selectMicrophone: (deviceId: string) => void;
}

export function useMediaDevices(): UseMediaDevicesResult {
  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [microphones, setMicrophones] = useState<MediaDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Load available devices
  const loadDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const videoDevices = devices
        .filter((device) => device.kind === 'videoinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
          kind: 'videoinput' as const,
        }));

      const audioDevices = devices
        .filter((device) => device.kind === 'audioinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          kind: 'audioinput' as const,
        }));

      setCameras(videoDevices);
      setMicrophones(audioDevices);

      // Auto-select first devices if none selected
      if (!selectedCamera && videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
      if (!selectedMicrophone && audioDevices.length > 0) {
        setSelectedMicrophone(audioDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error enumerating devices:', err);
      setError('Không thể liệt kê thiết bị');
    }
  }, [selectedCamera, selectedMicrophone]);

  // Request permissions and get stream
  const requestPermissions = useCallback(async () => {
    try {
      setError(null);
      setWarning(null);

      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      let newStream: MediaStream | null = null;
      let videoAcquired = false;

      // 1. Try to acquire both video and audio
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        videoAcquired = newStream.getVideoTracks().length > 0;
      } catch (mediaErr) {
        console.warn('Camera failed or unavailable, falling back to audio only:', mediaErr);
        // 2. Fallback: acquire audio only for oral exam
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          setWarning(
            'Không thể kích hoạt Camera (thiết bị đang bận hoặc không có camera). Hệ thống chuyển sang chế độ thi chỉ dùng Microphone.'
          );
        } catch (audioErr) {
          console.error('Microphone also failed:', audioErr);
          const errMessage = audioErr instanceof Error ? audioErr.message : 'Unknown error';
          if (errMessage.includes('Permission denied') || errMessage.includes('NotAllowed')) {
            throw new Error('Quyền Microphone bị từ chối. Vui lòng cấp quyền trong cài đặt Windows.');
          } else if (errMessage.includes('NotFound') || errMessage.includes('Devices not found')) {
            throw new Error('Không tìm thấy Microphone trên máy tính này. Vui lòng cắm tai nghe/micro.');
          }
          throw audioErr;
        }
      }

      if (newStream) {
        setStream(newStream);
        setHasVideo(videoAcquired);
        setPermissionsGranted(true);
        await loadDevices();
      }
    } catch (err) {
      console.error('Error requesting permissions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định';
      setError(`Không thể truy cập thiết bị: ${errorMessage}`);
    }
  }, [stream, loadDevices]);

  // Update stream when selected devices change
  useEffect(() => {
    const updateStream = async () => {
      if (!permissionsGranted) return;

      try {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          audio: selectedMicrophone
            ? { deviceId: { exact: selectedMicrophone } }
            : true,
        };

        if (hasVideo && selectedCamera) {
          constraints.video = { deviceId: { exact: selectedCamera } };
        }

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);
        setHasVideo(newStream.getVideoTracks().length > 0);
      } catch (err) {
        console.error('Error updating stream:', err);
        if (selectedMicrophone) {
          try {
            const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
              audio: { deviceId: { exact: selectedMicrophone } },
            });
            setStream(audioOnlyStream);
            setHasVideo(false);
            return;
          } catch (audioOnlyErr) {
            console.error('Audio only also failed:', audioOnlyErr);
          }
        }
        setError('Không thể đổi thiết bị đã chọn');
      }
    };

    if (selectedCamera || selectedMicrophone) {
      updateStream();
    }
  }, [selectedCamera, selectedMicrophone, permissionsGranted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const selectCamera = useCallback((deviceId: string) => {
    setSelectedCamera(deviceId);
  }, []);

  const selectMicrophone = useCallback((deviceId: string) => {
    setSelectedMicrophone(deviceId);
  }, []);

  return {
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
  };
}
