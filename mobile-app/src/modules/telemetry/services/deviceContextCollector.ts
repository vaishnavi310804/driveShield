import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import {
  DeviceContextAvailability,
  DeviceContextCollectorOptions,
  DeviceContextTelemetryData,
  NetworkType,
} from '../models/deviceContext.types';

export type BatterySubscription = ReturnType<
  typeof Battery.addBatteryLevelListener
>;

/**
 * Normalizes battery level from fractional (0.0 - 1.0) to integer percentage (0 - 100).
 * Returns -1 if battery information is unreadable or unavailable on hardware.
 *
 * @param rawLevel - Raw float returned by expo-battery (0.0 to 1.0)
 * @returns Battery level percentage (0 to 100) or -1 if unavailable
 */
export function normalizeBatteryLevel(rawLevel: number | null | undefined): number {
  if (typeof rawLevel !== 'number' || rawLevel < 0 || isNaN(rawLevel)) {
    return -1;
  }
  // Convert 0.0 - 1.0 float to 0 - 100 integer percentage
  if (rawLevel <= 1.0) {
    return Math.min(100, Math.max(0, Math.round(rawLevel * 100)));
  }
  return Math.min(100, Math.max(0, Math.round(rawLevel)));
}

/**
 * Maps BatteryState enum to a boolean isCharging flag.
 *
 * @param state - BatteryState from expo-battery
 * @returns true if state is CHARGING or FULL
 */
export function normalizeChargingState(state: Battery.BatteryState | null | undefined): boolean {
  if (!state) return false;
  return (
    state === Battery.BatteryState.CHARGING ||
    state === Battery.BatteryState.FULL
  );
}

/**
 * Maps NetworkState from expo-network to normalized NetworkType ('WIFI' | 'CELLULAR' | 'NONE' | 'UNKNOWN').
 *
 * @param networkState - NetworkState object from expo-network
 * @returns Normalized NetworkType
 */
export function normalizeNetworkState(
  networkState: Network.NetworkState | null | undefined
): NetworkType {
  if (!networkState) return 'UNKNOWN';

  if (!networkState.isConnected || networkState.type === Network.NetworkStateType.NONE) {
    return 'NONE';
  }

  if (networkState.type === Network.NetworkStateType.WIFI) {
    return 'WIFI';
  }

  if (networkState.type === Network.NetworkStateType.CELLULAR) {
    return 'CELLULAR';
  }

  return 'UNKNOWN';
}

export class DeviceContextCollector {
  private batteryLevelSub: BatterySubscription | null = null;
  private batteryStateSub: BatterySubscription | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private isCollecting: boolean = false;

  private latestBatteryLevel: number = -1;
  private latestIsCharging: boolean = false;
  private latestNetworkState: NetworkType = 'UNKNOWN';

  /**
   * Checks if battery and network features are supported on this device.
   */
  async checkAvailability(): Promise<DeviceContextAvailability> {
    let battery = false;
    let network = false;

    try {
      if (typeof Battery.isAvailableAsync === "function") {
        battery = await Battery.isAvailableAsync().catch(() => false);
      }
    } catch {
      battery = false;
    }

    try {
      if (typeof Network.getNetworkStateAsync === "function") {
        await Network.getNetworkStateAsync();
        network = true;
      }
    } catch {
      network = false;
    }

    return { battery, network };
  }

  /**
   * Fetches an immediate snapshot of current device battery and network state.
   */
  async fetchCurrentContext(): Promise<DeviceContextTelemetryData> {
    let rawLevel: number | null = -1;
    let batteryState: Battery.BatteryState | null = Battery.BatteryState.UNKNOWN;
    let rawNetwork: Network.NetworkState | null = null;

    try {
      const isBatteryAvailable = typeof Battery.isAvailableAsync === "function"
        ? await Battery.isAvailableAsync().catch(() => false)
        : false;

      if (isBatteryAvailable) {
        const [level, state] = await Promise.all([
          Battery.getBatteryLevelAsync().catch(() => -1),
          Battery.getBatteryStateAsync().catch(() => Battery.BatteryState.UNKNOWN),
        ]);
        rawLevel = level;
        batteryState = state;
      }
    } catch {
      rawLevel = -1;
      batteryState = Battery.BatteryState.UNKNOWN;
    }

    try {
      if (typeof Network.getNetworkStateAsync === "function") {
        rawNetwork = await Network.getNetworkStateAsync().catch(() => null);
      }
    } catch {
      rawNetwork = null;
    }

    this.latestBatteryLevel = normalizeBatteryLevel(rawLevel);
    this.latestIsCharging = normalizeChargingState(batteryState);
    this.latestNetworkState = normalizeNetworkState(rawNetwork);

    return {
      batteryLevel: this.latestBatteryLevel,
      isCharging: this.latestIsCharging,
      networkState: this.latestNetworkState,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Starts event listeners and low-frequency polling for device context changes.
   *
   * @param onData - Callback function receiving normalized DeviceContextTelemetryData
   * @param options - Configuration options such as refreshIntervalMs
   */
  async start(
    onData: (data: DeviceContextTelemetryData) => void,
    options: DeviceContextCollectorOptions = {}
  ): Promise<void> {
    if (this.isCollecting) {
      this.stop();
    }

    const { refreshIntervalMs = 10000 } = options;
    this.isCollecting = true;

    // Fetch initial snapshot
    const initialData = await this.fetchCurrentContext();
    if (this.isCollecting) {
      onData(initialData);
    }

    const emitNormalizedData = () => {
      if (!this.isCollecting) return;
      onData({
        batteryLevel: this.latestBatteryLevel,
        isCharging: this.latestIsCharging,
        networkState: this.latestNetworkState,
        timestamp: new Date().toISOString(),
      });
    };

    // Event listeners for battery changes (event-driven, guarded by availability)
    try {
      const isBatteryAvailable = typeof Battery.isAvailableAsync === "function"
        ? await Battery.isAvailableAsync().catch(() => false)
        : false;

      if (isBatteryAvailable && typeof Battery.addBatteryLevelListener === "function") {
        this.batteryLevelSub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
          this.latestBatteryLevel = normalizeBatteryLevel(batteryLevel);
          emitNormalizedData();
        });

        this.batteryStateSub = Battery.addBatteryStateListener(({ batteryState }) => {
          this.latestIsCharging = normalizeChargingState(batteryState);
          emitNormalizedData();
        });
      }
    } catch {
      // Event listeners unsupported on simulator or device
    }

    // Low frequency timer for network state updates
    const validInterval = Math.max(2000, refreshIntervalMs);
    this.refreshTimer = setInterval(async () => {
      if (!this.isCollecting) return;
      try {
        const rawNetwork = await Network.getNetworkStateAsync();
        const updatedNetwork = normalizeNetworkState(rawNetwork);
        if (updatedNetwork !== this.latestNetworkState) {
          this.latestNetworkState = updatedNetwork;
          emitNormalizedData();
        }
      } catch {
        // Network state fetch error
      }
    }, validInterval);
  }

  /**
   * Unsubscribes from battery event listeners and stops refresh timer.
   */
  stop(): void {
    this.isCollecting = false;

    if (this.batteryLevelSub) {
      this.batteryLevelSub.remove();
      this.batteryLevelSub = null;
    }

    if (this.batteryStateSub) {
      this.batteryStateSub.remove();
      this.batteryStateSub = null;
    }

    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Returns whether device context collection is active.
   */
  getIsCollecting(): boolean {
    return this.isCollecting;
  }
}
