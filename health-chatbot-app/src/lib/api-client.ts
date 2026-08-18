export function getApiBaseUrl(): string {
    if (typeof window !== 'undefined') {
        const envUrl = process.env.NEXT_PUBLIC_API_URL;
        if (envUrl && envUrl.trim() !== '' && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
            return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
        }
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        return `${protocol}//${hostname}:8001/api`;
    }
    const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
    return envApiUrl 
        ? (envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl}/api`) 
        : 'http://localhost:8001/api';
}

export const API_BASE_URL = typeof window !== 'undefined'
    ? getApiBaseUrl()
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api');

export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...extraHeaders };
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }
    return headers;
}

interface RequestOptions extends RequestInit {
    token?: string;
}

class ApiClient {
    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { token, ...fetchOptions } = options;

        const headers = new Headers(fetchOptions.headers);

        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        // Use passed token or retrieve from localStorage
        const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
        if (authToken) {
            headers.set('Authorization', `Bearer ${authToken}`);
        }

        const baseUrl = getApiBaseUrl();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(`${baseUrl}${endpoint}`, {
                ...fetchOptions,
                headers,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            const data = await response.json();

            if (!response.ok) {
                let errorMsg = data.detail || data.error?.message || 'API request failed';
                if (typeof errorMsg === 'string' && (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.includes('generativelanguage') || errorMsg.toLowerCase().includes('resourceexhausted'))) {
                    errorMsg = 'The AI assistant is currently experiencing high demand. Please wait a few moments and try your request again.';
                }
                throw new Error(errorMsg);
            }

            return data;
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                throw new Error('API Request timed out');
            }
            let errStr = err.message || String(err);
            if (typeof errStr === 'string' && (errStr.includes('429') || errStr.toLowerCase().includes('quota') || errStr.includes('generativelanguage') || errStr.toLowerCase().includes('resourceexhausted'))) {
                errStr = 'The AI assistant is currently experiencing high demand. Please wait a few moments and try your request again.';
            }
            throw new Error(errStr);
        }
    }

    // Auth endpoints
    async login(email: string, password: string) {
        return this.request<{ success: boolean; token: string; user: any }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async signup(email: string, password: string, name: string) {
        return this.request<{ success: boolean; token: string; user: any }>('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, name })
        });
    }

    async getMe() {
        return this.request<{ success: boolean; user: any }>('/auth/me', {
            method: 'GET'
        });
    }

    async updateProfile(name: string, token?: string) {
        return this.request<{ success: boolean; message: string }>('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({ name }),
            token
        });
    }

    async updatePreferences(prefs: any, token?: string) {
        return this.request<{ success: boolean; message: string }>('/auth/preferences', {
            method: 'PUT',
            body: JSON.stringify({ prefs }),
            token
        });
    }

    async sendOtp(email: string, name: string) {
        return this.request<{ success: boolean; message: string }>('/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ email, name })
        });
    }

    async verifyOtp(email: string, otp: string) {
        return this.request<{ success: boolean; userExists: boolean; userId: string | null }>('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ email, otp })
        });
    }

    // Chat endpoints
    async sendMessage(message: string, sessionId: string, history: any[] = [], token?: string) {
        return this.request<any>('/chat/query', {
            method: 'POST',
            body: JSON.stringify({ text: message, history }),
            token
        });
    }

    async getSessions(token?: string) {
        return this.request<{ success: boolean; sessions: any[] }>('/chat/sessions', {
            method: 'GET',
            token
        });
    }

    async createSession(title: string, messages: any[], token?: string) {
        return this.request<{ success: boolean; sessionId: string }>('/chat/sessions', {
            method: 'POST',
            body: JSON.stringify({ title, messages }),
            token
        });
    }

    async getSession(sessionId: string, token?: string) {
        return this.request<{ success: boolean; session: any }>(`/chat/sessions/${sessionId}`, {
            method: 'GET',
            token
        });
    }

    async updateSession(sessionId: string, title?: string, messages?: any[], token?: string) {
        const body: any = {};
        if (title !== undefined) body.title = title;
        if (messages !== undefined) body.messages = messages;
        
        return this.request<{ success: boolean }>(`/chat/sessions/${sessionId}`, {
            method: 'PUT',
            body: JSON.stringify(body),
            token
        });
    }

    async deleteSession(sessionId: string, token?: string) {
        return this.request<{ success: boolean }>(`/chat/sessions/${sessionId}`, {
            method: 'DELETE',
            token
        });
    }

    // Report endpoints
    async analyzeReport(data: { file?: File, text?: string }, token?: string) {
        const formData = new FormData();

        if (data.file) {
            formData.append('file', data.file);
        }

        if (data.text) {
            formData.append('text', data.text);
        }

        const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
        const headers: Record<string, string> = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${getApiBaseUrl()}/reports/analyze`, {
            method: 'POST',
            headers,
            body: formData
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.detail || 'Failed to analyze report');
        }

        return responseData;
    }

    async getReports(userId: string, token?: string) {
        return this.request<{ success: boolean; reports: any[] }>(`/reports?user_id=${userId}`, {
            method: 'GET',
            token
        });
    }

    async saveReport(data: { user_id: string, title: string, analysis: string }, token?: string) {
        return this.request<{ success: boolean; report_id: string }>('/reports', {
            method: 'POST',
            body: JSON.stringify(data),
            token
        });
    }

    // Hospital endpoints
    async searchHospitals(location: { lat: number, lng: number }, query?: string, token?: string) {
        const params = new URLSearchParams({
            lat: location.lat.toString(),
            lng: location.lng.toString()
        });

        if (query) {
            params.append('query', query);
        }

        return this.request<any>(`/hospitals?${params.toString()}`, {
            method: 'GET',
            token
        });
    }

    // Notification endpoints
    async sendLoginNotification(userData: { userId: string, email: string, name: string, timestamp: string }, token?: string) {
        try {
            return await this.request('/notifications/login', {
                method: 'POST',
                body: JSON.stringify(userData),
                token
            });
        } catch (error) {
            console.error("Failed to send login notification:", error);
            return { success: false };
        }
    }

    // Outbreaks endpoints
    async getOutbreaks(params: Record<string, string>, token?: string) {
        const queryParams = new URLSearchParams(params).toString();
        return this.request<any>(`/outbreaks?${queryParams}`, {
            method: 'GET',
            token
        });
    }

    async getOutbreakDetails(canonicalId: string, token?: string) {
        return this.request<any>(`/outbreaks/details/${canonicalId}`, {
            method: 'GET',
            token
        });
    }

    async getOutbreakStats(token?: string) {
        return this.request<any>(`/outbreaks?type=stats`, {
            method: 'GET',
            token
        });
    }

    // Official Government Sources endpoints
    async getSources(token?: string) {
        return this.request<{ sources: any[]; total: number }>('/sources', {
            method: 'GET',
            token
        });
    }

    async getSourcesHealth(token?: string) {
        return this.request<{ status: string; sources_monitored: number; sources: any[] }>('/sources/health', {
            method: 'GET',
            token
        });
    }

    // Alerts endpoints
    async getAlerts(userId: string, token?: string) {
        return this.request<{ subscriptions?: any[] }>(`/alerts?userId=${userId}`, {
            method: 'GET',
            token
        });
    }

    async saveAlerts(data: any, token?: string) {
        return this.request<any>(`/alerts`, {
            method: 'POST',
            body: JSON.stringify(data),
            token
        });
    }

    async deleteAlerts(userId: string, token?: string) {
        return this.request<any>(`/alerts?userId=${userId}`, {
            method: 'DELETE',
            token
        });
    }
}

export const apiClient = new ApiClient();
