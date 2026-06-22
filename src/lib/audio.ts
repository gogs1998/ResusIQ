export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  public onAudioData?: (base64Data: string) => void;
  public onVolumeChange?: (volume: number) => void;

  async startRecording() {
    // Do NOT force a sampleRate here. iOS Safari only supports the device's
    // native rate and throws NotSupportedError when a second AudioContext is
    // created at a different rate (this app also runs a 24kHz playback context
    // + the Gemini TTS context). We capture at the hardware rate and resample
    // to the 16kHz Gemini expects in JS below.
    this.audioContext = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    // iOS creates the context "suspended"; it must be resumed within the user
    // gesture that started the session, or no audio frames are delivered.
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    // The permission prompt is async; if the session was torn down while we
    // waited (e.g. the Live socket closed), stopRecording() will have nulled
    // the context. Bail cleanly instead of throwing a misleading mic error.
    if (!this.audioContext) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.mediaStream = stream;
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // 4096 frames (~85ms at 48kHz) — a good ScriptProcessor buffer size.
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    const TARGET_RATE = 16000;

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const inputRate = this.audioContext?.sampleRate ?? TARGET_RATE;

      // Linear-resample the hardware-rate float samples down to 16kHz, then
      // convert to little-endian Int16 PCM. ratio === 1 when the device is
      // already at 16kHz, so this is a no-op resample in that case.
      const ratio = inputRate / TARGET_RATE;
      const outLength = Math.max(1, Math.floor(inputData.length / ratio));

      let sum = 0;
      const pcm16 = new Int16Array(outLength);
      for (let i = 0; i < outLength; i++) {
        const srcIndex = i * ratio;
        const i0 = Math.floor(srcIndex);
        const i1 = Math.min(i0 + 1, inputData.length - 1);
        const frac = srcIndex - i0;
        let s = inputData[i0] + (inputData[i1] - inputData[i0]) * frac;
        s = Math.max(-1, Math.min(1, s));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        sum += s * s;
      }

      if (this.onVolumeChange) {
        const rms = Math.sqrt(sum / outLength);
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
      // Native rate again (see startRecording). The 24kHz Gemini audio is
      // carried by each AudioBuffer's own sampleRate (createBuffer(..., 24000)
      // below), so Web Audio resamples it to the context rate on playback —
      // no need to (and on iOS, no way to) force the context to 24kHz.
      this.playbackContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
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
