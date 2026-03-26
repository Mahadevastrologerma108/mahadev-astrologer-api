module.exports = async function (req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

    try {
        const { datetime, coordinates } = req.body;
        if (!datetime || !coordinates) return res.status(400).json({ success: false, error: 'Missing Data' });

        // 1. Prokerala Token
        const tokenResponse = await fetch('https://api.prokerala.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: process.env.PROKERALA_CLIENT_ID,
                client_secret: process.env.PROKERALA_CLIENT_SECRET
            })
        });

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) throw new Error("API Keys Missing");

        const commonParams = `datetime=${datetime}&coordinates=${coordinates}&ayanamsa=1&la=hi`;
        const headers = { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' };

        // 2. Fetch Logic
        async function fetchAPI(endpoint) {
            try {
                const r = await fetch(`https://api.prokerala.com/v2/astrology/${endpoint}`, { headers });
                const text = await r.text();
                try { return JSON.parse(text); }
                catch(e) { return { isRawSvg: true, svg: text }; }
            } catch(e) { return {}; }
        }

        // 3. 🚀 Credit Saver Mode: Fetching ONLY essential data (Lagna, Planets, Birth Details)
        const [planetsRes, lagnaRes, birthRes] = await Promise.all([
            fetchAPI(`planet-position?${commonParams}`),
            fetchAPI(`chart?${commonParams}&chart_type=rasi&chart_style=north-indian`),
            fetchAPI(`birth-details?${commonParams}`)
        ]);

        const getSvg = (res) => {
            if (!res) return "-";
            if (res.isRawSvg) return res.svg;
            if (res.response?.svg) return res.response.svg;
            if (typeof res.response === 'string') return res.response;
            return "-";
        };

        // 4. Safely Extracting Planets
        let pData = planetsRes?.response?.planet_position || planetsRes?.response || planetsRes?.data || [];

        // 5. Safely Extracting Birth Details
        let bDetails = birthRes?.response || birthRes?.data || {};

        return res.status(200).json({
            success: true,
            planets: pData,
            birthDetails: bDetails,
            charts: {
                lagna: getSvg(lagnaRes),
                navamsha: "-", // 🛑 Stopped to save API credits
                chalit: "-"    // 🛑 Stopped to save API credits
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
