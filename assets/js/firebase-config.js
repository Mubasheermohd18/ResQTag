/**
 * ResQTag Firebase Database & Cloud Firestore Integration Module
 * ==============================================================
 * This module connects ResQTag to Firebase Cloud Firestore for storing
 * vehicle owner details and emergency contact records in the cloud.
 *
 * HOW TO CONNECT YOUR FIREBASE PROJECT:
 * 1. Open https://console.firebase.google.com/ and create/select your project.
 * 2. Click the Web icon (</>) under "Get started by adding Firebase to your app".
 * 3. Copy your project configuration object and replace the values in FIREBASE_CONFIG below.
 * 4. In Firebase Console, go to "Firestore Database" -> "Create Database" (start in test mode for testing).
 * 5. That's it! ResQTag will automatically detect your credentials and sync data to Firestore.
 */

const FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Internal Firebase state
let _firebaseApp = null;
let _firestoreDb = null;
let _isFirebaseInitializing = false;

/**
 * Checks whether the user has supplied real Firebase credentials.
 */
function isFirebaseConfigured() {
    return Boolean(
        FIREBASE_CONFIG &&
        FIREBASE_CONFIG.apiKey &&
        FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY" &&
        !FIREBASE_CONFIG.apiKey.startsWith("YOUR_") &&
        FIREBASE_CONFIG.projectId &&
        FIREBASE_CONFIG.projectId !== "YOUR_PROJECT_ID" &&
        !FIREBASE_CONFIG.projectId.startsWith("YOUR_")
    );
}

/**
 * Returns current status of Firebase connection.
 */
function getFirebaseStatus() {
    if (!isFirebaseConfigured()) {
        return {
            connected: false,
            configured: false,
            mode: "Local Storage Fallback",
            message: "Firebase credentials pending in assets/js/firebase-config.js"
        };
    }

    if (_firestoreDb) {
        return {
            connected: true,
            configured: true,
            mode: "Cloud Firestore Live",
            message: `Connected to project "${FIREBASE_CONFIG.projectId}"`
        };
    }

    return {
        connected: false,
        configured: true,
        mode: "Connecting to Cloud Firestore...",
        message: "Initializing Firebase SDK"
    };
}

/**
 * Initializes Firebase App and Firestore instance safely.
 */
async function initFirebaseDb() {
    if (_firestoreDb) return _firestoreDb;
    if (!isFirebaseConfigured()) {
        console.info("[ResQTag DB] Firebase credentials not configured yet. Operating in local storage mode with automatic offline fallback. To enable cloud database, edit assets/js/firebase-config.js.");
        return null;
    }

    if (typeof firebase === "undefined") {
        console.warn("[ResQTag DB] Firebase SDK script not found on window. Ensure firebase-app-compat.js and firebase-firestore-compat.js are loaded.");
        return null;
    }

    try {
        if (!firebase.apps || !firebase.apps.length) {
            _firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
        } else {
            _firebaseApp = firebase.app();
        }

        _firestoreDb = firebase.firestore();
        console.info(`[ResQTag DB] Successfully initialized Cloud Firestore for project: ${FIREBASE_CONFIG.projectId}`);
        return _firestoreDb;
    } catch (err) {
        console.error("[ResQTag DB] Firebase initialization error:", err);
        return null;
    }
}

/**
 * Sanitizes a vehicle number to use as a document ID in Firestore.
 */
function getVehicleDocId(vehicleNumber) {
    if (!vehicleNumber) return "UNKNOWN";
    return String(vehicleNumber).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_");
}

/**
 * Saves a vehicle profile (owner + emergency contacts) to Firebase Firestore.
 * If Firebase is configured, persists to the 'vehicles' collection in Firestore.
 * Always resolves gracefully without breaking application flow.
 */
async function saveVehicleToFirebase(profile) {
    if (!profile || !profile.vehicleNumber) {
        return { success: false, reason: "Missing vehicle profile or registration number" };
    }

    const docId = getVehicleDocId(profile.vehicleNumber);
    const db = await initFirebaseDb();

    if (!db) {
        // Return local mode acknowledgement
        return {
            success: true,
            mode: "local",
            docId,
            message: "Saved locally. Add Firebase project keys in firebase-config.js for cloud persistence."
        };
    }

    try {
        const payload = {
            vehicleNumber: String(profile.vehicleNumber || "").trim().toUpperCase(),
            ownerName: String(profile.ownerName || "").trim(),
            ownerPhone: String(profile.ownerPhone || "").trim(),
            vehicleModel: String(profile.vehicleModel || "").trim(),
            vehicleType: String(profile.vehicleType || "").trim(),
            vehicleColor: String(profile.vehicleColor || "").trim(),
            contacts: Array.isArray(profile.contacts) ? profile.contacts.map(c => ({
                name: String(c?.name || "").trim(),
                phone: String(c?.phone || "").trim()
            })).filter(c => c.name && c.phone) : [],
            updatedAt: new Date().toISOString(),
            lastSyncTimestamp: (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.FieldValue)
                ? firebase.firestore.FieldValue.serverTimestamp()
                : new Date()
        };

        await db.collection("vehicles").doc(docId).set(payload, { merge: true });
        console.log(`[ResQTag DB] Vehicle ${docId} successfully saved to Firebase Firestore.`);

        return {
            success: true,
            mode: "cloud",
            docId,
            message: "Vehicle and emergency contacts saved to Cloud Firestore."
        };
    } catch (error) {
        console.error(`[ResQTag DB] Error saving vehicle ${docId} to Firebase:`, error);
        return {
            success: false,
            mode: "error",
            error: error.message || error
        };
    }
}

/**
 * Retrieves a vehicle profile from Firebase Firestore by vehicle number.
 * Returns null if not found or if Firebase is offline.
 */
async function getVehicleFromFirebase(vehicleNumber) {
    if (!vehicleNumber) return null;
    const docId = getVehicleDocId(vehicleNumber);
    const db = await initFirebaseDb();

    if (!db) return null;

    try {
        const docSnap = await db.collection("vehicles").doc(docId).get();
        if (docSnap.exists) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error(`[ResQTag DB] Error fetching vehicle ${docId} from Firebase:`, error);
        return null;
    }
}

/**
 * Retrieves all registered vehicles from Firebase Firestore.
 * Used by the Admin portal to display cloud-registered vehicles across devices.
 */
async function getAllVehiclesFromFirebase() {
    const db = await initFirebaseDb();
    if (!db) return null;

    try {
        const snapshot = await db.collection("vehicles").get();
        const list = [];
        snapshot.forEach(doc => {
            list.push(doc.data());
        });
        return list;
    } catch (error) {
        console.error("[ResQTag DB] Error fetching all vehicles from Firebase:", error);
        return null;
    }
}

/**
 * Deletes a vehicle document from Firebase Firestore.
 */
async function deleteVehicleFromFirebase(vehicleNumber) {
    if (!vehicleNumber) return false;
    const docId = getVehicleDocId(vehicleNumber);
    const db = await initFirebaseDb();
    if (!db) return false;

    try {
        await db.collection("vehicles").doc(docId).delete();
        console.log(`[ResQTag DB] Vehicle ${docId} deleted from Firebase Firestore.`);
        return true;
    } catch (error) {
        console.error(`[ResQTag DB] Error deleting vehicle ${docId} from Firebase:`, error);
        return false;
    }
}

/**
 * Automatically synchronizes any locally saved vehicle profile to Firebase if configured.
 */
async function syncLocalToFirebase() {
    if (!isFirebaseConfigured()) return;
    try {
        const stored = localStorage.getItem("resqtagVehicle");
        if (stored) {
            const profile = JSON.parse(stored);
            if (profile && profile.vehicleNumber) {
                await saveVehicleToFirebase(profile);
            }
        }
    } catch (err) {
        console.warn("[ResQTag DB] syncLocalToFirebase error:", err);
    }
}

// Auto-initialize when script loads
if (typeof window !== "undefined") {
    window.addEventListener("DOMContentLoaded", () => {
        if (isFirebaseConfigured()) {
            initFirebaseDb().then(() => syncLocalToFirebase());
        }
    });
}
