import axios from "axios";

const api_url = "https://api.smallgoogle.com";

export class Api {
    static async addSite(url) {
        const res = await axios.get(`${api_url}/addSite?url=${url}`);
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

    static async contentStatus() {
        const res = await axios.get(`${api_url}/contentStatus`);
        if (res.status !== 200) {
            throw new Error(`Failed to get content status: ${res.status}`);
        }
        return await res.data;
    }
}