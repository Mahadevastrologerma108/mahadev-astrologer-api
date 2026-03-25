async function generateMahadevKundli() {
    const dob = document.getElementById('k_dob').value;
    const time = document.getElementById('k_time').value;
    const lat = document.getElementById('k_lat').value;
    const lon = document.getElementById('k_lon').value;
    const resultSection = document.getElementById('result-section');
    const submitBtn = document.getElementById('submitBtn');

    if(!dob || !time || !lat || !lon) {
        alert("🔱 कृपया सभी आवश्यक जानकारी भरें!");
        return;
    }

    // 🛑 सुधार 1: डेली लिमिट चेक (कैश डेटा के लिए लिमिट नहीं कटेगी)
    const todayDate = new Date().toLocaleDateString();
    let usage = JSON.parse(localStorage.getItem('kundliUsage')) || { date: todayDate, count: 0 };
    if (usage.date !== todayDate) usage = { date: todayDate, count: 0 };

    const cacheKey = `kundli_${dob}_${time}_${lat}_${lon}`;
    const cachedData = localStorage.getItem(cacheKey);

    // अगर डेटा कैश में नहीं है और 2 की लिमिट खत्म हो गई है
    if (!cachedData && usage.count >= 2) {
        alert("😂 Today's limit exhausted! Come tomorrow and try again or try after 12:00 AM 🕛");
        return;
    }

    submitBtn.innerText = "ब्रह्मांडीय गणना हो रही है... ⏳";
    submitBtn.style.opacity = "0.7";
    resultSection.style.display = "block";

    // 🎨 UI Rendering Logic (No Change here, it was perfect)
    const renderKundli = (data) => {
        try {
            document.getElementById('lagna_svg').innerHTML = data.charts.lagna || "Error";
            document.getElementById('navamsha_svg').innerHTML = data.charts.navamsha || "Error";
            document.getElementById('chalit_svg').innerHTML = data.charts.chalit || "Error";

            let tableHTML = "";
            if (data.planets) {
                data.planets.forEach(p => {
                    let isRetro = (p.isRetro === "true" || p.isRetro === true);
                    tableHTML += `<tr>
                        <td><b>${p.name}</b></td>
                        <td>${p.sign || p.rasi}</td>
                        <td>${(p.normDegree || p.degree).toFixed(2)}°</td>
                        <td>${p.nakshatra}</td>
                        <td>${p.nakshatra_pad || p.nakshatra_pada || '-'}</td>
                        <td style="color: ${isRetro ? '#ff4d4d' : '#4caf50'};">${isRetro ? 'वक्री' : 'मार्गी'}</td>
                    </tr>`;
                });
            }
            document.getElementById('planets_body').innerHTML = tableHTML;

            // Avakhada Chakra Data
            if(data.birthDetails) {
                const bd = data.birthDetails;
                const getName = (item) => (Array.isArray(item) ? item[0]?.name : item?.name) || "-";
                let bdHtml = `<div><b>नक्षत्र:</b> ${getName(bd.nakshatra)}</div>
                              <div><b>राशि:</b> ${getName(bd.chandra_rasi)}</div>
                              <div><b>योनि:</b> ${bd.yoni || "-"}</div>
                              <div><b>गण:</b> ${bd.gana || "-"}</div>
                              <div><b>नाड़ी:</b> ${bd.nadi || "-"}</div>
                              <div><b>वर्ण:</b> ${bd.varna || "-"}</div>`;
                document.getElementById('basic_panchang_data').innerHTML = bdHtml;
            }

            // WhatsApp Banner Logic
            const paywall = document.querySelector('.paywall-container');
            if(paywall) {
                paywall.innerHTML = `<h3 class="gold-text cinzel">🔱 विस्तृत कुण्डली विश्लेषण</h3>
                    <p>दशा, गोचर फल और सटीक उपायों के लिए संपर्क करें।</p>
                    <a href="https://wa.me/message/VCK5OVBDCN7YK1" target="_blank" class="calc-btn" style="background:#25D366; color:#fff; text-decoration:none; display:inline-block; width:auto; padding:10px 20px;">📱 WhatsApp संपर्क</a>`;
            }

            submitBtn.innerText = "कुण्डली बनाएं ➔";
            submitBtn.style.opacity = "1";
            resultSection.scrollIntoView({ behavior: 'smooth' });
        } catch(e) { console.error("Rendering Error:", e); }
    };

    // 🚀 THE DECISION: Cache use karein ya API?
    if (cachedData) {
        console.log("🔱 Data Loaded From Cache");
        renderKundli(JSON.parse(cachedData));
    } else {
        const API_URL = "https://mahadev-astrologer-api.vercel.app/api/kundli"; 
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ datetime: `${dob}T${time}:00%2B05:30`, coordinates: `${lat},${lon}` })
            });

            if (!response.ok) throw new Error("Server Response Not OK");

            const rawResponse = await response.text();
            let data = JSON.parse(rawResponse);

            if(!data.success) throw new Error(data.error || "API Error");

            // 💾 सुधार: डेटा आने पर ही लिमिट बढ़ाएं
            localStorage.setItem(cacheKey, JSON.stringify(data));
            usage.count += 1;
            localStorage.setItem('kundliUsage', JSON.stringify(usage));

            renderKundli(data);

        } catch (error) {
            console.error("Fetch Error:", error);
            alert("🔱 सर्वर से संपर्क विफल। \nसंभावित कारण: " + error.message);
            submitBtn.innerText = "कुण्डली बनाएं ➔";
            submitBtn.style.opacity = "1";
        }
    }
}
