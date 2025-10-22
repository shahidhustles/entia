"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Loader } from "lucide-react";

interface ConfirmationUIProps {
  message: string;
  operationType: "query" | "execute";
  query: string;
  toolCallId: string;
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  addToolResult: (args: {
    tool: string;
    toolCallId: string;
    output: string;
  }) => void;
}

export function ConfirmationUI({
  message,
  operationType,
  query,
  toolCallId,
  state,
  addToolResult,
}: ConfirmationUIProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      addToolResult({
        tool: "ask_for_confirmation",
        toolCallId,
        output: "User confirmed the operation.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeny = async () => {
    setIsProcessing(true);
    try {
      addToolResult({
        tool: "ask_for_confirmation",
        toolCallId,
        output: "User denied the operation.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (state === "input-streaming") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader className="w-4 h-4 animate-spin" />
        <span>Preparing confirmation...</span>
      </div>
    );
  }

  if (state === "output-available") {
    return (
      <div className="flex items-center gap-2 text-sm text-foreground py-2 px-3 rounded border border-border bg-muted">
        <Check className="w-4 h-4" />
        <span>Operation executed successfully.</span>
      </div>
    );
  }

  if (state === "output-error") {
    return (
      <div className="flex items-center gap-2 text-sm text-foreground py-2 px-3 rounded border border-border bg-muted">
        <X className="w-4 h-4" />
        <span>Operation was denied or encountered an error.</span>
      </div>
    );
  }

  // input-available state
  return (
    <div className="border border-border bg-card rounded-lg p-4 my-4">
      {/* Operation type badge */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`px-2 py-1 text-xs font-semibold rounded ${
            operationType === "query"
              ? "bg-muted text-foreground border border-border"
              : "bg-muted text-foreground border border-border"
          }`}
        >
          {operationType === "query" ? "SELECT QUERY" : "DATA MODIFICATION"}
        </span>
      </div>

      {/* Message */}
      {message && (
        <div className="text-sm text-foreground mb-3 whitespace-pre-wrap">
          {message}
        </div>
      )}

      {/* SQL Query Display */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-muted-foreground mb-2">
          SQL Query:
        </div>
        <div className="bg-muted border border-border text-foreground rounded p-3 font-mono text-sm overflow-x-auto">
          <code>{query}</code>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleConfirm}
          disabled={isProcessing}
          className="flex-1 bg-foreground text-background hover:bg-foreground/90 dark:bg-foreground dark:text-background dark:hover:bg-foreground/90"
        >
          {isProcessing ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Confirm
            </>
          )}
        </Button>
        <Button
          onClick={handleDeny}
          disabled={isProcessing}
          variant="outline"
          className="flex-1 border border-border bg-background text-foreground hover:bg-muted dark:bg-background dark:text-foreground dark:hover:bg-muted"
        >
          {isProcessing ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <X className="w-4 h-4 mr-2" />
              Deny
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
