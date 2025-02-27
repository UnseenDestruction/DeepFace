"use client"

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FiMic, FiMicOff, FiPhoneOff, FiVideo, FiVideoOff, FiPhone } from "react-icons/fi";

const INTRO_VIDEO_URL = "/intro.mp4";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(INTRO_VIDEO_URL);
  const videoRef = useRef<HTMLVideoElement>(null);
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [introPlayed, setIntroPlayed] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const imageRef = useRef<File | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [call, setCall] = useState(false)

  useEffect(() => {
    if (!introPlayed) return;
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError("Your browser does not support speech recognition.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.lang = "en-US";
      recognition.interimResults = false;

      recognition.onresult = async (event: any) => {
        if (event.results.length > 0) {
          const transcript = event.results[0][0].transcript;
          recognition.stop();
          await handleGenerateResponse(transcript);
        }
      };
      recognitionRef.current = recognition;
      navigator.mediaDevices.getUserMedia({ audio: true }).then(() => recognition.start());
    }
    return () => {
      recognitionRef.current?.stop();
    };
  }, [introPlayed]);

  const handleGenerateResponse = async (text: string) => {
    if (!text) return;
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("prompt", text);

      if (imageRef.current) {
        formData.append("image", imageRef.current);
      }
      const response = await axios.post("/api/generate", formData, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "video/mp4" });
      setVideoUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError("Failed to generate video.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCamera = async () => {
    if (isCameraOn) {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCameraOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setIsCameraOn(true);
    } catch (err) {
      setError("Failed to access camera.");
    }
  };

  useEffect(() => {
    if (userVideoRef.current && streamRef.current) {
      userVideoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOn]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (videoRef.current && videoContainerRef.current) {
        const { width, height } = videoContainerRef.current.getBoundingClientRect();
        videoRef.current.style.width = `${width}px`;
        videoRef.current.style.height = `${height}px`;
      }
    });

    if (videoContainerRef.current) {
      resizeObserver.observe(videoContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white relative">
      <input
        type="file"
        accept="image/*"
        className="mb-4"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            imageRef.current = file;
          } else {
            imageRef.current = null;
          }
        }}
      />
        {callActive ? (
          <div>
               <div
        ref={videoContainerRef}
        className="flex w-[100vw] h-[80vh] max-w-4xl bg-gray-800 rounded-3xl overflow-hidden shadow-lg border border-gray-700"
      >
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            className="absolute w-full h-full object-contain"
            autoPlay
            playsInline
            src={videoUrl || undefined}
            onEnded={() => {
              if (!introPlayed) {
                setIntroPlayed(true);
                setVideoUrl(null);
              } else {
                if (recognitionRef.current) {
                  recognitionRef.current.start();
                }
              }
            }}
            
          />
        </div>

        {isCameraOn && (
          <div className="flex-1 border-l border-gray-700">
            <video
              ref={userVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            />
          </div>
        )}
      </div>
      {callActive && (
        <div className="flex items-center space-x-6 mt-4 justify-center">
          <button onClick={() => setIsMicMuted(!isMicMuted)} className="p-3 bg-gray-700 rounded-full hover:bg-gray-600">
            {isMicMuted ? <FiMicOff size={24} /> : <FiMic size={24} />}
          </button>
          <button onClick={toggleCamera} className="p-3 bg-gray-700 rounded-full hover:bg-gray-600">
            {isCameraOn ?  <FiVideo size={24} /> : <FiVideoOff size={24} />}
          </button>
          <button onClick={() => setCallActive(false)} className="p-3 bg-red-600 rounded-full hover:bg-red-500">
            <FiPhoneOff size={24} />
          </button>
        </div>
      )}
          </div>
        ): (
          <div className="flex justify-center items-center gap-2 bg-gray-800 rounded-xl p-4 -translate-y-2 duration-300">
            <FiPhone /> 
            <button 
            onClick={() => setCallActive(true)}
            >Call Anna</button>
          </div>
        )}

    </div>
  );
}
