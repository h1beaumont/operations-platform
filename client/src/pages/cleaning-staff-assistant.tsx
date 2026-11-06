import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Bot, User, Loader2, Sparkles, Database, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CleaningAssistantKnowledge from "@/pages/cleaning-assistant-knowledge";
import { sanitizeUserInput, validateMessage, formatMessageContent } from "@/lib/sanitize";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function CleaningStaffAssistant() {
  const [sessionId] = useState<string>(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Load tab preference from localStorage, default to "chat"
    return localStorage.getItem("cleaning-assistant-tab") || "chat";
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Save tab preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cleaning-assistant-tab", activeTab);
  }, [activeTab]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount and when switching to chat tab
  useEffect(() => {
    if (activeTab === "chat") {
      inputRef.current?.focus();
    }
  }, [activeTab]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (msg: string) => {
      const response = await apiRequest('POST', '/api/cleaning-staff-assistant/message', {
        sessionId,
        message: msg,
      });
      return response.json();
    },
    onSuccess: (data: { response: string }) => {
      // Add assistant response to messages
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
      }]);
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

    // Add user message to messages
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to backend
    sendMessageMutation.mutate(message);
  };

  const handleExampleClick = (exampleText: string) => {
    setMessage(exampleText);
    inputRef.current?.focus();
  };

  // Format message content with markdown-style bolding
  const formatMessage = (content: string) => {
    // Simple markdown-style formatting: **text** -> <strong>text</strong>
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="w-full max-w-7xl h-full max-h-[900px]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-cleaning-assistant">
                <Sparkles className="w-8 h-8" />
                Cleaning Staff Assistant
              </h1>
              <p className="text-muted-foreground mt-1" data-testid="text-assistant-description">
                Get help with cleaning tasks and manage the knowledge base
              </p>
            </div>
            <TabsList data-testid="tabs-list">
              <TabsTrigger value="chat" data-testid="tab-chat" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="knowledge" data-testid="tab-knowledge" className="gap-2">
                <Database className="w-4 h-4" />
                Knowledge Base
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="flex-1 mt-0 h-full">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-6 h-6" />
                  Chat Assistant
                </CardTitle>
                <CardDescription data-testid="text-cleaning-assistant-description">
                  Ask questions about linen packing, cleaning tasks, and special requests
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground" data-testid="empty-state">
                        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">Welcome to Cleaning Staff Assistant</p>
                        <p className="text-sm mb-4">
                          Ask me questions like:
                        </p>
                        <div className="flex flex-col gap-2 max-w-md mx-auto" data-testid="container-example-questions">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExampleClick("How do I pack linen for a 2-bedroom property?")}
                            data-testid="button-example-1"
                            className="text-left justify-start"
                          >
                            "How do I pack linen for a 2-bedroom property?"
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExampleClick("What's the checklist for a deep clean?")}
                            data-testid="button-example-2"
                            className="text-left justify-start"
                          >
                            "What's the checklist for a deep clean?"
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExampleClick("How do I handle a special request for extra towels?")}
                            data-testid="button-example-3"
                            className="text-left justify-start"
                          >
                            "How do I handle a special request for extra towels?"
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExampleClick("What products should I use for stubborn stains?")}
                            data-testid="button-example-4"
                            className="text-left justify-start"
                          >
                            "What products should I use for stubborn stains?"
                          </Button>
                        </div>
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
                    placeholder="Ask a question about cleaning tasks..."
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="knowledge" className="flex-1 mt-0 h-full overflow-auto">
            <CleaningAssistantKnowledge />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
