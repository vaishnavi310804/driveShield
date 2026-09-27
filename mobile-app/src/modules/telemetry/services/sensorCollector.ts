import { Accelerometer, Gyroscope } from 'expo-sensors';
import {
  MotionTelemetryData,
  SensorAvailability,
  SensorCollectorOptions,
} from '../models/sensor.types';

export type SensorSubscription = ReturnType<typeof Accelerometer.addListener>;

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
  private isCollecting: boolean = false;

  private latestAccel = { x: 0, y: 0, z: 0 };
  private latestGyro = { x: 0, y: 0, z: 0 };

  /**
   * Checks if accelerometer and gyroscope hardware are available on the current device.
   */
  async checkAvailability(): Promise<SensorAvailability> {
    const [accelerometer, gyroscope] = await Promise.all([
      Accelerometer.isAvailableAsync().catch(() => false),
      Gyroscope.isAvailableAsync().catch(() => false),
    ]);

    return { accelerometer, gyroscope };
  }

  /**
   * Sets the sampling/update interval for sensor readings in milliseconds.
   *
   * @param intervalMs - Desired update interval (e.g. 200ms for 5 Hz)
   */
  setUpdateInterval(intervalMs: number): void {
    const validInterval = Math.max(10, intervalMs);
    Accelerometer.setUpdateInterval(validInterval);
    Gyroscope.setUpdateInterval(validInterval);
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
    this.setUpdateInterval(updateIntervalMs);

    const availability = await this.checkAvailability();

    if (!availability.accelerometer && !availability.gyroscope) {
      throw new Error(
        'Motion sensors (Accelerometer & Gyroscope) are unavailable on this device.'
      );
    }

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
      this.accelSubscription = Accelerometer.addListener((data) => {
        this.latestAccel = data;
        emitNormalizedData();
      });
    }

    if (availability.gyroscope) {
      this.gyroSubscription = Gyroscope.addListener((data) => {
        this.latestGyro = data;
        emitNormalizedData();
      });
    }
  }

  /**
   * Unsubscribes from active sensor listeners and stops data collection.
   * Ensures no subscriptions continue running after unmount or lifecycle end.
   */
  stop(): void {
    this.isCollecting = false;

    if (this.accelSubscription) {
      this.accelSubscription.remove();
      this.accelSubscription = null;
    }

    if (this.gyroSubscription) {
      this.gyroSubscription.remove();
      this.gyroSubscription = null;
    }
  }

  /**
   * Returns whether sensor collection is currently active.
   */
  getIsCollecting(): boolean {
    return this.isCollecting;
  }
}
