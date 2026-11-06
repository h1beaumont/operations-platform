import { useState } from "react";
import { useParams } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShoppingCart, Camera, CheckCircle2, AlertCircle, LogIn, LogOut } from "lucide-react";
import { format } from "date-fns";

const formSchema = z.object({
  staffName: z.string().min(1, "Staff name is required"),
  action: z.enum(["sign_out", "sign_in"], { required_error: "Please select an action" }),
  photo: z.instanceof(FileList).refine((files) => files.length > 0, "Photo is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface ScanResult {
  success: boolean;
  message: string;
  movement: {
    id: string;
    equipmentType: string;
    equipmentNumber: number;
    staffName: string;
    action: string;
    timestamp: string;
  };
}

export default function EquipmentScanPublic() {
  const params = useParams();
  const type = params.type as string;
  const number = params.number as string;
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const equipmentLabel = `${type?.charAt(0).toUpperCase()}${type?.slice(1)} #${number}`;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      staffName: "",
      action: "sign_out",
    },
  });

  const scanMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const formData = new FormData();
      formData.append("staffName", data.staffName);
      formData.append("action", data.action);
      formData.append("photo", data.photo[0]);

      const response = await fetch(`/equipment/scan/${type}/${number}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process scan");
      }

      return response.json();
    },
    onSuccess: (data: ScanResult) => {
      setScanResult(data);
      form.reset();
      setPhotoPreview(null);
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: FormValues) => {
    scanMutation.mutate(data);
  };

  const handleNewScan = () => {
    setScanResult(null);
    form.reset();
    setPhotoPreview(null);
  };

  if (scanResult) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl" data-testid="heading-success">
              Success!
            </CardTitle>
            <CardDescription data-testid="text-success-message">
              {scanResult.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Equipment:</span>
                <span className="font-medium" data-testid="text-result-equipment">
                  {equipmentLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Staff:</span>
                <span className="font-medium" data-testid="text-result-staff">
                  {scanResult.movement.staffName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Action:</span>
                <span className="font-medium" data-testid="text-result-action">
                  {scanResult.movement.action === "sign_out" ? "Signed Out" : "Signed In"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Time:</span>
                <span className="font-medium" data-testid="text-result-time">
                  {format(new Date(scanResult.movement.timestamp), "PPp")}
                </span>
              </div>
            </div>

            <Button
              onClick={handleNewScan}
              className="w-full"
              size="lg"
              data-testid="button-new-scan"
            >
              Scan Another Equipment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ShoppingCart className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl" data-testid="heading-scan-equipment">
            {equipmentLabel}
          </CardTitle>
          <CardDescription data-testid="text-scan-description">
            Sign out or sign in this equipment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scanMutation.isError && (
            <Alert variant="destructive" className="mb-4" data-testid="alert-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {scanMutation.error instanceof Error
                  ? scanMutation.error.message
                  : "Failed to process scan"}
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="staffName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your full name"
                        {...field}
                        data-testid="input-staff-name"
                        autoComplete="name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="action"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Action</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div>
                          <Label
                            htmlFor="sign_out"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
                          >
                            <RadioGroupItem
                              value="sign_out"
                              id="sign_out"
                              className="sr-only"
                              data-testid="radio-sign-out"
                            />
                            <LogOut className="mb-3 h-6 w-6" />
                            <span className="text-sm font-medium">Sign Out</span>
                          </Label>
                        </div>
                        <div>
                          <Label
                            htmlFor="sign_in"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
                          >
                            <RadioGroupItem
                              value="sign_in"
                              id="sign_in"
                              className="sr-only"
                              data-testid="radio-sign-in"
                            />
                            <LogIn className="mb-3 h-6 w-6" />
                            <span className="text-sm font-medium">Sign In</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="photo"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Photo (Required)</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <Input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            onChange(e.target.files);
                            handlePhotoChange(e);
                          }}
                          {...field}
                          data-testid="input-photo"
                        />
                        {photoPreview && (
                          <div className="rounded-lg overflow-hidden border">
                            <img
                              src={photoPreview}
                              alt="Preview"
                              className="w-full h-auto"
                              data-testid="image-preview"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                disabled={scanMutation.isPending}
                data-testid="button-submit-scan"
              >
                <Camera className="h-5 w-5" />
                {scanMutation.isPending ? "Processing..." : "Submit Scan"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
