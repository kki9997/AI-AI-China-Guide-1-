import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/hooks/use-language";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: t("Hello! I'm your AI guide. Ask me anything about Chinese history or nearby attractions.", "你好！我是你的AI导游。你可以问我关于中国历史或附近景点的任何问题。") }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create conversation if needed (simplified for this demo, usually you'd list convos)
  const conversationId = 1; // Hardcoded for demo simplicity

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    // Optimistic UI update or wait for stream? 
    // We'll simulate a streaming response with the integration pattern
    
    try {
      // Note: In a real app with the provided backend, you'd use EventSource for SSE.
      // Here we will use a simple fetch for the "message creation" and handle response.
      // Since the backend provided in context handles SSE, we should ideally use that.
      // For this frontend-only generation, I'll mock the integration behavior slightly 
      // or assume a standard POST for simplicity if SSE is complex to wire up without full backend context.
      
      // Let's implement the standard POST which the backend integration likely supports alongside stream
      // Actually, let's use the fetch API with stream reading for the SSE endpoint:
      
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg }),
      });

      if (!response.ok) throw new Error("Failed to send");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";
      
      setMessages(prev => [...prev, { role: 'assistant', content: "" }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              assistantMsg += data.content;
              setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].content = assistantMsg;
                return newMsgs;
              });
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: t("Sorry, I encountered an error. Please try again.", "抱歉，出错了。请重试。") }]);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-safe">
      <Header title={t("AI Guide", "AI导游")} />
      
      <main className="flex-1 pt-20 pb-24 px-4 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'assistant' ? 'bg-primary text-white' : 'bg-secondary text-white'}`}>
                  {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                </div>
                
                <div 
                  className={`
                    p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm
                    ${msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : 'bg-card border border-border/50 text-foreground rounded-tl-sm'}
                  `}
                >
                  {msg.content}
                  {msg.role === 'assistant' && msg.content === "" && (
                     <span className="flex gap-1">
                       <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                       <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-100" />
                       <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-200" />
                     </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </main>

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border z-40">
        <div className="max-w-md mx-auto flex gap-2">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("Ask about history, culture...", "询问历史、文化...")}
            className="flex-1 rounded-full border-primary/20 focus-visible:ring-primary bg-background shadow-inner"
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <Button 
            size="icon" 
            className="rounded-full w-10 h-10 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            onClick={sendMessage}
            disabled={!input.trim()}
          >
            <Send size={18} className={input.trim() ? "ml-0.5" : ""} />
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
