import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export function AutoLogout() {
    const { user, settings, logout } = useAuth();
    const { addToast } = useToast();
    const timerRef = useRef(null);

    // Timeout duration in milliseconds (default 30 mins, min 5 mins)
    const timeoutMinutes = settings?.auto_logout_minutes || 30;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    useEffect(() => {
        if (!user) return;

        const handleActivity = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(() => {
                addToast('Sesi Anda telah berakhir karena tidak ada aktivitas selama ' + timeoutMinutes + ' menit.', 'info');
                logout();
            }, timeoutMs);
        };

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach((event) => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Initialize first timer
        handleActivity();

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [user, timeoutMs, timeoutMinutes, logout, addToast]);

    return null;
}
