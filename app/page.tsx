/* eslint-disable */

"use client"

import { useState, useEffect, useRef } from "react";
import axios from "axios";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError("Your browser does not support speech recognition.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = "en-US";
      recognition.interimResults = false;

      recognition.onresult = async (event: any) => {
        if (event.results.length > 0) {
          const transcript = event.results[0][0].transcript;
          await handleGenerateResponse(transcript);
        }
      };

      recognition.onend = () => {
        if (!loading) {
          recognition.start();
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event);
        setError("Speech recognition error. Please try again.");
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  }, []);

  const handleGenerateResponse = async (text: string) => {
    if (!text) return;
    setLoading(true);
    setError("");

    try {
      const response = await axios.post("/api/generate", { prompt: text }, { responseType: "blob" });

      if (response.data) {
        const newVideoUrl = URL.createObjectURL(response.data);

        if (videoRef.current) {
          const currentTime = videoRef.current.currentTime; 
          videoRef.current.src = newVideoUrl; 
          videoRef.current.currentTime = currentTime; 
          videoRef.current.play();
        } else {
          setVideoUrl(newVideoUrl);
        }
      }
    } catch (err) {
      console.error("API Error:", err);
      setError("Failed to generate video.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      {error && <p className="text-red-500">{error}</p>}
      <video
        ref={videoRef}
        src={videoUrl || ""}
        autoPlay
        controls
        className="w-full max-w-lg border-2 border-gray-700 rounded-lg shadow-lg"
      />
    </div>
  );
}
