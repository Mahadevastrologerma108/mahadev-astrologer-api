export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    const { datetime, coordinates } = req.body;

    try {
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
        if (!accessToken) throw new Error("Access Token Not Found");

        // 🔱 Correct Params: Adding ayanamsa=1 (Lahiri) and coordinates
        const commonParams = `datetime=${datetime}&coordinates=${coordinates}&ayanamsa=1&la=hi`;
        const headers = { Authorization: `Bearer ${accessToken}` };

        // 1. Planets Info
        const planetsRes = await fetch(`https://api.prokerala.com/v2/astrology/planets?${commonParams}`, { headers });
        const planets = await planetsRes.json();

        // 2. Lagna (Rasi) Chart - Using "rasi" instead of "birth"
        const lagnaRes = await fetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=rasi&chart_style=north-indian`, { headers });
        const lagna = await lagnaRes.json();

        // 3. Navamsha Chart - Using "navamsa"
        const navamshaRes = await fetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=navamsa&chart_style=north-indian`, { headers });
        const navamsha = await navamshaRes.json();

        // 4. Chandra Chart - Using "moon"
        const chandraRes = await fetch(`https://api.prokerala.com/v2/astrology/chart?${commonParams}&chart_type=moon&chart_style=north-indian`, { headers });
        const chandra = await chandraRes.json();

        // Check if data exists in all responses
        if (!planets.data || !lagna.data || !navamsha.data || !chandra.data) {
            const err = lagna.errors || planets.errors || "Data mismatch";
            throw new Error(JSON.stringify(err));
        }

        res.status(200).json({
            success: true,
            planets: planets.data,
            charts: {
                lagna: lagna.data.svg,
                navamsha: navamsha.data.svg,
                chandra: chandra.data.svg
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}