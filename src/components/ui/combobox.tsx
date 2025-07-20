'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  allowCustomValue?: boolean;
  'data-test'?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  className,
  disabled,
  allowCustomValue = false,
  'data-test': dataTest,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    
    const searchLower = search.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(searchLower) ||
        (option.sublabel && option.sublabel.toLowerCase().includes(searchLower))
    );
  }, [options, search]);

  const selectedOption = options.find((option) => option.value === value);

  // Reset highlighted index when filtered options change
  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredOptions]);

  // Focus input when opened
  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const option = filteredOptions[highlightedIndex];
          onValueChange?.(option.value);
          setOpen(false);
          setSearch('');
          setHighlightedIndex(-1);
        } else if (allowCustomValue && search.trim()) {
          // Allow custom value
          onValueChange?.(search.trim());
          setOpen(false);
          setSearch('');
          setHighlightedIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setSearch('');
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={placeholder}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-gray-500',
            className
          )}
          disabled={disabled}
          data-test={dataTest}
        >
          <span className="truncate">
            {selectedOption ? (
              <span className="flex items-center gap-2">
                {selectedOption.icon}
                <span className="truncate">{selectedOption.label}</span>
                {selectedOption.sublabel && (
                  <span className="text-xs text-gray-500 truncate">
                    {selectedOption.sublabel}
                  </span>
                )}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            ref={inputRef}
            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            data-test={dataTest ? `${dataTest}-search` : undefined}
          />
        </div>
        <div
          className="max-h-60 overflow-auto p-1"
          role="listbox"
          aria-label="Options"
        >
          {filteredOptions.length === 0 && !allowCustomValue ? (
            <div className="py-6 text-center text-sm text-gray-500">
              {emptyText}
            </div>
          ) : (
            <>
              {allowCustomValue && search.trim() && !options.find(o => o.value === search.trim()) && (
                <div
                  className={cn(
                    'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 hover:text-gray-900',
                    highlightedIndex === -1 && 'bg-gray-50 text-gray-900'
                  )}
                  onClick={() => {
                    onValueChange?.(search.trim());
                    setOpen(false);
                    setSearch('');
                    setHighlightedIndex(-1);
                  }}
                  onMouseEnter={() => setHighlightedIndex(-1)}
                  role="option"
                  data-test={dataTest ? `${dataTest}-custom-option` : undefined}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === search.trim() ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex-1">
                    <span className="text-gray-600">Use custom value: </span>
                    <span className="font-medium">{search.trim()}</span>
                  </div>
                </div>
              )}
              {filteredOptions.map((option, index) => (
              <div
                key={option.value}
                className={cn(
                  'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 hover:text-gray-900',
                  value === option.value && 'bg-gray-100 text-gray-900',
                  highlightedIndex === index && 'bg-gray-50 text-gray-900'
                )}
                onClick={() => {
                  onValueChange?.(option.value);
                  setOpen(false);
                  setSearch('');
                  setHighlightedIndex(-1);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                role="option"
                aria-selected={value === option.value}
                data-test={
                  dataTest ? `${dataTest}-option-${option.value}` : undefined
                }
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === option.value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  {option.icon}
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{option.label}</div>
                    {option.sublabel && (
                      <div className="text-xs text-gray-500 truncate">
                        {option.sublabel}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}