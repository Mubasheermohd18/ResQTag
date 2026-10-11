# ResQTag 🚘

**Scan. Connect. Save Lives.**

ResQTag is a QR-based vehicle emergency information system designed to help bystanders access essential vehicle details and emergency contact information when an accident or other emergency occurs.

## About the Project

In an emergency, contacting a vehicle owner's family or emergency contacts can be difficult. ResQTag addresses this problem by allowing vehicle owners to register their vehicle information and emergency contacts and associate them with a unique QR code.

When someone scans the QR code attached to a vehicle, they can view the available vehicle information and emergency contacts to help notify the appropriate people.

## Features

- **QR Code Identification:** Unique QR codes for registered vehicles.
- **Vehicle Information:** Access essential vehicle details through a QR scan.
- **Emergency Contacts:** Display registered emergency contacts for quick communication.
- **Multiple Contacts:** Support for multiple emergency contacts per vehicle.
- **Vehicle Registration:** Register and manage vehicle information.
- **QR Code Printing:** Generate printable QR codes for vehicles.
- **Responsive Interface:** Designed for convenient use on mobile devices and desktops.
- **Database Integration:** Store and retrieve registered information using Supabase.

## How It Works

1. The vehicle owner registers their vehicle on ResQTag.
2. The owner adds vehicle details and emergency contact information.
3. A unique QR code is generated for the registered vehicle.
4. The QR code is attached to the vehicle in an accessible location.
5. In an emergency, a bystander scans the QR code.
6. The website displays the available vehicle information and emergency contacts.

## Technology Stack

- **Frontend:** HTML5, CSS3, JavaScript
- **Database and Backend Services:** Supabase
- **QR Code Functionality:** QR code generation and scanning libraries
- **Deployment:** Netlify

## Project Structure

```text
ResQTag/
├── frontend/
│   ├── index.html
│   ├── dashboard.html
│   ├── printable-qr.html
│   ├── qr-lookup.html
│   ├── report.html
│   └── admin.html
├── assets/
│   ├── css/
│   │   ├── style.css
│   │   └── components.css
│   └── js/
└── README.md
```

*Note: Update the structure above to match the final repository.*

## Getting Started

### Prerequisites

- A modern web browser
- A code editor such as Visual Studio Code
- A Supabase project with the required database tables and permissions

### Setup

1. Clone this repository:

   ```bash
   git clone YOUR_REPOSITORY_URL
   ```

2. Open the project folder in Visual Studio Code.

3. Configure the Supabase project URL and public client key in the appropriate configuration file.

4. Ensure that database tables, access policies, and required environment settings are configured correctly.

5. Run the frontend using a local development server, such as the Live Server extension in VS Code.

6. Test vehicle registration, QR code generation, QR scanning, and emergency contact display.

## Security and Privacy

- Do not expose Supabase service-role keys or other secret credentials in frontend code.
- Configure appropriate Supabase Row Level Security policies.
- Collect and display only the information necessary for the emergency use case.
- Obtain consent before publishing personal contact information.
- Test all emergency workflows before using the system in real-world situations.

## Future Enhancements

- SMS or email notifications to emergency contacts.
- Improved emergency reporting functionality.
- Additional vehicle verification options.
- Enhanced privacy controls.
- Support for more vehicle categories.

## Disclaimer

ResQTag is intended to support emergency communication. It does not replace emergency services, medical assistance, or official accident reporting procedures. Availability of information depends on the vehicle owner's registration and the system's connectivity.

## Team

Developed as a project focused on making emergency vehicle identification and communication more accessible through QR technology.

## License

Specify an appropriate open-source license if you intend to distribute or reuse this project publicly.
