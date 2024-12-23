import { useState } from "react";
import { googleapi } from "@/functions/googleapi";

export const useTranslation = (apiKey: string) => {
  const [translation, setTranslation] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("");

  const translate = async (text: string, language: string, prompt: string) => {
    setIsTranslating(true);
    try {
      const response = await googleapi(
        `You are a professional translator. Translate the following text to ${prompt}. Only reply the best translation without other words.\n Text: "${text}"`,
        apiKey,
        "gemini-2.0-flash-exp"
      );
      if (response) {
        setTranslation(response);
        setSelectedVoice(language);
      }
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  return { translation, isTranslating, selectedVoice, translate, setTranslation, setIsTranslating };
};
