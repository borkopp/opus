import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface DebouncedInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export function DebouncedInput({
  value: initialValue,
  onChange,
  debounceMs = 300,
  ...props
}: DebouncedInputProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (value !== initialValue) {
        onChange(value);
      }
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [value, onChange, initialValue, debounceMs]);

  return (
    <Input
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
