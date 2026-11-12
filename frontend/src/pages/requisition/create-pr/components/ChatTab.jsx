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
import { requisitionApi } from '../../../../api/requisition';

export default function ChatTab({
  requisitionId,
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

  // Format date time helper
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

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  };

  const loadChat = async () => {
    if (!requisitionId) return;
    setLoading(true);
    setErrorBanner(null);
    try {
      const res = await requisitionApi.getChat(requisitionId);
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
  }, [requisitionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle image selection
  const validateAndSelectImage = (file) => {
    if (!file) return;

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const fileExt = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

    // Strict validation: Reject SVG, scripts, and non-whitelisted image formats
    if (
      !allowedExtensions.includes(fileExt) ||
      !file.type ||
      !allowedMimes.includes(file.type.toLowerCase()) ||
      fileExt === '.svg' ||
      file.type.includes('svg')
    ) {
      setErrorBanner(
        'Security validation failed: Only JPG, PNG, and WEBP image files are allowed in chat (SVG, scripts, and other file types are prohibited).'
      );
      return;
    }

    // Max 2MB
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
      await requisitionApi.sendChatMessage(
        requisitionId,
        text,
        selectedImage,
        session?.token
      );
      setInputText('');
      clearSelectedImage();

      // Reset textarea height
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

  const autoResizeTextarea = (el) => {
    if (!el) return;
    el.style.height = '72px';
    const newHeight = Math.max(72, Math.min(el.scrollHeight, 180));
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > 180 ? 'auto' : 'hidden';
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
          <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-rose-400 hover:text-rose-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Message Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 px-4 sm:px-6 py-4 overflow-y-auto space-y-3"
        >
          {loading && messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Loader2 className="w-7 h-7 animate-spin text-[#00a884]" />
              <span className="text-xs">Loading conversations...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center border ${
                  isDark
                    ? 'bg-[#202c33] border-slate-700'
                    : 'bg-white border-slate-200'
                }`}
              >
                <MessageSquare className="w-7 h-7 text-[#008069] dark:text-[#00a884]" />
              </div>
              <p
                className={`font-semibold text-xs ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                No conversation history on this document yet.
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm">
                Type a message or paste an image below to start the internal discussion.
              </p>
            </div>
          ) : (
            messages.map((entry) => {
              const isSelf =
                currentUserId && Number(entry.createdby) === Number(currentUserId);
              const senderName =
                entry.user_description || entry.user_name || `User #${entry.createdby}`;
              const timeStr = formatTime(entry.created);
              const atts = entry.attachments || [];

              return (
                <div
                  key={entry.id}
                  className={`flex flex-col ${
                    isSelf ? 'items-end' : 'items-start'
                  } my-1`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl shadow-sm overflow-hidden transition-all ${
                      isSelf
                        ? isDark
                          ? 'bg-[#005c4b] text-slate-100 rounded-tr-none border border-[#005c4b]'
                          : 'bg-[#d9fdd3] text-slate-900 rounded-tr-none border border-[#c6f0be]'
                        : isDark
                        ? 'bg-[#202c33] text-slate-100 rounded-tl-none border border-slate-700/60'
                        : 'bg-white text-slate-900 rounded-tl-none border border-slate-200/80'
                    }`}
                  >
                    {/* Attached Images */}
                    {atts.length > 0 && (
                      <div className="p-1 space-y-1">
                        {atts.map((att, attIdx) => {
                          const imageUrl = requisitionApi.getChatAttachmentUrl(
                            entry.id,
                            att.name
                          );
                          return (
                            <div
                              key={attIdx}
                              className="overflow-hidden rounded-xl bg-black/5"
                            >
                              <img
                                src={imageUrl}
                                alt={att.name}
                                onClick={() =>
                                  setModalPreviewImage({
                                    url: imageUrl,
                                    name: att.name,
                                  })
                                }
                                className="w-full max-h-80 object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                                loading="lazy"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Text & Metadata */}
                    <div className="px-3.5 py-2">
                      <p className="text-xs font-semibold text-[#008069] dark:text-[#00a884] mb-1">
                        {senderName}
                      </p>

                      {entry.characterdata && (
                        <p className="text-xs leading-relaxed whitespace-pre-line break-words">
                          {entry.characterdata}
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-1 select-none">
                        <span>{timeStr}</span>
                        {isSelf && (
                          <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] inline-block ml-0.5" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <div
          className={`p-3 border-t ${
            isDark
              ? 'bg-[#202c33] border-slate-700/60'
              : 'bg-[#f0f2f5] border-slate-200'
          }`}
        >
          {/* Selected / Pasted Image Preview Bar */}
          {selectedImage && (
            <div
              className={`mb-2.5 p-2 rounded-xl border flex items-center justify-between shadow-xs ${
                isDark
                  ? 'bg-[#2a3942] border-slate-700'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={imagePreviewUrl}
                  className="w-12 h-12 object-cover rounded-lg border border-slate-300 dark:border-slate-700 flex-shrink-0"
                  alt="Preview"
                />
                <div className="min-w-0">
                  <p
                    className={`text-xs font-medium truncate max-w-[200px] ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    {selectedImage.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatFileSize(selectedImage.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearSelectedImage}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2.5 items-center">
            <input
              type="file"
              ref={fileInputRef}
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  validateAndSelectImage(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {/* Clip Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach Image (Max 2MB)"
              className={`h-11 w-11 rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-sm border flex-shrink-0 ${
                isDark
                  ? 'bg-[#2a3942] border-slate-700 text-slate-300 hover:text-[#00a884] hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-[#008069] hover:bg-slate-100'
              }`}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Input Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  autoResizeTextarea(e.target);
                }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                rows={3}
                placeholder="Type a message or paste an image (Shift + Enter for new line)..."
                disabled={sending}
                className={`w-full rounded-2xl border-none px-4 py-2.5 text-xs focus:ring-2 focus:ring-[#008069] resize-none shadow-sm transition-all overflow-hidden leading-relaxed ${
                  isDark
                    ? 'bg-[#2a3942] text-white placeholder-slate-400'
                    : 'bg-white text-slate-900 placeholder-slate-400'
                }`}
                style={{ minHeight: '72px', maxHeight: '180px' }}
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={sending || (!inputText.trim() && !selectedImage)}
              className="h-11 w-11 bg-[#00a884] hover:bg-[#008069] active:bg-[#005c4b] text-white rounded-full flex items-center justify-center shadow-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              title="Send Message"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5 ml-0.5" />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Image Preview Modal */}
      {modalPreviewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-4xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800">
              <h4
                className={`text-xs font-bold truncate ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}
              >
                {modalPreviewImage.name}
              </h4>
              <div className="flex items-center gap-2">
                <a
                  href={modalPreviewImage.url}
                  target="_blank"
                  rel="noreferrer"
                  title="Open in new window"
                  className={`p-1.5 rounded-lg border transition ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setModalPreviewImage(null)}
                  title="Close"
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/20">
              <img
                src={modalPreviewImage.url}
                alt={modalPreviewImage.name}
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

