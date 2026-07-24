<!-- Auto-generated Markdown reference from "Installation Dependencies.pdf". The PDF remains the human-readable source of truth. -->

# Installation Requirements and Dependencies

> Basically lahat ng ininstall natin for this project to work.

## 1. Overview

The ChainCert system is composed of three primary layers: the frontend application, the backend API server, and the blockchain smart contract layer (chaincode). Each layer runs in a different runtime environment and therefore requires separate dependency installations.

The frontend runs on the Windows environment as a React application accessed through the user's browser. The backend API and blockchain components run inside the Ubuntu (WSL) environment because Hyperledger Fabric and its associated command-line tools require a Linux-based runtime. Supporting infrastructure components such as Docker and CouchDB are also required to operate the blockchain network and supporting services.

The following sections describe the required system tools, infrastructure components, and software dependencies necessary to deploy and run the ChainCert system.

## 2. System Requirements

### 2.1 Operating Environment

> **⚠️ For the CCSCloud VM deployment:** the VM runs **native Ubuntu 22.04 (no WSL, no Windows)** — the
> React frontend is **built and served on the VM** (via Nginx), not run from Windows. **Skip the
> "Windows Environment" subsection below** on the VM. The dependency *lists* in this doc still apply;
> only the host differs. See `CAP-2459-IT-VM-INSTALLATION-MANUAL.md`.

The development and deployment environment requires the following system-level components:

#### Windows Environment

- Windows 10 or Windows 11
- Windows Subsystem for Linux (WSL2)
- Docker Desktop (with WSL integration enabled)
- Git
- Node.js (version 18 or compatible)
- npm (Node Package Manager)

#### Ubuntu Environment (WSL)

- Ubuntu distribution installed through WSL
- Node.js (version 18 or compatible)
- npm
- curl
- wget
- Git

These tools support both the application runtime and the blockchain infrastructure required by the system.

## 3. Blockchain Infrastructure Dependencies

ChainCert uses Hyperledger Fabric as the underlying blockchain framework for credential issuance, verification, and audit logging. The following components must be installed and configured within the Ubuntu environment:

- Hyperledger Fabric binaries
- Fabric peer CLI tools
- Fabric Certificate Authority (Fabric CA)
- Docker and Docker Compose
- CouchDB containers for ledger state databases
- Fabric orderer service
- Fabric peer nodes for participating organizations

These components allow the system to create and manage blockchain networks, channels, and smart contracts used for credential operations.

## 4. Frontend Application Dependencies

The ChainCert frontend is implemented as a React-based web application and runs within the Windows environment. These dependencies must be installed within the frontend project directory.

### Core Frontend Libraries

| Library | Purpose |
|---|---|
| `react` | JavaScript library for building the user interface |
| `react-dom` | DOM renderer used by React |
| `react-router-dom` | Handles routing between application pages |
| `react-scripts` | Build system and development scripts for React applications |
| `axios` | HTTP client used for communication with the backend API |

### User Interface Libraries

| Library | Purpose |
|---|---|
| `lucide-react` | Line-icon set used throughout the interface. Replaced FontAwesome (`@fortawesome/fontawesome-free`), which is no longer a dependency. |
| `framer-motion` | Drives the opacity-based page transitions between routes. |
| `recharts` | Renders the analytics charts (donut and trend-bar reports) on the holder, issuer, and administrator dashboards. |
| `web-vitals` | Performance monitoring library for measuring frontend performance metrics. |

### Credential Export and PDF Handling

| Library | Purpose |
|---|---|
| `jspdf` | Generates downloadable PDF files for issued credentials. |
| `dompurify` | Required by `jspdf@4` for HTML sanitization. **Must be a direct dependency** or the frontend build fails with `Can't resolve 'dompurify'` (added 2026-07-04 after it blocked the VM build). |
| `qrcode` | Generates QR codes embedded within exported credential PDFs. |
| `pdfjs-dist` | Parses uploaded credential-portfolio PDFs on the Verification Dashboard to extract the embedded credential IDs for bulk verification. Loaded lazily (code-split) so it does not enlarge the main bundle. |

### Testing Libraries (Optional)

The following libraries are used for testing and development validation but are not required for production deployment:

- `@testing-library/react`
- `@testing-library/dom`
- `@testing-library/jest-dom`
- `@testing-library/user-event`

### Frontend Installation Command

Run the following command inside the frontend project directory:

```bash
npm install react react-dom react-router-dom react-scripts axios jspdf dompurify qrcode pdfjs-dist lucide-react framer-motion recharts web-vitals
```

Optional testing libraries may be installed using:

```bash
npm install @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
```

## 5. Backend API Dependencies

The ChainCert backend server is implemented using Node.js and Express and runs within the Ubuntu WSL environment. The backend is responsible for managing authentication, interacting with CouchDB, handling issuer onboarding, and submitting transactions to the Hyperledger Fabric blockchain through the Fabric SDK.

### Core Backend Libraries

| Library | Purpose |
|---|---|
| `express` | Web framework used to implement the REST API |
| `cors` | Enables cross-origin requests between the frontend and backend |
| `dotenv` | Loads environment variables from configuration files |

### Security and Authentication

| Library | Purpose |
|---|---|
| `bcryptjs` | Secure password hashing for user accounts |
| `jsonwebtoken` | Implements JSON Web Token authentication for API access |
| `helmet` | Sets protective HTTP security headers on API responses (clickjacking, MIME-sniffing, referrer policy, etc.) — added in the Phase 5 security hardening (M6) |

### File Upload Handling

| Library | Purpose |
|---|---|
| `multer` | Handles multipart file uploads for issuer documents |

### Notification Services

| Library | Purpose |
|---|---|
| `nodemailer` | Sends system notifications and email alerts |

### Background Tasks

| Library | Purpose |
|---|---|
| `node-cron` | Schedules periodic background tasks such as credential expiration checks |

### Docker Integration

| Library | Purpose |
|---|---|
| `dockerode` | Allows the backend to programmatically interact with Docker containers |

### Blockchain Integration

| Library | Purpose |
|---|---|
| `fabric-network` | Hyperledger Fabric SDK used to submit transactions to the blockchain network |
| `fabric-ca-client` | Used for enrolling identities through the Fabric Certificate Authority |

### Backend Installation Command

Run the following commands in the backend directory:

```bash
cd ~/chaincert-api
npm install express cors dotenv helmet bcryptjs jsonwebtoken multer nodemailer node-cron dockerode fabric-network fabric-ca-client
```

### Backend Environment Variables (`~/chaincert-api/.env`)

The backend reads the following variables from its `.env` file (Ubuntu only — **not** committed to git). Added/changed during the Phase 5 security hardening:

| Variable | Required? | Purpose |
|---|---|---|
| `JWT_SECRET` | **Required** | Secret used to sign JWTs. The server **refuses to start** without it (the old `dev_secret_key` fallback was removed in M3). Generate with `openssl rand -hex 48`. |
| `SMTP_USER` | For email | Gmail address used to send system emails (OTP, approval, integrity alerts). |
| `SMTP_APP_PASSWORD` | For email | Gmail app password for `SMTP_USER`. |
| `SMTP_OVERRIDE_TO` | Optional (demo) | If set, ALL outgoing email is redirected to this single inbox (useful when demo accounts use fake addresses). Remove for production. |
| `DISABLE_RATE_LIMIT` | Optional (test) | `true` bypasses all rate limiting (M5). **Testing only** — a loud startup warning prints while on; remove before demo/production. |
| `DISABLE_PASSWORD_POLICY` | Optional (test) | `true` bypasses the password-strength policy (M8). **Testing only** — loud startup warning; remove before demo/production. |
| `DISABLE_SIGNUP_OTP` | Optional (test) | `true` bypasses the signup email-OTP gate on `/api/auth/register` (lets a scripted/`curl` account creation succeed without a 6-digit code). **Testing only** — no boot warning is printed for this one, so remove it before a real demo. |
| `DISABLE_ISSUER_TOGGLE` | Optional (UAT) | `true` freezes the admin enable/disable-issuer action (`adminRoutes`). **UAT only** — loud startup warning; remove before demo/production. |

## 6. Chaincode (Smart Contract) Dependencies

ChainCert's credential issuance and verification logic is implemented as Hyperledger Fabric chaincode, which runs on the blockchain network. These dependencies must be installed in the chaincode directory within the Ubuntu environment.

### Chaincode Libraries

| Library | Purpose |
|---|---|
| `fabric-contract-api` | Framework for writing Hyperledger Fabric smart contracts |
| `fabric-shim` | Provides the runtime interface between the chaincode and the Fabric peer |

### Chaincode Installation Command

Run the following commands in the chaincode directory:

```bash
cd ~/chaincert-chaincode
npm install fabric-contract-api fabric-shim
```

## 7. Infrastructure Components

In addition to application dependencies, the system requires several infrastructure components to operate properly.

### Blockchain Network Components

- Hyperledger Fabric peer nodes
- Hyperledger Fabric ordering service
- Fabric Certificate Authorities
- Fabric channel configuration tools

### Database Infrastructure

- CouchDB containers used as the state database for Fabric peers
- CouchDB instances used for application data storage including:
  - user accounts
  - issuer records
  - credential metadata
  - notification records

### Containerization Environment

Docker is used to host Fabric peer nodes, certificate authorities, orderers, and CouchDB databases.

## 8. Dependency Management Note

Only direct project dependencies are documented in this section. Additional packages that appear within the `node_modules` directory are considered sub-dependencies automatically installed by npm as part of the dependency tree.

Examples of such sub-dependencies include:

- `protobufjs`
- `uuid`
- `winston`
- `grpc-js`
- `nano`

These packages are managed automatically by npm and do not require separate installation instructions.
