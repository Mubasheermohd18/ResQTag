let resqtagScanner = null;
let resqtagScannerRunning = false;

function getScannerMessageElement() {
    return document.querySelector("[data-scanner-message]");
}

function showScannerMessage(message, type = "info") {
    const element = getScannerMessageElement();

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className = `scanner-notice notice-${type}`;
    element.setAttribute("role", type === "error" ? "alert" : "status");
}

function parseEmergencyTextToProfile(text) {
    if (!text || typeof text !== "string") return null;

    let vehicleNumber = "";
    let vehicleModel = "";
    let vehicleType = "Car";
    let vehicleColor = "";
    let ownerName = "";
    let ownerPhone = "";
    const contacts = [];

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Vehicle number
        const vehMatch = line.match(/^Vehicle(?:\s*Number|\s*Reg|\s*Plate)?\s*:\s*([A-Z0-9\s-]+)$/i);
        if (vehMatch && !vehicleNumber) {
            vehicleNumber = vehMatch[1].trim();
            continue;
        }

        // Vehicle model
        const modelMatch = line.match(/^Model\s*:\s*([^\n\r]+)/i);
        if (modelMatch && !vehicleModel) {
            const parts = modelMatch[1].split(/[·•|]/).map(s => s.trim());
            vehicleModel = parts[0] || "";
            if (parts[1]) vehicleColor = parts[1];
            if (parts[2]) vehicleType = parts[2];
            continue;
        }

        // Owner header or line
        if (/^📞?\s*(?:Vehicle\s*Owner|Owner)\s*:?$/i.test(line) && i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            const nextMatch = nextLine.match(/^([A-Za-z\s]+?)\s*:\s*(\+?[\d\s-]{10,})$/);
            if (nextMatch) {
                ownerName = nextMatch[1].trim();
                ownerPhone = nextMatch[2].trim();
                i++;
                continue;
            }
        }

        const ownerMatch = line.match(/^📞?\s*(?:Vehicle\s*Owner|Owner)\s*:\s*([A-Za-z\s]+?)(?:\s*:\s*(\+?[\d\s-]{10,})|\s*\(([^)]+)\))?$/i);
        if (ownerMatch) {
            ownerName = ownerMatch[1].trim();
            ownerPhone = (ownerMatch[2] || ownerMatch[3] || "").trim();
            continue;
        }

        // Emergency Contacts
        const contactMatch = line.match(/^(?:\d+[\.\)]\s*)?([A-Za-z\s]+(?:\s*\([^)]+\))?)\s*:\s*(\+?[\d\s-]{10,})/i);
        if (contactMatch && !/owner|vehicle|model|resqtag/i.test(contactMatch[1])) {
            contacts.push({
                name: contactMatch[1].trim(),
                phone: contactMatch[2].trim()
            });
        }
    }

    if (!vehicleNumber && !ownerPhone && contacts.length === 0) {
        return null;
    }

    return {
        vehicleNumber: vehicleNumber || "VEHICLE",
        ownerName: ownerName || "Vehicle Owner",
        ownerPhone: ownerPhone || "",
        vehicleModel: vehicleModel || "",
        vehicleType: vehicleType || "Car",
        vehicleColor: vehicleColor || "",
        contacts
    };
}

function parseVCardToProfile(vcardText) {
    if (!vcardText || typeof vcardText !== "string" || !vcardText.includes("BEGIN:VCARD")) {
        return null;
    }

    const lines = vcardText.split(/\r?\n/);
    let vehicleNumber = "";
    let ownerName = "";
    let ownerPhone = "";
    let vehicleModel = "";
    let vehicleType = "Car";
    let vehicleColor = "";
    const contacts = [];

    const unescapeVCard = (str) =>
        str.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        while (i + 1 < lines.length && /^[ \t]/.test(lines[i + 1])) {
            line += lines[i + 1].trim();
            i++;
        }

        const upper = line.toUpperCase();

        if (upper.startsWith("FN:")) {
            const fnVal = line.slice(3).trim();
            // Try extracting vehicle registration plate
            const plateMatch = fnVal.match(/(?:TS|AP|MH|DL|KA|TN|KL|HR|UP|GJ|WB|MP|RJ|PB|CH|BR|JH|OD|AS)\s*[0-9]{1,2}\s*[A-Z]{1,3}\s*[0-9]{1,4}/i) ||
                               fnVal.match(/(?:EMERGENCY[:\s-]+)?([A-Z0-9\s-]{6,15})/i);
            if (plateMatch && plateMatch[1]) {
                vehicleNumber = plateMatch[1].trim();
            } else if (plateMatch && plateMatch[0]) {
                vehicleNumber = plateMatch[0].trim();
            }
        } else if (upper.startsWith("TITLE:") && !ownerName) {
            const val = line.slice(6).trim();
            const match = val.match(/(?:Owner[:\s-]+)?(.+)$/i);
            if (match) ownerName = match[1].trim();
        } else if (upper.startsWith("TEL")) {
            const colonIdx = line.lastIndexOf(":");
            if (colonIdx !== -1) {
                const meta = line.slice(0, colonIdx);
                const phone = line.slice(colonIdx + 1).trim();

                const isOwner = /owner/i.test(meta);
                if (isOwner) {
                    ownerPhone = phone;
                    const nameMatch = meta.match(/Owner\s*[-:(]\s*([^);]+)/i);
                    if (nameMatch && !ownerName) {
                        ownerName = nameMatch[1].replace(/[)]$/, "").trim();
                    }
                } else {
                    let cName = "";
                    const nameMatch = meta.match(/X-LABEL=(?:ICE\s*[-:\d]*\s*)?([^;]+)/i);
                    if (nameMatch) {
                        cName = nameMatch[1].replace(/^[-\s]+/, "").trim();
                    }
                    contacts.push({
                        name: cName || `Emergency Contact ${contacts.length + 1}`,
                        phone
                    });
                }
            }
        } else if (upper.startsWith("NOTE:")) {
            const noteText = unescapeVCard(line.slice(5));
            const regMatch = noteText.match(/VEHICLE:\s*([^\n\r]+)/i);
            if (regMatch) vehicleNumber = regMatch[1].trim();

            const ownerMatch = noteText.match(/OWNER:\s*([^(]+?)(?:\s*\(([^)]+)\))?(?:$|\n)/i);
            if (ownerMatch) {
                if (ownerMatch[1] && !ownerName) ownerName = ownerMatch[1].trim();
                if (ownerMatch[2] && !ownerPhone) ownerPhone = ownerMatch[2].trim();
            }

            const modelMatch = noteText.match(/MODEL:\s*([^\n\r]+)/i);
            if (modelMatch) {
                const parts = modelMatch[1].split(/[·•|]/).map((s) => s.trim());
                if (parts[0]) vehicleModel = parts[0];
                if (parts[1]) vehicleColor = parts[1];
                if (parts[2]) vehicleType = parts[2];
            }

            // Fallback contacts from NOTE if not parsed from TEL
            const iceMatch = noteText.match(/EMERGENCY CONTACTS?:\s*([\s\S]+?)(?:$|\n\n)/i);
            if (iceMatch && contacts.length === 0) {
                const cLines = iceMatch[1].split(/\n/).map(s => s.trim()).filter(Boolean);
                for (const cl of cLines) {
                    const cm = cl.match(/^(?:\d+[\.\)]\s*)?([A-Za-z\s\(\)]+?)\s*:\s*(\+?[\d\s-]{10,})/);
                    if (cm) {
                        contacts.push({ name: cm[1].trim(), phone: cm[2].trim() });
                    }
                }
            }
        }
    }

    if (!vehicleNumber && !ownerPhone && contacts.length === 0) {
        return null;
    }

    return {
        vehicleNumber: vehicleNumber || "VEHICLE",
        ownerName: ownerName || "Vehicle Owner",
        ownerPhone: ownerPhone || "",
        vehicleModel: vehicleModel || "",
        vehicleType: vehicleType || "Car",
        vehicleColor: vehicleColor || "",
        contacts
    };
}

function makeReportUrlFromProfile(profile) {
    const isFile = window.location.protocol === "file:";
    const basePath = isFile
        ? new URL("report.html", window.location.href).href
        : new URL("report.html", window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "/")).href;
    const jsonString = JSON.stringify(profile);
    const encoded = btoa(unescape(encodeURIComponent(jsonString)));
    const targetUrl = new URL(basePath);
    targetUrl.hash = "data=" + encodeURIComponent(encoded);
    return targetUrl.href;
}

function validateResQTagContent(value) {
    if (!value || typeof value !== "string") return false;

    // 1. Check if Instant Emergency Plain Text
    if (value.includes("RESQTAG") || (value.includes("EMERGENCY") && (value.includes("Vehicle") || value.includes("TS ") || value.includes("ICE")))) {
        const textProfile = parseEmergencyTextToProfile(value);
        if (textProfile && (textProfile.vehicleNumber || textProfile.contacts.length > 0)) {
            return true;
        }
    }

    // 2. Check if vCard
    if (value.includes("BEGIN:VCARD")) {
        const profile = parseVCardToProfile(value);
        return Boolean(profile && profile.vehicleNumber && (profile.ownerPhone || profile.contacts.length > 0));
    }

    // 3. Check if URL
    try {
        const url = new URL(value);

        if (url.protocol !== "https:" && url.protocol !== "http:" && url.protocol !== "file:") {
            return false;
        }

        const fileName = url.pathname.split("/").pop().toLowerCase();

        if (fileName !== "report.html" && fileName !== "emergency.html") {
            return false;
        }

        const encodedData = url.hash.match(/(?:^#|&)data=([^&]+)/);

        if (!encodedData) {
            return false;
        }

        const decodedData = decodeURIComponent(encodedData[1]);
        const jsonText = decodeURIComponent(escape(atob(decodedData)));
        const profile = JSON.parse(jsonText);

        return Boolean(
            profile &&
            typeof profile === "object" &&
            profile.vehicleNumber
        );
    } catch {
        return false;
    }
}

// Backward-compatible alias
function validateResQTagUrl(value) {
    return validateResQTagContent(value);
}

function handleScannedQr(decodedText) {
    if (!validateResQTagContent(decodedText)) {
        showScannerMessage(
            "This QR code is not a valid ResQTag emergency code.",
            "error"
        );
        return;
    }

    showScannerMessage("ResQTag code found. Opening emergency details...", "success");

    // 1. If Instant Emergency Text
    if (decodedText.includes("RESQTAG") || (decodedText.includes("EMERGENCY") && !decodedText.includes("BEGIN:VCARD") && !decodedText.startsWith("http"))) {
        const textProfile = parseEmergencyTextToProfile(decodedText);
        if (textProfile) {
            window.location.href = makeReportUrlFromProfile(textProfile);
            return;
        }
    }

    // 2. If vCard, generate the report URL and redirect
    if (decodedText.includes("BEGIN:VCARD")) {
        const profile = parseVCardToProfile(decodedText);
        if (profile) {
            window.location.href = makeReportUrlFromProfile(profile);
            return;
        }
    }

    // 3. Web URL
    window.location.href = decodedText;
}

async function startResQTagScanner() {
    const reader = document.getElementById("reader");

    if (!reader) {
        showScannerMessage("Scanner area was not found.", "error");
        return;
    }

    if (typeof Html5Qrcode === "undefined") {
        showScannerMessage(
            "The QR scanning library could not load. Check your internet connection.",
            "error"
        );
        return;
    }

    if (resqtagScannerRunning) {
        return;
    }

    try {
        resqtagScanner = new Html5Qrcode("reader");

        await resqtagScanner.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1
            },
            (decodedText) => {
                if (!validateResQTagUrl(decodedText)) {
                    showScannerMessage(
                        "QR detected, but it is not a valid ResQTag code.",
                        "error"
                    );
                    return;
                }

                stopResQTagScanner().finally(() => {
                    handleScannedQr(decodedText);
                });
            },
            () => {}
        );

        resqtagScannerRunning = true;
        showScannerMessage("Camera active. Point it at a ResQTag QR code.");
    } catch {
        resqtagScanner = null;
        resqtagScannerRunning = false;
        showScannerMessage(
            "Unable to access the camera. Allow camera permission or use an image instead.",
            "error"
        );
    }
}

async function stopResQTagScanner() {
    if (!resqtagScanner) {
        resqtagScannerRunning = false;
        return;
    }

    try {
        if (resqtagScannerRunning) {
            await resqtagScanner.stop();
        }
    } catch {
    } finally {
        try {
            resqtagScanner.clear();
        } catch {
        }

        resqtagScanner = null;
        resqtagScannerRunning = false;
    }
}

async function scanResQTagImage(file) {
    if (!file) {
        showScannerMessage("Choose an image containing a QR code.", "error");
        return;
    }

    if (typeof Html5Qrcode === "undefined") {
        showScannerMessage(
            "The QR scanning library could not load. Check your internet connection.",
            "error"
        );
        return;
    }

    await stopResQTagScanner();

    const reader = document.getElementById("reader");

    if (!reader) {
        showScannerMessage("Scanner area was not found.", "error");
        return;
    }

    try {
        const imageScanner = new Html5Qrcode("reader");
        const decodedText = await imageScanner.scanFile(file, true);

        try {
            imageScanner.clear();
        } catch {
        }

        if (!validateResQTagUrl(decodedText)) {
            showScannerMessage(
                "The selected image does not contain a valid ResQTag QR code.",
                "error"
            );
            return;
        }

        handleScannedQr(decodedText);
    } catch {
        showScannerMessage(
            "Could not read a QR code from this image. Try a clearer image.",
            "error"
        );
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.querySelector("[data-start-scanner]");
    const stopButton = document.querySelector("[data-stop-scanner]");
    const imageInput = document.querySelector("[data-qr-image]");

    if (startButton) {
        startButton.addEventListener("click", startResQTagScanner);
    }

    if (stopButton) {
        stopButton.addEventListener("click", stopResQTagScanner);
    }

    if (imageInput) {
        imageInput.addEventListener("change", (event) => {
            const file = event.target.files?.[0];

            if (file) {
                scanResQTagImage(file);
            }

            event.target.value = "";
        });
    }

    window.addEventListener("beforeunload", () => {
        if (resqtagScanner && resqtagScannerRunning) {
            resqtagScanner.stop().catch(() => {});
        }
    });
});