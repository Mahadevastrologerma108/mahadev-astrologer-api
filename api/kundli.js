const fetch = require('node-fetch');

export default async function handler(req, res) {
    // 🔱 1. CORS Setup (ताकि आपकी वेबसाइट इसे कॉल कर सके)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST requests allowed' });
    }

    // 🔱 2. आपकी गुप्त चाबियाँ (Vercel से आएंगी)
    const CLIENT_ID = process.env.PROKERALA_CLIENT_ID;
    const CLIENT_SECRET = process.env.PROKERALA_CLIENT_SECRET;

    try {
        // 🔱 3. Prokerala से Access Token लेना
        const tokenResponse = await fetch("https://api.prokerala.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`
        });

        const tokenData = await tokenResponse.json();
        const access_token = tokenData.access_token;

        // 🔱 4. Frontend से यूज़र का डेटा लेना
        const { datetime, coordinates } = req.body;

        // 🔱 5. Prokerala से असली कुण्डली मंगाना (GET Request)
        const kundliUrl = `https://api.prokerala.com/v2/astrology/kundli?ayanamsa=1&coordinates=${coordinates}&datetime=${datetime}`;
        
        const kundliResponse = await fetch(kundliUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json"
            }
        });

        const kundliData = await kundliResponse.json();

        // 🔱 6. कुण्डली का डेटा आपकी वेबसाइट पर भेजना
        res.status(200).json(kundliData);

    } catch (error) {
        console.error("Mahadev API Error:", error);
        res.status(500).json({ error: "Server Error, failed to fetch Kundli" });
    }
}
