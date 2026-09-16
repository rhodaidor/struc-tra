import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Sparkles, Volume2, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const VoiceSearchModal: React.FC = () => {
  const { isVoiceSearchOpen, setIsVoiceSearchOpen, setGlobalSearchQuery, performAISearch, setCurrentPage } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  const sampleVoiceQueries = [
    'Find the Dangote invoice from March',
    'Show me the receipt I received from Zenith',
    'Find the contract with ABC Ltd',
    'I need the payment confirmation from MTN',
    'Show me documents from Gmail',
    'Find the document with invoice INV-2045',
  ];

  const handleApplyVoice = async (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop error
      }
    }

    setIsListening(false);
    setIsProcessing(true);
    setGlobalSearchQuery(clean);

    try {
      await performAISearch(clean);
    } catch (e) {
      console.warn('Voice search execution error:', e);
    } finally {
      setIsProcessing(false);
      setIsVoiceSearchOpen(false);
      setCurrentPage('documents');
    }
  };

  const startListening = () => {
    setErrorMessage(null);
    setTranscription('');
    setIsProcessing(false);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorMessage("Voice search isn't supported in your browser. You can still type your request in search.");
      setIsListening(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscription('Listening... Speak now.');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscription(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setErrorMessage('Microphone access is required for voice search. Please enable microphone permissions.');
        } else if (event.error === 'no-speech') {
          setTranscription('No speech detected. Please try speaking again.');
        } else if (event.error === 'network') {
          setErrorMessage('We couldn\'t complete the voice search. Please check your connection and try again.');
        } else {
          setErrorMessage(`Voice search error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setErrorMessage('Microphone access is required for voice search.');
    }
  };

  useEffect(() => {
    if (isVoiceSearchOpen) {
      startListening();
    } else {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      setIsProcessing(false);
      setTranscription('');
      setErrorMessage(null);
    }
  }, [isVoiceSearchOpen]);

  if (!isVoiceSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative animate-in zoom-in-95">
        <button
          onClick={() => {
            if (recognitionRef.current) {
              try { recognitionRef.current.stop(); } catch (e) {}
            }
            setIsVoiceSearchOpen(false);
          }}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close voice search modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mic Pulse Icon */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 relative transition-all ${
          isProcessing
            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
            : isListening 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-8 ring-indigo-100 dark:ring-indigo-950' 
            : errorMessage 
            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800' 
            : 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400'
        }`}>
          {isProcessing ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : isListening ? (
            <Mic className="w-8 h-8 animate-pulse" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </div>

        <h3 className="text-lg font-black text-slate-900 dark:text-white">Voice AI Search</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Speak naturally to retrieve documents across Gmail, Telegram & Uploads</p>

        {/* Error State Banner */}
        {errorMessage && (
          <div className="my-4 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Live Speech Recognition Box */}
        <div className="my-5 p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl min-h-[90px] flex items-center justify-center relative">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 italic">
            {isProcessing 
              ? 'Searching your documents with Structra AI...' 
              : transcription || (isListening ? 'Listening for voice input...' : 'Click start listening or pick a sample voice query below')}
          </p>
        </div>

        {/* Action Controls */}
        <div className="space-y-2.5">
          {transcription && transcription !== 'Listening... Speak now.' && transcription !== 'No speech detected. Please try speaking again.' && !isProcessing && (
            <button
              onClick={() => handleApplyVoice(transcription)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Search "{transcription}"
            </button>
          )}

          <button
            onClick={startListening}
            disabled={isProcessing}
            className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-2xl text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Mic className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            {isListening ? 'Restart Listening' : 'Start Voice Search'}
          </button>
        </div>

        {/* Quick Sample Query Chips */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5">Or tap a sample voice command:</p>
          <div className="space-y-1.5">
            {sampleVoiceQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyVoice(q)}
                className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold flex items-center justify-between group transition-colors"
              >
                <span>"{q}"</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

