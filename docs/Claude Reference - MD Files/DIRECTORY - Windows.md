<!-- Auto-generated Markdown reference from "DIRECTORY - Windows.pdf". The PDF remains the human-readable source of truth. -->

# Windows Directory

Directory tree of the Windows working copy, generated with:

```bash
kaitanz_@EmperorKai:/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET$ tree -a -I 'node_modules|objects'
```

```text
.
├── .env
├── .git
│   ├── COMMIT_EDITMSG
│   ├── FETCH_HEAD
│   ├── HEAD
│   ├── ORIG_HEAD
│   ├── config
│   ├── description
│   ├── hooks
│   │   ├── applypatch-msg.sample
│   │   ├── commit-msg.sample
│   │   ├── fsmonitor-watchman.sample
│   │   ├── post-update.sample
│   │   ├── pre-applypatch.sample
│   │   ├── pre-commit.sample
│   │   ├── pre-merge-commit.sample
│   │   ├── pre-push.sample
│   │   ├── pre-rebase.sample
│   │   ├── pre-receive.sample
│   │   ├── prepare-commit-msg.sample
│   │   ├── push-to-checkout.sample
│   │   ├── sendemail-validate.sample
│   │   └── update.sample
│   ├── index
│   ├── info
│   │   └── exclude
│   ├── logs
│   │   ├── HEAD
│   │   └── refs
│   │       ├── heads
│   │       │   ├── AFTER-Defense
│   │       │   └── main
│   │       └── remotes
│   │           └── origin
│   │               ├── AFTER-Defense
│   │               ├── HEAD
│   │               └── changes
│   │                   ├── clean-up-issuer-template-ui
│   │                   ├── fix-verifier-dashboard-name
│   │                   └── codex
│   │                       └── review-frontend-for-ui
│   ├── packed-refs
│   └── refs
│       ├── heads
│       │   ├── AFTER-Defense
│       │   └── main
│       ├── remotes
│       │   └── origin
│       │       ├── AFTER-Defense
│       │       ├── HEAD
│       │       └── changes
│       │           ├── clean-up-issuer-template-ui
│       │           ├── fix-verifier-dashboard-name
│       │           └── codex
│       │               └── review-frontend-for-ui
│       └── tags
├── .gitignore
├── README.md
├── backend
│   ├── couchDB_service.js
│   ├── enrollChaincertAdmin.js
│   ├── issuerRequirements.js
│   ├── node_creation
│   │   └── dlsu
│   │       ├── compose
│   │       │   ├── compose-ca-dlsu.yaml
│   │       │   ├── compose-couch-dlsu.yaml
│   │       │   ├── compose-couch-innocencio.yaml
│   │       │   ├── compose-couch-lasallecomputersociety.yaml
│   │       │   ├── compose-dlsu.yaml
│   │       │   └── docker
│   │       │       └── peercfg
│   │       │           └── core.yaml
│   │       ├── configtx-DEFAULT.yaml
│   │       ├── configtx-WITHDLSU.yaml
│   │       ├── connection-delasalleuniversity.json
│   │       ├── fabric-ca
│   │       │   └── registerEnrollFORDLSU.sh
│   │       ├── registerEnrollFORDLSU.sh
│   │       ├── setupWallet_DLSU.js
│   │       ├── setup_Wallet_DLSU_Subordinate_INNOCENCIO.js
│   │       └── setup_Wallet_DLSU_Subordinate_LASALLECOMPUTERSOCIETY.js
│   ├── package-lock.json
│   ├── package.json
│   ├── sdk-server-fixed.js
│   ├── setupWallet_ORG1.js
│   └── setupWallet_ORG2.js
├── chaincode
│   ├── index.js
│   └── package.json
├── package-lock.json
├── package.json
├── public
│   ├── assets
│   │   ├── landing-bg.png
│   │   └── logo512.png
│   ├── favicon.ico
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
└── src
    ├── App.js
    ├── App.test.js
    ├── assets
    │   └── landinghomepage.webm
    ├── components
    │   ├── adminProtectedRoutes.js
    │   ├── appToast.js
    │   ├── button.js
    │   ├── credentialCard.js
    │   ├── footer.js
    │   ├── navBar_Guest
    │   ├── navBar_User.js
    │   └── protectedRoutes.js
    ├── controllers
    │   ├── accountController.js
    │   ├── adminAuditController.js
    │   ├── adminDashboardController.js
    │   ├── adminIssuerController.js
    │   ├── authController.js
    │   ├── issuerCredentialController.js
    │   ├── issuerOnboardingController.js
    │   ├── rootAuthorityController.js
    │   ├── verifierController.js
    │   └── walletController.js
    ├── index.js
    ├── logo.svg
    ├── pages
    │   ├── BadgeDetailsProfilePreviewPage.js
    │   ├── TestPage.js
    │   ├── aboutUsPage.js
    │   ├── adminDashboard.js
    │   ├── badgeDetailsPage.js
    │   ├── createAccount.js
    │   ├── credentialDetails.js
    │   ├── credentialHistoryPage.js
    │   ├── forgotPassword.js
    │   ├── helpPage.js
    │   ├── issuerDashboardPage.js
    │   ├── landingHomePage.js
    │   ├── loginPage.js
    │   ├── notifPage.js
    │   ├── profilePage.js
    │   ├── profilePreview.js
    │   ├── requestAccessPage.js
    │   ├── settingsPage.js
    │   ├── shareCredentialPage.js
    │   ├── studentDashboard.js
    │   ├── transcript.js
    │   └── verifierDashboard.js
    ├── reportWebVitals.js
    ├── routes
    │   ├── adminRoutes.js
    │   ├── authRoutes.js
    │   ├── credentialRoutes.js
    │   ├── issuerRoutes.js
    │   ├── systemRoutes.js
    │   ├── verificationRoutes.js
    │   └── walletRoutes.js
    ├── services
    │   ├── apiService.js
    │   ├── authenticationService.js
    │   ├── axiosInstance.js
    │   └── pdfExportService.js
    ├── setupTests.js
    ├── styles
    │   ├── App.css
    │   ├── aboutUsPage.css
    │   ├── adminDashboard.css
    │   ├── appToast.css
    │   ├── badgeDetailsPage.css
    │   ├── createAccount.css
    │   ├── credentialCard.css
    │   ├── dashboard.css
    │   ├── footer.css
    │   ├── helpPage.css
    │   ├── index.css
    │   ├── issuerDashboardPage.css
    │   ├── landingHomePage.css
    │   ├── loginPage.css
    │   ├── navBar.css
    │   ├── profilePage.css
    │   ├── profilePreview.css
    │   ├── settingsPage.css
    │   ├── shareCredentialPage.css
    │   ├── studentDashboard.css
    │   ├── transcript.css
    │   └── verifierDashboard.css
    └── utils
        ├── formatDate.js
        └── userDisplay.js

41 directories, 151 files
```

> Note: The original `tree` output rendered the hierarchy without ASCII connector glyphs; the indentation and tree connectors above were reconstructed from the indentation levels in the source PDF. The directory/file names, ordering, and the final count (`41 directories, 151 files`) are preserved exactly.
