import axios from "axios";

export class Api {
    static async addSite(url) {
        const res = await axios.get(`http://localhost:3000/addSite?url=${url}`);
        if (res.status !== 200 && res.status !== 304) {
            throw new Error(`Failed to get links for ${url}`);
        }
        return await res.data;
    }

    static async getLinks() {
        const res = await axios.get("http://localhost:3000/getLinks");
        if (res.status !== 200 && res.status !== 304) {
            throw new Error(`Failed to get links: ${res.status}`);
        }
        return await res.data;
    }

    static async getClusters() {
        const res = await axios.get("http://localhost:3000/getClusters");
        if (res.status !== 200 && res.status !== 304) {
            throw new Error(`Failed to get clusters: ${res.status}`);
        }
        return await res.data;
    }
}