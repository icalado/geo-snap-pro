export type LicenseMode = 'free' | 'trial' | 'pro';
export type PlanType = 'personal' | 'professional' | 'enterprise';

export interface License {
  mode: LicenseMode;
  trialExpira: number | null;
  plan: PlanType;
  registeredDevices: string[];
}

const PLAN_LIMITS: Record<PlanType, number> = {
  personal: 1,
  professional: 3,
  enterprise: 10,
};

const DEFAULT_LICENSE: License = {
  mode: 'free',
  trialExpira: null,
  plan: 'personal',
  registeredDevices: [],
};

export function generateDeviceId(): string {
  const stored = localStorage.getItem('device_uuid');
  if (stored) return `dev-${stored}`;
  
  const uuid = Array.from({ length: 6 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  localStorage.setItem('device_uuid', uuid);
  return `dev-${uuid}`;
}

export function getLicense(): License {
  const stored = localStorage.getItem('licencaApp');
  if (!stored) return DEFAULT_LICENSE;
  return JSON.parse(stored);
}

export function saveLicense(license: License): void {
  localStorage.setItem('licencaApp', JSON.stringify(license));
}

export function checkTrialExpiration(): License {
  const license = getLicense();
  if (license.mode === 'trial' && license.trialExpira && Date.now() > license.trialExpira) {
    license.mode = 'free';
    license.trialExpira = null;
    saveLicense(license);
  }
  return license;
}

export function activateTrial(): boolean {
  const license = getLicense();
  if (license.mode === 'trial') return false;
  
  license.mode = 'trial';
  license.trialExpira = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  saveLicense(license);
  return true;
}

export function activatePro(): void {
  const license = getLicense();
  license.mode = 'pro';
  license.trialExpira = null;
  saveLicense(license);
}

export function changePlan(plan: PlanType): void {
  const license = getLicense();
  license.plan = plan;
  saveLicense(license);
}

export function registerDevice(deviceId: string): { success: boolean; message: string } {
  const license = getLicense();
  const maxDevices = PLAN_LIMITS[license.plan];
  
  if (license.registeredDevices.includes(deviceId)) {
    return { success: false, message: 'Device already registered' };
  }
  
  if (license.registeredDevices.length >= maxDevices) {
    return { success: false, message: 'Device limit reached. Please upgrade your plan.' };
  }
  
  license.registeredDevices.push(deviceId);
  saveLicense(license);
  return { success: true, message: 'Device registered successfully' };
}

export function isDeviceAuthorized(deviceId: string): boolean {
  const license = getLicense();
  
  if (license.mode === 'pro' || license.mode === 'trial') {
    return license.registeredDevices.includes(deviceId) || 
           license.registeredDevices.length < PLAN_LIMITS[license.plan];
  }
  
  return license.registeredDevices.includes(deviceId);
}

export function isProFeatureAvailable(deviceId: string): boolean {
  const license = getLicense();
  const isPro = license.mode === 'pro' || license.mode === 'trial';
  return isPro && isDeviceAuthorized(deviceId);
}

export function getPlanLimit(plan: PlanType): number {
  return PLAN_LIMITS[plan];
}
