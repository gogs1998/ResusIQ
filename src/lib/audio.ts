export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  public onAudioData?: (base64Data: string) => void;
  public onVolumeChange?: (volume: number) => void;

  async startRecording() {
    this.audioContext = new (
      window.AudioContext || (window as any).webkitAudioContext
    )({ sampleRate: 16000 });
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // 4096 is a good buffer size for 16kHz audio (~256ms)
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);

      let sum = 0;
      // Convert Float32 to Int16
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        sum += s * s;
      }

      if (this.onVolumeChange) {
        const rms = Math.sqrt(sum / inputData.length);
        this.onVolumeChange(rms);
      }

      // Convert to base64
      const buffer = new ArrayBuffer(pcm16.length * 2);
      const view = new DataView(buffer);
      for (let i = 0; i < pcm16.length; i++) {
        view.setInt16(i * 2, pcm16[i], true); // little endian
      }

      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      if (this.onAudioData) {
        this.onAudioData(base64);
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  stopRecording() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // Playback
  private playbackContext: AudioContext | null = null;
  private nextPlayTime = 0;

  initPlayback() {
    if (!this.playbackContext) {
      this.playbackContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )({ sampleRate: 24000 });
    }
  }

  playAudio(base64Data: string) {
    this.initPlayback();
    if (!this.playbackContext) return;

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // The data is Int16 PCM, 24000Hz
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 0x8000;
    }

    const audioBuffer = this.playbackContext.createBuffer(
      1,
      float32.length,
      24000,
    );
    audioBuffer.getChannelData(0).set(float32);

    const source = this.playbackContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.playbackContext.destination);

    const currentTime = this.playbackContext.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime;
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
  }

  stopPlayback() {
    if (this.playbackContext) {
      this.playbackContext.close();
      this.playbackContext = null;
      this.nextPlayTime = 0;
    }
  }
}
