import {
  DriverStateSimulationMode,
  DriverStateSimulatorOptions,
  DriverStateTelemetryData,
} from '../models/driverState.types';

/**
 * Driver State / Driver Monitoring System (DMS) Telemetry Simulator Service.
 *
 * Produces deterministic, coherent simulated driver monitoring data without requiring
 * camera hardware, facial landmark tracking, ML models, or native DMS dependencies.
 *
 * Simulation Modes & Deterministic Value Profiles:
 * 1. FOCUSED:
 *    - perclos: Low/normal PERCLOS (~4.0% - 6.0%)
 *    - gazeDirection: "FORWARD"
 *    - headPose: "NORMAL"
 *    - attentionState: "FOCUSED"
 *    - blinkRate: ~14 blinks/min
 *    - yawnDetected: false
 *
 * 2. DROWSY:
 *    - perclos: Elevated PERCLOS (~50.0% - 60.0%)
 *    - gazeDirection: "DOWN"
 *    - headPose: "NODDING"
 *    - attentionState: "DROWSY"
 *    - blinkRate: ~26 blinks/min (slow heavy blinks)
 *    - yawnDetected: true (periodic intermittent yawn)
 *
 * 3. DISTRACTED:
 *    - perclos: Moderate PERCLOS (~13.0% - 17.0%)
 *    - gazeDirection: "RIGHT"
 *    - headPose: "TILTED_RIGHT"
 *    - attentionState: "DISTRACTED"
 *    - blinkRate: ~18 blinks/min
 *    - yawnDetected: false
 *
 * 4. UNRESPONSIVE:
 *    - perclos: Very high PERCLOS / eyes closed (~96.5% - 99.5%)
 *    - gazeDirection: "UNKNOWN"
 *    - headPose: "UNKNOWN"
 *    - attentionState: "UNRESPONSIVE"
 *    - blinkRate: 0 blinks/min
 *    - yawnDetected: false
 */
export class DriverStateSimulator {
  private mode: DriverStateSimulationMode = 'FOCUSED';
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private stepCount: number = 0;

  constructor(mode: DriverStateSimulationMode = 'FOCUSED') {
    this.mode = mode;
  }

  /**
   * Sets the active simulation mode ('FOCUSED' | 'DROWSY' | 'DISTRACTED' | 'UNRESPONSIVE').
   */
  setMode(mode: DriverStateSimulationMode): void {
    this.mode = mode;
  }

  /**
   * Gets the active simulation mode.
   */
  getMode(): DriverStateSimulationMode {
    return this.mode;
  }

  /**
   * Generates a single deterministic telemetry reading based on mode and current step.
   */
  generateCurrentReading(): DriverStateTelemetryData {
    const timestamp = new Date().toISOString();
    const step = this.stepCount;

    if (this.mode === 'DROWSY') {
      const perclos = Number((55.0 + 5.0 * Math.sin(step * 0.1)).toFixed(1));
      return {
        perclos,
        gazeDirection: 'DOWN',
        headPose: 'NODDING',
        attentionState: 'DROWSY',
        blinkRate: 26,
        yawnDetected: step % 3 === 0,
        timestamp,
      };
    }

    if (this.mode === 'DISTRACTED') {
      const perclos = Number((15.0 + 2.0 * Math.sin(step * 0.1)).toFixed(1));
      return {
        perclos,
        gazeDirection: 'RIGHT',
        headPose: 'TILTED_RIGHT',
        attentionState: 'DISTRACTED',
        blinkRate: 18,
        yawnDetected: false,
        timestamp,
      };
    }

    if (this.mode === 'UNRESPONSIVE') {
      const perclos = Number(
        Math.min(100.0, 98.0 + 1.5 * Math.sin(step * 0.05)).toFixed(1)
      );
      return {
        perclos,
        gazeDirection: 'UNKNOWN',
        headPose: 'UNKNOWN',
        attentionState: 'UNRESPONSIVE',
        blinkRate: 0,
        yawnDetected: false,
        timestamp,
      };
    }

    // Default: FOCUSED mode
    const perclos = Number((5.0 + 1.0 * Math.sin(step * 0.1)).toFixed(1));
    return {
      perclos,
      gazeDirection: 'FORWARD',
      headPose: 'NORMAL',
      attentionState: 'FOCUSED',
      blinkRate: 14,
      yawnDetected: false,
      timestamp,
    };
  }

  /**
   * Starts periodic driver state simulation.
   *
   * @param onData - Callback receiving DriverStateTelemetryData updates
   * @param options - Configurable options (mode, updateIntervalMs)
   */
  start(
    onData: (data: DriverStateTelemetryData) => void,
    options: DriverStateSimulatorOptions = {}
  ): void {
    if (this.isRunning) {
      this.stop();
    }

    if (options.mode) {
      this.mode = options.mode;
    }

    const { updateIntervalMs = 1000 } = options;
    const validInterval = Math.max(100, updateIntervalMs);

    this.isRunning = true;
    this.stepCount = 0;

    // Emit initial reading immediately
    onData(this.generateCurrentReading());

    this.timer = setInterval(() => {
      if (!this.isRunning) return;
      this.stepCount += 1;
      onData(this.generateCurrentReading());
    }, validInterval);
  }

  /**
   * Stops driver state simulation and clears internal timer.
   */
  stop(): void {
    this.isRunning = false;

    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Returns whether the simulator is actively running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }
}
