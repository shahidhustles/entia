"use client";

import * as React from "react";
import { useActionState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  testMySQLConnection,
  saveMySQLConnection,
  getUserDatabaseConnection,
} from "@/app/actions/ping-database";

// Validation schema
const connectionSchema = z.object({
  databaseType: z.enum(["mysql", "postgresql"], {
    errorMap: () => ({ message: "Please select a database type" }),
  }),
  connectionString: z
    .string()
    .min(10, "Connection string is required")
    .regex(
      /^(mysql|postgresql):\/\//,
      "Invalid connection string format. Should start with mysql:// or postgresql://"
    ),
});

type ConnectionFormData = z.infer<typeof connectionSchema>;

// Server action wrapper for saving connection
async function handleSaveConnection(_prevState: unknown, formData: FormData) {
  const connectionString = formData.get("connectionString") as string;
  const result = await saveMySQLConnection(connectionString);
  return result;
}

const ProfilePage = () => {
  const router = useRouter();
  const [isTestingConnection, setIsTestingConnection] = React.useState(false);
  const [isLoadingConnection, setIsLoadingConnection] = React.useState(true);
  const [connectionStatus, setConnectionStatus] = React.useState<{
    status: "idle" | "success" | "error";
    message: string;
    databaseName?: string;
    testedAt?: string;
  }>({
    status: "idle",
    message: "",
  });

  // useActionState for saving connection
  const [state, formAction, isPending] = useActionState(handleSaveConnection, {
    success: false,
  });

  const form = useForm<ConnectionFormData>({
    resolver: zodResolver(connectionSchema),
    defaultValues: {
      databaseType: "mysql",
      connectionString: "",
    },
  });

  // Load saved connection on mount
  React.useEffect(() => {
    const loadConnection = async () => {
      try {
        setIsLoadingConnection(true);
        const { connectionUrl } = await getUserDatabaseConnection();
        if (connectionUrl) {
          form.setValue("connectionString", connectionUrl);
          // Try to parse database type from URL
          if (connectionUrl.startsWith("mysql://")) {
            form.setValue("databaseType", "mysql");
          } else if (connectionUrl.startsWith("postgresql://")) {
            form.setValue("databaseType", "postgresql");
          }
        }
      } catch (error) {
        console.error("Failed to load connection:", error);
      } finally {
        setIsLoadingConnection(false);
      }
    };

    loadConnection();
  }, [form]);

  // Redirect when save is successful
  React.useEffect(() => {
    if (state?.success) {
      router.push("/chat");
    }
  }, [state?.success, router]);

  const handleTestConnection = async () => {
    // Validate form first
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsTestingConnection(true);
    setConnectionStatus({
      status: "idle",
      message: "Testing connection...",
    });

    try {
      const connectionString = form.getValues("connectionString");
      const response = await testMySQLConnection(connectionString);

      if (response.success) {
        setConnectionStatus({
          status: "success",
          message: "✓ Successfully connected to database",
          databaseName: response.database,
          testedAt: new Date().toLocaleTimeString(),
        });
      } else {
        setConnectionStatus({
          status: "error",
          message: `✗ ${response.error}`,
        });
      }
    } catch {
      setConnectionStatus({
        status: "error",
        message:
          "✗ Connection failed. Check your connection string and try again.",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const getPlaceholder = (dbType: string) => {
    if (dbType === "mysql") {
      return "mysql://user:password@localhost:3306/database_name";
    }
    return "postgresql://user:password@localhost:5432/database_name";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="mt-2 text-muted-foreground">
              Manage your database connection
            </p>
          </div>
        </div>

        <form action={formAction}>
          <Card>
            <CardHeader>
              <CardTitle>Database Connection</CardTitle>
              <CardDescription>
                Connect your MySQL or PostgreSQL database to start using Entia.
                Your connection string will be securely encrypted.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Loading State */}
              {isLoadingConnection && (
                <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                  <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200 ml-2">
                    Loading your saved connection...
                  </AlertDescription>
                </Alert>
              )}

              {/* Database Type Selector */}
              <div className="space-y-2">
                <Label htmlFor="db-type">Database Type</Label>
                <Controller
                  name="databaseType"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="db-type"
                          className={
                            fieldState.invalid ? "border-destructive" : ""
                          }
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mysql">MySQL</SelectItem>
                          <SelectItem value="postgresql">PostgreSQL</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <p className="mt-1 text-sm text-destructive">
                          {fieldState.error?.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>

              {/* Connection String */}
              <div className="space-y-2">
                <Label htmlFor="connection-string">Connection String</Label>
                <Controller
                  name="connectionString"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div>
                      <Textarea
                        {...field}
                        id="connection-string"
                        name="connectionString"
                        placeholder={getPlaceholder(form.watch("databaseType"))}
                        className={`min-h-24 font-mono text-sm ${
                          fieldState.invalid ? "border-destructive" : ""
                        }`}
                      />
                      <p className="mt-2 text-xs text-muted-foreground">
                        Format: {form.watch("databaseType")}
                        ://user:password@host:port/database_name
                      </p>
                      {fieldState.invalid && (
                        <p className="mt-1 text-sm text-destructive">
                          {fieldState.error?.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>

              {/* Test Connection Button */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="gap-2"
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
              </div>

              {/* Connection Status */}
              {connectionStatus.status !== "idle" && (
                <Alert
                  className={
                    connectionStatus.status === "success"
                      ? "border-green-500 bg-green-50 dark:border-green-900 dark:bg-green-950"
                      : "border-destructive bg-destructive/10"
                  }
                >
                  <div className="flex items-start gap-3">
                    {connectionStatus.status === "success" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <AlertDescription
                        className={
                          connectionStatus.status === "success"
                            ? "text-green-800 dark:text-green-200"
                            : "text-destructive"
                        }
                      >
                        <div className="font-medium">
                          {connectionStatus.message}
                        </div>
                        {connectionStatus.databaseName && (
                          <div className="mt-1 text-sm opacity-90">
                            Database:{" "}
                            <span className="font-mono">
                              {connectionStatus.databaseName}
                            </span>
                          </div>
                        )}
                        {connectionStatus.testedAt && (
                          <div className="mt-1 text-xs opacity-75">
                            Last tested: {connectionStatus.testedAt}
                          </div>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}

              {/* Info Box */}
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200 ml-2">
                  Your connection string will be encrypted and securely stored.
                  We&apos;ll never store your password in plain text.
                </AlertDescription>
              </Alert>

              {/* Saved Connection Indicator */}
              {!isLoadingConnection && form.getValues("connectionString") && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-200 ml-2">
                    ✓ A database connection is already saved. Edit or save a new
                    one below.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>

            <div className="border-t px-6 py-4 flex gap-3 justify-end">
              <Button type="button" variant="outline" disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Connection"
                )}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
