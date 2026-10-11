function normalizePhoneNumber(phone) {
    return String(phone || "").replace(/\D/g, "");
}

function formatPhoneNumber(phone) {
    const digits = normalizePhoneNumber(phone);

    if (digits.length === 10) {
        return digits.replace(/(\d{5})(\d{5})/, "$1 $2");
    }

    return String(phone || "").trim();
}

function validateContact(contact) {
    if (!contact || typeof contact !== "object") {
        return {
            valid: false,
            message: "Invalid contact details."
        };
    }

    const name = String(contact.name || "").trim();
    const phone = normalizePhoneNumber(contact.phone);

    if (!name) {
        return {
            valid: false,
            message: "Enter the contact's name."
        };
    }

    if (phone.length < 10 || phone.length > 15) {
        return {
            valid: false,
            message: "Enter a valid phone number."
        };
    }

    return {
        valid: true,
        message: "",
        contact: {
            name,
            phone
        }
    };
}

function createCallLink(phone) {
    const digits = normalizePhoneNumber(phone);

    if (digits.length < 10 || digits.length > 15) {
        return "";
    }

    return `tel:${digits}`;
}

function createWhatsAppLink(phone, message = "") {
    const digits = normalizePhoneNumber(phone);

    if (digits.length < 10 || digits.length > 15) {
        return "";
    }

    const baseUrl = `https://wa.me/${digits}`;
    const text = String(message || "").trim();

    return text
        ? `${baseUrl}?text=${encodeURIComponent(text)}`
        : baseUrl;
}

function createContactCard(contact) {
    const result = validateContact(contact);

    if (!result.valid) {
        return null;
    }

    const cleanContact = result.contact;
    const card = document.createElement("div");
    card.className = "emergency-contact";

    const info = document.createElement("div");
    info.className = "emergency-contact-info";

    const name = document.createElement("strong");
    name.textContent = cleanContact.name;

    const phone = document.createElement("span");
    phone.textContent = formatPhoneNumber(cleanContact.phone);

    info.append(name, phone);

    const actions = document.createElement("div");
    actions.className = "emergency-contact-actions";

    const callLink = document.createElement("a");
    callLink.href = createCallLink(cleanContact.phone);
    callLink.textContent = "Call";

    const whatsappLink = document.createElement("a");
    whatsappLink.href = createWhatsAppLink(cleanContact.phone);
    whatsappLink.textContent = "WhatsApp";
    whatsappLink.target = "_self";
    whatsappLink.rel = "noopener noreferrer";

    actions.append(callLink, whatsappLink);
    card.append(info, actions);

    return card;
}

function renderEmergencyContacts(contacts, container) {
    if (!container) {
        return;
    }

    container.replaceChildren();

    const validContacts = Array.isArray(contacts)
        ? contacts.filter((contact) => validateContact(contact).valid)
        : [];

    if (validContacts.length === 0) {
        const message = document.createElement("p");
        message.textContent = "No emergency contacts are available.";
        container.appendChild(message);
        return;
    }

    validContacts.forEach((contact) => {
        const card = createContactCard(contact);

        if (card) {
            container.appendChild(card);
        }
    });
}

function setupContactLinks() {
    document.querySelectorAll("[data-contact-phone]").forEach((element) => {
        const phone = element.getAttribute("data-contact-phone");
        const link = createCallLink(phone);

        if (link) {
            element.href = link;
        } else {
            element.removeAttribute("href");
        }
    });

    document.querySelectorAll("[data-whatsapp-phone]").forEach((element) => {
        const phone = element.getAttribute("data-whatsapp-phone");
        const message = element.getAttribute("data-whatsapp-message") || "";
        const link = createWhatsAppLink(phone, message);

        if (link) {
            element.href = link;
            element.target = "_self";
            element.rel = "noopener noreferrer";
        } else {
            element.removeAttribute("href");
        }
    });
}

document.addEventListener("DOMContentLoaded", setupContactLinks);