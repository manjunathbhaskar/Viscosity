"use client";

import { useRef, useState } from "react";

interface VoicePlayerProps {
  dealId: string;
}

export default function VoicePlayer({ dealId }: VoicePlayerProps) {
  const [briefingState, setBriefingState] = useState<"idle" | "loading" | "playing" | "done">("idle");
  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answerState, setAnswerState] = useState<"idle" | "loading" | "playing">("idle");
  const [answerText, setAnswerText] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function playBriefing() {
    setBriefingState("loading");
    setBriefingText(null);
    try {
      const res = await fetch("/api/voice/briefing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dealId }),
      });
      const data = await res.json();
      setBriefingText(data.text);

      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        audio.onended = () => setBriefingState("done");
        audio.play();
        setBriefingState("playing");
      } else {
        setBriefingState("done");
      }
    } catch {
      setBriefingState("idle");
    }
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setBriefingState("done");
    setAnswerState("idle");
  }

  async function askQuestion() {
    if (!question.trim()) return;
    setAnswerState("loading");
    setAnswerText(null);
    try {
      const res = await fetch("/api/voice/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dealId, question }),
      });
      const data = await res.json();
      setAnswerText(data.text);

      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        audio.onended = () => setAnswerState("idle");
        audio.play();
        setAnswerState("playing");
      } else {
        setAnswerState("idle");
      }
    } catch {
      setAnswerState("idle");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {briefingState === "idle" || briefingState === "done" ? (
          <button className="btn" onClick={playBriefing}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 3.5C1 2.67 1.67 2 2.5 2h2.09c.33 0 .65.13.88.37L7 4h4.5c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5h-9C1.67 12 1 11.33 1 10.5v-7z" fill="none" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M4.5 7.5v2M6.5 6.5v3M8.5 7v2M10.5 6v3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span>brief me</span>
          </button>
        ) : briefingState === "loading" ? (
          <button className="btn" disabled>
            <span>generating...</span>
          </button>
        ) : (
          <button className="btn" onClick={stopAudio}>
            <div className="waveform">
              <div className="bar" />
              <div className="bar" />
              <div className="bar" />
              <div className="bar" />
              <div className="bar" />
            </div>
            <span>stop</span>
          </button>
        )}
      </div>

      {briefingText && briefingState === "done" && (
        <div className="card-paper p-3">
          <p className="label mb-1">briefing transcript</p>
          <p className="text-[13px]">{briefingText}</p>
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="ask about this deal..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && askQuestion()}
        />
        <button
          className="btn"
          disabled={!question.trim() || answerState === "loading"}
          onClick={askQuestion}
        >
          {answerState === "loading" ? "..." : "ask"}
        </button>
      </div>

      {answerState === "playing" && (
        <div className="flex items-center gap-2">
          <div className="waveform">
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
          </div>
          <button className="label cursor-pointer" onClick={stopAudio}>stop</button>
        </div>
      )}

      {answerText && answerState !== "loading" && (
        <div className="card-paper p-3">
          <p className="label mb-1">answer</p>
          <p className="text-[13px]">{answerText}</p>
        </div>
      )}
    </div>
  );
}
