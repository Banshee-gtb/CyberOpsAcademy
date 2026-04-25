import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchConversations, createConversation, fetchMessages, saveMessage, streamAiChat, deleteConversation } from '@/lib/api';
import type { AiConversation, AiMessage } from '@/types';
import { toast } from 'sonner';
import { Bot, Send, Plus, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export default function AiMentorPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchConversations(user.id).then((convs) => {
      setConversations(convs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  const loadConversation = async (convId: string) => {
    setActiveConv(convId);
    const msgs = await fetchMessages(convId);
    setMessages(msgs);
  };

  const handleNewConversation = async () => {
    if (!user) return;
    const conv = await createConversation(user.id, 'New Chat');
    setConversations((prev) => [conv, ...prev]);
    setActiveConv(conv.id);
    setMessages([]);
  };

  const handleDeleteConversation = async (convId: string) => {
    await deleteConversation(convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConv === convId) {
      setActiveConv(null);
      setMessages([]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user || streaming) return;

    let convId = activeConv;
    if (!convId) {
      const conv = await createConversation(user.id, input.trim().slice(0, 50));
      setConversations((prev) => [conv, ...prev]);
      convId = conv.id;
      setActiveConv(convId);
    }

    const userMsg: AiMessage = {
      id: crypto.randomUUID(),
      conversation_id: convId,
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    setStreamText('');

    // Save user message
    await saveMessage(convId, 'user', userMsg.content);

    // Build message history for AI
    const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

    let fullResponse = '';
    await streamAiChat(
      history,
      convId,
      (chunk) => {
        fullResponse += chunk;
        setStreamText(fullResponse);
      },
      async () => {
        // Save assistant message
        await saveMessage(convId!, 'assistant', fullResponse);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            conversation_id: convId!,
            role: 'assistant',
            content: fullResponse,
            created_at: new Date().toISOString(),
          },
        ]);
        setStreamText('');
        setStreaming(false);
      },
      (err) => {
        toast.error(`AI error: ${err}`);
        setStreaming(false);
        setStreamText('');
      }
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="flex h-[calc(100vh-0px)] lg:h-screen">
      {/* Sidebar - conversations */}
      <div className="hidden md:flex w-64 flex-col border-r border-border bg-card/30">
        <div className="p-4 border-b border-border">
          <Button onClick={handleNewConversation} className="w-full bg-primary text-primary-foreground font-bold text-sm" size="sm">
            <Plus className="size-4 mr-1" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                'group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors',
                activeConv === conv.id ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-secondary/50'
              )}
              onClick={() => loadConversation(conv.id)}
            >
              <MessageSquare className="size-4 shrink-0" />
              <span className="text-sm truncate flex-1">{conv.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {messages.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="size-12 text-primary/30 mb-4" />
              <h2 className="text-lg font-bold text-foreground mb-1">CyberNinja AI Mentor</h2>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Ask anything about cybersecurity, ethical hacking, CTF techniques, networking, or get help with your challenges.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {[
                  'Explain SQL injection',
                  'How does ARP spoofing work?',
                  'Help me with a CTF challenge',
                  'Best way to learn penetration testing',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="text-xs px-3 py-2 rounded-lg border border-border bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={cn(
                'max-w-[85%] lg:max-w-[70%] rounded-xl px-4 py-3 text-sm',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-foreground'
              )}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none [&_pre]:bg-background/50 [&_pre]:border [&_pre]:border-border [&_pre]:rounded-lg [&_code]:text-primary [&_a]:text-primary">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {streaming && streamText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] lg:max-w-[70%] rounded-xl px-4 py-3 text-sm bg-card border border-border text-foreground">
                <div className="prose prose-sm prose-invert max-w-none [&_pre]:bg-background/50 [&_pre]:border [&_pre]:border-border [&_pre]:rounded-lg [&_code]:text-primary [&_a]:text-primary">
                  <ReactMarkdown>{streamText}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {streaming && !streamText && (
            <div className="flex justify-start">
              <div className="rounded-xl px-4 py-3 bg-card border border-border">
                <div className="flex gap-1">
                  <div className="size-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="size-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="size-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card/30 p-4">
          {/* Mobile: new chat button */}
          <div className="md:hidden flex gap-2 mb-2">
            <Button onClick={handleNewConversation} variant="ghost" size="sm" className="text-xs text-muted-foreground">
              <Plus className="size-3 mr-1" /> New Chat
            </Button>
          </div>
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask CyberNinja AI anything..."
              className="flex-1 resize-none rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 max-h-32"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              className="bg-primary text-primary-foreground h-11 px-4"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
