import type * as BatteryTypes from 'expo-battery';
import type * as NetworkTypes from 'expo-network';
import {
  DeviceContextAvailability,
  DeviceContextCollectorOptions,
  DeviceContextTelemetryData,
  NetworkType,
} from '../models/deviceContext.types';

export type BatterySubscription = { remove(): void };

let _batteryModule: typeof import('expo-battery') | null = null;
let _batteryModuleLoaded = false;

function getBatteryModule(): typeof import('expo-battery') | null {
  if (!_batteryModuleLoaded) {
    _batteryModuleLoaded = true;
    try {
      _batteryModule = require('expo-battery');
    } catch {
      _batteryModule = null;
    }
  }
  return _batteryModule;
}

let _networkModule: typeof import('expo-network') | null = null;
let _networkModuleLoaded = false;

function getNetworkModule(): typeof import('expo-network') | null {
  if (!_networkModuleLoaded) {
    _networkModuleLoaded = true;
    try {
      _networkModule = require('expo-network');
    } catch {
      _networkModule = null;
    }
  }
  return _networkModule;
}

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
export function normalizeChargingState(state: number | BatteryTypes.BatteryState | null | undefined): boolean {
  if (typeof state !== 'number') return false;
  const Battery = getBatteryModule();
  if (Battery?.BatteryState) {
    return (
      state === Battery.BatteryState.CHARGING ||
      state === Battery.BatteryState.FULL
    );
  }
  return state === 2 || state === 3;
}

/**
 * Maps NetworkState from expo-network to normalized NetworkType ('WIFI' | 'CELLULAR' | 'NONE' | 'UNKNOWN').
 *
 * @param networkState - NetworkState object from expo-network
 * @returns Normalized NetworkType
 */
export function normalizeNetworkState(
  networkState: NetworkTypes.NetworkState | null | undefined
): NetworkType {
  if (!networkState) return 'UNKNOWN';

  const Network = getNetworkModule();
  const NONE_TYPE = Network?.NetworkStateType?.NONE || 'NONE';
  const WIFI_TYPE = Network?.NetworkStateType?.WIFI || 'WIFI';
  const CELLULAR_TYPE = Network?.NetworkStateType?.CELLULAR || 'CELLULAR';

  if (!networkState.isConnected || networkState.type === NONE_TYPE) {
    return 'NONE';
  }

  if (networkState.type === WIFI_TYPE) {
    return 'WIFI';
  }

  if (networkState.type === CELLULAR_TYPE) {
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
      const Battery = getBatteryModule();
      if (Battery && typeof Battery.isAvailableAsync === 'function') {
        battery = await Battery.isAvailableAsync().catch(() => false);
      }
    } catch {
      battery = false;
    }

    try {
      const Network = getNetworkModule();
      if (Network && typeof Network.getNetworkStateAsync === 'function') {
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
    let batteryState: number | BatteryTypes.BatteryState | null = 0;
    let rawNetwork: NetworkTypes.NetworkState | null = null;

    try {
      const Battery = getBatteryModule();
      const isBatteryAvailable = Battery && typeof Battery.isAvailableAsync === 'function'
        ? await Battery.isAvailableAsync().catch(() => false)
        : false;

      if (isBatteryAvailable && Battery) {
        const [level, state] = await Promise.all([
          Battery.getBatteryLevelAsync().catch(() => -1),
          Battery.getBatteryStateAsync().catch(() => 0),
        ]);
        rawLevel = level;
        batteryState = state;
      }
    } catch {
      rawLevel = -1;
      batteryState = 0;
    }

    try {
      const Network = getNetworkModule();
      if (Network && typeof Network.getNetworkStateAsync === 'function') {
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
      const Battery = getBatteryModule();
      const isBatteryAvailable = Battery && typeof Battery.isAvailableAsync === 'function'
        ? await Battery.isAvailableAsync().catch(() => false)
        : false;

      if (isBatteryAvailable && Battery && typeof Battery.addBatteryLevelListener === 'function') {
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
        const Network = getNetworkModule();
        if (Network && typeof Network.getNetworkStateAsync === 'function') {
          const rawNetwork = await Network.getNetworkStateAsync();
          const updatedNetwork = normalizeNetworkState(rawNetwork);
          if (updatedNetwork !== this.latestNetworkState) {
            this.latestNetworkState = updatedNetwork;
            emitNormalizedData();
          }
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
