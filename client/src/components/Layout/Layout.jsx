import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { NotificationsPanel } from './NotificationsPanel';
import { AutoLogout } from '../Common/AutoLogout';
import { api } from '../../utils/api';

export function Layout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Initial load unread notifications count
    useEffect(() => {
        api.getNotifications()
            .then((data) => setUnreadCount(data.unreadCount || 0))
            .catch(() => {});
    }, []);

    const toggleSidebar = () => {
        setIsSidebarOpen((prev) => !prev);
        if (isNotificationsOpen) setIsNotificationsOpen(false);
    };

    const toggleNotifications = () => {
        setIsNotificationsOpen((prev) => !prev);
        if (isSidebarOpen) setIsSidebarOpen(false);
    };

    return (
        <div className="app-layout">
            <AutoLogout />

            <Navbar
                onToggleSidebar={toggleSidebar}
                isSidebarOpen={isSidebarOpen}
                onToggleNotifications={toggleNotifications}
                unreadCount={unreadCount}
            />

            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <NotificationsPanel
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                onUnreadCountChange={setUnreadCount}
            />

            <main className="main-content content-wrapper">
                <Outlet />
            </main>
        </div>
    );
}
