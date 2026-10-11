/**
 * ResQTag Authentication & Role-Based Access Control Module
 * =========================================================
 * Provides:
 * 1. User registration & sign-in for vehicle owners.
 * 2. Scoped vehicle management per user account.
 * 3. Exclusive Developer Admin role ("only me ie the one who developed it").
 * 4. Local storage persistence with Firebase Firestore cloud synchronization.
 */

const RESQTAG_USERS_KEY = "resqtag_users";
const RESQTAG_SESSION_KEY = "resqtag_current_session";

// Developer credentials (Reserved exclusively for the application developer)
const DEVELOPER_ADMIN_ACCOUNT = {
    id: "dev_super_admin",
    name: "Developer Admin",
    email: "admin@resqtag.com",
    phone: "9999999999",
    role: "developer_admin",
    isDeveloper: true
};

const DEVELOPER_PASSWORDS = ["admin123", "developer123", "admin", "9999"];

/**
 * Retrieves all registered users from storage.
 */
function getStoredUsers() {
    try {
        const raw = localStorage.getItem(RESQTAG_USERS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Saves users list to storage.
 */
function saveStoredUsers(users) {
    try {
        localStorage.setItem(RESQTAG_USERS_KEY, JSON.stringify(users));
    } catch (e) {
        console.warn("[Auth] Failed to save users locally:", e);
    }
}

/**
 * Returns currently authenticated user session, or null if guest.
 */
function getCurrentUser() {
    try {
        const raw = localStorage.getItem(RESQTAG_SESSION_KEY) || sessionStorage.getItem(RESQTAG_SESSION_KEY);
        if (!raw) return null;
        const user = JSON.parse(raw);
        if (user && user.id && user.email) return user;
        return null;
    } catch {
        return null;
    }
}

/**
 * Returns whether any user is currently signed in.
 */
function isUserLoggedIn() {
    return Boolean(getCurrentUser());
}

/**
 * Returns true ONLY if the authenticated user is the Developer Admin.
 */
function isDeveloperAdmin() {
    const user = getCurrentUser();
    if (!user) {
        // Also check legacy session flag for admin passcode
        return sessionStorage.getItem("resqtag_admin_authenticated") === "true";
    }
    return user.role === "developer_admin" || user.isDeveloper === true;
}

/**
 * Registers a new vehicle owner user account.
 */
async function registerUser({ name, email, phone, password }) {
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPhone = String(phone || "").trim().replace(/\D/g, "");
    const cleanPass = String(password || "").trim();

    if (!cleanName || cleanName.length < 2) {
        throw new Error("Please enter your full name (at least 2 characters).");
    }
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
        throw new Error("Please enter a valid email address.");
    }
    if (!cleanPhone || cleanPhone.length < 10) {
        throw new Error("Please enter a valid 10-digit mobile phone number.");
    }
    if (!cleanPass || cleanPass.length < 5) {
        throw new Error("Password must be at least 5 characters long.");
    }

    // Check if email conflicts with Developer Admin
    if (cleanEmail === DEVELOPER_ADMIN_ACCOUNT.email.toLowerCase()) {
        throw new Error("This email is reserved for Developer Administration. Please use the Developer Sign In.");
    }

    const users = getStoredUsers();
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
        throw new Error("An account with this email address already exists. Please sign in instead.");
    }

    const newUser = {
        id: "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash: btoa(cleanPass),
        role: "user",
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveStoredUsers(users);

    // Sync user profile to Firebase Firestore if connected
    if (typeof initFirebaseDb === "function" && typeof isFirebaseConfigured === "function" && isFirebaseConfigured()) {
        try {
            const db = await initFirebaseDb();
            if (db) {
                await db.collection("users").doc(newUser.id).set({
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    phone: newUser.phone,
                    role: "user",
                    createdAt: newUser.createdAt
                }, { merge: true });
            }
        } catch (err) {
            console.warn("[Auth] Firebase user sync notice:", err);
        }
    }

    // Automatically establish session
    const session = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        isDeveloper: false,
        loginAt: new Date().toISOString()
    };

    sessionStorage.removeItem("resqtag_admin_authenticated");
    localStorage.setItem(RESQTAG_SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent("resqtag_auth_changed", { detail: session }));

    return { success: true, user: session };
}

/**
 * Authenticates an existing user account or the Developer Admin.
 */
async function loginUser(emailOrPhone, password, remember = true) {
    const identifier = String(emailOrPhone || "").trim().toLowerCase();
    const cleanPass = String(password || "").trim();

    if (!identifier) {
        throw new Error("Please enter your email address or phone number.");
    }
    if (!cleanPass) {
        throw new Error("Please enter your password.");
    }

    // 1. Check Developer Admin login
    if (
        (identifier === DEVELOPER_ADMIN_ACCOUNT.email.toLowerCase() ||
         identifier === "developer@resqtag.com" ||
         identifier === "admin" ||
         identifier === "developer") &&
        DEVELOPER_PASSWORDS.includes(cleanPass)
    ) {
        const session = {
            ...DEVELOPER_ADMIN_ACCOUNT,
            loginAt: new Date().toISOString()
        };

        sessionStorage.setItem("resqtag_admin_authenticated", "true");
        if (remember) {
            localStorage.setItem(RESQTAG_SESSION_KEY, JSON.stringify(session));
        } else {
            sessionStorage.setItem(RESQTAG_SESSION_KEY, JSON.stringify(session));
        }

        window.dispatchEvent(new CustomEvent("resqtag_auth_changed", { detail: session }));
        return { success: true, user: session, isDeveloper: true };
    }

    // 2. Check registered regular user accounts
    const users = getStoredUsers();
    const cleanPhoneDigits = identifier.replace(/\D/g, "");

    const foundUser = users.find(u =>
        u.email.toLowerCase() === identifier ||
        (cleanPhoneDigits.length >= 10 && u.phone && u.phone.replace(/\D/g, "") === cleanPhoneDigits)
    );

    if (!foundUser) {
        throw new Error("No account found with this email or phone. Please create an account.");
    }

    let passMatches = false;
    try {
        passMatches = foundUser.passwordHash === btoa(cleanPass) || cleanPass === atob(foundUser.passwordHash);
    } catch {
        passMatches = false;
    }

    if (!passMatches) {
        throw new Error("Incorrect password. Please try again.");
    }

    // Regular users are strictly NOT Developer Admin
    sessionStorage.removeItem("resqtag_admin_authenticated");

    const session = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        phone: foundUser.phone,
        role: "user",
        isDeveloper: false,
        loginAt: new Date().toISOString()
    };

    if (remember) {
        localStorage.setItem(RESQTAG_SESSION_KEY, JSON.stringify(session));
    } else {
        sessionStorage.setItem(RESQTAG_SESSION_KEY, JSON.stringify(session));
    }

    window.dispatchEvent(new CustomEvent("resqtag_auth_changed", { detail: session }));
    return { success: true, user: session, isDeveloper: false };
}

/**
 * Signs out the current user session and clears access tokens.
 */
function logoutUser() {
    localStorage.removeItem(RESQTAG_SESSION_KEY);
    sessionStorage.removeItem(RESQTAG_SESSION_KEY);
    sessionStorage.removeItem("resqtag_admin_authenticated");

    window.dispatchEvent(new CustomEvent("resqtag_auth_changed", { detail: null }));
}

/**
 * Fetches all registered users for Developer Admin inspection.
 */
async function getAdminUserDirectory() {
    if (!isDeveloperAdmin()) {
        throw new Error("Unauthorized: Only the application developer can view the user directory.");
    }

    let localUsers = getStoredUsers();

    // Merge with Firebase users if connected
    if (typeof initFirebaseDb === "function" && typeof isFirebaseConfigured === "function" && isFirebaseConfigured()) {
        try {
            const db = await initFirebaseDb();
            if (db) {
                const snap = await db.collection("users").get();
                snap.forEach(doc => {
                    const u = doc.data();
                    if (!localUsers.some(lu => lu.id === u.id || lu.email === u.email)) {
                        localUsers.push(u);
                    }
                });
            }
        } catch (e) {
            console.warn("[Auth] Failed to load cloud users:", e);
        }
    }

    return localUsers;
}

/**
 * Deletes a user account (Developer Admin only).
 */
async function adminDeleteUser(userId) {
    if (!isDeveloperAdmin()) {
        throw new Error("Unauthorized: Only the developer can manage user accounts.");
    }

    let users = getStoredUsers().filter(u => u.id !== userId);
    saveStoredUsers(users);

    if (typeof initFirebaseDb === "function" && typeof isFirebaseConfigured === "function" && isFirebaseConfigured()) {
        try {
            const db = await initFirebaseDb();
            if (db) await db.collection("users").doc(userId).delete();
        } catch {}
    }

    return true;
}
