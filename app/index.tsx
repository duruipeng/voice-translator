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
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranscription } from "@/hooks/useTranscription";
import { useTranslation } from "@/hooks/useTranslation";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

export default function HomeScreen() {
  const [apiKey, setApiKey] = useState("");
  const [voicesWeb, setVoicesWeb] = useState<SpeechSynthesisVoice[]>([]);
  const webAudioPermissionsRef = useRef<MediaStream | null>(null);
  const { transcribedSpeech, isRecording, isTranscribing, setIsRecording, setIsTranscribing, setTranscribedSpeech, startRecording, stopRecording } =
    useTranscription(apiKey, webAudioPermissionsRef);
  const { translation, isTranslating, selectedVoice, translate, setTranslation, setIsTranslating } = useTranslation(apiKey);
  const { isPaused, speak, stop } = useSpeechSynthesis();

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const voiceTranslatorApiKey = await AsyncStorage.getItem("voiceTranslatorApiKey");
        if (voiceTranslatorApiKey) setApiKey(voiceTranslatorApiKey);
      } catch (error) {
        console.error("failed:", error);
      }
    };
    loadApiKey();

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

  const handleInputChange = async (text: string) => {
    await AsyncStorage.setItem("voiceTranslatorApiKey", text);
    setApiKey(text);
  };

  const handleSpeak = () => {
    const voice = voicesWeb.find((v) => v.lang === selectedVoice);
    speak(translation, voice ?? null, selectedVoice);
  };

  const saveTranscription = async () => {
    try {
      await AsyncStorage.setItem("savedTranscription", transcribedSpeech);
    } catch (error) {
      console.error("Error saving transcription:", error);
    }
  };
  
  const clearTranscription = () => {
    AsyncStorage.setItem("savedTranscription", "").catch(console.error);
    setTranscribedSpeech("");
    setTranslation("");
    setIsRecording(false);
    setIsTranscribing(false);
    setIsTranslating(false);
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
              onPress={() => translate(transcribedSpeech, "zh-CN", "Chinese")}
            >
              <Text style={styles.saveButtonText}>CN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => translate(transcribedSpeech, "en-US", "English")}
            >
              <Text style={styles.saveButtonText}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => translate(transcribedSpeech, "ja-JP", "Japanese")}
            >
              <Text style={styles.saveButtonText}>JP</Text>
            </TouchableOpacity>
            {isPaused ? 
            (<TouchableOpacity
              style={styles.saveButton}
              onPress={stop} 
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
