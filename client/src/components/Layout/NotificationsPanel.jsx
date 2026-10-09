import { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';
import { XIcon, CheckIcon, BellIcon } from '../Common/Icons';

export function NotificationsPanel({ isOpen, onClose, onUnreadCountChange }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getNotifications();
            setNotifications(data.notifications || []);
            if (onUnreadCountChange) {
                onUnreadCountChange(data.unreadCount || 0);
            }
        } catch {
            // Silently fail if not logged in or network error
        } finally {
            setLoading(false);
        }
    }, [onUnreadCountChange]);

    useEffect(() => {
        if (isOpen) {
            loadNotifications();
        }
    }, [isOpen, loadNotifications]);

    // Polling notifications periodically every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            loadNotifications();
        }, 30000);
        return () => clearInterval(interval);
    }, [loadNotifications]);

    const handleMarkAsRead = async (id) => {
        try {
            await api.markNotificationRead(id);
            setNotifications(prev =>
                prev.map(n => (n.id === id ? { ...n, is_read: 1 } : n))
            );
            if (onUnreadCountChange) {
                const newUnread = notifications.filter(n => n.id !== id && !n.is_read).length;
                onUnreadCountChange(newUnread);
            }
        } catch (err) {
            console.error('Gagal menandai notifikasi dibaca', err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
            if (onUnreadCountChange) {
                onUnreadCountChange(0);
            }
        } catch (err) {
            console.error('Gagal menandai semua dibaca', err);
        }
    };

    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    return (
        <aside
            className={`notification-panel ${isOpen ? 'open' : ''}`}
            aria-label="Panel Notifikasi"
        >
            <div className="card-header" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BellIcon size={20} />
                    <h3 className="card-title" style={{ margin: 0 }}>Notifikasi</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {notifications.some(n => !n.is_read) && (
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={handleMarkAllRead}
                            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                            <CheckIcon size={14} /> Tandai Dibaca
                        </button>
                    )}
                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                        aria-label="Tutup panel notifikasi"
                    >
                        <XIcon size={18} />
                    </button>
                </div>
            </div>

            {loading && notifications.length === 0 ? (
                <div className="text-center text-muted" style={{ padding: '32px 0' }}>
                    Memuat notifikasi...
                </div>
            ) : notifications.length === 0 ? (
                <div className="empty-state" style={{ padding: '48px 16px' }}>
                    <BellIcon size={40} />
                    <h3>Tidak ada notifikasi</h3>
                    <p>Notifikasi pengumuman dan jadwal akan tampil di sini.</p>
                </div>
            ) : (
                <div className="notification-list">
                    {notifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                            onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                        >
                            <div className="notif-title">{notif.title}</div>
                            <div className="notif-message">{notif.message}</div>
                            <div className="notif-time">{formatDate(notif.created_at)}</div>
                        </div>
                    ))}
                </div>
            )}
        </aside>
    );
}
