"use client";

import React, { useEffect, useRef } from "react";

interface LiveAudioVisualizerProps {
  audioStream: MediaStream | null;
  isActive: boolean;
}

const LiveAudioVisualizer: React.FC<LiveAudioVisualizerProps> = ({
  audioStream,
  isActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive && audioStream && canvasRef.current) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256; // Smaller FFT size for faster updates, adjust as needed
      }

      if (
        analyserRef.current &&
        audioContextRef.current &&
        (!sourceRef.current || sourceRef.current.mediaStream !== audioStream)
      ) {
        // If source exists and is from a different stream, disconnect it
        if (sourceRef.current) {
          sourceRef.current.disconnect();
        }
        sourceRef.current =
          audioContextRef.current.createMediaStreamSource(audioStream);
        sourceRef.current.connect(analyserRef.current);
      }

      const canvas = canvasRef.current;
      const canvasCtx = canvas.getContext("2d");
      const bufferLength = analyserRef.current?.frequencyBinCount || 128;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!analyserRef.current || !canvasCtx) return;

        animationFrameIdRef.current = requestAnimationFrame(draw);
        analyserRef.current.getByteFrequencyData(dataArray);

        canvasCtx.fillStyle = "rgb(241 245 249)"; // bg-slate-100
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 2; // Scale down bar height
          if (barHeight < 1) barHeight = 1; // Minimum bar height

          canvasCtx.fillStyle = `rgba(59, 130, 246, ${barHeight / 100})`; // text-blue-500 with opacity based on height
          canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }
      };

      draw();
    } else {
      // Cleanup when not active or stream is gone
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      // Optional: Clear canvas when not active
      const canvas = canvasRef.current;
      if (canvas) {
        const canvasCtx = canvas.getContext("2d");
        if (canvasCtx) {
          canvasCtx.fillStyle = "rgb(241 245 249)"; // bg-slate-100 or your default bg
          canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
          canvasCtx.fillStyle = "rgb(100 116 139)"; // text-slate-500
          canvasCtx.textAlign = "center";
          canvasCtx.fillText(
            isActive ? "Connecting audio..." : "Audio Paused",
            canvas.width / 2,
            canvas.height / 2
          );
        }
      }
    }

    // Ensure audio context is closed on component unmount or when audioStream becomes null
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      // Only close the AudioContext if it was created by this component instance
      // and the component is truly unmounting or the stream is permanently gone.
      // For simplicity here, we'll close it if it exists and the component unmounts.
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        // audioContextRef.current.close(); // Be cautious with closing, might affect other components if shared
        // audioContextRef.current = null; // Let it be recreated if stream comes back
      }
    };
  }, [audioStream, isActive]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-lg p-2">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default LiveAudioVisualizer;
