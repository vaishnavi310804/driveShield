import { DeviceContextTelemetryData } from '../models/deviceContext.types';
import {
  DriverStateSimulationMode,
  DriverStateTelemetryData,
} from '../models/driverState.types';
import { LocationTelemetryData } from '../models/location.types';
import { MotionTelemetryData } from '../models/sensor.types';
import {
  TelemetryReadiness,
  UnifiedTelemetryCollectorOptions,
  UnifiedTelemetryData,
} from '../models/unifiedTelemetry.types';
import {
  VehicleSimulationMode,
  VehicleTelemetryData,
} from '../models/vehicle.types';
import { DeviceContextCollector } from './deviceContextCollector';
import { DriverStateSimulator } from './driverStateSimulator';
import { LocationSensorCollector } from './locationCollector';
import { MotionSensorCollector } from './sensorCollector';
import { VehicleTelemetrySimulator } from './vehicleTelemetrySimulator';

/**
 * Complete Unified Telemetry Aggregator Service.
 *
 * Aggregates all 5 mobile telemetry sources:
 * 1. MotionSensorCollector (Accelerometer & Gyroscope) [REQUIRED]
 * 2. LocationSensorCollector (GPS Location & Speed) [REQUIRED]
 * 3. VehicleTelemetrySimulator (OBD Speed, RPM, Engine Load, etc.) [REQUIRED]
 * 4. DeviceContextCollector (Battery & Network State) [OPTIONAL]
 * 5. DriverStateSimulator (PERCLOS, Gaze, Head Pose, Attention State) [OPTIONAL]
 *
 * Synchronization & Timestamping:
 * All sources update independently at their respective frequencies (Motion ~5 Hz, Location ~1 Hz,
 * Vehicle ~2 Hz, Device Context low-frequency, Driver State ~1 Hz). The aggregator caches the
 * latest reading from each source and emits a complete unified payload with an independent
 * aggregation timestamp at the configured emission interval.
 */
export class UnifiedTelemetryAggregator {
  private motionCollector: MotionSensorCollector;
  private locationCollector: LocationSensorCollector;
  private deviceContextCollector: DeviceContextCollector;
  private vehicleSimulator: VehicleTelemetrySimulator;
  private driverStateSimulator: DriverStateSimulator;

  private latestMotion: MotionTelemetryData | null = null;
  private latestLocation: LocationTelemetryData | null = null;
  private latestVehicle: VehicleTelemetryData | null = null;
  private latestDeviceContext: DeviceContextTelemetryData | null = null;
  private latestDriverState: DriverStateTelemetryData | null = null;

  private emissionTimer: ReturnType<typeof setInterval> | null = null;
  private isAggregating: boolean = false;

  constructor(
    motionCollector?: MotionSensorCollector,
    locationCollector?: LocationSensorCollector,
    deviceContextCollector?: DeviceContextCollector,
    vehicleSimulator?: VehicleTelemetrySimulator,
    driverStateSimulator?: DriverStateSimulator
  ) {
    this.motionCollector = motionCollector ?? new MotionSensorCollector();
    this.locationCollector = locationCollector ?? new LocationSensorCollector();
    this.deviceContextCollector =
      deviceContextCollector ?? new DeviceContextCollector();
    this.vehicleSimulator = vehicleSimulator ?? new VehicleTelemetrySimulator();
    this.driverStateSimulator =
      driverStateSimulator ?? new DriverStateSimulator();
  }

  /**
   * Sets vehicle simulation mode dynamically on the active simulator.
   */
  setVehicleSimulationMode(mode: VehicleSimulationMode): void {
    this.vehicleSimulator.setMode(mode);
  }

  /**
   * Gets current vehicle simulation mode.
   */
  getVehicleSimulationMode(): VehicleSimulationMode {
    return this.vehicleSimulator.getMode();
  }

  /**
   * Sets driver state simulation mode dynamically on the active simulator.
   */
  setDriverStateSimulationMode(mode: DriverStateSimulationMode): void {
    this.driverStateSimulator.setMode(mode);
  }

  /**
   * Gets current driver state simulation mode.
   */
  getDriverStateSimulationMode(): DriverStateSimulationMode {
    return this.driverStateSimulator.getMode();
  }

  /**
   * Returns current readiness state of the required telemetry sources (motion + location + vehicle).
   */
  getReadiness(): TelemetryReadiness {
    const hasMotionData = this.latestMotion !== null;
    const hasLocationData = this.latestLocation !== null;
    const hasVehicleData = this.latestVehicle !== null;
    return {
      hasMotionData,
      hasLocationData,
      hasVehicleData,
      isReady: hasMotionData && hasLocationData && hasVehicleData,
    };
  }

  /**
   * Starts collecting and aggregating telemetry from all 5 sources,
   * emitting unified payloads at the configured emission interval.
   *
   * @param onData - Callback function receiving UnifiedTelemetryData payloads
   * @param options - Configurable sampling, simulation mode, and emission parameters
   */
  async start(
    onData: (data: UnifiedTelemetryData) => void,
    options: UnifiedTelemetryCollectorOptions = {}
  ): Promise<void> {
    if (this.isAggregating) {
      this.stop();
    }

    const {
      motionUpdateIntervalMs = 200,
      locationTimeIntervalMs = 1000,
      locationDistanceIntervalMeters = 0,
      deviceContextRefreshIntervalMs = 10000,
      vehicleUpdateIntervalMs = 500,
      vehicleSimulationMode = 'NORMAL',
      driverStateUpdateIntervalMs = 1000,
      driverStateSimulationMode = 'FOCUSED',
      emissionIntervalMs = 200,
    } = options;

    this.isAggregating = true;

    // 1. Motion Collector (Required)
    await this.motionCollector.start(
      (motionData) => {
        this.latestMotion = motionData;
      },
      { updateIntervalMs: motionUpdateIntervalMs }
    );

    // 2. Location Collector (Required)
    await this.locationCollector.start(
      (locationData) => {
        this.latestLocation = locationData;
      },
      {
        timeIntervalMs: locationTimeIntervalMs,
        distanceIntervalMeters: locationDistanceIntervalMeters,
      }
    );

    // 3. Vehicle Telemetry Simulator (Required)
    this.vehicleSimulator.start(
      (vehicleData) => {
        this.latestVehicle = vehicleData;
      },
      {
        updateIntervalMs: vehicleUpdateIntervalMs,
        mode: vehicleSimulationMode,
      }
    );

    // 4. Device Context Collector (Optional - non-blocking)
    this.deviceContextCollector
      .start(
        (deviceContextData) => {
          this.latestDeviceContext = deviceContextData;
        },
        { refreshIntervalMs: deviceContextRefreshIntervalMs }
      )
      .catch(() => {
        // Device context errors caught non-destructively
      });

    // 5. Driver State Simulator (Optional - non-blocking)
    this.driverStateSimulator.start(
      (driverStateData) => {
        this.latestDriverState = driverStateData;
      },
      {
        updateIntervalMs: driverStateUpdateIntervalMs,
        mode: driverStateSimulationMode,
      }
    );

    // 6. Periodic Emission Timer
    const validInterval = Math.max(50, emissionIntervalMs);
    this.emissionTimer = setInterval(() => {
      if (!this.isAggregating) return;

      // Motion, Location, and Vehicle Data are required for readiness emission
      if (this.latestMotion && this.latestLocation && this.latestVehicle) {
        const unifiedData: UnifiedTelemetryData = {
          timestamp: new Date().toISOString(),
          location: {
            latitude: this.latestLocation.latitude,
            longitude: this.latestLocation.longitude,
            speed: this.latestLocation.speed, // GPS speed in km/h
            heading: this.latestLocation.heading,
          },
          motion: {
            accelX: this.latestMotion.accelX,
            accelY: this.latestMotion.accelY,
            accelZ: this.latestMotion.accelZ,
            gForce: this.latestMotion.gForce,
            gyroX: this.latestMotion.gyroX,
            gyroY: this.latestMotion.gyroY,
            gyroZ: this.latestMotion.gyroZ,
          },
          vehicleData: {
            speed: this.latestVehicle.speed, // OBD vehicle speed in km/h (separate from GPS speed)
            rpm: this.latestVehicle.rpm,
            engineLoad: this.latestVehicle.engineLoad,
            throttle: this.latestVehicle.throttle,
            coolantTemp: this.latestVehicle.coolantTemp,
            batteryVoltage: this.latestVehicle.batteryVoltage,
            diagnosticFaults: this.latestVehicle.diagnosticFaults,
          },
          ...(this.latestDeviceContext
            ? {
                deviceContext: {
                  batteryLevel: this.latestDeviceContext.batteryLevel,
                  isCharging: this.latestDeviceContext.isCharging,
                  networkState: this.latestDeviceContext.networkState,
                },
              }
            : {}),
          ...(this.latestDriverState
            ? {
                driverState: {
                  perclos: this.latestDriverState.perclos,
                  gazeDirection: this.latestDriverState.gazeDirection,
                  headPose: this.latestDriverState.headPose,
                  attentionState: this.latestDriverState.attentionState,
                  blinkRate: this.latestDriverState.blinkRate,
                  yawnDetected: this.latestDriverState.yawnDetected,
                },
              }
            : {}),
        };

        onData(unifiedData);
      }
    }, validInterval);
  }

  /**
   * Stops all 5 telemetry collectors/simulators, clears emission timer,
   * and resets cached telemetry readings.
   */
  stop(): void {
    this.isAggregating = false;

    if (this.emissionTimer !== null) {
      clearInterval(this.emissionTimer);
      this.emissionTimer = null;
    }

    this.motionCollector.stop();
    this.locationCollector.stop();
    this.deviceContextCollector.stop();
    this.vehicleSimulator.stop();
    this.driverStateSimulator.stop();

    this.latestMotion = null;
    this.latestLocation = null;
    this.latestVehicle = null;
    this.latestDeviceContext = null;
    this.latestDriverState = null;
  }

  /**
   * Returns whether aggregation is currently active.
   */
  getIsAggregating(): boolean {
    return this.isAggregating;
  }
}
