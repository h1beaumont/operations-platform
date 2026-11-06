import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building2, CheckCircle2 } from "lucide-react";

const setupSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SetupFormData = z.infer<typeof setupSchema>;

export default function LandlordSetup() {
  const [match, params] = useRoute("/landlord-setup/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: SetupFormData) {
    if (!params?.token) {
      toast({
        variant: "destructive",
        title: "Invalid Link",
        description: "The setup link is invalid. Please contact support.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/landlord-auth/setup-password", {
        token: params.token,
        password: data.password,
      });

      const response = await res.json();

      if (response.success) {
        setIsSuccess(true);
        toast({
          title: "Password set successfully",
          description: "You can now sign in with your new password.",
        });
        // Redirect to login after 2 seconds
        setTimeout(() => {
          setLocation("/landlord-login");
        }, 2000);
      } else {
        throw new Error(response.error || "Failed to set password");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Setup failed",
        description: error.message || "Failed to set password. The link may have expired.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!match || !params?.token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Invalid Link</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation("/landlord-login")}
              className="w-full"
              data-testid="button-back-to-login"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Password Set Successfully!</CardTitle>
            <CardDescription>
              Redirecting you to the login page...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Set Your Password</CardTitle>
          </div>
          <CardDescription>
            Create a secure password for your landlord portal account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Enter a strong password"
                        autoComplete="new-password"
                        disabled={isLoading}
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        disabled={isLoading}
                        data-testid="input-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? "Setting password..." : "Set Password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
