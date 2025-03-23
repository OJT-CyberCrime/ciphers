import React, { forwardRef } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

export interface DatePickerProps {
  selected?: Date;
  onSelect?: (date: Date | null) => void;
  disabled?: boolean;
  placeholderText?: string;
  className?: string;
  dateFormat?: string;
}

export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  (
    {
      selected,
      onSelect,
      disabled = false,
      placeholderText = "Select date",
      dateFormat = "PPP",
      className,
      ...props
    },
    ref
  ) => {
    // Create a handler that wraps the onSelect prop to handle the correct types
    const handleChange = (date: Date | null) => {
      if (onSelect) {
        onSelect(date);
      }
    };

    return (
      <div ref={ref} className={cn("relative", className)}>
        <ReactDatePicker
          selected={selected}
          onChange={handleChange}
          disabled={disabled}
          placeholderText={placeholderText}
          dateFormat={dateFormat}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          customInput={
            <div className="flex items-center relative w-full">
              <input
                className={cn(
                  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
                  "pr-8" // Add padding for the Calendar icon
                )}
                placeholder={placeholderText}
                disabled={disabled}
                value={selected ? selected.toLocaleDateString() : ""}
                readOnly
              />
              <Calendar className="absolute right-2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
          }
          {...props}
        />
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker"; 