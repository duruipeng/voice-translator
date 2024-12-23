import { useState } from "react";
import { Platform } from "react-native";

export const useSpeechSynthesis = () => {
  const [isPaused, setIsPaused] = useState(false);

  const speak = (text: string, voice: SpeechSynthesisVoice | null, lang: string) => {
    setIsPaused(true);
    
    if (Platform.OS === "web") {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = lang;
    
        utterance.onstart = () => setIsPaused(true);
        utterance.onend = () => setIsPaused(false);
        utterance.onerror = () => setIsPaused(false);
    
        window.speechSynthesis.speak(utterance);
    }else{
        import("expo-speech").then((Speech) => {
          Speech.speak(text, {
            language: lang,
            pitch: 1.0,
            rate: 1.0,
            onDone: () => setIsPaused(false),
            onStopped: () => setIsPaused(false),
          });
        });
    }
  };

  const stop = () => {
    if (Platform.OS === "web") {
      window.speechSynthesis.cancel();
    } else {
      import("expo-speech").then((Speech) => Speech.stop());
    }
    setIsPaused(false);
  };

  return { isPaused, speak, stop };
};
