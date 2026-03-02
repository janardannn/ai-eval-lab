"use client";

import { useState, useRef, useCallback } from "react";

export interface AudioRecorderState {
  isRecording: boolean;
  analyser: AnalyserNode | null;
  liveTranscript: string;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | undefined>;
  isRecordingRef: React.RefObject<boolean>;
  mediaRecorderRef: React.RefObject<MediaRecorder | null>;
  chunksRef: React.RefObject<Blob[]>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

function createSpeechRecognition(): SpeechRecognitionInstance | null {
  if (typeof window === "undefined") return null;
  const SR = (window as /* eslint-disable-line */ any).SpeechRecognition
    || (window as /* eslint-disable-line */ any).webkitSpeechRecognition;
  if (!SR) return null;
  const recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  return recognition;
}

export function useAudioRecorder(): AudioRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance>(null);

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
      node.fftSize = 128;
      node.smoothingTimeConstant = 0.8;
      source.connect(node);
      setAnalyser(node);

      // Start live STT
      setLiveTranscript("");
      const recognition = createSpeechRecognition();
      if (recognition) {
        let finalText = "";
        recognition.onresult = (e: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; [j: number]: { transcript: string } } } }) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const result = e.results[i];
            if (result.isFinal) {
              finalText += result[0].transcript + " ";
            } else {
              interim += result[0].transcript;
            }
          }
          setLiveTranscript(finalText + interim);
        };
        recognition.onerror = () => {};
        recognition.onend = () => {
          // Restart if still recording (browser stops after silence)
          if (isRecordingRef.current) {
            try { recognition.start(); } catch {}
          }
        };
        try { recognition.start(); } catch {}
        recognitionRef.current = recognition;
      }

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

    // Stop live STT
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

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
    liveTranscript,
    startRecording,
    stopRecording,
    isRecordingRef,
    mediaRecorderRef,
    chunksRef,
  };
}
