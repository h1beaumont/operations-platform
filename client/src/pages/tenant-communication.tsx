import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, Mail, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { sanitizeUserInput, validateMessage, formatMessageContent } from "@/lib/sanitize";

interface DraftEmail {
  subject: string;
  body: string;
  recipientIds: string[];
  propertyFilter?: string;
  roomFilter?: string;
}

interface DraftSms {
  message: string;
  recipientIds: string[];
  propertyFilter?: string;
  roomFilter?: string;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  draftEmail?: DraftEmail;
  emailSent?: boolean;
  draftSms?: DraftSms;
  smsSent?: boolean;
  sentAt?: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  userId: string;
  staffName: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function TenantCommunication() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chat history
  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/tenant-communication/history', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/tenant-communication/history?sessionId=${sessionId}`);
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
      const response = await apiRequest('POST', '/api/tenant-communication/session', {});
      return response.json();
    },
    onSuccess: (data: ChatSession) => {
      setSessionId(data.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start tenant communication session",
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
    if (sessionId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [sessionId]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (msg: string) => {
      const response = await apiRequest('POST', '/api/tenant-communication/message', {
        sessionId,
        message: msg,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-communication/history', sessionId] });
      setMessage("");
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

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiRequest('POST', '/api/tenant-communication/send-email', {
        sessionId,
        messageId,
      });
      return response.json();
    },
    onSuccess: (data: { success: boolean; successCount: number; failureCount: number }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-communication/history', sessionId] });
      if (data.success) {
        toast({
          title: "Email Sent",
          description: `Successfully sent to ${data.successCount} tenant(s)`,
        });
      } else {
        toast({
          title: "Partial Success",
          description: `Sent to ${data.successCount} tenant(s), ${data.failureCount} failed`,
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send email",
        variant: "destructive",
      });
    },
  });

  // Send SMS mutation
  const sendSmsMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiRequest('POST', '/api/tenant-communication/send-sms', {
        sessionId,
        messageId,
      });
      return response.json();
    },
    onSuccess: (data: { success: boolean; successCount: number; failureCount: number }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-communication/history', sessionId] });
      if (data.success) {
        toast({
          title: "SMS Sent",
          description: `Successfully sent to ${data.successCount} tenant(s)`,
        });
      } else {
        toast({
          title: "Partial Success",
          description: `Sent to ${data.successCount} tenant(s), ${data.failureCount} failed`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to send SMS";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message);
  };

  const handleSendEmail = (messageId: string) => {
    sendEmailMutation.mutate(messageId);
  };

  const handleSendSms = (messageId: string) => {
    sendSmsMutation.mutate(messageId);
  };

  // Format message content with markdown-style bolding
  const formatMessage = (content: string) => {
    // Remove DRAFT_EMAIL: or DRAFT_SMS: prefix if present
    let displayContent = content.replace(/^DRAFT_(EMAIL|SMS):.*$/m, '').trim();
    if (!displayContent) {
      displayContent = "I've drafted a message for you. Please review it below and click 'Send' when ready.";
    }
    
    // Simple markdown-style formatting: **text** -> <strong>text</strong>
    const parts = displayContent.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Loading state while session is being created
  if (!sessionId && createSessionMutation.isPending) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4" data-testid="loading-session">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Starting communication session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-4xl h-full max-h-[800px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="heading-tenant-communication">
            <Mail className="w-6 h-6" />
            Tenant Communication
          </CardTitle>
          <CardDescription data-testid="text-description">
            Draft and send emails or SMS to tenants filtered by property or room
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && !messagesLoading && (
                <div className="text-center py-12 text-muted-foreground" data-testid="empty-state">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Welcome to Tenant Communication</p>
                  <p className="text-sm">
                    Try asking me:
                  </p>
                  <ul className="text-sm mt-2 space-y-1" data-testid="list-example-questions">
                    <li>"Draft an email to all tenants in Flat 1 about a noise complaint"</li>
                    <li>"Send an urgent SMS to Building A residents about water shutdown"</li>
                    <li>"Who are the current tenants in Manor House?"</li>
                  </ul>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  <div
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

                  {/* Email Draft Preview */}
                  {msg.role === "assistant" && msg.draftEmail && (
                    <div className="ml-11">
                      <Card className={msg.emailSent ? "border-green-500" : ""} data-testid="card-email-preview">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              Email Draft
                            </CardTitle>
                            {msg.emailSent && (
                              <div className="flex items-center gap-1 text-sm text-green-600" data-testid="badge-email-sent">
                                <CheckCircle2 className="w-4 h-4" />
                                Sent
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Subject</p>
                            <p className="text-sm font-medium" data-testid={`draft-subject-${msg.id}`}>
                              {msg.draftEmail.subject}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Body</p>
                            <div 
                              className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md" 
                              data-testid={`draft-body-${msg.id}`}
                            >
                              {msg.draftEmail.body}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Recipients ({msg.draftEmail.recipientIds.length} tenant{msg.draftEmail.recipientIds.length !== 1 ? 's' : ''})
                            </p>
                            {msg.draftEmail.propertyFilter && (
                              <p className="text-xs text-muted-foreground">
                                Property: {msg.draftEmail.propertyFilter}
                                {msg.draftEmail.roomFilter && `, Room: ${msg.draftEmail.roomFilter}`}
                              </p>
                            )}
                          </div>
                          {!msg.emailSent && (
                            <>
                              <Button
                                onClick={() => handleSendEmail(msg.id)}
                                disabled={sendEmailMutation.isPending || msg.draftEmail.recipientIds.length === 0}
                                className="w-full"
                                data-testid={`button-send-email-${msg.id}`}
                              >
                                {sendEmailMutation.isPending ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send Email
                                  </>
                                )}
                              </Button>
                              {msg.draftEmail.recipientIds.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center">
                                  No recipients selected. Add tenants by specifying a property or room.
                                </p>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* SMS Draft Preview */}
                  {msg.role === "assistant" && msg.draftSms && (
                    <div className="ml-11">
                      <Card className={msg.smsSent ? "border-green-500" : ""} data-testid="card-sms-preview">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <MessageSquare className="w-4 h-4" />
                              SMS Draft
                            </CardTitle>
                            {msg.smsSent && (
                              <div className="flex items-center gap-1 text-sm text-green-600" data-testid="badge-sms-sent">
                                <CheckCircle2 className="w-4 h-4" />
                                Sent
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Message</p>
                            <div 
                              className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md" 
                              data-testid="text-sms-message"
                            >
                              {msg.draftSms.message}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1" data-testid="text-sms-recipient-count">
                                Recipients ({msg.draftSms.recipientIds.length} tenant{msg.draftSms.recipientIds.length !== 1 ? 's' : ''})
                              </p>
                              {msg.draftSms.propertyFilter && (
                                <p className="text-xs text-muted-foreground">
                                  Property: {msg.draftSms.propertyFilter}
                                  {msg.draftSms.roomFilter && `, Room: ${msg.draftSms.roomFilter}`}
                                </p>
                              )}
                            </div>
                            <div>
                              <p 
                                className={`text-xs font-medium ${
                                  msg.draftSms.message.length > 160 
                                    ? "text-red-600" 
                                    : msg.draftSms.message.length > 140 
                                    ? "text-orange-600" 
                                    : "text-muted-foreground"
                                }`}
                                data-testid="text-sms-char-count"
                              >
                                {msg.draftSms.message.length}/160
                              </p>
                            </div>
                          </div>
                          {!msg.smsSent && (
                            <>
                              <Button
                                onClick={() => handleSendSms(msg.id)}
                                disabled={sendSmsMutation.isPending || msg.draftSms.recipientIds.length === 0}
                                className="w-full"
                                data-testid="button-send-sms"
                              >
                                {sendSmsMutation.isPending ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending SMS...
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send SMS
                                  </>
                                )}
                              </Button>
                              {msg.draftSms.recipientIds.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center">
                                  No recipients selected. Add tenants by specifying a property or room.
                                </p>
                              )}
                              {msg.draftSms.message.length > 160 && (
                                <p className="text-xs text-red-600 text-center">
                                  ⚠️ Message exceeds 160 characters and will be sent as multiple SMS
                                </p>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
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
              placeholder="Ask me to draft an email or SMS..."
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
    </div>
  );
}
