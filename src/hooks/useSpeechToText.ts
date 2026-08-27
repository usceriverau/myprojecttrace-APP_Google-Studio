import { useState, useEffect, useRef, useCallback } from 'react';
import { SpeechRecognitionInstance, SpeechRecognitionConstructor, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '../types/speech';

export interface UseSpeechToTextOptions {
  defaultLanguage?: string;
  onTranscriptChange?: (transcript: string, isFinal: boolean) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export interface UseSpeechToTextReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
  language: string;
  setLanguage: (lang: string) => void;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  resetTranscript: () => void;
}

export const useSpeechToText = (options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn => {
  const {
    defaultLanguage = 'en-US',
    onTranscriptChange,
    onFinalResult,
    onError,
  } = options;

  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguageState] = useState<string>(defaultLanguage);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);

  // Check speech recognition API support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass: SpeechRecognitionConstructor | undefined =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        setIsSupported(true);
      } else {
        setIsSupported(false);
      }
    }
  }, []);

  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore abort errors
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    isListeningRef.current = false;
  }, []);

  // Update language on active instance
  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        cleanupRecognition();
      }
    }
    setIsListening(false);
    isListeningRef.current = false;
  }, [cleanupRecognition]);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass: SpeechRecognitionConstructor | undefined =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setError('Voice recognition is not supported in this browser.');
      onError?.('Voice recognition is not supported in this browser.');
      return;
    }

    // Stop any existing instance
    cleanupRecognition();
    setError(null);
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    setFinalTranscript('');
    setTranscript('');

    try {
      const instance = new SpeechRecognitionClass();
      instance.continuous = true;
      instance.interimResults = true;
      instance.lang = language;
      instance.maxAlternatives = 1;

      instance.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setError(null);
      };

      instance.onresult = (event: SpeechRecognitionEvent) => {
        let currentInterim = '';
        let currentFinal = finalTranscriptRef.current;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            currentFinal = (currentFinal ? currentFinal + ' ' : '') + text.trim();
          } else {
            currentInterim += text;
          }
        }

        finalTranscriptRef.current = currentFinal;
        setFinalTranscript(currentFinal);
        setInterimTranscript(currentInterim);

        const combined = currentFinal + (currentInterim ? (currentFinal ? ' ' : '') + currentInterim : '');
        setTranscript(combined);

        onTranscriptChange?.(combined, !currentInterim && Boolean(currentFinal));

        if (currentFinal && !currentInterim) {
          onFinalResult?.(currentFinal);
        }
      };

      instance.onerror = (event: SpeechRecognitionErrorEvent) => {
        let errorMsg = 'Voice recognition error occurred.';
        if (event.error === 'not-allowed') {
          errorMsg = 'Microphone permission denied. Please allow microphone access in your browser settings.';
        } else if (event.error === 'no-speech') {
          errorMsg = 'No speech detected. Please try speaking again.';
        } else if (event.error === 'audio-capture') {
          errorMsg = 'No microphone was found or microphone is busy.';
        } else if (event.error === 'network') {
          errorMsg = 'Network error during voice recognition.';
        }

        setError(errorMsg);
        onError?.(errorMsg);
        setIsListening(false);
        isListeningRef.current = false;
      };

      instance.onend = () => {
        setIsListening(false);
        isListeningRef.current = false;
        // Trigger final callback if we captured any final transcript
        if (finalTranscriptRef.current) {
          onFinalResult?.(finalTranscriptRef.current);
        }
      };

      recognitionRef.current = instance;
      instance.start();
    } catch (err: any) {
      console.error('Failed to initialize speech recognition:', err);
      const msg = err?.message || 'Could not start voice recognition.';
      setError(msg);
      onError?.(msg);
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, [language, cleanupRecognition, onTranscriptChange, onFinalResult, onError]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setFinalTranscript('');
    finalTranscriptRef.current = '';
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecognition();
    };
  }, [cleanupRecognition]);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    finalTranscript,
    error,
    language,
    setLanguage,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
  };
};
