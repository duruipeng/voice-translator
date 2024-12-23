import { useState, useRef, useEffect, MutableRefObject } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { transcribeSpeech } from "@/functions/transcribeSpeech";
import { recordSpeech } from "@/functions/recordSpeech";
import useWebFocus from "@/hooks/useWebFocus";

export const useTranscription = (apiKey: string, webAudioPermissionsRef: MutableRefObject<MediaStream | null>) => {
  const [transcribedSpeech, setTranscribedSpeech] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRecordingRef = useRef(new Audio.Recording());
  const isWebFocused = useWebFocus();

  useEffect(() => {
    const loadTranscription = async () => {
      const savedTranscription = await AsyncStorage.getItem("savedTranscription");
      if (savedTranscription) setTranscribedSpeech(savedTranscription);
    };
    loadTranscription();
  }, []);

  useEffect(() => {
    if (isWebFocused) {
      const requestMicAccess = async () => {
        try {
          const permissions = await navigator.mediaDevices.getUserMedia({ audio: true });
          webAudioPermissionsRef.current = permissions;
        } catch (error) {
          console.error("Microphone access error:", error);
        }
      };
      if (!webAudioPermissionsRef.current) requestMicAccess();
    } else {
      webAudioPermissionsRef.current?.getTracks().forEach((track) => track.stop());
      webAudioPermissionsRef.current = null;
    }
  }, [isWebFocused]);

  useEffect(() => {
    if (transcribedSpeech) {
      AsyncStorage.setItem("savedTranscription", transcribedSpeech).catch(console.error);
    }
  }, [transcribedSpeech]);

  const startRecording = async () => {
    setIsRecording(true);
    await recordSpeech(audioRecordingRef, setIsRecording, !!webAudioPermissionsRef.current);
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      const transcript = await transcribeSpeech(audioRecordingRef, apiKey);
      if (transcript) {
        setTranscribedSpeech((prev) => (prev ? `${prev}\n${transcript}` : transcript));
      }
    } catch (error) {
      console.error("Transcription error:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  return {
    transcribedSpeech,
    isRecording,
    isTranscribing,
    setIsRecording,
    setIsTranscribing,
    setTranscribedSpeech,
    startRecording,
    stopRecording,
  };
};
