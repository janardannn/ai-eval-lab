"use client";

import { useState, useRef, useCallback } from "react";

export interface AudioRecorderState {
  isRecording: boolean;
  analyser: AnalyserNode | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | undefined>;
  isRecordingRef: React.RefObject<boolean>;
  mediaRecorderRef: React.RefObject<MediaRecorder | null>;
  chunksRef: React.RefObject<Blob[]>;
}

export function useAudioRecorder(): AudioRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      // Set up analyser for visualization
      const ctx = audioCtxRef.current || new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createAnalyser();
      node.fftSize = 64;
      source.connect(node);
      setAnalyser(node);

      recorder.start();
      mediaRecorderRef.current = recorder;
      isRecordingRef.current = true;
      setIsRecording(true);
    } catch {
      // Mic access denied
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | undefined> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    setAnalyser(null);

    return new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        recorder.stream.getTracks().forEach((t) => t.stop());
        resolve(blob);
      };
      recorder.stop();
      isRecordingRef.current = false;
      setIsRecording(false);
    });
  }, []);

  return {
    isRecording,
    analyser,
    startRecording,
    stopRecording,
    isRecordingRef,
    mediaRecorderRef,
    chunksRef,
  };
}
