import {
  MotionTelemetryData,
  SensorAvailability,
  SensorCollectorOptions,
} from '../models/sensor.types';

export type SensorSubscription = { remove(): void };

let _accelModule: typeof import('expo-sensors/build/Accelerometer').default | null = null;
let _accelLoaded = false;

function getAccelerometerModule(): typeof import('expo-sensors/build/Accelerometer').default | null {
  if (!_accelLoaded) {
    _accelLoaded = true;
    try {
      _accelModule = require('expo-sensors/build/Accelerometer').default;
    } catch {
      _accelModule = null;
    }
  }
  return _accelModule;
}

let _gyroModule: typeof import('expo-sensors/build/Gyroscope').default | null = null;
let _gyroLoaded = false;

function getGyroscopeModule(): typeof import('expo-sensors/build/Gyroscope').default | null {
  if (!_gyroLoaded) {
    _gyroLoaded = true;
    try {
      _gyroModule = require('expo-sensors/build/Gyroscope').default;
    } catch {
      _gyroModule = null;
    }
  }
  return _gyroModule;
}

/**
 * Calculates total G-force magnitude from 3-axis accelerometer readings.
 *
 * Calculation:
 * gForce = sqrt(accelX^2 + accelY^2 + accelZ^2)
 *
 * In expo-sensors, accelerometer values (x, y, z) are normalized G units
 * (where 1.0 G ≈ 9.81 m/s²). When the device is completely stationary on a flat table,
 * gForce ≈ 1.0 G due to Earth's standard gravity.
 *
 * @param x - Acceleration along the X axis (in Gs)
 * @param y - Acceleration along the Y axis (in Gs)
 * @param z - Acceleration along the Z axis (in Gs)
 * @returns Derived G-force magnitude rounded to 4 decimal places
 */
export function calculateGForce(x: number, y: number, z: number): number {
  const magnitude = Math.sqrt(x * x + y * y + z * z);
  return Number(magnitude.toFixed(4));
}

export class MotionSensorCollector {
  private accelSubscription: SensorSubscription | null = null;
  private gyroSubscription: SensorSubscription | null = null;
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;
  private isCollecting: boolean = false;

  private latestAccel = { x: 0, y: 0, z: 0 };
  private latestGyro = { x: 0, y: 0, z: 0 };

  /**
   * Checks if accelerometer and gyroscope hardware are available on the current device.
   */
  async checkAvailability(): Promise<SensorAvailability> {
    let accelerometer = false;
    let gyroscope = false;

    try {
      const Accel = getAccelerometerModule();
      if (Accel && typeof Accel.isAvailableAsync === 'function') {
        accelerometer = await Accel.isAvailableAsync().catch(() => false);
      }
    } catch {
      accelerometer = false;
    }

    try {
      const Gyro = getGyroscopeModule();
      if (Gyro && typeof Gyro.isAvailableAsync === 'function') {
        gyroscope = await Gyro.isAvailableAsync().catch(() => false);
      }
    } catch {
      gyroscope = false;
    }

    return { accelerometer, gyroscope };
  }

  /**
   * Sets the sampling/update interval for sensor readings in milliseconds.
   *
   * @param intervalMs - Desired update interval (e.g. 200ms for 5 Hz)
   */
  setUpdateInterval(intervalMs: number): void {
    const validInterval = Math.max(10, intervalMs);
    try {
      const Accel = getAccelerometerModule();
      if (Accel && typeof Accel.setUpdateInterval === 'function') {
        Accel.setUpdateInterval(validInterval);
      }
    } catch {}

    try {
      const Gyro = getGyroscopeModule();
      if (Gyro && typeof Gyro.setUpdateInterval === 'function') {
        Gyro.setUpdateInterval(validInterval);
      }
    } catch {}
  }

  /**
   * Starts collecting motion sensor data and invokes the onData callback when updates occur.
   *
   * @param onData - Callback function receiving normalized MotionTelemetryData
   * @param options - Configuration options such as updateIntervalMs
   */
  async start(
    onData: (data: MotionTelemetryData) => void,
    options: SensorCollectorOptions = {}
  ): Promise<void> {
    if (this.isCollecting) {
      this.stop();
    }

    const { updateIntervalMs = 200 } = options;
    const validInterval = Math.max(10, updateIntervalMs);
    this.setUpdateInterval(validInterval);

    const availability = await this.checkAvailability();

    this.isCollecting = true;

    const emitNormalizedData = () => {
      if (!this.isCollecting) return;

      const accelX = Number(this.latestAccel.x.toFixed(4));
      const accelY = Number(this.latestAccel.y.toFixed(4));
      const accelZ = Number(this.latestAccel.z.toFixed(4));

      const gForce = calculateGForce(accelX, accelY, accelZ);

      const gyroX = Number(this.latestGyro.x.toFixed(4));
      const gyroY = Number(this.latestGyro.y.toFixed(4));
      const gyroZ = Number(this.latestGyro.z.toFixed(4));

      const telemetry: MotionTelemetryData = {
        accelX,
        accelY,
        accelZ,
        gForce,
        gyroX,
        gyroY,
        gyroZ,
        timestamp: new Date().toISOString(),
      };

      onData(telemetry);
    };

    if (availability.accelerometer) {
      try {
        const Accel = getAccelerometerModule();
        if (Accel && typeof Accel.addListener === 'function') {
          this.accelSubscription = Accel.addListener((data: { x: number; y: number; z: number }) => {
            this.latestAccel = data;
            emitNormalizedData();
          });
        }
      } catch {}
    }

    if (availability.gyroscope) {
      try {
        const Gyro = getGyroscopeModule();
        if (Gyro && typeof Gyro.addListener === 'function') {
          this.gyroSubscription = Gyro.addListener((data: { x: number; y: number; z: number }) => {
            this.latestGyro = data;
            emitNormalizedData();
          });
        }
      } catch {}
    }

    // Fallback periodic emissions if hardware listeners are unavailable or unlinked
    if (!this.accelSubscription && !this.gyroSubscription) {
      emitNormalizedData();
      this.fallbackTimer = setInterval(() => {
        emitNormalizedData();
      }, validInterval);
    }
  }

  /**
   * Unsubscribes from active sensor listeners and stops data collection.
   * Ensures no subscriptions continue running after unmount or lifecycle end.
   */
  stop(): void {
    this.isCollecting = false;

    if (this.accelSubscription) {
      try {
        this.accelSubscription.remove();
      } catch {}
      this.accelSubscription = null;
    }

    if (this.gyroSubscription) {
      try {
        this.gyroSubscription.remove();
      } catch {}
      this.gyroSubscription = null;
    }

    if (this.fallbackTimer !== null) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  /**
   * Returns whether sensor collection is currently active.
   */
  getIsCollecting(): boolean {
    return this.isCollecting;
  }
}
