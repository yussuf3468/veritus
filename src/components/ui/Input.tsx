import { cn } from "@/lib/utils";
import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-slate-400">{label}</label>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full bg-bg-secondary border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 transition-colors outline-none focus:border-brand-cyan/50 focus:bg-brand-cyan/5",
          error && "border-red-500/50 focus:border-red-500/70",
          className,
        )}
        {...props}
      />
      {hint && !error && <span className="text-xs text-slate-500">{hint}</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  ),
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-slate-400">{label}</label>
      )}
      <textarea
        ref={ref}
        className={cn(
          "w-full bg-bg-secondary border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 transition-colors outline-none focus:border-brand-cyan/50 resize-none",
          error && "border-red-500/50",
          className,
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  ),
);
Textarea.displayName = "Textarea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className, children, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-slate-400">{label}</label>
      )}
      <select
        ref={ref}
        className={cn(
          "w-full bg-bg-secondary border border-surface-border rounded-lg px-3 py-2 text-sm text-white transition-colors outline-none focus:border-brand-cyan/50 cursor-pointer",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  ),
);
Select.displayName = "Select";
