"use client";

import { useEffect, useState } from "react";
import mermaid from "mermaid";
import { Button } from "./button";
import { ChevronDown, ChevronUp, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface MermaidDiagramProps {
  code: string;
  className?: string;
}

export function MermaidDiagram({ code, className }: MermaidDiagramProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [svgHtml, setSvgHtml] = useState<string>("");

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code) return;

      try {
        // Initialize mermaid with black and white theme
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            // Pure black and white colors
            primaryColor: "#ffffff",
            primaryTextColor: "#000000",
            primaryBorderColor: "#000000",
            // Secondary
            secondBkgColor: "#ffffff",
            secondTextColor: "#000000",
            secondBorderColor: "#000000",
            // Tertiary
            tertiaryColor: "#f0f0f0",
            tertiaryTextColor: "#000000",
            tertiaryBorderColor: "#000000",
            // Font settings - larger for readability
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: "16px",
            fontWeightBold: "700",
            fontWeightNormal: "400",
            // Line styling
            lineColor: "#000000",
            textColor: "#000000",
          },
          securityLevel: "loose",
        });

        // Create a unique ID for this diagram
        const diagramId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        try {
          // Render the diagram
          const { svg } = await mermaid.render(diagramId, code);
          setSvgHtml(svg);
          setError(null);
          console.log("[MERMAID] Diagram rendered successfully");
        } catch (renderErr) {
          // If rendering fails, show the raw code instead of throwing
          const errorMessage =
            renderErr instanceof Error
              ? renderErr.message
              : "Failed to render diagram";
          console.warn(
            "[MERMAID] Render failed, showing raw code:",
            errorMessage
          );
          // Set a fallback - show raw code as plain text
          setSvgHtml("");
          setError(null); // Don't show error, just display raw code
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to render diagram";
        setError(errorMessage);
        setSvgHtml("");
        console.error("[MERMAID] Render error:", err);
      }
    };

    renderDiagram();
  }, [code]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error("[MERMAID] Copy failed:", err);
    }
  };

  return (
    <>
      <div
        className={cn(
          "my-4 rounded-lg border border-border overflow-hidden bg-black",
          className
        )}
      >
        {/* Diagram Container */}
        {error ? (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              Failed to render diagram:
            </p>
            <p className="text-xs text-destructive/80 mt-1 font-mono break-words">
              {error}
            </p>
          </div>
        ) : svgHtml ? (
          <div className="relative">
            <div
              className="bg-black flex justify-center items-center min-h-[700px] overflow-auto p-8"
              style={{
                background: "#000000",
              }}
            >
              <style>{`
                .mermaid-diagram {
                  width: 100%;
                  height: 100%;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                }
                .mermaid-diagram svg {
                  width: 100%;
                  height: 100%;
                  max-width: none;
                  max-height: none;
                }
                .mermaid-diagram svg * {
                  color: #ffffff !important;
                }
                .mermaid-diagram svg rect {
                  stroke: #ffffff !important;
                  fill: #1a1a1a !important;
                }
                .mermaid-diagram svg text {
                  fill: #ffffff !important;
                  color: #ffffff !important;
                }
                .mermaid-diagram svg tspan {
                  fill: #ffffff !important;
                  color: #ffffff !important;
                }
                .mermaid-diagram svg [style*="fill"] {
                  fill: #ffffff !important;
                }
                .mermaid-diagram svg path {
                  stroke: #ffffff !important;
                  fill: none !important;
                }
                .mermaid-diagram svg line {
                  stroke: #ffffff !important;
                }
                .mermaid-diagram svg circle {
                  stroke: #ffffff !important;
                  fill: #1a1a1a !important;
                }
                .mermaid-diagram svg ellipse {
                  stroke: #ffffff !important;
                  fill: #1a1a1a !important;
                }
                .mermaid-diagram svg polygon {
                  stroke: #ffffff !important;
                  fill: #ffffff !important;
                }
              `}</style>
              <div
                className="mermaid-diagram"
                dangerouslySetInnerHTML={{ __html: svgHtml }}
                suppressHydrationWarning
              />
            </div>
          </div>
        ) : (
          <div className="bg-black p-8 min-h-[400px] overflow-auto">
            <div className="bg-gray-900 rounded border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400 font-mono">mermaid</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyCode}
                  className="h-7"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <pre className="text-white text-xs font-mono whitespace-pre-wrap break-words overflow-auto max-h-96">
                <code>{code}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Collapsible Source Code */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-900 hover:bg-gray-800 transition-colors border-t border-gray-700"
        >
          <span className="text-xs font-medium text-gray-300">Source Code</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {/* Code Content */}
        {isExpanded && (
          <div className="bg-gray-900/50 p-4 border-t border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-300 font-mono">mermaid</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyCode}
                className="h-7"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <pre className="bg-black rounded p-3 overflow-x-auto border border-gray-700 max-h-64">
              <code className="text-xs font-mono text-gray-100">{code}</code>
            </pre>
          </div>
        )}
      </div>
    </>
  );
}
