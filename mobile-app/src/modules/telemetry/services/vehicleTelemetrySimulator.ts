import {
  VehicleSimulationMode,
  VehicleSimulatorOptions,
  VehicleTelemetryData,
} from '../models/vehicle.types';

/**
 * Vehicle / OBD Telemetry Simulator Service.
 *
 * Produces deterministic, coherent vehicle telemetry data without requiring physical OBD hardware.
 *
 * Coherent Simulation Formulas (NORMAL mode):
 * - Speed (km/h): Smooth sinusoidal cruising curve between 40 km/h and 65 km/h.
 *   speed = 52.5 + 12.5 * sin(step * 0.1)
 * - RPM: Coherently linked to simulated speed and gear ratio.
 *   rpm = 900 + speed * 32.5 + 150 * sin(step * 0.2)
 * - Throttle (%): Proportional to speed acceleration demand.
 *   throttle = 20 + (speed - 40) * 0.8
 * - Engine Load (%): Correlated to throttle demand.
 *   engineLoad = throttle * 1.1 + 5
 * - Coolant Temp (°C): Stable engine operating range (~88°C to 92°C).
 *   coolantTemp = 90 + 2 * sin(step * 0.05)
 * - Battery Voltage (V): Plausible alternator charging voltage (~13.8V to 14.2V).
 *   batteryVoltage = 14.0 + 0.2 * sin(step * 0.15)
 * - Diagnostic Faults: Empty array [] in NORMAL mode.
 */
export class VehicleTelemetrySimulator {
  private mode: VehicleSimulationMode = 'NORMAL';
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private stepCount: number = 0;

  constructor(mode: VehicleSimulationMode = 'NORMAL') {
    this.mode = mode;
  }

  /**
   * Sets the current simulation mode ('NORMAL' | 'STALL' | 'CRITICAL_PARAMETER').
   */
  setMode(mode: VehicleSimulationMode): void {
    this.mode = mode;
  }

  /**
   * Gets the current simulation mode.
   */
  getMode(): VehicleSimulationMode {
    return this.mode;
  }

  /**
   * Generates a single coherent telemetry reading based on the current step and mode.
   */
  generateCurrentReading(): VehicleTelemetryData {
    const timestamp = new Date().toISOString();

    if (this.mode === 'STALL') {
      return {
        speed: 0.0,
        rpm: 0,
        engineLoad: 0.0,
        throttle: 0.0,
        coolantTemp: 85.0,
        batteryVoltage: 12.2,
        diagnosticFaults: ['P0505'], // Idle Control System Malfunction
        timestamp,
      };
    }

    if (this.mode === 'CRITICAL_PARAMETER') {
      return {
        speed: 45.0,
        rpm: 2800,
        engineLoad: 75.0,
        throttle: 35.0,
        coolantTemp: 115.0, // Overheating
        batteryVoltage: 11.2, // Low battery voltage
        diagnosticFaults: ['P0217', 'P0562'], // Engine Over-Temperature & System Voltage Low
        timestamp,
      };
    }

    // NORMAL mode - Coherent cruising profile
    const step = this.stepCount;

    const rawSpeed = 52.5 + 12.5 * Math.sin(step * 0.1);
    const speed = Number(rawSpeed.toFixed(1));

    const rawRpm = 900 + speed * 32.5 + 150 * Math.sin(step * 0.2);
    const rpm = Math.round(rawRpm);

    const rawThrottle = 20 + (speed - 40) * 0.8;
    const throttle = Number(rawThrottle.toFixed(1));

    const rawEngineLoad = throttle * 1.1 + 5;
    const engineLoad = Number(rawEngineLoad.toFixed(1));

    const rawCoolantTemp = 90 + 2 * Math.sin(step * 0.05);
    const coolantTemp = Number(rawCoolantTemp.toFixed(1));

    const rawBatteryVoltage = 14.0 + 0.2 * Math.sin(step * 0.15);
    const batteryVoltage = Number(rawBatteryVoltage.toFixed(2));

    return {
      speed,
      rpm,
      engineLoad,
      throttle,
      coolantTemp,
      batteryVoltage,
      diagnosticFaults: [],
      timestamp,
    };
  }

  /**
   * Starts periodic vehicle telemetry simulation.
   *
   * @param onData - Callback receiving VehicleTelemetryData updates
   * @param options - Configurable simulation options (mode, updateIntervalMs)
   */
  start(
    onData: (data: VehicleTelemetryData) => void,
    options: VehicleSimulatorOptions = {}
  ): void {
    if (this.isRunning) {
      this.stop();
    }

    if (options.mode) {
      this.mode = options.mode;
    }

    const { updateIntervalMs = 500 } = options;
    const validInterval = Math.max(50, updateIntervalMs);

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
   * Stops vehicle telemetry simulation and clears internal timer.
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
