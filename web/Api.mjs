import axios from "axios";

const api_url = "/api";

export class Api {
    static async addSite(url) {
        const res = await axios.get(`${api_url}/addSite?url=${url}`, {}, {
            withCredentials: true
        });
        if (res.status !== 200 && res.status !== 304) {
            throw new Error(`Failed to get links for ${url}`);
        }
        return await res.data;
    }

    static async getLinks() {
        const res = await axios.get(`${api_url}/getLinks`);
        if (res.status !== 200 && res.status !== 304) {
            throw new Error(`Failed to get links: ${res.status}`);
        }
        return await res.data;
    }

    static async getClusters() {
        const res = await axios.get(`${api_url}/getClusters`);
        if (res.status !== 200 && res.status !== 304) {
            throw new Error(`Failed to get clusters: ${res.status}`);
        }
        return await res.data;
    }

    static async search(query) {
        const res = await axios.get(`${api_url}/search?query=${query}`);
        if (res.status !== 200 && res.status !== 304) {
            throw new Error(`Failed to search: ${res.status}`);
        }
        return await res.data;
    }

    static async getStatistics() {
        const res = await axios.get(`${api_url}/getStatistics`);
        if (res.status !== 200) {
            throw new Error(`Failed to get statistics: ${res.status}`);
        }
        return await res.data;
    }

    static async getContentStatus() {
        const res = await axios.get(`${api_url}/getContentStatus`);
        if (res.status !== 200) {
            throw new Error(`Failed to get content status: ${res.status}`);
        }
        return await res.data;
    }

    static async authorize(username, password) {
        const res = await axios.post(`${api_url}/authorize`, {
            username,
            password
        });
        if (res.status !== 200) {
            throw new Error(`Failed to authorize: ${res.status}`);
        }
        return await res.data;
    }

    static async isAuthorized() {
        const res = await axios.get(`${api_url}/isAuthorized`, {
            withCredentials: true
        });
        if (res.status !== 200) {
            throw new Error(`Failed to check authorization: ${res.status}`);
        }
        return await res.data;
    }

    static async logout() {
        const res = await axios.post(`${api_url}/logout`, {}, {
            withCredentials: true
        });
        if (res.status !== 200) {
            throw new Error(`Failed to logout: ${res.status}`);
        }
        return await res.data;
    }

    static async getSuggestions(query) {
        const res = await axios.get(`${api_url}/getSuggestions?query=${query}`);
        if (res.status !== 200) {
            throw new Error(`Failed to get suggestions: ${res.status}`);
        }
        return await res.data;
    }

    static async startWork() {
        const res = await axios.get(`${api_url}/startWork`, {
            withCredentials: true
        });
        if (res.status !== 200) {
            throw new Error(`Failed to start work: ${res.status}`);
        }
        return await res.data;
    }

    static async stopWork() {
        const res = await axios.get(`${api_url}/stopWork`, {
            withCredentials: true
        });
        if (res.status !== 200) {
            throw new Error(`Failed to stop work: ${res.status}`);
        }
        return await res.data;
    }

    static async isWorking() {
        const res = await axios.get(`${api_url}/isWorking`, {
            withCredentials: true
        });
        if (res.status !== 200) {
            throw new Error(`Failed to check if working: ${res.status}`);
        }
        return await res.data;
    }
}