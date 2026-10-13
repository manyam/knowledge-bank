import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square, Sparkles, AlertCircle, Volume2, Globe2 } from 'lucide-react';
import { translateVoiceQuery } from '../../api/client.js';

interface VoiceRecorderProps {
  onTranscriptReady: (refinedText: string, autoSubmit: boolean) => void;
  isProcessingParent?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscriptReady,
  isProcessingParent = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [autoSubmit, setAutoSubmit] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Check Web Speech API availability
  const hasSpeechRecognition =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const startRecording = () => {
    setError(null);
    setTranscript('');
    setRecordingSeconds(0);

    if (!hasSpeechRecognition) {
      setError(
        'Web Speech API is not supported in this browser. Please use Chrome, Safari, or Edge on Mac.'
      );
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = targetLanguage === 'Spanish' ? 'es-ES' : targetLanguage === 'French' ? 'fr-FR' : targetLanguage === 'German' ? 'de-DE' : targetLanguage === 'Chinese' ? 'zh-CN' : 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        timerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
        setTranscript(fullTranscript.trim());
      };

      recognition.onerror = (event: any) => {
        console.error('[SpeechRecognition Error]:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone permission was denied. Please allow microphone access in your browser.');
        } else if (event.error !== 'no-speech') {
          setError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setError(err.message || 'Failed to start microphone');
      setIsRecording(false);
    }
  };

  const stopAndProcess = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsRecording(false);

    const spokenText = transcript.trim();
    if (!spokenText) {
      setError('No speech was detected. Please try speaking again.');
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      // Send spoken transcript to local Llama / Ollama model for translation and refinement
      const result = await translateVoiceQuery(spokenText, targetLanguage);
      const finalText = result.refinedText || spokenText;
      onTranscriptReady(finalText, autoSubmit);
      setTranscript('');
    } catch (err: any) {
      console.warn('Voice translation error, falling back to raw transcript:', err);
      onTranscriptReady(spokenText, autoSubmit);
      setTranscript('');
    } finally {
      setIsTranslating(false);
    }
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsRecording(false);
    setIsTranslating(false);
    setTranscript('');
    setError(null);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full">
      {/* If Not Recording or Translating: Show compact mic trigger */}
      {!isRecording && !isTranslating && (
        <button
          type="button"
          onClick={startRecording}
          disabled={isProcessingParent}
          className="p-3 text-slate-400 hover:text-sky-400 hover:bg-slate-800/80 rounded-xl transition-all flex items-center space-x-1.5 shrink-0 group"
          title="Voice Mode (Speak to search)"
        >
          <Mic className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline text-xs font-medium">Voice</span>
        </button>
      )}

      {/* Active Voice Overlay Panel */}
      {(isRecording || isTranslating) && (
        <div className="bg-slate-900 border border-sky-500/30 rounded-2xl p-4 shadow-2xl animate-in fade-in duration-200 space-y-3">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
              <span className="text-xs font-bold text-white tracking-wide uppercase">
                {isRecording ? 'Listening...' : 'Translating with Local Model...'}
              </span>
              {isRecording && (
                <span className="text-xs font-mono font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  {formatTimer(recordingSeconds)}
                </span>
              )}
            </div>

            {/* Target Language & Auto-send Controls */}
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1 text-slate-400">
                <Globe2 className="w-3.5 h-3.5 text-sky-400" />
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  disabled={isRecording || isTranslating}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="English">Translate to English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Chinese">Chinese</option>
                </select>
              </div>

              <label className="flex items-center space-x-1.5 cursor-pointer text-slate-400 text-[11px]">
                <input
                  type="checkbox"
                  checked={autoSubmit}
                  onChange={(e) => setAutoSubmit(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0"
                />
                <span>Auto-search</span>
              </label>
            </div>
          </div>

          {/* Sound Wave Animation */}
          {isRecording && (
            <div className="flex items-center justify-center space-x-1.5 py-2">
              {[40, 70, 100, 60, 90, 50, 80, 45, 95, 65].map((height, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-sky-500 to-indigo-500 rounded-full animate-pulse"
                  style={{
                    height: `${Math.max(12, (height * (1 + (recordingSeconds % 3))) / 2.5)}px`,
                    animationDelay: `${i * 100}ms`,
                    animationDuration: '600ms',
                  }}
                />
              ))}
            </div>
          )}

          {/* Real-time Transcript Preview */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 min-h-[48px] max-h-24 overflow-y-auto text-xs text-slate-200">
            {isTranslating ? (
              <div className="flex items-center space-x-2 text-sky-400 font-medium animate-pulse">
                <Sparkles className="w-4 h-4" />
                <span>Translating spoken audio & refining query with local model...</span>
              </div>
            ) : transcript ? (
              <p className="italic font-sans text-slate-200">"{transcript}"</p>
            ) : (
              <p className="text-slate-500 italic">Speak now into your microphone...</p>
            )}
          </div>

          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Bottom Action Controls */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={cancelRecording}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {isRecording && (
              <button
                type="button"
                onClick={stopAndProcess}
                disabled={!transcript.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop & Translate</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
