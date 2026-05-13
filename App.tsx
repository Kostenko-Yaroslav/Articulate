import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { analyzeSpeech } from './services/ai';
import { AntDesign } from '@expo/vector-icons'; // Для иконок


export default function App() {
  const [recording, setRecording] = useState<Audio.Recording | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    title: string;
    transcript: string;
    score: number;
    errors: { type: string; text: string; suggestion: string }[];
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    (async () => {
      // Запрос разрешения на микрофон
      await Audio.requestPermissionsAsync();
    })();
  }, []);

  async function startRecording() {
    try {
      setAnalysisResult(null); // Сбрасываем предыдущий результат
      setIsRecording(true);
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Ошибка', 'Не удалось начать запись. Проверьте разрешения микрофона.');
    }
  }

  async function stopRecording() {
    setIsRecording(false);
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (!uri) return;

    // Очистка предыдущего файла, если есть
    await FileSystem.deleteAsync(uri, { idempotent: true }); 
    setRecording(undefined);

    setIsAnalyzing(true);
    try {
      const result = await analyzeSpeech(uri);
      setAnalysisResult(result);
    } catch (err: any) {
      console.error('AI Analysis Error:', err);
      Alert.alert('Ошибка анализа', err.message || 'Произошла ошибка при анализе речи.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  const highlightText = (text: string, errors: { type: string; text: string; suggestion: string }[]) => {
    let result: React.ReactNode[] = [];
    let lastIndex = 0;

    errors.forEach((error) => {
      const startIndex = text.indexOf(error.text, lastIndex);
      if (startIndex !== -1) {
        // Добавляем текст до ошибки
        result.push(<Text key={`normal-${lastIndex}`}>{text.substring(lastIndex, startIndex)}</Text>);
        // Добавляем ошибку с подсветкой
        result.push(
          <Text key={`error-${startIndex}`} style={styles.highlightedText}>
            {text.substring(startIndex, startIndex + error.text.length)}
          </Text>
        );
        lastIndex = startIndex + error.text.length;
      }
    });

    // Добавляем оставшийся текст
    result.push(<Text key={`normal-${lastIndex}`}>{text.substring(lastIndex)}</Text>);
    return result;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Мобильный тренер речи</Text>

      <View style={styles.card}>
        {isAnalyzing ? (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.analyzingText}>ИИ слушает запись...</Text>
          </View>
        ) : analysisResult ? (
          <ScrollView style={styles.resultsScroll}>
            <Text style={styles.resultTitle}>{analysisResult.title}</Text>
            <Text style={styles.scoreText}>Оценка: {analysisResult.score}%</Text>
            
            <View style={styles.transcriptContainer}>
              {highlightText(analysisResult.transcript, analysisResult.errors)}
            </View>

            {analysisResult.errors.map((error, index) => (
              <View key={index} style={styles.errorCard}>
                <Text style={styles.errorType}>{error.type}</Text>
                <Text style={styles.errorText}>"{error.text}"</Text>
                <Text style={styles.suggestionText}>→ {error.suggestion}</Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.placeholderText}>Нажмите кнопку и начните говорить</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {isRecording ? (
          <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
            <AntDesign name="pausecircle" size={50} color="white" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
            <AntDesign name="mic" size={50} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  card: {
    flex: 1,
    width: '90%',
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
    textAlign: 'center',
  },
  analyzingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingText: {
    color: '#fff',
    marginTop: 15,
    fontSize: 18,
  },
  resultsScroll: {
    width: '100%',
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 20,
  },
  transcriptContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  highlightedText: {
    color: '#FF6347', // Tomato color for errors
    fontWeight: 'bold',
    backgroundColor: 'rgba(255,99,71,0.2)',
    borderRadius: 5,
  },
  errorCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,99,71,0.2)',
  },
  errorType: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  errorText: {
    color: '#FF6347',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 5,
  },
  suggestionText: {
    color: '#3CB371', // MediumSeaGreen
    fontSize: 14,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  recordButton: {
    backgroundColor: '#FF6347', // Tomato
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6347',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 8,
  },
  stopButton: {
    backgroundColor: '#A9A9A9', // DarkGray
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A9A9A9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 8,
  },
});
