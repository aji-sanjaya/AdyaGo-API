import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import ModuleLayout from '../../layouts/ModuleLayout';
import { aiApi } from '../../api/ai';
import { Send, Bot, User, Loader2, Trash2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const STORAGE_KEY = 'adyago_ai_history';

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages) {
  try {
    // Simpan max 50 pesan terakhir
    const trimmed = messages.slice(-50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

export default function ConversationAIPage() {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState(() => loadHistory());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  const historyForAPI = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiApi.chat(text, historyForAPI);
      const assistantMsg = { role: 'assistant', content: res.data.reply };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg = err?.response?.data?.error || 'Gagal menghubungi AI. Pastikan Ollama berjalan.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${errMsg}`, isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const suggestions = [
    'Tampilkan 5 Purchase Order terakhir',
    'Cari vendor dengan nama Adya',
    'Berapa jumlah requisition yang masih Draft?',
    'Cari produk bearing',
  ];

  return (
    <ModuleLayout pageTitle="Conversation AI" rootMenuId={1000030} rootMenuName="Dashboard">
      <div className={`flex flex-col h-[calc(100vh-64px)] ${isDark ? 'bg-[#0d1117]' : 'bg-slate-50'}`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-700/50 bg-[#0d1117]' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
              <Sparkles className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <div>
              <h1 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                AdyaGo AI
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Powered by Qwen3.5 · iDempiere Database
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${isDark
                ? 'text-slate-400 hover:text-red-400 hover:bg-red-400/10'
                : 'text-slate-500 hover:text-red-500 hover:bg-red-50'
                }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus riwayat
            </button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6 pb-16">
              <div className={`p-5 rounded-2xl ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                <Bot className={`w-10 h-10 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
              </div>
              <div className="text-center">
                <p className={`text-lg font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  Halo! Saya AI Asisten AdyaGo
                </p>
                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Tanyakan apapun tentang data ERP iDempiere Anda
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                    className={`text-left text-xs px-4 py-3 rounded-xl border transition-all ${isDark
                      ? 'border-slate-700 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/5'
                      : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} isDark={isDark} />
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                <Bot className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </div>
              <div className={`px-4 py-3 rounded-2xl rounded-tl-sm ${isDark ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
                <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className={`px-4 py-4 border-t ${isDark ? 'border-slate-700/50 bg-[#0d1117]' : 'border-slate-200 bg-white'}`}>
          <div className={`flex items-end gap-3 max-w-4xl mx-auto rounded-2xl border px-4 py-3 transition-colors ${isDark
            ? 'border-slate-700 bg-slate-800/50 focus-within:border-indigo-500/60'
            : 'border-slate-200 bg-white focus-within:border-indigo-400'
            }`}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan sesuatu tentang data ERP... (Enter untuk kirim)"
              rows={1}
              className={`flex-1 resize-none bg-transparent text-sm outline-none max-h-32 ${isDark ? 'text-slate-100 placeholder-slate-600' : 'text-slate-800 placeholder-slate-400'}`}
              style={{ lineHeight: '1.5' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className={`flex-shrink-0 p-2 rounded-xl transition-all ${input.trim() && !loading
                ? isDark
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : isDark
                  ? 'bg-slate-700 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className={`text-center text-xs mt-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            AI dapat membuat kesalahan. Verifikasi data penting langsung di iDempiere.
          </p>
        </div>
      </div>
    </ModuleLayout>
  );
}

function MessageBubble({ message, isDark }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser
        ? isDark ? 'bg-slate-700' : 'bg-slate-200'
        : isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'
        }`}>
        {isUser
          ? <User className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
          : <Bot className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser
        ? isDark
          ? 'bg-indigo-600 text-white rounded-tr-sm'
          : 'bg-indigo-600 text-white rounded-tr-sm'
        : message.isError
          ? isDark
            ? 'bg-red-500/10 border border-red-500/30 text-red-400 rounded-tl-sm'
            : 'bg-red-50 border border-red-200 text-red-600 rounded-tl-sm'
          : isDark
            ? 'bg-slate-800 text-slate-200 rounded-tl-sm'
            : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
        }`}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className={`prose prose-sm max-w-none ${isDark ? 'prose-invert' : ''}`}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
