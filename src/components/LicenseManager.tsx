import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FlaskConical, Shield, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import {
  getLicense,
  checkTrialExpiration,
  activateTrial,
  activatePro,
  changePlan,
  registerDevice,
  getPlanLimit,
  type PlanType,
} from '@/lib/license';

interface LicenseManagerProps {
  deviceId: string;
  onLicenseUpdate: () => void;
}

export default function LicenseManager({ deviceId, onLicenseUpdate }: LicenseManagerProps) {
  const [license, setLicense] = useState(checkTrialExpiration());

  const handleActivateTrial = () => {
    if (activateTrial()) {
      toast.success('7-day trial activated! Enjoy PRO features.');
      refreshLicense();
    } else {
      toast.error('Trial already active');
    }
  };

  const handleActivatePro = () => {
    activatePro();
    toast.success('PRO activated! (Simulated)');
    refreshLicense();
  };

  const handleRegisterDevice = () => {
    const result = registerDevice(deviceId);
    if (result.success) {
      toast.success(result.message);
      refreshLicense();
    } else {
      toast.error(result.message);
    }
  };

  const handleChangePlan = (plan: PlanType) => {
    changePlan(plan);
    toast.success(`Plan changed to ${plan}`);
    refreshLicense();
  };

  const refreshLicense = () => {
    setLicense(checkTrialExpiration());
    onLicenseUpdate();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const updated = checkTrialExpiration();
      if (updated.mode !== license.mode) {
        setLicense(updated);
        onLicenseUpdate();
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [license.mode, onLicenseUpdate]);

  const getDaysRemaining = () => {
    if (license.mode !== 'trial' || !license.trialExpira) return null;
    return Math.ceil((license.trialExpira - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const isDeviceRegistered = license.registeredDevices.includes(deviceId);
  const planLimit = getPlanLimit(license.plan);

  return (
    <Card className="shadow-elevation">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          License & Account
        </CardTitle>
        <CardDescription>Manage your subscription and device registration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <p className="text-sm font-medium">Current Plan</p>
            <p className="text-xs text-muted-foreground capitalize">{license.plan}</p>
          </div>
          <Badge variant={license.mode === 'pro' ? 'default' : license.mode === 'trial' ? 'secondary' : 'outline'}>
            {license.mode === 'trial' && getDaysRemaining() && `Trial: ${getDaysRemaining()}d left`}
            {license.mode === 'pro' && 'PRO'}
            {license.mode === 'free' && 'FREE'}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>Device ID: <code className="bg-muted px-1 py-0.5 rounded">{deviceId}</code></p>
          <p>Registered Devices: {license.registeredDevices.length} / {planLimit}</p>
          <p>Status: {isDeviceRegistered ? '✓ Registered' : '✗ Not registered'}</p>
        </div>

        <div className="grid gap-2">
          {license.mode !== 'trial' && (
            <Button onClick={handleActivateTrial} variant="outline" className="w-full">
              <FlaskConical className="w-4 h-4 mr-2" />
              Activate 7-Day Trial
            </Button>
          )}
          
          {license.mode !== 'pro' && (
            <Button onClick={handleActivatePro} className="w-full bg-gradient-primary">
              <Sparkles className="w-4 h-4 mr-2" />
              Activate PRO (Demo)
            </Button>
          )}

          {!isDeviceRegistered && (
            <Button onClick={handleRegisterDevice} variant="secondary" className="w-full">
              <Smartphone className="w-4 h-4 mr-2" />
              Register This Device
            </Button>
          )}
        </div>

        <div className="pt-4 border-t space-y-2">
          <label className="text-sm font-medium">Test Plan Limits (Local)</label>
          <Select value={license.plan} onValueChange={handleChangePlan}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">Personal (1 device)</SelectItem>
              <SelectItem value="professional">Professional (3 devices)</SelectItem>
              <SelectItem value="enterprise">Enterprise (10 devices)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Local simulation only. Real plans require server validation.</p>
        </div>
      </CardContent>
    </Card>
  );
}
