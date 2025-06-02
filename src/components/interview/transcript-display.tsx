"use client";

import { TranscriptEntry } from "@/lib/types"; // Import TranscriptEntry
import { useEffect, useRef } from "react";

interface TranscriptDisplayProps {
  transcript: TranscriptEntry[];
}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  transcript,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto space-y-4 pr-2">
      {transcript.length === 0 && (
        <p className="text-center text-muted-foreground italic">
          Interview transcript will appear here...
        </p>
      )}
      {transcript.map((entry, index) => (
        <div
          key={entry.timestamp + "-" + index} // More robust key
          className={`flex flex-col ${
            entry.speaker === "User" ? "items-end" : "items-start"
          }`}
        >
          <div
            className={`max-w-[75%] rounded-lg px-4 py-2 ${
              entry.speaker === "User"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            <p className="text-xs font-semibold mb-0.5">
              {entry.speaker === "User" ? "You" : "Gemini"}
              <span className="text-xs text-muted-foreground/80 ml-2">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </p>
            <p className="text-sm whitespace-pre-wrap">{entry.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TranscriptDisplay;
