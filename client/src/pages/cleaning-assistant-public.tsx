import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/Northstay logo black-01 (8)_1761129570743.png";
import { sanitizeUserInput, sanitizeName, validateMessage, formatMessageContent } from "@/lib/sanitize";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function CleaningAssistantPublic() {
  const [sessionId] = useState<string>(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [cleanerName, setCleanerName] = useState<string>("");
  const [nameInput, setNameInput] = useState("");
  const [showNameForm, setShowNameForm] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus name input on mount
  useEffect(() => {
    if (showNameForm) {
      nameInputRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  }, [showNameForm]);

  // Handle name submission
  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to continue",
        variant: "destructive",
      });
      return;
    }
    setCleanerName(nameInput.trim());
    setShowNameForm(false);
  };

  // Send message mutation (using public endpoint - no auth required)
  const sendMessageMutation = useMutation({
    mutationFn: async (msg: string) => {
      const response = await fetch('/api/public/cleaning-assistant/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: msg,
          cleanerName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return await response.json();
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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with logo */}
      <header className="border-b p-4 bg-card">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
          <img 
            src={logoUrl} 
            alt="Northstay" 
            className="h-12 w-auto dark:invert"
            data-testid="img-logo"
          />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl h-full max-h-[700px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="heading-cleaning-assistant-public">
              <Sparkles className="w-6 h-6" />
              Cleaning Staff Assistant
              {!showNameForm && cleanerName && (
                <span className="text-base font-normal text-muted-foreground" data-testid="text-cleaner-name">
                  - {cleanerName}
                </span>
              )}
            </CardTitle>
            <CardDescription data-testid="text-cleaning-assistant-description">
              Get help with linen packing, cleaning tasks, and special requests
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            {showNameForm ? (
              <div className="flex-1 flex items-center justify-center" data-testid="name-form-container">
                <div className="w-full max-w-md space-y-6">
                  <div className="text-center">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary opacity-80" />
                    <h2 className="text-2xl font-bold mb-2" data-testid="heading-welcome">Welcome!</h2>
                    <p className="text-muted-foreground" data-testid="text-welcome-description">
                      Please enter your name to get started with the Cleaning Staff Assistant
                    </p>
                  </div>
                  <form onSubmit={handleNameSubmit} className="space-y-4">
                    <div>
                      <Input
                        ref={nameInputRef}
                        data-testid="input-cleaner-name"
                        placeholder="Enter your name"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="text-center text-lg"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      data-testid="button-submit-name"
                    >
                      Continue
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t p-4 text-center text-sm text-muted-foreground bg-card" data-testid="footer">
        <p>Northstay - Cleaning Staff Assistant</p>
      </footer>
    </div>
  );
}
