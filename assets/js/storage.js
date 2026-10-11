const RESQTAG_STORAGE_KEY = "resqtagVehicle";

function getVehicleProfile() {
    try {
        const storedData = localStorage.getItem(RESQTAG_STORAGE_KEY);

        if (!storedData) return null;

        const profile = JSON.parse(storedData);

        if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
            return null;
        }

        return profile;
    } catch {
        return null;
    }
}

function saveVehicleProfile(profile) {
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
        throw new Error("Invalid vehicle profile.");
    }

    const vehicleNumber = String(profile.vehicleNumber || "").trim().toUpperCase();
    const ownerName = String(profile.ownerName || "").trim();
    const ownerPhone = String(profile.ownerPhone || "").trim();

    if (!ownerName || !ownerPhone || !vehicleNumber) {
        throw new Error("Enter the owner's name, phone number, and vehicle number.");
    }

    const contacts = Array.isArray(profile.contacts)
        ? profile.contacts
            .map((contact) => ({
                name: String(contact?.name || "").trim(),
                phone: String(contact?.phone || "").trim()
            }))
            .filter((contact) => contact.name && contact.phone)
        : [];

    const cleanedProfile = {
        ownerName,
        ownerPhone,
        vehicleNumber,
        vehicleModel: String(profile.vehicleModel || "").trim(),
        vehicleType: String(profile.vehicleType || "").trim(),
        vehicleColor: String(profile.vehicleColor || "").trim(),
        contacts,
        updatedAt: new Date().toISOString()
    };

    try {
        localStorage.setItem(
            RESQTAG_STORAGE_KEY,
            JSON.stringify(cleanedProfile)
        );

        // Keep local registry updated for admin overview
        try {
            let list = [];
            const rawList = localStorage.getItem("resqtagVehicles");
            if (rawList) list = JSON.parse(rawList);
            if (!Array.isArray(list)) list = [];

            const idx = list.findIndex(v => v.vehicleNumber.toUpperCase() === vehicleNumber);
            if (idx >= 0) {
                list[idx] = cleanedProfile;
            } else {
                list.unshift(cleanedProfile);
            }
            localStorage.setItem("resqtagVehicles", JSON.stringify(list));
        } catch {}
    } catch {
        throw new Error("Unable to save your profile in this browser.");
    }

    // Seamless Firebase Cloud Firestore synchronization
    if (typeof saveVehicleToFirebase === "function") {
        try {
            saveVehicleToFirebase(cleanedProfile).catch((err) => {
                console.warn("[ResQTag Storage] Cloud sync notice:", err);
            });
        } catch {}
    }

    return cleanedProfile;
}

function deleteVehicleProfile() {
    try {
        const existing = getVehicleProfile();
        localStorage.removeItem(RESQTAG_STORAGE_KEY);

        if (existing && existing.vehicleNumber) {
            try {
                let list = [];
                const rawList = localStorage.getItem("resqtagVehicles");
                if (rawList) list = JSON.parse(rawList);
                if (Array.isArray(list)) {
                    list = list.filter(v => v.vehicleNumber.toUpperCase() !== existing.vehicleNumber.toUpperCase());
                    localStorage.setItem("resqtagVehicles", JSON.stringify(list));
                }
            } catch {}

            if (typeof deleteVehicleFromFirebase === "function") {
                try {
                    deleteVehicleFromFirebase(existing.vehicleNumber).catch(() => {});
                } catch {}
            }
        }
        return true;
    } catch {
        return false;
    }
}

function hasVehicleProfile() {
    const profile = getVehicleProfile();

    return Boolean(
        profile &&
        profile.ownerName &&
        profile.ownerPhone &&
        profile.vehicleNumber
    );
}

function getEmergencyContacts() {
    const profile = getVehicleProfile();

    return profile && Array.isArray(profile.contacts)
        ? profile.contacts
        : [];
}

function updateVehicleProfile(updates) {
    const existingProfile = getVehicleProfile();

    if (!existingProfile) {
        throw new Error("No saved vehicle profile was found.");
    }

    return saveVehicleProfile({
        ...existingProfile,
        ...updates,
        contacts: updates.contacts ?? existingProfile.contacts
    });
}

function exportVehicleProfile() {
    const profile = getVehicleProfile();

    if (!profile) {
        throw new Error("No vehicle profile is available to export.");
    }

    const file = new Blob(
        [JSON.stringify(profile, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = "resqtag-" + (profile.vehicleNumber || "profile").toLowerCase().replace(/[^a-z0-9]/g, "-") + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}