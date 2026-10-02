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
      setError('Failed to enumerate devices');
    }
  }, [selectedCamera, selectedMicrophone]);

  // Request permissions and get stream
  const requestPermissions = useCallback(async () => {
    try {
      setError(null);

      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setStream(newStream);
      setPermissionsGranted(true);
      await loadDevices();
    } catch (err) {
      console.error('Error requesting permissions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowed')) {
        setError('Permission denied. Please allow camera and microphone access.');
      } else if (errorMessage.includes('NotFound') || errorMessage.includes('Devices not found')) {
        setError('No camera or microphone found on this device.');
      } else {
        setError(`Failed to access devices: ${errorMessage}`);
      }
    }
  }, [stream, loadDevices]);

  // Update stream when selected devices change
  useEffect(() => {
    const updateStream = async () => {
      if (!permissionsGranted) return;

      try {
        // Stop current stream
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          audio: selectedMicrophone
            ? { deviceId: { exact: selectedMicrophone } }
            : true,
          video: selectedCamera
            ? { deviceId: { exact: selectedCamera } }
            : true,
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);
      } catch (err) {
        console.error('Error updating stream:', err);
        setError('Failed to switch device');
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
    requestPermissions,
    selectCamera,
    selectMicrophone,
  };
}
