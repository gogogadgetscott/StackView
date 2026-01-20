"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";

const TAG_COLORS = [
  "bg-red-500/20 text-red-300 border-red-500/30",
  "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "bg-green-500/20 text-green-300 border-green-500/30",
  "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "bg-pink-500/20 text-pink-300 border-pink-500/30",
];

function getTagColor(tag: string): string {
  const hash = tag.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export function TagBadge({
  tag,
  onRemove,
}: {
  tag: string;
  onRemove?: () => void;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${getTagColor(tag)}`}
    >
      {tag}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:text-white transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export function TagInput({
  tags,
  onChange,
  suggestions = [],
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <TagBadge key={tag} tag={tag} onRemove={() => removeTag(tag)} />
      ))}

      {isEditing ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              setTimeout(() => {
                setIsEditing(false);
                setShowSuggestions(false);
              }, 150);
            }}
            className="w-20 rounded border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-xs text-neutral-200 outline-none focus:border-cyan-500"
            placeholder="Add tag"
          />

          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 z-10 mt-1 rounded border border-neutral-700 bg-neutral-900 shadow-lg">
              {filteredSuggestions.slice(0, 5).map((s) => (
                <button
                  key={s}
                  onMouseDown={() => addTag(s)}
                  className="block w-full px-3 py-1 text-left text-xs text-neutral-300 hover:bg-neutral-800"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center gap-1 rounded border border-dashed border-neutral-700 px-2 py-0.5 text-xs text-neutral-500 hover:border-cyan-500 hover:text-cyan-400 transition-colors"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
