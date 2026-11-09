import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Paperclip,
  X,
  RefreshCw,
  Loader2,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import { orderApi } from '../../../../api/order';

export default function OrderChatTab({
  orderId,
  displayDocNo,
  isReadOnly,
  session,
  isDark,
  onTokenExpired,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [modalPreviewImage, setModalPreviewImage] = useState(null);
  const [errorBanner, setErrorBanner] = useState(null);

  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const currentUserId = session?.user?.id || session?.user?.userId || 0;

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  };

  const loadChat = async () => {
    if (!orderId) return;
    setLoading(true);
    setErrorBanner(null);
    try {
      const res = await orderApi.getChat(orderId);
      if (res && res.data) {
        setMessages(res.data);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load chat:', err);
      setErrorBanner('Failed to load discussion messages.');
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  useEffect(() => {
    loadChat();
  }, [orderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const validateAndSelectImage = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorBanner('Only image files (JPG, PNG, GIF, WEBP) can be attached.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorBanner('Image file size exceeds the 2 MB limit.');
      return;
    }

    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    setErrorBanner(null);
  };

  const clearSelectedImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData || !clipboardData.items) return;

    for (let item of clipboardData.items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          const filename = `pasted_image_${Date.now()}.png`;
          const file = new File([blob], filename, { type: blob.type });
          validateAndSelectImage(file);
        }
        break;
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = inputText.trim();

    if (!text && !selectedImage) return;
    if (sending) return;

    setSending(true);
    setErrorBanner(null);

    try {
      await orderApi.sendChatMessage(
        orderId,
        text,
        selectedImage,
        session?.token
      );
      setInputText('');
      clearSelectedImage();

      if (textareaRef.current) {
        textareaRef.current.style.height = '72px';
      }

      await loadChat();
    } catch (err) {
      console.error('Failed to send message:', err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to send message.';
      if (
        errMsg.includes('401') ||
        errMsg.includes('Token has expired') ||
        errMsg.includes('token')
      ) {
        if (onTokenExpired) onTokenExpired();
      } else {
        setErrorBanner(errMsg);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 font-mono">
      <div
        className={`flex flex-col h-[650px] rounded-2xl border overflow-hidden shadow-md ${
          isDark
            ? 'bg-[#0b141a] border-slate-800'
            : 'bg-[#efeae2] border-slate-300'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between ${
            isDark
              ? 'bg-[#202c33] border-slate-700/60'
              : 'bg-[#f0f2f5] border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#008069] text-white flex items-center justify-center font-bold shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4
                className={`font-semibold text-sm leading-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Document Discussions {displayDocNo ? `• ${displayDocNo}` : ''}
              </h4>
              <p className="text-[11px] text-[#008069] dark:text-[#00a884] font-medium flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse"></span>
                <span>
                  {messages.length} {messages.length === 1 ? 'Message' : 'Messages'} Registered
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadChat}
              disabled={loading}
              title="Refresh Chat"
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isDark
                  ? 'text-slate-300 hover:text-white hover:bg-white/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
              }`}
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorBanner && (
          <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-500 text-xs flex items-center justify-between">
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-rose-500 hover:text-rose-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Chat Body */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
          style={{
            backgroundImage: isDark
              ? 'radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0)'
              : 'radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        >
          {loading && messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#008069] animate-spin mb-2" />
              <p className="text-xs text-slate-400">Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                  isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-400 shadow-sm'
                }`}
              >
                <MessageSquare className="w-6 h-6" />
              </div>
              <p
                className={`text-sm font-semibold ${
                  isDark ? 'text-slate-200' : 'text-slate-700'
                }`}
              >
                No discussion messages yet
              </p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Start a conversation about this purchase order. All updates and attachments are logged here.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = Number(msg.ad_user_id) === Number(currentUserId);
              return (
                <div
                  key={msg.cm_chatentry_id || idx}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm text-xs relative group ${
                      isMine
                        ? isDark
                          ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-xs'
                          : 'bg-[#d9fdd3] text-[#111b21] rounded-tr-xs'
                        : isDark
                        ? 'bg-[#202c33] text-[#e9edef] rounded-tl-xs'
                        : 'bg-white text-[#111b21] rounded-tl-xs'
                    }`}
                  >
                    {!isMine && (
                      <div className="font-semibold text-[11px] text-[#53bdeb] mb-1">
                        {msg.user_name || 'System User'}
                      </div>
                    )}

                    {msg.image_data && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 max-w-xs">
                        <img
                          src={`data:image/jpeg;base64,${msg.image_data}`}
                          alt="Attachment"
                          className="w-full h-auto max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() =>
                            setModalPreviewImage(`data:image/jpeg;base64,${msg.image_data}`)
                          }
                        />
                      </div>
                    )}

                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                      {msg.characterdata}
                    </div>

                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                      <span>{formatTime(msg.created)}</span>
                      {isMine && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected image preview bar */}
        {selectedImage && (
          <div
            className={`px-4 py-2 border-t flex items-center justify-between ${
              isDark ? 'bg-[#182229] border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <img
                src={imagePreviewUrl}
                alt="Upload preview"
                className="w-10 h-10 object-cover rounded-md border border-slate-300 dark:border-slate-700"
              />
              <span className="text-xs truncate max-w-xs text-slate-700 dark:text-slate-300">
                {selectedImage.name}
              </span>
            </div>
            <button
              type="button"
              onClick={clearSelectedImage}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className={`p-3 border-t flex items-end gap-2 ${
            isDark
              ? 'bg-[#202c33] border-slate-700/60'
              : 'bg-[#f0f2f5] border-slate-200'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => validateAndSelectImage(e.target.files[0])}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
            disabled={isReadOnly || sending}
            className={`p-2.5 rounded-full transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-white/10'
                : 'text-slate-500 hover:text-slate-800 hover:bg-black/5'
            }`}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isReadOnly ? 'Discussions are locked' : 'Type a message... (Enter to send)'}
            disabled={isReadOnly || sending}
            rows={1}
            className={`flex-1 resize-none text-xs rounded-xl px-4 py-2.5 max-h-32 border focus:outline-hidden transition-all ${
              isDark
                ? 'bg-[#2a3942] border-transparent text-[#e9edef] placeholder-slate-400 focus:border-[#00a884]'
                : 'bg-white border-transparent text-[#111b21] placeholder-slate-400 focus:border-[#008069] shadow-xs'
            }`}
          />

          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedImage) || sending || isReadOnly}
            className={`p-2.5 rounded-full text-white font-medium shadow-sm transition-all ${
              (!inputText.trim() && !selectedImage) || sending || isReadOnly
                ? 'bg-slate-400 cursor-not-allowed opacity-50'
                : 'bg-[#008069] hover:bg-[#00705c] active:scale-95'
            }`}
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>

      {/* Image Modal Preview */}
      {modalPreviewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModalPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={modalPreviewImage}
              alt="Full Preview"
              className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
            <button
              onClick={() => setModalPreviewImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

