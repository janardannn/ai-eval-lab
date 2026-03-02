"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface AudioRecorderState {
  isRecording: boolean;
  analyser: AnalyserNode | null;
  liveTranscript: string;
  micError: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | undefined>;
  resetRecording: () => void;
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

function getMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

function teardown(
  mediaRecorderRef: React.RefObject<MediaRecorder | null>,
  recognitionRef: React.RefObject<SpeechRecognitionInstance>,
) {
  const rec = mediaRecorderRef.current;
  if (rec) {
    rec.stream.getTracks().forEach((t) => t.stop());
    if (rec.state !== "inactive") {
      try { rec.stop(); } catch {}
    }
    mediaRecorderRef.current = null;
  }
  if (recognitionRef.current) {
    try { recognitionRef.current.stop(); } catch {}
    recognitionRef.current = null;
  }
}

export function useAudioRecorder(): AudioRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance>(null);
  const mountedRef = useRef(true);

  const startRecording = useCallback(async () => {
    teardown(mediaRecorderRef, recognitionRef);
    setMicError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const mime = getMimeType();
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      // Analyser for visualization
      const existing = audioCtxRef.current;
      const ctx = (existing && existing.state !== "closed") ? existing : new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createAnalyser();
      node.fftSize = 128;
      node.smoothingTimeConstant = 0.8;
      source.connect(node);
      setAnalyser(node);

      // Live STT
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
    } catch (err) {
      console.error("[useAudioRecorder] startRecording failed:", err);
      if (err instanceof DOMException) {
        if (err.name === "NotFoundError") {
          setMicError("No microphone found. Close other tabs using the mic and try again.");
        } else if (err.name === "NotAllowedError") {
          setMicError("Microphone access denied. Allow mic access in browser settings.");
        } else {
          setMicError("Microphone error. Please try again.");
        }
      }
    }
  }, []);

  const resetRecording = useCallback(() => {
    teardown(mediaRecorderRef, recognitionRef);
    setAnalyser(null);
    setLiveTranscript("");
    chunksRef.current = [];
    // Small delay for browser to release mic before re-acquiring
    setTimeout(() => { startRecording(); }, 100);
  }, [startRecording]);

  const stopRecording = useCallback(async (): Promise<Blob | undefined> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    setAnalyser(null);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    return new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        recorder.stream.getTracks().forEach((t) => t.stop());
        resolve(blob);
      };
      recorder.stop();
      isRecordingRef.current = false;
      setIsRecording(false);
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      teardown(mediaRecorderRef, recognitionRef);
      isRecordingRef.current = false;
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch {}
        audioCtxRef.current = null;
      }
    };
  }, []);

  return {
    isRecording,
    analyser,
    liveTranscript,
    micError,
    startRecording,
    stopRecording,
    resetRecording,
    isRecordingRef,
    mediaRecorderRef,
    chunksRef,
  };
}
