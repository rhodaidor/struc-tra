import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, X, Send, User as UserIcon, Loader2, FileText, ArrowRight, 
  Mic, MicOff, Plus, MessageSquare, History, Trash2, AlertTriangle, 
  ChevronLeft, ChevronDown, Clock, MessageSquarePlus 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AIChatMessage, AIConversation } from '../../types';
import { supabase } from '../../lib/supabase';
import aiAvatarImg from '../../assets/images/structra_ai_avatar_1785559224651.jpg';

const DEFAULT_AI_GREETING: AIChatMessage = {
  id: 'structra_greeting_default',
  sender: 'assistant',
  text: 'Hello! I am Structra AI. Ask me anything about your documents, like "What is the total of Dangote invoice?" or "Find the office lease agreement terms".',
  timestamp: 'Just now',
};

export const AIChatDrawer: React.FC = () => {
  const { 
    user, 
    isAIChatOpen, 
    setIsAIChatOpen, 
    documents, 
    setSelectedDocument, 
    aiConversations,
    activeConversationId,
    aiMessages, 
    addAiMessage, 
    startNewAiChat,
    selectAiConversation,
    deleteAiConversation,
    isLoadingConversations,
  } = useApp();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<AIConversation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const prevMessagesCountRef = useRef(0);

  const displayedMessages = aiMessages.length > 0 ? aiMessages : [DEFAULT_AI_GREETING];
  const activeConversation = aiConversations.find(c => c.id === activeConversationId);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    setMicError(null);
    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicError("Voice input is not supported in this browser environment.");
      setIsListening(true);
      setTimeout(() => {
        setInput((prev) => (prev ? `${prev} What is the total invoice amount?` : 'What is the total invoice amount?'));
        setIsListening(false);
      }, 2000);
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInput(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicError('Microphone permission required.');
        } else if (event.error !== 'no-speech') {
          setMicError(`Voice error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setMicError('Microphone permission required.');
    }
  };

  // Lock background webpage scrolling when AI Assistant drawer is open
  useEffect(() => {
    if (isAIChatOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    } else {
      stopListening();
      setMicError(null);
      setShowHistory(false);
      setConversationToDelete(null);
    }
  }, [isAIChatOpen]);

  // Check scroll position to determine if user has intentionally scrolled up
  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    // User is considered scrolled up if more than 60px away from the bottom
    setIsUserScrolledUp(distanceFromBottom > 60);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
      setIsUserScrolledUp(false);
    }
  };

  useEffect(() => {
    if (isAIChatOpen && !showHistory) {
      const isNewMessage = displayedMessages.length > prevMessagesCountRef.current;
      const lastMsg = displayedMessages[displayedMessages.length - 1];

      // Auto-scroll to bottom if user sent message or if user hasn't scrolled up
      if (lastMsg?.sender === 'user' || !isUserScrolledUp) {
        scrollToBottom(isNewMessage ? 'smooth' : 'auto');
      }
      prevMessagesCountRef.current = displayedMessages.length;
    }
  }, [displayedMessages, isAIChatOpen, isLoading, showHistory, isUserScrolledUp]);

  if (!isAIChatOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');

    const userMsg: AIChatMessage = {
      id: 'm_' + Date.now(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    await addAiMessage(userMsg);
    setIsLoading(true);
    scrollToBottom('smooth');

    const activeDocs = documents.filter(d => !d.isTrash);

    // Build lightweight document payload (NO binary/base64 content, NO large file blobs)
    const lightweightDocs = activeDocs.map(d => ({
      id: d.id,
      title: d.title,
      category: d.category,
      source: d.source,
      fileType: d.fileType,
      uploadDate: d.uploadDate,
      tags: d.tags || [],
      contentSummary: d.contentSummary || '',
      rawText: d.rawText || '',
      metadata: {
        vendor: d.metadata?.vendor,
        totalAmount: d.metadata?.totalAmount,
        documentNumber: d.metadata?.documentNumber,
        issueDate: d.metadata?.issueDate,
        dueDate: d.metadata?.dueDate,
        counterparty: d.metadata?.counterparty,
      },
    }));

    // Send recent conversation history (last 8 turns only, excluding placeholder greeting)
    const realHistory = aiMessages.filter(m => m.id !== userMsg.id && m.id !== 'greeting');
    const recentHistory = [...realHistory, userMsg].slice(-8).map(m => ({
      sender: m.sender,
      text: m.text,
      referencedDocumentIds: m.referencedDocumentIds || [],
    }));

    try {
      let token: string | undefined = undefined;
      try {
        const sessionRes = await supabase.auth.getSession();
        token = sessionRes?.data?.session?.access_token;
      } catch (e) {
        // Fallback if auth check fails
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userText,
          history: recentHistory,
          documents: lightweightDocs,
          userId: user?.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        let replyText = data.answer || data.text;
        if (!replyText && data.success === false) {
          replyText = data.error?.message || 'Structra AI is temporarily unavailable. Please try again.';
        }

        const botMsg: AIChatMessage = {
          id: 'm_res_' + Date.now(),
          sender: 'assistant',
          text: replyText || "I couldn't find that information in your Structra documents.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          referencedDocumentIds: data.referencedDocumentIds || (data.sources ? data.sources.map((s: any) => s.documentId) : []),
          contextDocumentIds: data.contextDocumentIds || [],
          matchType: data.matchType || (data.referencedDocumentIds?.length > 0 ? 'RELATED' : 'NONE'),
        };

        await addAiMessage(botMsg);
      } else {
        let errMessage = 'Structra AI is temporarily unavailable. Please try again.';
        try {
          const errData = await response.json();
          if (errData?.error?.message) {
            errMessage = errData.error.message;
          }
        } catch {}

        if (response.status === 401 && !errMessage) {
          errMessage = 'Your session has expired. Please sign in again.';
        }

        const errorMsg: AIChatMessage = {
          id: 'm_err_' + Date.now(),
          sender: 'assistant',
          text: errMessage,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        await addAiMessage(errorMsg);
      }
    } catch {
      const networkErrorMsg: AIChatMessage = {
        id: 'm_err_' + Date.now(),
        sender: 'assistant',
        text: "We couldn't connect to Structra AI. Please check your connection and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      await addAiMessage(networkErrorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    if (isLoading) return;
    startNewAiChat();
    setShowHistory(false);
  };

  const handleSelectConversation = async (convId: string) => {
    if (isLoading) return;
    setShowHistory(false);
    await selectAiConversation(convId);
  };

  const handleConfirmDelete = async () => {
    if (!conversationToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteAiConversation(conversationToDelete.id);
      setConversationToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsAIChatOpen(false);
      }}
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 overflow-hidden"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#121316] h-full max-h-screen shadow-2xl flex flex-col border-l border-slate-200 dark:border-[#22242a] overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Fixed Header */}
        <div className="shrink-0 p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-xs ring-1 ring-white/30 bg-blue-700 flex items-center justify-center">
              <img
                src={aiAvatarImg}
                alt="Structra AI Avatar"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/structra-ai-avatar.jpg';
                }}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm tracking-tight truncate">
                {showHistory ? 'Conversation History' : (activeConversation?.title || 'Structra Document AI')}
              </h3>
              <p className="text-[10px] text-blue-100 font-medium truncate">
                {showHistory 
                  ? `${aiConversations.length} saved conversation${aiConversations.length === 1 ? '' : 's'}`
                  : `Instant AI Q&A across ${documents.filter(d => !d.isTrash).length} document${documents.filter(d => !d.isTrash).length === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* History Toggle Button */}
            <button
              type="button"
              onClick={() => setShowHistory(prev => !prev)}
              title={showHistory ? 'Back to current chat' : 'View conversation history'}
              className={`p-1.5 rounded-lg text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px] ${
                showHistory ? 'bg-white/20 font-bold' : 'hover:bg-white/10 text-white/90'
              }`}
              aria-label={showHistory ? 'Back to chat' : 'Conversation history'}
            >
              {showHistory ? (
                <>
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden sm:inline">Chat</span>
                </>
              ) : (
                <>
                  <History className="w-3.5 h-3.5" />
                  {aiConversations.length > 0 && (
                    <span className="text-[9px] bg-white/25 px-1 py-0.2 rounded-full font-bold">
                      {aiConversations.length}
                    </span>
                  )}
                </>
              )}
            </button>

            {/* New Chat Button */}
            <button
              type="button"
              onClick={handleNewChat}
              title="Start a new conversation"
              className="p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              aria-label="Start new conversation"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium hidden sm:inline">New Chat</span>
            </button>

            {/* Close Drawer Button */}
            <button
              type="button"
              onClick={() => setIsAIChatOpen(false)}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close AI Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal Overlay */}
        {conversationToDelete && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#16171b] border border-slate-200 dark:border-[#262832] rounded-2xl p-4 w-full max-w-xs shadow-2xl space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
                <div className="p-2 bg-red-50 dark:bg-red-950/50 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Delete conversation?</h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                "<span className="font-semibold text-slate-800 dark:text-slate-200">{conversationToDelete.title}</span>" and all its messages will be permanently deleted. This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setConversationToDelete(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#20222a] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-3.5 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Mode 1: Conversation History List */}
        {showHistory ? (
          <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-2 bg-slate-50 dark:bg-[#0c0d10]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#7d8292]">
                Saved Conversations
              </span>
              <button
                type="button"
                onClick={handleNewChat}
                className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Start Fresh</span>
              </button>
            </div>

            {isLoadingConversations && (
              <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span>Loading conversations...</span>
              </div>
            )}

            {!isLoadingConversations && aiConversations.length === 0 && (
              <div className="text-center py-12 px-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 mx-auto flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700 dark:text-[#ededee]">No previous conversations yet</p>
                  <p className="text-[11px] text-slate-500 dark:text-[#888c9b]">
                    Ask Structra AI anything about your documents to start your first conversation thread.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Start New Chat
                </button>
              </div>
            )}

            {!isLoadingConversations && aiConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const dateDisplay = conv.updatedAt 
                ? new Date(conv.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                : '';
              const timeDisplay = conv.updatedAt 
                ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={conv.id}
                  className={`group relative p-3 rounded-xl border transition-all flex items-start justify-between gap-2.5 cursor-pointer ${
                    isActive
                      ? 'bg-blue-50/80 dark:bg-[#181a24] border-blue-300 dark:border-blue-700/60 shadow-xs ring-1 ring-blue-500/20'
                      : 'bg-white dark:bg-[#15161b] border-slate-200 dark:border-[#262832] hover:border-slate-300 dark:hover:border-[#333644] hover:bg-slate-50 dark:hover:bg-[#1c1d24]'
                  }`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-100 dark:bg-[#20222a] text-slate-500 dark:text-[#888c9b] group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    }`}>
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-[#ededee] truncate">
                          {conv.title || 'New Conversation'}
                        </h4>
                        {isActive && (
                          <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded-md shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-[11px] text-slate-500 dark:text-[#888c9b] truncate mt-0.5">
                          {conv.lastMessage}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 dark:text-[#6b7082]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {dateDisplay} {timeDisplay}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Explicit Delete Button */}
                  <button
                    type="button"
                    title="Delete this conversation"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConversationToDelete(conv);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer shrink-0"
                    aria-label={`Delete conversation ${conv.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* View Mode 2: Scrollable Active Conversation History */
          <div 
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            className="flex-1 min-h-0 p-4 overflow-y-auto space-y-4 bg-slate-50 dark:bg-[#0c0d10] relative overscroll-contain"
          >
            {isLoadingConversations ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span>Loading conversation messages...</span>
              </div>
            ) : (
              displayedMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {m.sender === 'user' ? (
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white shrink-0 flex items-center justify-center text-xs font-bold shadow-2xs">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 shadow-2xs bg-blue-700 flex items-center justify-center">
                      <img
                        src={aiAvatarImg}
                        alt="Structra AI Avatar"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/structra-ai-avatar.jpg';
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className={`max-w-[80%] space-y-1 ${m.sender === 'user' ? 'items-end' : ''}`}>
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none shadow-2xs'
                          : 'bg-white dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] text-slate-800 dark:text-[#ededee] rounded-tl-none shadow-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    </div>

                    {/* Referenced Documents */}
                    {m.referencedDocumentIds && m.referencedDocumentIds.length > 0 && (
                      <div className="pt-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-[#7d8292]">
                            {m.matchType === 'EXACT' ? 'Matched Document:' : 'Relevant Documents:'}
                          </p>
                          {m.matchType === 'EXACT' ? (
                            <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded">
                              Exact Match
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 rounded">
                              Related
                            </span>
                          )}
                        </div>
                        {m.referencedDocumentIds.map((docId) => {
                          const doc = documents.find((d) => d.id === docId);
                          if (!doc) return null;
                          return (
                            <button
                              key={docId}
                              type="button"
                              onClick={() => {
                                setSelectedDocument(doc);
                              }}
                              className="flex items-center gap-2 p-1.5 bg-white dark:bg-[#18191f] hover:bg-blue-50 dark:hover:bg-[#20222a] border border-slate-200 dark:border-[#262832] rounded-lg text-[11px] text-blue-600 dark:text-blue-400 font-medium transition-colors w-full text-left cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                              <span className="truncate">{doc.title}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400 dark:text-[#6b7082] ml-auto shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Near Candidate Suggestions when matchType is NONE */}
                    {(!m.referencedDocumentIds || m.referencedDocumentIds.length === 0) &&
                      m.contextDocumentIds &&
                      m.contextDocumentIds.length > 0 && (
                        <div className="pt-1 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                              Did you mean one of these?
                            </p>
                            <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded">
                              Suggested
                            </span>
                          </div>
                          {m.contextDocumentIds.map((docId) => {
                            const doc = documents.find((d) => d.id === docId);
                            if (!doc) return null;
                            return (
                              <button
                                key={docId}
                                type="button"
                                onClick={() => {
                                  setSelectedDocument(doc);
                                }}
                                className="flex items-center gap-2 p-1.5 bg-white dark:bg-[#18191f] hover:bg-amber-50 dark:hover:bg-[#20222a] border border-amber-200 dark:border-amber-800/40 rounded-lg text-[11px] text-amber-700 dark:text-amber-400 font-medium transition-colors w-full text-left cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                <span className="truncate">{doc.title}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400 dark:text-[#6b7082] ml-auto shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                    )}

                    <span className="text-[10px] text-slate-400 dark:text-[#6b7082] px-1 block">{m.timestamp}</span>
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-[#888c9b] p-2.5 bg-white dark:bg-[#18191f] rounded-xl border border-slate-200 dark:border-[#262832] w-fit shadow-2xs">
                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-blue-700 flex items-center justify-center">
                  <img
                    src={aiAvatarImg}
                    alt="Structra AI Avatar"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/structra-ai-avatar.jpg';
                    }}
                    className="w-full h-full object-cover animate-pulse"
                  />
                </div>
                <Loader2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
                <span>Analyzing document intelligence...</span>
              </div>
            )}
            <div ref={messagesEndRef} />

            {/* Floating scroll to bottom button */}
            {isUserScrolledUp && (
              <div className="sticky bottom-2 left-0 right-0 flex justify-center pointer-events-none z-10">
                <button
                  type="button"
                  onClick={() => scrollToBottom('smooth')}
                  className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs shadow-md transition-all duration-150 cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Latest messages</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Fixed Quick Prompts (Only on chat mode) */}
        {!showHistory && (
          <div className="shrink-0 p-2 bg-white dark:bg-[#121316] border-t border-slate-100 dark:border-[#22242a] flex gap-1.5 overflow-x-auto text-[11px]">
            {[
              'Total Dangote invoice?',
              'When is the office lease due?',
              'List all contracts',
            ].map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setInput(prompt)}
                className="px-2.5 py-1 bg-slate-100 dark:bg-[#18191f] hover:bg-blue-50 dark:hover:bg-[#20222a] hover:text-blue-600 dark:hover:text-blue-400 rounded-lg text-slate-600 dark:text-[#888c9b] whitespace-nowrap transition-colors cursor-pointer shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Fixed Input Form (Only on chat mode) */}
        {!showHistory && (
          <form onSubmit={handleSend} className="shrink-0 p-3 bg-white dark:bg-[#121316] border-t border-slate-200 dark:border-[#22242a] flex flex-col gap-2">
            {isListening && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-600 dark:text-red-400 text-[11px] font-medium animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                <span>Listening... Speak into your microphone</span>
              </div>
            )}

            {micError && (
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-amber-700 dark:text-amber-400 text-[11px] font-medium">
                <span>{micError}</span>
                <button type="button" onClick={() => setMicError(null)} className="text-amber-500 hover:text-amber-700 p-0.5 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? 'Listening to speech...' : 'Ask AI about your documents...'}
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-[#18191f] border border-slate-200 dark:border-[#262832] rounded-xl text-xs text-slate-800 dark:text-[#ededee] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[#121316] transition-all"
                />
                <button
                  type="button"
                  onClick={toggleListening}
                  title={isListening ? 'Stop voice recording' : 'Speak message using microphone'}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-xs transition-all cursor-pointer ${
                    isListening
                      ? 'bg-red-500 text-white shadow-xs animate-bounce'
                      : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-[#22242c]'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
