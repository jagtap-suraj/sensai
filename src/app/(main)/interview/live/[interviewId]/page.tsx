"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getLiveInterviewForClientStart,
  generateFeedbackAndFinalizeInterview,
  LiveInterviewClientData,
} from "@/lib/actions/live-interview";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Mic,
  MicOff,
  AlertTriangle,
  Square,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import LiveAudioVisualizer from "@/components/interview/live-audio-visualizer";
import { GoogleGenAI, Modality } from "@google/genai";
import { InterviewStatus, TranscriptEntry } from "@/lib/types";
import PCMProcessorScript from "@/lib/worklets/pcm-processor";

// Add interface for LiveSession type
interface LiveSession {
  close: () => void;
  sendRealtimeInput: (input: {
    audio: { data: string; mimeType: string };
  }) => void;
  sendClientContent: (content: {
    turns: Array<{ role: string; parts: Array<{ text: string }> }>;
  }) => void;
}

// Add interfaces for message types
interface Transcription {
  text?: string; // Using optional to match the library's type
}

interface LiveServerContent {
  inputTranscription?: Transcription;
  outputTranscription?: Transcription;
}

interface LiveServerMessage {
  text?: string;
  data?: string;
  serverContent?: LiveServerContent;
}

const AUDIO_SAMPLE_RATE = 16000; // Required by Gemini Live API for PCM, though it can resample for input.
const GEMINI_AUDIO_SAMPLE_RATE = 24000; // Corrected: Live API audio output is 24kHz
// const AUDIO_TIME_SLICE_MS = 500; // No longer directly used by MediaRecorder for Gemini data path

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper function to convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export default function LiveInterviewPage() {
  const router = useRouter();
  const params = useParams();
  const interviewId = params.interviewId as string;

  const [interviewStatus, setInterviewStatus] = useState<InterviewStatus>(
    InterviewStatus.INITIALIZING
  );
  const [interviewData, setInterviewData] =
    useState<LiveInterviewClientData | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isMicrophoneAllowed, setIsMicrophoneAllowed] = useState<
    boolean | null
  >(null);
  const [isRecording, setIsRecording] = useState(false); // This will now gate the worklet processing

  const genAIRef = useRef<GoogleGenAI | null>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);
  // Remove MediaRecorder refs if no longer used for primary audio path
  // const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Refs for AudioContext and Worklet
  const audioContextRef = useRef<AudioContext | null>(null);
  const pcmProcessorNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(
    null
  );
  const workletUrlRef = useRef<string | null>(null);

  // Refs for debouncing user speech transcription
  const currentUserSpeechRef = useRef<string>("");
  const speechDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const SPEECH_DEBOUNCE_DELAY = 750; // ms

  // Refs and state for Gemini audio playback
  const playbackAudioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isGeminiSpeakingRef = useRef<boolean>(false);

  // Define a ref to solve the circular dependency problem
  const processAudioQueueRef = useRef<
    ((audioData?: ArrayBuffer) => void) | null
  >(null);

  const addToTranscript = useCallback(
    (speaker: "User" | "Gemini", text: string) => {
      setTranscript((prev) => [
        ...prev,
        { speaker, text, timestamp: Date.now() },
      ]);
    },
    []
  );

  const initializeLiveAPI = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      toast.error("Gemini API key is not configured.");
      setInterviewStatus(InterviewStatus.ERROR);
      return;
    }
    genAIRef.current = new GoogleGenAI({
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    });
  }, []);

  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setIsMicrophoneAllowed(true);
      setInterviewStatus(InterviewStatus.MIC_PERMISSION_GRANTED);
    } catch (error) {
      console.error("Microphone permission denied:", error);
      toast.error(
        "Microphone permission denied. Please allow microphone access to start the interview."
      );
      setIsMicrophoneAllowed(false);
      setInterviewStatus(InterviewStatus.ERROR_MIC_PERMISSION);
    }
  }, []);

  const initializePlaybackAudioContext = useCallback(() => {
    if (!playbackAudioContextRef.current) {
      try {
        const context = new AudioContext({
          sampleRate: GEMINI_AUDIO_SAMPLE_RATE,
        });
        playbackAudioContextRef.current = context;
        console.log("Playback AudioContext initialized.");
      } catch (e) {
        console.error("Error initializing playback AudioContext:", e);
        toast.error("Could not initialize audio playback.");
      }
    }
  }, []);

  // Forward declaration to break the circular dependency
  const stopAudioProcessing = useCallback(() => {
    console.log("Stopping audio processing...");
    if (mediaStreamSourceNodeRef.current && pcmProcessorNodeRef.current) {
      mediaStreamSourceNodeRef.current.disconnect(pcmProcessorNodeRef.current);
      console.log("Disconnected media stream source from PCM processor.");
    }
    if (pcmProcessorNodeRef.current) {
      pcmProcessorNodeRef.current.port.close();
      // pcmProcessorNodeRef.current.disconnect(); // Not standard for AudioWorkletNode itself
      console.log("Closed PCM processor port.");
    }
    if (audioContextRef.current) {
      audioContextRef.current
        .close()
        .then(() => {
          console.log("AudioContext closed successfully.");
        })
        .catch((e) => console.error("Error closing AudioContext:", e));
    }

    // Revoke Blob URL if it was created
    if (workletUrlRef.current) {
      URL.revokeObjectURL(workletUrlRef.current);
      workletUrlRef.current = null;
      console.log("Revoked worklet Blob URL.");
    }

    // Clear speech debounce timer on stop
    if (speechDebounceTimerRef.current) {
      clearTimeout(speechDebounceTimerRef.current);
      speechDebounceTimerRef.current = null;
    }
    currentUserSpeechRef.current = ""; // Clear any pending speech

    pcmProcessorNodeRef.current = null;
    mediaStreamSourceNodeRef.current = null;
    audioContextRef.current = null;

    // Stop Gemini audio playback and clear queue
    isGeminiSpeakingRef.current = false;
    audioQueueRef.current = [];
    if (playbackAudioContextRef.current) {
      playbackAudioContextRef.current
        .close()
        .then(() => {
          console.log("Playback AudioContext closed successfully.");
        })
        .catch((e) => console.error("Error closing Playback AudioContext:", e));
      playbackAudioContextRef.current = null;
    }

    // Stop media tracks
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
      console.log("MediaStream tracks stopped.");
    }
  }, []);

  // Convert endInterview to use useCallback
  const endInterview = useCallback(async () => {
    setIsRecording(false); // This will prevent the useEffect from re-initializing audio processing
    setInterviewStatus(InterviewStatus.FINALIZING);
    toast.info("Ending interview and generating feedback...");

    stopAudioProcessing();

    if (liveSessionRef.current) {
      try {
        liveSessionRef.current.close();
        console.log("Live API session explicitly closed.");
      } catch (e) {
        console.error("Error closing live session:", e);
      }
      liveSessionRef.current = null;
    }

    const fullTranscript = transcript
      .map((entry) => `${entry.speaker}: ${entry.text}`)
      .join("\n");

    try {
      const feedbackData = await generateFeedbackAndFinalizeInterview({
        interviewId,
        transcript: fullTranscript,
      });
      if (feedbackData) {
        toast.success("Feedback generated!");
        setInterviewStatus(InterviewStatus.COMPLETED);
        router.push(`/interview/live/results/${interviewId}`);
      } else {
        toast.error("Failed to generate feedback.");
        setInterviewStatus(InterviewStatus.ERROR_FINALIZING);
      }
    } catch (error: unknown) {
      console.error("Error finalizing interview:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Error finalizing interview: ${errorMessage}`);
      setInterviewStatus(InterviewStatus.ERROR_FINALIZING);
    }
  }, [stopAudioProcessing, transcript, interviewId, router]);

  // Define playAudioData before processAudioQueue
  const playAudioData = useCallback(
    async (audioData: ArrayBuffer) => {
      if (
        !playbackAudioContextRef.current ||
        playbackAudioContextRef.current.state === "closed"
      ) {
        console.warn("Playback AudioContext not available or closed.");
        // Attempt to re-initialize if closed and context is available.
        if (
          playbackAudioContextRef.current &&
          playbackAudioContextRef.current.state === "closed"
        ) {
          initializePlaybackAudioContext(); // Re-initialize
          if (
            !playbackAudioContextRef.current ||
            playbackAudioContextRef.current.state === "closed"
          ) {
            isGeminiSpeakingRef.current = false;
            // If still closed, process next in queue if any, or just return.
            if (processAudioQueueRef.current) processAudioQueueRef.current(); // Try to process next if any
            return;
          }
        } else if (!playbackAudioContextRef.current) {
          isGeminiSpeakingRef.current = false;
          if (processAudioQueueRef.current) processAudioQueueRef.current();
          return;
        }
      }

      // Ensure context is running
      if (playbackAudioContextRef.current.state === "suspended") {
        await playbackAudioContextRef.current.resume();
      }

      try {
        isGeminiSpeakingRef.current = true;

        // Assuming audioData is 16-bit PCM mono
        const pcm16Data = new Int16Array(audioData);
        const frameCount = pcm16Data.length;
        const audioBuffer = playbackAudioContextRef.current.createBuffer(
          1, // 1 channel (mono)
          frameCount,
          GEMINI_AUDIO_SAMPLE_RATE
        );
        const channelData = audioBuffer.getChannelData(0);

        for (let i = 0; i < frameCount; i++) {
          channelData[i] = pcm16Data[i] / 32768.0; // Convert Int16 to Float32 range [-1.0, 1.0]
        }

        const source = playbackAudioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(playbackAudioContextRef.current.destination);
        source.onended = () => {
          isGeminiSpeakingRef.current = false;
          if (processAudioQueueRef.current) processAudioQueueRef.current(); // Play next chunk if available
        };
        source.start();
      } catch (error) {
        console.error("Error playing audio data:", error);
        toast.error("Error playing Gemini's audio.");
        isGeminiSpeakingRef.current = false;
        if (processAudioQueueRef.current) processAudioQueueRef.current(); // Attempt to play next even if current one failed
      }
    },
    [initializePlaybackAudioContext]
  );

  // Now define the actual processAudioQueue function that uses the ref and playAudioData
  const processAudioQueue = useCallback(() => {
    if (!isGeminiSpeakingRef.current && audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift();
      if (audioData) {
        playAudioData(audioData);
      }
    }
  }, [playAudioData]);

  // Keep processAudioQueueRef in sync with the latest processAudioQueue function
  useEffect(() => {
    processAudioQueueRef.current = processAudioQueue;
  }, [processAudioQueue]);

  const connectToLiveApi = useCallback(async () => {
    if (!genAIRef.current || !interviewData?.systemInstruction) {
      toast.error("Live API or interview data not initialized.");
      setInterviewStatus(InterviewStatus.ERROR);
      return;
    }
    setInterviewStatus(InterviewStatus.CONNECTING_LIVE_API);

    try {
      const session = await genAIRef.current.live.connect({
        model: "gemini-2.0-flash-live-001",
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: interviewData.systemInstruction,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Kore",
              },
            },
          },
        },
        callbacks: {
          onopen: () => {
            console.log("Live API session opened.");
            setIsRecording(true);
            setInterviewStatus(InterviewStatus.ACTIVE_LISTENING);
            toast.success(
              "Connected to Gemini. Interview started. You can speak now."
            );
          },
          onmessage: (message: LiveServerMessage) => {
            console.log("Live API message:", message);
            if (speechDebounceTimerRef.current) {
              clearTimeout(speechDebounceTimerRef.current);
              speechDebounceTimerRef.current = null;
            }

            if (message.serverContent?.inputTranscription?.text) {
              currentUserSpeechRef.current +=
                message.serverContent.inputTranscription.text + " ";
              // Don't add to transcript immediately, wait for pause or Gemini's response

              speechDebounceTimerRef.current = setTimeout(() => {
                if (currentUserSpeechRef.current.trim()) {
                  addToTranscript("User", currentUserSpeechRef.current.trim());
                  currentUserSpeechRef.current = "";
                }
              }, SPEECH_DEBOUNCE_DELAY);
            } else if (message.text) {
              // Direct text from Gemini
              // If Gemini speaks, finalize any pending user speech first
              if (currentUserSpeechRef.current.trim()) {
                if (speechDebounceTimerRef.current) {
                  // Clear pending timeout if Gemini responds faster
                  clearTimeout(speechDebounceTimerRef.current);
                  speechDebounceTimerRef.current = null;
                }
                addToTranscript("User", currentUserSpeechRef.current.trim());
                currentUserSpeechRef.current = "";
              }
              addToTranscript("Gemini", message.text);
            } else if (message.serverContent?.outputTranscription?.text) {
              addToTranscript(
                "Gemini",
                message.serverContent.outputTranscription.text
              );
            } else if (message.data) {
              // Handling incoming audio data from Gemini
              // console.log('[Main Thread] Received audio data from Gemini, type:', typeof message.data, 'content:', message.data);
              if (typeof message.data === "string") {
                initializePlaybackAudioContext(); // Ensure playback context is ready
                const audioChunk = base64ToArrayBuffer(message.data);
                audioQueueRef.current.push(audioChunk);
                processAudioQueue();
              } else {
                console.warn(
                  "Received non-string audio data from Gemini, cannot process:",
                  message.data
                );
              }
            }
          },
          onerror: (e: ErrorEvent | Error | { message?: string }) => {
            console.error("Live API error:", e);
            toast.error(`Live API Error: ${e.message || "Unknown error"}`);
            setInterviewStatus(InterviewStatus.ERROR_LIVE_API);
          },
          onclose: (e?: CloseEvent) => {
            console.log("Live API session closed.", e);
            // If the session closes and the interview wasn't already being finalized or completed,
            // and it wasn't an error state that would trigger its own finalization flow.
            if (
              interviewStatus !== InterviewStatus.FINALIZING &&
              interviewStatus !== InterviewStatus.COMPLETED &&
              interviewStatus !== InterviewStatus.ERROR_FINALIZING &&
              interviewStatus !== InterviewStatus.ERROR_LIVE_API // Avoid re-triggering if already an API error
            ) {
              toast.info(
                "Interview session ended unexpectedly. Finalizing current progress."
              );
              // Automatically trigger the end interview process to save transcript and get feedback
              // Ensure we don't call this if endInterview() is already in progress or was the cause.
              // The interviewStatus check helps prevent recursion if endInterview itself leads to a close.
              endInterview();
            } else if (
              interviewStatus !== InterviewStatus.COMPLETED &&
              interviewStatus !== InterviewStatus.FINALIZING
            ) {
              setInterviewStatus(InterviewStatus.LIVE_API_DISCONNECTED);
              toast.info("Interview session ended.");
            }
          },
        },
      });
      liveSessionRef.current = session;
    } catch (error: unknown) {
      console.error("Failed to connect to Live API:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to connect to Live API: ${errorMessage}`);
      setInterviewStatus(InterviewStatus.ERROR_LIVE_API);
    }
  }, [
    interviewData,
    addToTranscript,
    interviewStatus,
    initializePlaybackAudioContext,
    processAudioQueue,
    endInterview,
  ]);

  // Send initial message once API is connected
  useEffect(() => {
    if (
      interviewStatus === InterviewStatus.LIVE_API_CONNECTED &&
      liveSessionRef.current
    ) {
      try {
        liveSessionRef.current.sendClientContent({
          turns: [
            {
              role: "user",
              parts: [{ text: "Hello Gemini, let's begin the interview." }],
            },
          ],
        });
        console.log("Sent initial client content after API connection.");
        addToTranscript("User", "Hello Gemini, let's begin the interview."); // Add to local transcript
      } catch (sendError) {
        console.error("Error sending initial client content:", sendError);
        toast.error("Could not send initial message to Gemini.");
      }
    }
  }, [interviewStatus, addToTranscript]); // Ensure all stable dependencies are listed, or ESLint might complain

  useEffect(() => {
    initializeLiveAPI();
  }, [initializeLiveAPI]);

  useEffect(() => {
    if (interviewId) {
      getLiveInterviewForClientStart(interviewId)
        .then((data) => {
          if (data) {
            setInterviewData(data);
            if (isMicrophoneAllowed === true) {
              setInterviewStatus(InterviewStatus.READY_TO_START);
            } else if (isMicrophoneAllowed === null) {
              setInterviewStatus(InterviewStatus.MIC_PERMISSION_PENDING);
            }
          } else {
            toast.error("Failed to load interview data.");
            setInterviewStatus(InterviewStatus.ERROR);
            // router.push('/dashboard/interview');
          }
        })
        .catch((error) => {
          console.error("Error fetching interview data:", error);
          toast.error("Error fetching interview data.");
          setInterviewStatus(InterviewStatus.ERROR);
          // router.push('/dashboard/interview');
        });
    }
  }, [interviewId, router, isMicrophoneAllowed]);

  useEffect(() => {
    if (
      interviewStatus === InterviewStatus.MIC_PERMISSION_PENDING &&
      isMicrophoneAllowed === null
    ) {
      requestMicrophonePermission();
    }
  }, [interviewStatus, requestMicrophonePermission, isMicrophoneAllowed]);

  useEffect(() => {
    if (
      interviewStatus === InterviewStatus.MIC_PERMISSION_GRANTED &&
      interviewData
    ) {
      setInterviewStatus(InterviewStatus.READY_TO_START);
    }
  }, [interviewStatus, interviewData]);

  useEffect(() => {
    // console.log('[LiveInterviewPage] Audio processing useEffect triggered. Status:', interviewStatus, 'isRecording:', isRecording);
    if (
      (interviewStatus === InterviewStatus.LIVE_API_CONNECTED ||
        interviewStatus === InterviewStatus.ACTIVE_LISTENING) &&
      isRecording
    ) {
      // Start AudioWorklet processing if not already started
      if (
        audioStreamRef.current &&
        !pcmProcessorNodeRef.current &&
        !audioContextRef.current
      ) {
        // console.log('[LiveInterviewPage] Entering block to setup audio processing...');
        const setupAudioProcessing = async () => {
          // Explicit check for audioStreamRef.current to satisfy linter and add robustness
          if (!audioStreamRef.current) {
            console.error(
              "audioStreamRef.current is null inside setupAudioProcessing. This should not happen."
            );
            toast.error("Microphone stream lost unexpectedly.");
            setInterviewStatus(InterviewStatus.ERROR_AUDIO_RECORDING);
            setIsRecording(false);
            return;
          }
          try {
            console.log("Setting up AudioContext and PCMProcessor Worklet...");
            const context = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
            audioContextRef.current = context;

            const source = context.createMediaStreamSource(
              audioStreamRef.current
            );
            mediaStreamSourceNodeRef.current = source;

            if (!workletUrlRef.current) {
              const blob = new Blob([PCMProcessorScript], {
                type: "application/javascript",
              });
              workletUrlRef.current = URL.createObjectURL(blob);
            }

            await context.audioWorklet.addModule(workletUrlRef.current);
            const processorNode = new AudioWorkletNode(
              context,
              "pcm-processor",
              {
                processorOptions: { targetSampleRate: AUDIO_SAMPLE_RATE },
              }
            );
            pcmProcessorNodeRef.current = processorNode;

            processorNode.port.onmessage = (
              event: MessageEvent<ArrayBuffer>
            ) => {
              // console.log('[Main Thread] Received data from worklet, byteLength:', event.data.byteLength);
              if (
                liveSessionRef.current &&
                event.data &&
                event.data.byteLength > 0
              ) {
                const base64PcmData = arrayBufferToBase64(event.data);
                // console.log('[Main Thread] Sending audio data to Gemini, base64 length:', base64PcmData.length);
                liveSessionRef.current.sendRealtimeInput({
                  audio: {
                    data: base64PcmData,
                    mimeType: `audio/pcm;rate=${AUDIO_SAMPLE_RATE}`,
                  },
                });
              } else if (!liveSessionRef.current) {
                // console.warn("Live session not available, cannot send audio data.");
              }
            };

            source.connect(processorNode);
            // The worklet itself doesn't need to be connected to context.destination
            // unless you want to hear the raw mic input *after* it passes through the worklet (if it passed data through).
            // For just sending data, this connection is enough.

            // console.log('[LiveInterviewPage] AudioContext and PCMProcessor Worklet setup complete.');
          } catch (error) {
            console.error(
              "[LiveInterviewPage] Error setting up AudioWorklet:",
              error
            );
            toast.error(
              "Failed to initialize audio processing for the interview."
            );
            setInterviewStatus(InterviewStatus.ERROR_AUDIO_RECORDING); // Or a new error state
            setIsRecording(false);
          }
        };
        setupAudioProcessing();
      } else if (
        audioContextRef.current &&
        audioContextRef.current.state === "suspended"
      ) {
        audioContextRef.current.resume();
      }
    } else if (
      isRecording === false &&
      pcmProcessorNodeRef.current &&
      audioContextRef.current?.state === "running"
    ) {
      // If recording stops, suspend the audio context to stop processing.
      // The nodes remain connected.
      // audioContextRef.current?.suspend();
      // console.log('AudioContext suspended as recording stopped.');
      // No need to suspend here as endInterview will clean up.
    }

    // Cleanup function for this effect
    return () => {
      // This cleanup runs if isRecording or interviewStatus changes causing the effect to re-run,
      // or when the component unmounts.
      // The main cleanup is in endInterview and the unmount effect.
      // Stop Gemini speech playback and clear queue if effect dependencies change leading to re-run
      // though this specific effect's primary role is setup, not continuous operation that needs its own active cleanup.
      // The main audio cleanup is tied to stopAudioProcessing and unmount.
    };
  }, [
    interviewStatus,
    isRecording,
    audioStreamRef,
    pcmProcessorNodeRef,
    audioContextRef,
  ]); // Added all relevant refs that are checked inside

  const startInterview = async () => {
    if (interviewStatus === InterviewStatus.READY_TO_START) {
      setInterviewStatus(InterviewStatus.CONNECTING_LIVE_API);
      await connectToLiveApi();
    }
  };

  // Ensure cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("LiveInterviewPage unmounting. Cleaning up resources.");
      stopAudioProcessing(); // This will also clear the speech debounce timer and Gemini audio queue/context
      if (liveSessionRef.current) {
        try {
          liveSessionRef.current.close();
          console.log("Live API session closed on unmount.");
        } catch (e) {
          console.error("Error closing live session on unmount:", e);
        }
        liveSessionRef.current = null;
      }
    };
  }, [stopAudioProcessing]); // Add stopAudioProcessing as a dependency

  // UI Rendering based on interviewStatus
  const renderContent = () => {
    switch (interviewStatus) {
      case InterviewStatus.INITIALIZING:
      case InterviewStatus.MIC_PERMISSION_PENDING:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">
              {interviewData
                ? "Requesting microphone..."
                : "Initializing Interview..."}
            </p>
          </div>
        );
      case InterviewStatus.MIC_PERMISSION_GRANTED:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">
              Microphone ready, loading data...
            </p>
          </div>
        );
      case InterviewStatus.READY_TO_START:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <Play className="h-16 w-16 text-green-500 mb-6" />
            <p className="text-xl font-semibold mb-4">
              Ready to Start Your Interview?
            </p>
            <p className="text-muted-foreground mb-8 text-center max-w-md">
              Click the button below to begin your live audio interview with
              Gemini.
            </p>
            <Button onClick={startInterview} size="lg">
              <Mic className="mr-2 h-5 w-5" /> Start Interview
            </Button>
          </div>
        );
      case InterviewStatus.CONNECTING_LIVE_API:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">
              Connecting to Gemini...
            </p>
          </div>
        );
      case InterviewStatus.ACTIVE_LISTENING:
      case InterviewStatus.ACTIVE_SPEAKING:
        return (
          <div className="flex flex-col h-full items-center justify-center p-4">
            <div className="w-full max-w-md h-48 mb-8">
              <LiveAudioVisualizer
                audioStream={audioStreamRef.current}
                isActive={isRecording}
              />
            </div>
            <Button
              onClick={endInterview}
              variant="destructive"
              size="lg"
              className="w-full max-w-xs"
            >
              <Square className="mr-2 h-5 w-5" /> End Interview
            </Button>
          </div>
        );
      case InterviewStatus.FINALIZING:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">
              Finalizing & Generating Feedback...
            </p>
          </div>
        );
      case InterviewStatus.COMPLETED:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <h2 className="text-2xl font-semibold mb-4">
              Interview Completed!
            </h2>
            <p className="text-muted-foreground mb-6">
              Redirecting to results...
            </p>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        );
      case InterviewStatus.LIVE_API_DISCONNECTED:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg text-destructive mb-2">
              Interview Session Disconnected
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              The connection to the live interview service was lost.
            </p>
            <Button
              onClick={() => router.push("/dashboard/interview")}
              variant="outline"
            >
              Back to Dashboard
            </Button>
          </div>
        );
      case InterviewStatus.ERROR:
      case InterviewStatus.ERROR_MIC_PERMISSION:
      case InterviewStatus.ERROR_LIVE_API:
      case InterviewStatus.ERROR_AUDIO_RECORDING:
      case InterviewStatus.ERROR_FINALIZING:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg text-destructive mb-2">An Error Occurred</p>
            <p className="text-sm text-muted-foreground mb-6">
              {interviewStatus === InterviewStatus.ERROR_MIC_PERMISSION
                ? "Please grant microphone permission and refresh."
                : "Something went wrong. Please try again later."}
            </p>
            <Button
              onClick={() => router.push("/dashboard/interview")}
              variant="outline"
            >
              Back to Dashboard
            </Button>
            {isMicrophoneAllowed === false &&
              interviewStatus === InterviewStatus.ERROR_MIC_PERMISSION && (
                <Button onClick={requestMicrophonePermission} className="mt-2">
                  <Mic className="mr-2 h-5 w-5" /> Retry Microphone Permission
                </Button>
              )}
          </div>
        );
      default:
        return <p>Unknown interview state.</p>;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl h-[calc(100vh-100px)] flex flex-col">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-center">
          {interviewData?.targetRole || "Live Interview"}
        </h1>
        {interviewData && (
          <p className="text-center text-muted-foreground">
            Job Level: {interviewData.jobLevel} | Type: {interviewData.type}
          </p>
        )}
      </header>
      <main className="flex-grow flex flex-col justify-center">
        {renderContent()}
      </main>
      {!isMicrophoneAllowed &&
        isMicrophoneAllowed !== null &&
        interviewStatus !== InterviewStatus.ERROR_MIC_PERMISSION && (
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md text-sm">
            <MicOff className="inline mr-2 h-4 w-4" />
            Microphone permission was not granted. Some features might be
            unavailable. You can grant permission in your browser settings.
          </div>
        )}
    </div>
  );
}
