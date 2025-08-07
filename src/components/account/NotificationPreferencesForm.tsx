import React, { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface NotificationPreferences {
    email_enabled: boolean;
    sms_enabled: boolean;
}

interface NotificationPreferencesFormProps {
    preferences: NotificationPreferences;
    isSaving: boolean;
    savePreferences: (prefs: NotificationPreferences) => void;
}

const NotificationPreferencesForm: React.FC<NotificationPreferencesFormProps> = ({ preferences, isSaving, savePreferences }) => {
    const [localPreferences, setLocalPreferences] = useState(preferences);

    useEffect(() => {
        setLocalPreferences(preferences);
    }, [preferences]);

    return (
        <>
            <div className="space-y-4">
                <div >
                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="email-notifications"
                            checked={localPreferences.email_enabled}
                            onCheckedChange={(checked) => setLocalPreferences(prev => ({
                                ...prev,
                                email_enabled: checked as boolean
                            }))}
                        />
                        <div className="space-y-1">
                            <Label
                                htmlFor="email-notifications"
                                className="text-sm font-medium"
                            >
                                Email Notifications
                            </Label>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground pl-[30px]">
                        Receive email reminders for upcoming contributions and payouts
                    </p>
                </div>

                <div >
                    <div className="flex items-center space-x-3">
                    <Checkbox
                        id="sms-notifications"
                        checked={localPreferences.sms_enabled}
                        onCheckedChange={(checked) => setLocalPreferences(prev => ({
                            ...prev,
                            sms_enabled: checked as boolean
                        }))}
                    />
                    <div className="space-y-1">
                        <Label
                            htmlFor="sms-notifications"
                            className="text-sm font-medium"
                        >
                            SMS Notifications
                        </Label>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground pl-[30px]">
                        Receive SMS reminders for upcoming contributions and payouts
                    </p>
                </div>
            </div>
            <Button
                onClick={() => savePreferences(localPreferences)}
                disabled={isSaving}
            >
                {isSaving ? "Saving..." : "Save Preferences"}
            </Button>
        </>
    );
};

export default NotificationPreferencesForm; 