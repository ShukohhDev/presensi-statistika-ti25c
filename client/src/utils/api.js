export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

async function request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = { ...options.headers };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401 || response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401 && endpoint !== '/api/auth/login') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        throw new Error(errorData.error || 'Akses ditolak');
    }

    // Handle file downloads
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('spreadsheet') || contentType.includes('csv'))) {
        return response;
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Terjadi kesalahan');
    }

    return data;
}

export const api = {
    // Auth
    login: (name, password) =>
        request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ name, password }),
        }),
    logout: () =>
        request('/api/auth/logout', { method: 'POST' }),
    getMe: () =>
        request('/api/auth/me'),

    // Attendance
    getActiveSession: () =>
        request('/api/attendance/active-session'),
    submitAttendance: (formData) =>
        request('/api/attendance/submit', {
            method: 'POST',
            body: formData,
        }),
    getAttendanceHistory: () =>
        request('/api/attendance/history'),
    getAttendanceSummary: () =>
        request('/api/attendance/summary'),
    getAttendanceRecap: () =>
        request('/api/attendance/recap'),
    getCourseInfo: () =>
        request('/api/attendance/course-info'),
    updateAttendanceStatus: (user_id, session_id, status) =>
        request('/api/attendance/update-status', {
            method: 'PUT',
            body: JSON.stringify({ user_id, session_id, status }),
        }),

    // Admin
    openSession: (meeting_number, title, duration_minutes) =>
        request('/api/admin/session/open', {
            method: 'POST',
            body: JSON.stringify({ meeting_number, title, duration_minutes }),
        }),
    closeSession: (session_id) =>
        request('/api/admin/session/close', {
            method: 'POST',
            body: JSON.stringify({ session_id }),
        }),
    getSessions: () =>
        request('/api/admin/sessions'),
    getStudents: () =>
        request('/api/admin/students'),
    getDashboardStats: () =>
        request('/api/admin/dashboard-stats'),
    getSessionAttendances: (sessionId) =>
        request(`/api/admin/session/${sessionId}/attendances`),
    getSessionWASummary: (sessionId) =>
        request(`/api/admin/session/${sessionId}/wa-summary`),
    updateCourseInfo: (data) =>
        request('/api/admin/course-info', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    exportExcel: async () => {
        const response = await request('/api/admin/export/excel');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rekap_kehadiran_statistika_TI25C.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    },
    exportCSV: async () => {
        const response = await request('/api/admin/export/csv');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rekap_kehadiran_statistika_TI25C.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    },

    // Tasks & Assignments
    getAssignments: () =>
        request('/api/tasks/assignments'),
    createAssignment: (data) =>
        request('/api/tasks/assignments/create', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    deleteAssignment: (id) =>
        request(`/api/tasks/assignments/${id}`, { method: 'DELETE' }),
    getAssignmentStatus: (id) =>
        request(`/api/tasks/assignments/${id}/status`),
    uploadTask: (formData) =>
        request('/api/tasks/upload', {
            method: 'POST',
            body: formData,
        }),
    getTaskHistory: () =>
        request('/api/tasks/history'),
    getAllTasks: () =>
        request('/api/tasks/all'),
    testDriveConnection: () =>
        request('/api/tasks/test-drive'),

    // Reports
    createReport: (category, title, description) =>
        request('/api/reports/create', {
            method: 'POST',
            body: JSON.stringify({ category, title, description }),
        }),
    getMyReports: () =>
        request('/api/reports/my'),
    getAllReports: () =>
        request('/api/reports/all'),
    updateReportStatus: (report_id, status, admin_response) =>
        request('/api/reports/update-status', {
            method: 'PUT',
            body: JSON.stringify({ report_id, status, admin_response }),
        }),

    // Notifications
    getNotifications: () =>
        request('/api/notifications'),
    markNotificationRead: (id) =>
        request(`/api/notifications/read/${id}`, { method: 'PUT' }),
    markAllNotificationsRead: () =>
        request('/api/notifications/read-all', { method: 'PUT' }),
    sendNotification: (user_id, title, message, type) =>
        request('/api/notifications/send', {
            method: 'POST',
            body: JSON.stringify({ user_id, title, message, type }),
        }),

    // Users
    uploadProfilePhoto: (formData) =>
        request('/api/users/profile-photo', {
            method: 'PUT',
            body: formData,
        }),
    updateSettings: (settings) =>
        request('/api/users/settings', {
            method: 'PUT',
            body: JSON.stringify(settings),
        }),
    getActivity: () =>
        request('/api/users/activity'),
    getLoginHistory: () =>
        request('/api/users/login-history'),

    // Calendar
    getCalendarEvents: (month, year) =>
        request(`/api/calendar?month=${month}&year=${year}`),
    createCalendarEvent: (eventData) =>
        request('/api/calendar/create', {
            method: 'POST',
            body: JSON.stringify(eventData),
        }),
    deleteCalendarEvent: (id) =>
        request(`/api/calendar/${id}`, { method: 'DELETE' }),

    // Announcements
    getAnnouncements: () =>
        request('/api/announcements'),
    createAnnouncement: (title, content) =>
        request('/api/announcements/create', {
            method: 'POST',
            body: JSON.stringify({ title, content }),
        }),
    deleteAnnouncement: (id) =>
        request(`/api/announcements/${id}`, { method: 'DELETE' }),

    // Materials (Bank Materi & Modul Perkuliahan)
    getMaterials: () =>
        request('/api/materials'),
    createMaterial: (formData) =>
        request('/api/materials/create', {
            method: 'POST',
            body: formData,
        }),
    deleteMaterial: (id) =>
        request(`/api/materials/${id}`, { method: 'DELETE' }),
};
