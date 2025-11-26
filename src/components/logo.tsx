import { cn } from "@/lib/utils";
import { Database } from "lucide-react";

export const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
        <Database className="size-4 text-primary-foreground" />
      </div>
      <span className="text-xl font-bold tracking-tight">Entia</span>
    </div>
  );
};

export const LogoIcon = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "flex size-8 items-center justify-center rounded-lg bg-primary",
        className
      )}
    >
      <Database className="size-4 text-primary-foreground" />
    </div>
  );
};

export const LogoStroke = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex size-7 items-center justify-center rounded-lg border border-current">
        <Database className="size-3.5" />
      </div>
      <span className="text-lg font-bold tracking-tight">Entia</span>
    </div>
  );
};
