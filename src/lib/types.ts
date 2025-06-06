export enum InterviewStatus {
  INITIALIZING = "INITIALIZING",
  MIC_PERMISSION_PENDING = "MIC_PERMISSION_PENDING",
  MIC_PERMISSION_GRANTED = "MIC_PERMISSION_GRANTED",
  READY_TO_START = "READY_TO_START",
  CONNECTING_LIVE_API = "CONNECTING_LIVE_API",
  LIVE_API_CONNECTED = "LIVE_API_CONNECTED",
  ACTIVE_LISTENING = "ACTIVE_LISTENING", // User is speaking or system is expecting user input
  ACTIVE_SPEAKING = "ACTIVE_SPEAKING", // AI is speaking
  FINALIZING = "FINALIZING", // Interview ended, generating feedback
  COMPLETED = "COMPLETED", // Feedback generated, ready for results page
  LIVE_API_DISCONNECTED = "LIVE_API_DISCONNECTED",
  ERROR = "ERROR",
  ERROR_MIC_PERMISSION = "ERROR_MIC_PERMISSION",
  ERROR_LIVE_API = "ERROR_LIVE_API",
  ERROR_AUDIO_RECORDING = "ERROR_AUDIO_RECORDING",
  ERROR_FINALIZING = "ERROR_FINALIZING",
}

export interface TranscriptEntry {
  speaker: "User" | "Gemini";
  text: string;
  timestamp: number;
}
