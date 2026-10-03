import { useState, useEffect, useCallback, useRef } from 'react';

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
  stopAllMedia: () => void;
}

// Module-level global stream to keep camera & mic alive across pages
let globalStream: MediaStream | null = null;

export function stopGlobalMedia() {
  if (globalStream) {
    globalStream.getTracks().forEach((track) => track.stop());
    globalStream = null;
  }
}

export function useMediaDevices(): UseMediaDevicesResult {
  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [microphones, setMicrophones] = useState<MediaDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string | null>(null);
  
  const isGlobalActive = !!globalStream && globalStream.active && globalStream.getTracks().some(t => t.readyState === 'live');
  const [stream, setStream] = useState<MediaStream | null>(isGlobalActive ? globalStream : null);
  const [hasVideo, setHasVideo] = useState<boolean>(isGlobalActive ? (globalStream?.getVideoTracks().length ?? 0) > 0 : false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(isGlobalActive);

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

      // If global stream is already active and healthy, reuse it!
      if (globalStream && globalStream.active && globalStream.getTracks().some(t => t.readyState === 'live')) {
        setStream(globalStream);
        setHasVideo(globalStream.getVideoTracks().length > 0);
        setPermissionsGranted(true);
        await loadDevices();
        return;
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
        console.warn('Camera failed or in use, trying microphone only:', mediaErr);
        // 2. Fallback: acquire audio only
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          setWarning(
            'Không thể kích hoạt Camera (thiết bị đang bận hoặc không có camera). Hệ thống chuyển sang chỉ dùng Microphone.'
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
        globalStream = newStream;
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
  }, [loadDevices]);

  // Update stream when selected devices change
  useEffect(() => {
    const updateStream = async () => {
      if (!permissionsGranted || !selectedCamera && !selectedMicrophone) return;

      try {
        const constraints: MediaStreamConstraints = {
          audio: selectedMicrophone
            ? { deviceId: { exact: selectedMicrophone } }
            : true,
        };

        if (hasVideo && selectedCamera) {
          constraints.video = { deviceId: { exact: selectedCamera } };
        }

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (globalStream && globalStream !== newStream) {
          globalStream.getTracks().forEach((track) => track.stop());
        }
        globalStream = newStream;
        setStream(newStream);
        setHasVideo(newStream.getVideoTracks().length > 0);
      } catch (err) {
        console.error('Error updating stream device:', err);
      }
    };

    if (permissionsGranted && (selectedCamera || selectedMicrophone)) {
      updateStream();
    }
  }, [selectedCamera, selectedMicrophone, permissionsGranted, hasVideo]);

  const selectCamera = useCallback((deviceId: string) => {
    setSelectedCamera(deviceId);
  }, []);

  const selectMicrophone = useCallback((deviceId: string) => {
    setSelectedMicrophone(deviceId);
  }, []);

  const stopAllMedia = useCallback(() => {
    stopGlobalMedia();
    setStream(null);
    setHasVideo(false);
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
    stopAllMedia,
  };
}
