const axios = require('axios');

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { datetime, coordinates } = req.body;

    try {
        // 1. Get Access Token
        const tokenResponse = await axios.post('https://api.prokerala.com/token', {
            grant_type: 'client_credentials',
            client_id: process.env.PROKERALA_CLIENT_ID,
            client_secret: process.env.PROKERALA_CLIENT_SECRET
        });

        const accessToken = tokenResponse.data.access_token;

        // 2. Prepare Requests (D1, D9, Chandra & Planets)
        const commonParams = `datetime=${datetime}&coordinates=${coordinates}`;
        
        const config = { headers: { Authorization: `Bearer ${accessToken}` } };

        // Sabhi data ek sath mangne ke liye (Parallel Requests)
        const [planets, lagnaChart, navamshaChart, chandraChart] = await Promise.all([
            axios.get(`https://api.prokerala.com/v2/astrology/planets?${commonParams}`, config),
            axios.get(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=birth&chart_style=north-indian`, config),
            axios.get(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=navamsha&chart_style=north-indian`, config),
            axios.get(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=moon&chart_style=north-indian`, config)
        ]);

        // 3. Sabhi data ko ek JSON me lapet kar bhejna
        res.status(200).json({
            success: true,
            planets: planets.data.data,
            charts: {
                lagna: lagnaChart.data.data.svg,
                navamsha: navamshaChart.data.data.svg,
                chandra: chandraChart.data.data.svg
            }
        });

    } catch (error) {
        console.error("API Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: error.response ? error.response.data : "Internal Server Error" });
    }
};
