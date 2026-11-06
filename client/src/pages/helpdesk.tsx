import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Bot, User, Loader2, MessageSquare, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import HelpdeskKnowledge from "@/pages/helpdesk-knowledge";
import { sanitizeUserInput, validateMessage, formatMessageContent } from "@/lib/sanitize";

interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  userId: string;
  staffName: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function Helpdesk() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Load tab preference from localStorage, default to "chat"
    return localStorage.getItem("helpdesk-tab") || "chat";
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Save tab preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("helpdesk-tab", activeTab);
  }, [activeTab]);

  // Fetch chat history
  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/helpdesk/history', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/helpdesk/history?sessionId=${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      return response.json();
    },
    enabled: !!sessionId,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-create session on mount
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/helpdesk/session', {});
      return response.json();
    },
    onSuccess: (data: ChatSession) => {
      setSessionId(data.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start helpdesk session",
        variant: "destructive",
      });
    },
  });

  // Auto-start session on mount
  useEffect(() => {
    if (!sessionId && !createSessionMutation.isPending) {
      createSessionMutation.mutate();
    }
  }, []);

  // Focus input after session is created
  useEffect(() => {
    if (sessionId && inputRef.current && activeTab === "chat") {
      inputRef.current.focus();
    }
  }, [sessionId, activeTab]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (msg: string) => {
      const response = await apiRequest('POST', '/api/helpdesk/message', {
        sessionId,
        message: msg,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/helpdesk/history', sessionId] });
      setMessage("");
      // Focus input after response
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;
    
    // Validate message first
    const validationError = validateMessage(message);
    if (validationError) {
      toast({
        title: "Invalid Message",
        description: validationError,
        variant: "destructive",
      });
      return;
    }
    
    // Sanitize input before sending
    const sanitizedMessage = sanitizeUserInput(message);
    
    if (sanitizedMessage.length === 0) {
      toast({
        title: "Invalid Message",
        description: "Please enter a valid message.",
        variant: "destructive",
      });
      return;
    }
    
    sendMessageMutation.mutate(sanitizedMessage);
  };

  // Use the safe formatting function from sanitization library
  const formatMessage = (content: string) => {
    const parts = formatMessageContent(content);
    return parts.map((part, index) => {
      if (part.isBold) {
        return <strong key={index}>{part.text}</strong>;
      }
      return part.text;
    });
  };

  // Loading state while session is being created
  if (!sessionId && createSessionMutation.isPending && activeTab === "chat") {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4" data-testid="loading-session">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Starting helpdesk session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-7xl h-full max-h-[900px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="heading-helpdesk">
            <Bot className="w-6 h-6" />
            Management Chatbot
          </CardTitle>
          <CardDescription data-testid="text-helpdesk-description">
            Get help with properties, staff, landlords, contractors, or manage the knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2" data-testid="tabs-list">
              <TabsTrigger value="chat" data-testid="tab-chat" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="knowledge" data-testid="tab-knowledge" className="gap-2">
                <Database className="w-4 h-4" />
                Knowledge Base
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-4" data-testid="content-chat">
              <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.length === 0 && !messagesLoading && (
                    <div className="text-center py-12 text-muted-foreground" data-testid="empty-state">
                      <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2" data-testid="text-welcome-title">Welcome to Management Chatbot</p>
                      <p className="text-sm">
                        Ask me questions like:
                      </p>
                      <ul className="text-sm mt-2 space-y-1" data-testid="list-example-questions">
                        <li>"Who owns Varsity Studio 1?"</li>
                        <li>"What's StaffE's phone number?"</li>
                        <li>"Find me a plumber"</li>
                        <li>"Tell me about Manor House property"</li>
                      </ul>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      data-testid={`message-${msg.role}-${msg.id}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[80%] ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {formatMessage(msg.content)}
                        </p>
                      </div>
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}

                  {sendMessageMutation.isPending && (
                    <div className="flex gap-3 justify-start" data-testid="loading-response">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                      <div className="rounded-lg px-4 py-2 bg-muted">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                <Input
                  ref={inputRef}
                  data-testid="input-message"
                  placeholder="Ask a question..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={sendMessageMutation.isPending}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  data-testid="button-send"
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="knowledge" className="flex-1 min-h-0 mt-4 overflow-auto" data-testid="content-knowledge">
              <HelpdeskKnowledge />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
