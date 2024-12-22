import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  SafeAreaView,
  ScrollView,
  View,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Platform,
} from "react-native";
import { Audio } from "expo-av";
import { transcribeSpeech } from "@/functions/transcribeSpeech";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { recordSpeech } from "@/functions/recordSpeech";
import useWebFocus from "@/hooks/useWebFocus";
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { googleapi } from '../functions/googleapi';

export default function HomeScreen() {
  const [transcribedSpeech, setTranscribedSpeech] = useState("");
  const [translation, setTranslation] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [voicesWeb, setVoicesWeb] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const isWebFocused = useWebFocus();
  const audioRecordingRef = useRef(new Audio.Recording());
  const webAudioPermissionsRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const loadTranscription = async () => {
      try {
        const voiceTranslatorApiKey = await AsyncStorage.getItem("voiceTranslatorApiKey");
        if (voiceTranslatorApiKey) setApiKey(voiceTranslatorApiKey);

        const savedTranscription = await AsyncStorage.getItem("savedTranscription");
        if (savedTranscription) setTranscribedSpeech(savedTranscription);
      } catch (error) {
        console.error("failed:", error);
      }
    };
    loadTranscription();

    const fetchVoices = () => {
      if (Platform.OS === "web") {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoicesWeb(availableVoices);
      }
    };

    if (Platform.OS === "web" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = fetchVoices;
      fetchVoices();
    }
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
    if (transcribedSpeech) saveTranscription();
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
        setTranscribedSpeech((prev) => prev? `${prev || ''}\n${transcript}。` : `${transcript}。`);
      }
    } catch (error) {
      console.error("Transcription error:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleInputChange = async (text: any) => {
    await AsyncStorage.setItem("voiceTranslatorApiKey", text);
    setApiKey(text);
  };

  const handleTranslation = async (language: "zh-CN" | "en-US" | "ja-JP", prompt: string) => {
    setIsTranslating(true);
    try {
      const response = await googleapi(
        `${transcribedSpeech}\n Please translate these sentences to ${prompt}. Only reply the best translation without other words.`,
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

  const saveTranscription = async () => {
    try {
      await AsyncStorage.setItem("savedTranscription", transcribedSpeech);
    } catch (error) {
      console.error("Error saving transcription:", error);
    }
  };

  const clearTranscription = async () => {
    try {
      await AsyncStorage.setItem("savedTranscription", "");
      setTranscribedSpeech("");
      setTranslation("");
      setIsRecording(false);
      setIsTranscribing(false);
      setIsTranslating(false);
    } catch (error) {
      console.error("Error clearing transcription:", error);
    }
  };

  const handleSpeak = async () => {
    if (!translation) {
      alert("Please input translation！");
      return;
    }
    setIsPaused(true);

    if (Platform.OS === "web") {
      const voice = voicesWeb.find((v) => v.lang === selectedVoice);
      const utterance = new SpeechSynthesisUtterance(translation);
      utterance.voice = voice ?? null;
      utterance.lang = voice?.lang || "en-US";
      
      utterance.onstart = () => {
        console.log("Speech started");
        setIsPaused(true);
      };

      
      utterance.onend = () => {
        console.log("Speech finished");
        setIsPaused(false);
      };

      utterance.onerror = (e) => {
        console.error("Speech error:", e);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      import("expo-speech").then((Speech) => {
        Speech.speak(translation, {
          language: selectedVoice,
          pitch: 1.0,
          rate: 1.0,
          onDone: () => setIsPaused(false),
          onStopped: () => setIsPaused(false),
        });
      });
    }
  };

  const stopSpeak = () => {
    if (Platform.OS === "web") {
      window.speechSynthesis.cancel();
      setIsPaused(false);
    } else {
      import("expo-speech").then((Speech) => Speech.stop());
    }
    setIsPaused(false);
  };


  return (
    <SafeAreaView>
      <ScrollView style={styles.mainScrollContainer}>
        <View style={styles.mainInnerContainer}>
          <Text style={styles.label}>Voice Translator</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Google API Key"
            value={apiKey}
            onChangeText={handleInputChange}
            secureTextEntry
          />
          <View style={styles.transcriptionContainer}>
            {isTranscribing && (
              <View style={styles.overlay}>
                <ActivityIndicator size="large" color="#000" />
              </View>
            )}
            
            <TextInput
                style={{
                  ...styles.transcribedText,
                  color: transcribedSpeech ? "#000" : "rgb(150,150,150)",
                }}
                value={transcribedSpeech}
                onChangeText={setTranscribedSpeech}
                placeholder="Your transcribed text will be shown here"
                multiline
                editable 
                placeholderTextColor="rgb(150,150,150)"
              >
            </TextInput>
          </View>
          <View style={styles.rowContainer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => handleTranslation("zh-CN", "Chinese")}
            >
              <Text style={styles.saveButtonText}>CN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => handleTranslation("en-US", "English")}
            >
              <Text style={styles.saveButtonText}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => handleTranslation("ja-JP", "Japanese")}
            >
              <Text style={styles.saveButtonText}>JP</Text>
            </TouchableOpacity>
            {isPaused ? 
            (<TouchableOpacity
              style={styles.saveButton}
              onPress={stopSpeak} 
              accessible={true}
              accessibilityLabel="stop"
            >
              <Text style={styles.saveButtonText}><FontAwesome name="stop-circle" size={24} color="white" /></Text>
            </TouchableOpacity>) : (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSpeak} 
              accessible={true}
              accessibilityLabel="play"
            >
              <Text style={styles.saveButtonText}><FontAwesome name="play-circle-o" size={24} color="white" /></Text>
            </TouchableOpacity>)
            }
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveTranscription}
            >
              <Text style={styles.saveButtonText}>save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={clearTranscription}
            >
              <Text style={styles.saveButtonText}>reset</Text>
            </TouchableOpacity>
          </View>
          <View style={{
                  ...styles.transcriptionContainer,
                }}>
            {isTranslating && (
              <View style={styles.overlay}>
                <ActivityIndicator size="large" color="#000" />
              </View>
            )}
            <Text
                style={{
                  ...styles.transcribedText,
                  color: translation ? "#000" : "rgb(150,150,150)",
                }}
                selectable={true}
              >
                {translation ||
                  "Translation will be shown here"}
            </Text>
          </View>
          <TouchableOpacity
            style={{
              ...styles.microphoneButton,
              opacity: isRecording || isTranscribing ? 0.5 : 1,
            }}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            disabled={isRecording || isTranscribing}
          >
            {isRecording ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <FontAwesome name="microphone" size={40} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainScrollContainer: {
    padding: 20,
    height: "100%",
    width: "100%",
  },
  mainInnerContainer: {
    gap: 5,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  title: {
    fontSize: 35,
    padding: 5,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  transcriptionContainer: {
    backgroundColor: "rgb(220,220,220)",
    width: "100%",
    height: 260,
    padding: 20,
    marginBottom: 20,
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  transcribedText: {
    fontSize: 20,
    color: "#000",
    textAlign: "left",
    textAlignVertical: "top",
    width: "100%",
    height: "100%",
    overflow: "scroll"
  },
  microphoneButton: {
    backgroundColor: "red",
    width: 75,
    height: 75,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  label: {
    fontSize: 18,
    marginBottom: 8,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    width: '100%',
    marginBottom: 16,
  },
  displayedText: {
    fontSize: 18,
    marginTop: 16,
    color: 'blue',
  },
  saveButton: {
    backgroundColor: "green",
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  saveButtonText: {
    textAlign: "center",
    color: '#fff',
    fontSize: 16,
  },
  rowContainer: {
    flexDirection: 'row', 
    justifyContent: 'space-between',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
  },
});
