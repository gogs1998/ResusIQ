import { GoogleGenAI, Modality } from '@google/genai';
import type { LiveServerMessage } from '@google/genai';
import { AudioStreamer } from './audio';

/**
 * Singleton Gemini TTS service.
 * Opens a persistent Live API session and sends text to get high-quality
 * Zephyr voice audio back. Falls through gracefully if no API key.
 */
class GeminiTTSService {
  private session: any = null;
  private streamer: AudioStreamer | null = null;
  private connecting = false;
  private connected = false;
  private apiKey: string | null = null;
  private speakQueue: string[] = [];
  private isSpeaking = false;
  private onSpeakingChange?: (speaking: boolean) => void;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /** Check if Gemini TTS is available (API key saved) */
  get isAvailable(): boolean {
    return !!this.getApiKey();
  }

  /** Check if currently connected */
  get isConnected(): boolean {
    return this.connected;
  }

  private getApiKey(): string | null {
    return localStorage.getItem('resusiq-gemini-key');
  }

  /** Set callback for speaking state changes */
  setSpeakingCallback(cb: (speaking: boolean) => void) {
    this.onSpeakingChange = cb;
  }

  /** Connect to Gemini Live API for TTS */
  async connect(): Promise<boolean> {
    const apiKey = this.getApiKey();
    if (!apiKey) return false;
    if (this.connected || this.connecting) return this.connected;

    this.apiKey = apiKey;
    this.connecting = true;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const streamer = new AudioStreamer();
      this.streamer = streamer;

      const session = await ai.live.connect({
        model: 'gemini-2.5-flash-preview-native-audio-dialog',
        callbacks: {
          onopen: () => {
            this.connected = true;
            this.connecting = false;
            // Process any queued speech
            this.processQueue();
          },
          onmessage: (message: LiveServerMessage) => {
            const base64Audio =
              message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              streamer.playAudio(base64Audio);
            }

            // Detect turn completion (no more audio coming)
            const turnComplete = message.serverContent?.turnComplete;
            if (turnComplete) {
              // Small delay to let last audio chunk finish playing
              setTimeout(() => {
                this.isSpeaking = false;
                this.onSpeakingChange?.(false);
                // Process next in queue
                this.processQueue();
              }, 300);
            }
          },
          onerror: (err) => {
            console.warn('Gemini TTS connection error:', err);
            this.handleDisconnect();
          },
          onclose: () => {
            this.handleDisconnect();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction:
            'You are a text-to-speech reader for a medical emergency app. ' +
            'Read the provided text clearly, calmly, and at a measured pace. ' +
            'Do NOT add any commentary, greetings, or extra words. ' +
            'Simply read exactly what is given to you. ' +
            'Use a calm, authoritative, British English tone.',
        },
      });

      this.session = session;
      return true;
    } catch (err) {
      console.warn('Gemini TTS connect failed:', err);
      this.connecting = false;
      this.connected = false;
      return false;
    }
  }

  private handleDisconnect() {
    this.connected = false;
    this.connecting = false;
    this.session = null;
    this.isSpeaking = false;
    this.onSpeakingChange?.(false);
  }

  /** Speak text via Gemini. Auto-connects if needed. */
  async speak(text: string): Promise<boolean> {
    if (!this.getApiKey()) return false;

    this.speakQueue.push(text);

    if (!this.connected && !this.connecting) {
      await this.connect();
    } else {
      this.processQueue();
    }

    return true;
  }

  private async processQueue() {
    if (this.isSpeaking || this.speakQueue.length === 0 || !this.session) return;

    const text = this.speakQueue.shift();
    if (!text) return;

    this.isSpeaking = true;
    this.onSpeakingChange?.(true);

    try {
      await this.session.send({ text });
    } catch (err) {
      console.warn('Gemini TTS send failed:', err);
      this.isSpeaking = false;
      this.onSpeakingChange?.(false);
      // Try reconnecting for next request
      this.handleDisconnect();
    }
  }

  /** Stop current speech and clear queue */
  stop() {
    this.speakQueue = [];
    this.isSpeaking = false;
    this.onSpeakingChange?.(false);

    if (this.streamer) {
      this.streamer.stopPlayback();
    }
  }

  /** Fully disconnect and clean up */
  disconnect() {
    this.stop();

    if (this.session) {
      try {
        this.session.close();
      } catch { /* ignore */ }
      this.session = null;
    }

    if (this.streamer) {
      this.streamer.stopPlayback();
      this.streamer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.connected = false;
    this.connecting = false;
  }
}

// Export singleton
export const geminiTTS = new GeminiTTSService();
