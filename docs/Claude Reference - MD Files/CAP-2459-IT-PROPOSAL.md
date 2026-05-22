<!-- Auto-generated Markdown reference from "CAP-2459-IT-PROPOSAL.pdf". The PDF remains the human-readable source of truth. -->

# ChainCert: A Permissioned Blockchain-Enabled Credential Verification and Management Platform

**De La Salle University - Manila**
Term 3, A.Y. 2024-2025

In Partial Fulfillment of the Course Requirements for **CAPIT0A**

**Submitted by CAP-2459-IT:**

- Kalinisan, Carl Adrian
- Ramirez, Myles Clement
- Tan, Kyle Justin
- Tumulak, Ralph Lauren

**Capstone Adviser:** Danny Cheng

**Submitted to:** Bertumen, Estefanie; Tabora, Liandro

**Submitted on:** August 5, 2025

---

# Chapter 1

## 1.1 Background of the Study

In an era where digital technology is ever growing, it is easier than ever to forge credentials, thus harder to distinguish between them being fake or real. The case of Marilee Jones, a former dean at MIT, who was found to have falsified her academic credentials for nearly 30 years, using fake degrees from Albany Medical College, Union College, and Rensselaer Polytechnic Institute (Hoover & Millman, 2007). Similarly, in January 2012, Yahoo's CEO, Scott Thompson, falsely claimed to have a degree in computer science from Stonehill College, alongside his actual degree in accounting. This was exposed through an investigation by activist shareholder Daniel Loeb (Luckerath-Rovers, 2025). These incidents are not isolated; in fact, even in the Philippines, a 2025 operation by the Manila Police District (MPD) resulted in the arrest of Mario Acantilado, who was caught producing counterfeit diplomas (Calucin, 2025). In addition, in Brazil, a large-scale investigation covered thousands of fake adult high school diplomas sold to individuals who had never completed their education. These fake adult high school diplomas resulted in wage gains of 5% to 8% for individuals compared to those without. These examples showcase the proliferation of fake academic credentials as a growing threat, not only undermining the integrity of education systems but also compromising the recruitment process and eroding trust between educational institutions, employers, and job seekers. Overall, the issue is driven by the desire for individuals to bypass educational qualifications and gain access to employment opportunities; almost all employers may perceive diplomas or credentials as a basis for productivity (Firmo, 2021). Moreover, in the Philippines and other developing countries, where education is a key factor in securing employment, individuals are encouraged to resort to making use of fraudulent credentials and certifications to gain either employment or admission to educational institutions.

Existing credential verification systems rely heavily on manual processes, such as contacting educational institutions or using third-party services to verify credentials. These systems are not only time-consuming but also vulnerable to errors and fraud. For example, when an applicant's credentials are in question, HR departments often rely on alumni networks or use personal references, both of which may not be reliable or standardized. This process can take up to five to ten working days, depending on the responsiveness of the institution being contacted (Appendix D). Furthermore, there is a lack of standardization in verification methods across institutions, which further complicates the process. In addition, many educational institutions continue to use physical credentials, such as diplomas and transcripts, which are prone to manipulation. Watermarks, holograms, and other anti-forgery techniques, while commonly employed, have proven insufficient in preventing fraud. The recent case involving two Filipino nationals shed light on vulnerabilities of the existing systems of issuance and verification, as both women submitted forged university certificates, one from De La Salle University and the other from Ateneo de Manila University, in order to secure positions at CL Enterprise, a retail company operating Mr. Fix outlets. Their deception remained undetected for over a year, until a random inspection by the Ministry of Manpower (MOM) uncovered the falsified documents. Moreover, in South Florida, thousands of fake nursing degrees were issued, leading to individuals passing national exams and entering the healthcare system without the necessary training (Putri, 2024). These cases highlight the significance of thorough document verification, as false educational qualifications or credentials are rampant.

The consequences of fraudulent credentials extend beyond recruitment issues; they have serious legal, financial, and reputational implications for both employers and educational institutions. Employers who hire individuals with fake credentials may face legal action, financial losses, and damage to their reputation. For instance, Mallory (2014) describes a case where a security guard company in Rhode Island was held liable for hiring a fraudster who misrepresented their qualifications, leading to serious legal consequences when the individual committed theft. Similarly, a Texas cab company was held accountable for hiring a driver with false credentials, who later committed a crime (Attewell & Domina, 2010). These cases illustrate the risks associated with negligent hiring practices, which can be mitigated by more reliable verification methods. Educational institutions also face significant risks when they fail to secure their credentials. Institutions that unknowingly issue authentic degrees alongside fraudulent ones may suffer from loss of credibility, affecting future enrollments and damaging their reputation in the academic community. The Philippine Labor Code (R.A 6715) mandates that employers exercise due diligence in verifying credentials, and failure to do so can lead to negligent hiring claims. Moreover, educational institutions and employers must ensure that their credentialing systems comply with data privacy laws, such as the Philippine Data Privacy Act of 2012, to avoid legal liabilities. Given these serious implications, there is an urgent need for a more secure, transparent, and efficient method of issuing. Outdated, manual verification and issuance systems are no longer adequate, as these are often slow, inefficient, and vulnerable to fraud, allowing fake documents to go undetected for long periods or, worst case, never at all.

According to Pulmano et al. (2023) the concept of self-sovereign identity (SSI) as a key framework was highlighted for empowering individuals to control their credentials. This concept is increasingly seen as the future of digital identity management, allowing users to hold and share their data in a decentralized manner, without relying on centralized authorities for validation. In alignment with this concept and the challenges posed by academic fraud and inefficient verification methods, Hyperledger Fabric, a permissioned blockchain technology, offers a secure, transparent, and tamper-proof solution for credential management. Blockchain technology ensures that once credentials are recorded, they cannot be altered or forged, providing a reliable and immutable record for credential verification. Moreover, its model restricts access to trusted participants, ensuring that only authorized entities can validate and access sensitive data, thereby reducing the risk of fraudulent activities (Mitani & Otsuka, 2020).

This is made possible by the modular architecture of Hyperledger Fabric, which enhances scalability and efficiency by using a modular consensus mechanism that allows only specific nodes to validate transactions, reducing computational load and transaction fees. This feature is particularly useful for systems managing large datasets like credentials and ensuring cost-effective processing. Additionally, privacy controls such as data collection and channels allow for secure data sharing between authorized participants, ensuring confidentiality (Androulaki et al., 2018).

Despite their advantages, permissioned blockchains like Hyperledger Fabric have limitations, notably the centralization of control. Since only trusted entities validate transactions, there is a risk of tampering if these entities act maliciously or fail to reach consensus. As noted by Solat et al. (2021), the closed network of permissioned blockchains can allow block alterations if the trusted participants permit it, undermining the core tamper-resistance feature of blockchain. Unlike permissionless blockchain, where tampering with past transactions would require recalculating the entire blockchain, this centralization poses a potential vulnerability (Solat et al., 2021).

However, despite these challenges, Hyperledger Fabric remains a robust solution for credential verification due to its enhanced privacy features, scalability, and compliance with regulations like the Philippine Data Privacy Act of 2012 (DPA 2012) (Pulmano et al., 2023). Its ability to securely manage academic and professional credentials, while offering real-time verification, makes it a suitable solution for mitigating the risks associated with academic fraud and inefficiency. By using Chaincode (smart contracts), Hyperledger Fabric enables the automated issuance and verification of credentials, ensuring they are tamper-proof and easily accessible by authorized entities (Androulaki et al., 2018).

In conclusion, Hyperledger Fabric provides a secure, scalable, and compliant framework for academic credentialing that addresses the flaws of traditional verification systems. Its combination of privacy controls, real-time verification, and auditability makes it an ideal solution to ensure the authenticity and integrity of academic credentials in today's digital age.

## 1.2 Statement of the Problem

This section focuses exclusively on the data- and information-related root causes behind the inefficiencies, fraud, and limitations of traditional systems using the 5 Whys method. Each identified problem includes a justification of why it is a problem, a logically connected sequence of questions and answers, and real-life examples grounded in the review of related literature (RRL) and project appendix.

### 1.2.1 Specific Problem #1 — Reliance on Static Credential Formats Without Embedded Verifiability

Traditional systems issue and store credentials in static, non-machine-readable formats like PDFs or printed copies that lack embedded authenticity metadata such as cryptographic hashes, issuer signatures, credential IDs, and timestamps. These static formats cannot be independently validated, are highly vulnerable to tampering, and require human-driven processes to inspect.

#### 1.2.1.1 5 Whys Analysis

**1) Why do fake credentials go undetected?**

Fake credentials often go undetected in traditional systems because the verification process used by HR departments and government agencies is largely manual and based on visual inspection of submitted documents, which typically involve PDFs or printed diplomas, which lack embedded validation data such as digital signatures, hashes, or cryptographic proofs. This lack of digital verifiability leads to trust being based on physical appearance or subjective judgment, which is easily flawed. Miss Tan, an HR recruiter at Avesco Marketing Corporation, mentioned that applicants are required to bring physical copies of their diplomas and transcripts, which HR recruiters inspect by either asking the applicant about the contents or visually checking for logos and seals; if further verification is needed, they would reach out to the issuing institution. This process takes five to ten working days and lacks standardized confirmation protocols (Tan, personal communication, June 28, 2025; Appendix A; Tan, personal communication, July 21, 2025; Appendix C; Lagunilla, personal communication, July 21, 2025; Appendix D.2). Overall, because the documents contain no cryptographic or linked data, visually convincing forgeries easily bypass scrutiny. One high-profile example is Marilee Jones, the former MIT dean who submitted fabricated degrees from multiple institutions, which were never verified beyond face value and went undetected for 28 years (Hoover & Millman, 2007).

**2) Why are institutions still relying on outdated methods?**

Institutions continue to use printed documents and static PDFs because these are low-cost, familiar, and require no investment in infrastructure upgrades. Many schools and agencies are constrained by entrenched workflows and legacy systems that were never built to accommodate verifiable data. Additionally, there is limited awareness and understanding of technologies like verifiable credentials, blockchain anchoring, or credential APIs (Freeman et al., n.d; Appendix C; Appendix E). Unfortunately, even institutions that are aware of digital threats often underestimate the risk or believe that fraud detection can still be managed manually. For instance, MIT continued manual verification practices even after uncovering Marilee Jones' fraud (Hoover & Millman, 2007). In local cases, Bacoor LGU and Reliance Producers Cooperative admitted their systems are inefficient but remain unreformed due to budget constraints and lack of staff training (Appendix E).

**3) Why are credentials not embedded with real-time validation mechanisms like hashes or blockchain references?**

Credentials are not embedded with real-time validation mechanisms because most issuer systems still operate on legacy infrastructure designed for document storage rather than interoperable data. These systems do not support features like cryptographic hashes, issuer metadata, or blockchain anchors. Most static credential formats do not integrate with digital verification ecosystems, limiting trust and increasing dependency on human judgment. According to Freeman et al. (n.d.) observed that current databases lack schema fields necessary for verifiable attributes, making it difficult to modernize without overhauling the entire structure. In practice, this means that credentials like diplomas or certificates exist only as flat files, without any built-in proof of issuance or links to authoritative registries, unless contacted directly. This was evident in the case of Scott Thompson, the former Yahoo CEO, who claimed to have a Computer Science degree that did not exist. The lack of embedded metadata or any automated reference to verify that claim allowed the fraud to persist until it was exposed by an external shareholder investigation (Lückerath-Rovers, 2024).

**4) Why haven't institutions upgraded to secure, verifiable digital credential systems?**

Most institutions have not adopted modern credentialing systems because of a combination of cost barriers, lack of technical capacity, and organizational resistance to change. Jimu (2018) highlights how institutional entrenchment leads to the continued use of outdated systems despite known risks. This is reinforced by local examples like Bacoor LGU and Reliance Producers Cooperative, where officials acknowledged inefficiencies but cited budget limitations and the steep learning curve as obstacles to upgrading (Appendix E; Appendix D.1). Moreover, there is a fear of complexity and uncertainty about regulatory compliance when adopting blockchain or digitally verifiable credentials, especially in government contexts where any systemic change involves long bureaucratic processes. As a result, institutions prioritize continuity over reform, even after encountering cases of fraud (Hoover & Millman, 2007).

**5) Why is this reliance on unverifiable documents dangerous?**

Relying on unverifiable, static documents creates systemic vulnerabilities that allow forged or altered credentials to enter legitimate pipelines such as employment, licensing, or certification. Without built-in validation logic or tamper-evidence, fraudulent documents can persist for years without detection. This poses legal, operational, and ethical risks, particularly in sectors like education and healthcare. The most alarming example is the 2023 U.S. case where over 7,600 fake nursing diplomas were sold and at least 2,800 individuals with fraudulent records were able to pass the licensure exam and enter the healthcare system (Putri, 2024).

#### 1.2.1.2 Root Cause Analysis

The core issue in this problem lies in the traditional treatment of credentials as static records, either physical or digital documents, rather than dynamic, verifiable data objects. Traditional issuance and verification systems were never designed to capture or process authenticity metadata, resulting in a lack of cryptographic proofs, issuer signatures, and verifiable audit trails. Because of this, institutions are forced to rely on manual processes such as visual inspection, phone calls, or emails, which are slow, error-prone, and inconsistent. The lack of built-in integrity checks makes these credentials vulnerable to forgery, while institutional resistance to adopting modern solutions like blockchain is fueled by perceived cost, complexity, and unfamiliarity. As long as credential formats remain static and unverifiable, the education and employment ecosystem will remain exposed to fraud, inefficiency, and compromised trust.

#### 1.2.1.3 Opportunity

Our blockchain-based system issues verifiable credentials with embedded cryptographic proofs such as hashes and issuer metadata. Each credential is recorded on a permissioned ledger, enabling real-time validation without relying on human inspection. This eliminates the forgery risk and significantly reduces turnaround time for verification. With built-in auditability, our system strengthens public trust, enforces accountability, and replaces static PDFs with dynamic, verifiable digital credentials.

### 1.2.2 Specific Problem #2 — Lack of Credential Lifecycle Management (Issuance, Expiry, Revocation, and Updates)

Traditional credentialing systems do not support dynamic metadata or credential states that reflect real-world changes, such as revocation, expiration, or version updates. Credentials are issued once and treated as immutable, static documents, with no mechanism to reflect whether they have been invalidated or updated. This creates an information asymmetry between the issuer and verifier, who has no way of knowing whether a credential is still valid at the time of review.

#### 1.2.2.1 5 Whys Analysis

**1) Why do traditional systems fail to indicate if a credential has been revoked or expired?**

This is because most credentials exist only as static documents like PDFs or printed certificates, which carry no metadata that indicates validity period or revocation status. They are typically stored in folders, personal email inboxes, or printed files and lack links to real-time status systems. Traditional verification methods rely on manual cross-checking with registries, which is time-consuming and often skipped. Thus, if a diploma or certificate is revoked due to dishonesty or policy validations, there is no downstream notification to employers or regulators on the real-time status of the submitted credential.

**2) Why are expiration and revocation statuses not integrated in the credential itself?**

Static formats like PDFs do not support programmable metadata that can update over time. Credential files lack linked data or API endpoints that can reflect changes in status. As observed by Jimu (2018), traditional systems lack the infrastructure to automate credential lifecycles, making them blind to conditions such as renewal deadlines, certification suspensions, or expirations.

**3) Why is it difficult to track updated versions of a credential or maintain version control?**

There is no versioning framework in static credentialing systems. If someone reissues a diploma with updated names, corrected honors, or a change in affiliation, there is no way to track which version is the most recent or authoritative unless the user explicitly discloses the change or the verifier contacts the associated issuer institution (Pandya, 2022). According to Freeman et al. (n.d), they argue that traditional systems do not include credential IDs or version hashes that can differentiate legitimate updates from duplicates or forgeries. This leads to confusion among verifiers, especially when discrepancies exist between multiple copies.

**4) Why is this a risk for employers, institutions, or regulators?**

Without lifecycle visibility, institutions risk accepting outdated, falsified, or revoked credentials. This is particularly dangerous in time-sensitive roles like medicine, aviation, or finance, where certifications expire or require revalidation. The 2023 fake nursing diploma scandal exemplifies how expired or fraudulent credentials can remain undetected due to lack of real-time revocation awareness (Putri, 2024).

**5) Why haven't institutions implemented systems that support credential lifecycle management?**

Many issuers operate legacy databases or rely on Excel spreadsheets, physical files, or email logs for credential issuance. These systems lack support for API-based revocation, audit trails, or expiration rules. Integrating lifecycle tracking requires redesigning credential schemas and building interoperable verification systems, efforts that institutions perceive as costly and complex. Moreover, there is no regulatory pressure to require revocation protocols, so many issuers do not prioritize it (Rustemi et al., 2023; Freeman et al., n.d; Jimu, 2018).

#### 1.2.2.2 Root Cause Analysis

Traditional credentialing systems lack the capacity to manage dynamic states because they were designed around paper-based processes and later digitized into flat files. This results in credentials that are permanently static and disconnected from the real-world conditions that affect their validity. The lack of metadata standards, infrastructure, and legal mandates perpetuates this flaw, exposing employers and regulators to expired, revoked, or inaccurate records.

#### 1.2.2.3 Opportunity

Our solution introduces lifecycle management for all issued credentials. In simple terms, all transactions are logged, where every transaction or credential has a timestamp, expiration date, and revocation status field embedded and tracked on-chain. Issuers can revoke or update credentials at any time, and verifiers will always see the most recent status during validation. This ensures that credentials used in high-stakes environments are always up-to-date, improving trust, safety, and compliance.

### 1.2.3 Specific Problem #3 — Absence of Standardized Credential Metadata and Format Structures

This is a data standardization issue because traditional issuers provide credentials in inconsistent layouts and unstructured formats. An example of which is PDFs with no unified fields for issuer, recipient, type, status, or dates. Without standard metadata schemas, systems and verifiers cannot reliably extract or validate data, leading to interpretation errors, inefficiencies, and the inability to automate cross-institutional checks.

#### 1.2.3.1 5 Whys Analysis

**1) Why is credential formatting inconsistent?**

Credentials are inconsistent because institutions independently design and issue credentials with no mandatory structure or metadata format. Each issuer uses its own layout, which leads to differences in how fields like name, issue date, and program title appear or are labeled. This inconsistency creates problems for downstream verifiers such as HR or government offices, who must manually identify information across documents with varying formats (Pandya, 2022). For example, Avesco HR has to manually interpret credentials submitted from different institutions; some credentials contain names in uppercase, while others hide key data inside paragraphs or images, resulting in longer processing time and increased error risks (Appendix C).

**2) Why isn't there a single standard for formatting or storing credential data?**

There is no enforced credential data standard due to the decentralized nature of issuing bodies. Schools, training centers, and certification providers each adopt their own templates without a unifying guideline. As noted by Freeman et al. (n.d.), this leads to fragmented data and technical barriers for automation. Even when credentials contain similar data points, the labeling, position, and structure vary significantly. In local interviews, registrars mentioned that even within the same school, departments use different formats for certificate issuance, which complicates digital record keeping (Appendix D.1).

**3) Why is standardization important for automation or interoperability?**

Standardized metadata and credential schemas allow systems to parse, read, and verify credentials automatically. Without it, every verifier must create custom logic to interpret incoming documents. This is not scalable or sustainable. Systems like Credly and ESbi use JSON-LD or W3C VC formats to enable plug-and-play integration across issuers and verifiers (Stefaniak & Carey, 2019).

**4) Why haven't institutions adopted these standards?**

The adoption of credentialing standards is limited by lack of awareness, technical capacity, and guidance from regulatory bodies. Institutions are hesitant to switch to structured formats like JSON-LD or XML because of unfamiliarity and lack of local infrastructure. In the Philippines, no national framework exists for digital credential metadata, unlike in the EU, where projects like Europass and EBSI have begun implementing such standards (Pulmano et al., 2023).

**5) Why is lack of standardization risky?**

The absence of standards leads to human errors, delays in verification, and misinterpretation of critical details. Inconsistent formats allow fraudulent actors to modify or misinterpret data more easily. For instance, a fake diploma in image format can bypass checks simply because HR systems cannot process credential types, which means even legitimate documents are hard to cross-check efficiently.

#### 1.2.3.2 Root Cause Evaluation

Credential documents are treated as static artifacts without embedded, structured metadata. The absence of a shared data model among institutions leads to fragmented, human-readable-only formats. Without schema enforcement, the potential for automation, integration, and security is severely limited.

#### 1.2.3.3 Opportunity

Our system enforces the use of standardized credential metadata following the W3C Verifiable Credentials Data Model, ensuring that all credentials include consistent, machine-readable fields. This allows instant parsing, efficient filtering, and automated verification across institutions, regardless of the issuing body.

### 1.2.4 Specific Problem #4 — Exclusion of Microcredentials and Informal Learning Proofs

Traditional credential systems are focused on degree-based or terminal certifications and often exclude short-term or modular achievements such as online courses, training workshops, or industry certifications. These microcredentials are harder to verify and rarely included in official registries or transcripts, leading to a fragmented view of lifelong learning.

#### 1.2.4.1 5 Whys Analysis

**1) Why are microcredentials often unrecorded?**

Traditional systems were not designed to handle high-frequency, small-scope certifications. They focus on end-stage outcomes like degrees or licenses. There's no infrastructure to accommodate frequent, low-stakes issuances (Varadarajan, et al., 2023).

**2) Why do systems struggle to verify informal learning?**

Systems lack the ability to ingest and recognize diverse formats and issuers. Microcredentials may come from online platforms such as Coursera, LinkedIn Learning, or community-based training. These are not centrally recognized or formatted consistently, making them hard to validate or include in employment workflows (Varadarajan, et al., 2023).

**3) Why are microcredentials important for employability?**

Employers increasingly value skill-based credentials to supplement or replace traditional degrees, especially in tech and vocational fields. According to microcredentials, they provide a flexible path for upskilling and meet labor market demands more rapidly than formal degrees. However, lack of integration into credential systems makes them invisible to most hiring systems (Keystone Education Group, 2024).

**4) Why haven't traditional systems adapted to include these?**

There is resistance from educational institutions to recognize credentials they don't issue. Additionally, older database systems do not support frequent issuances or flexible credential categories. Many schools still rely on manual records or outdated ERPs, making integration of microcredentials a challenge (Appendix D.1).

**5) Why is this exclusion problematic?**

It creates a blind spot in evaluating a person's full skillset. Candidates who participate in short-term learning programs cannot effectively present these credentials during application or licensing processes. This leads to underemployment, inefficiencies in hiring, and wasted learning opportunities.

#### 1.2.4.2 Root Cause Evaluation

It creates a blind spot in evaluating a person's full skillset. Candidates who participate in short-term learning programs cannot effectively present these credentials during application or licensing processes. This leads to underemployment, inefficiencies in hiring, and wasted learning opportunities.

#### 1.2.4.3 Opportunity

Our system supports microcredentials by enabling flexible issuance from multiple types of verified issuers. It allows recipients to store and share all learning records, formal and informal, in a unified wallet, enriching their credential portfolio and improving employability outcomes.

### 1.2.5 Specific Problem #5 — Decentralized and Paper-Based Storage Results in Credential Loss and Inaccessibility

Traditional credential systems rely on institution-specific storage and paper-based issuance with no digital backup, centralized registry, or redundancy. When credentials are issued only as physical documents or stored in local databases without synchronization or long-term preservation strategies, they are highly vulnerable to loss from natural disasters, poor archiving practices, and human error. Overall, individuals who lose access to credentials are unable to recover or verify them, severely impacting their ability to pursue employment, licenses, or further education.

#### 1.2.5.1 5 Whys Analysis

**1) Why are credentials frequently lost or inaccessible?**

Credentials are lost or inaccessible because most are issued in printed versions or stored in local systems without cloud backup or integration into centralized registries. These formats are prone to loss from physical damage or institutional errors.

**2) Why are paper-based systems still widely used despite these risks?**

Institutions continue to use paper-based systems because they appear simple and cost-effective, especially in settings with limited digital infrastructure. However, they carry hidden costs: physical degradation, data loss, and human misfiling. Jimu (2018) highlights that small schools or LGUs often do not have digitization initiatives or disaster recovery policies. Reliance Producers Cooperative confirmed that most credential-related documents are still stored manually, and unless scanned during onboarding, these are lost if misplaced or damaged (Appendix E). The absence of enforced digital transition policies allows these risky practices to persist.

**3) Why don't institutions implement centralized or cloud-based archives?**

Many institutions do not implement cloud-based or redundant storage due to budget constraints, cybersecurity concerns, and lack of technical staff. Freeman et al. (n.d.) argue that decentralized, siloed credentials databases are common because schools operate independently without national mandates for credential backup or interconnectivity.

**4) Why can't individuals recover lost credentials easily from institutions?**

Most institutions lack long-term digitized records or automated reissuance procedures. If a school's archives are damaged, disorganized, or only kept for a few years, reissuance becomes impossible or heavily delayed. Freeman et al. (n.d.) note that credentialing authorities often fail to maintain permanent records.

**5) Why are data loss and inaccessibility serious issues in credentialing?**

Credential loss undermines the trust, continuity, and accessibility of education and employment systems. Without tamper-proof backups or decentralized registries, individuals risk permanent disqualification from job applications, licensing boards, or graduate programs. Rustemi et al. (2023) warn that siloed and analog credential practices disproportionately harm vulnerable populations who cannot afford multiple reissuance requests or who study in institutions with poor archival capacity. In the Philippines, disasters, institutional closures, and outdated storage habits continue to erase people's educational history, harming their long-term socioeconomic mobility.

#### 1.2.5.2 Root Cause Evaluation

The root issue lies in the reliance on localized, paper-based credential storage and the absence of interoperable, secure digital systems for backups and access. Without national digital registries, cloud-based archives, or blockchain-anchored credential logs, educational records remain fragile, fragmented, and highly susceptible to permanent loss. This makes re-verification inefficient or impossible, denying individuals their earned qualifications and reducing institutional credibility in the process.

#### 1.2.5.3 Opportunity

Our blockchain-based credentialing system addresses this problem by ensuring that every credential issued is recorded as a cryptographic hash on a decentralized ledger (Hyperledger Fabric), proving an immutable and tamper-evident proof of issuance. Additionally, credentials are stored in a user-owned digital wallet that is cloud-accessible, enabling individuals to retrieve them anytime, even if the issuing institution is no longer operational. Institutions are onboarded into a shared network, ensuring long-term access, redundancy, and disaster resilience. This approach eliminates single points of failure and builds permanent verifiability into the credential lifecycle.

### 1.2.6 Specific Problem #6 — Manual Verification Delays Due to Lack of Credential Interoperability

Most traditional credential verification processes involve manual procedures such as email exchanges, phone calls, or physical document checks. These delays are not just due to the static format of documents but also stem from the absence of interoperable systems and shared digital registries where credentials can be queried in real time. This hampers efficiency, especially in high-volume or time-sensitive settings.

#### 1.2.6.1 5 Whys Analysis

**1) Why are verification requests still manual and slow?**

Verification remains manual because there is no universal or federated system where issuers, employers, and verifiers can instantly check the authenticity of a credential. Most institutions do not expose APIs or searchable registries for external verification. Instead, HR departments must rely on time-consuming practices like emailing the issuing school or scanning printed documents for visual review. For instance, in the HR process at Avesco Marketing Corporation, recruiters spend 5-10 working days awaiting registrar confirmation (Appendix D.2).

**2) Why haven't institutions integrated verification APIs or interoperable platforms?**

Many issuers and verifiers lack both the technical capacity and the incentives to build or adopt interoperable systems. There is no consistent requirement or government mandate for this in many countries, including the Philippines. Freeman et al. (n.d.) point out that the credentialing ecosystem remains highly siloed, where each institution operates in isolation. Even when institutions have digital records, they are often inaccessible to external parties due to data privacy concerns or lack of authentication mechanisms.

**3) Why can't verifiers access credential data directly from schools or systems?**

Even when credential data exists digitally within a school's internal system, it is rarely published or shared externally due to concerns over data protection, consent, and system design. There is no standard method for securely querying records. In most cases, the verifier does not even know whether the credential exists unless the user provides a copy. As a result, verifiers must rely on manual outreach, creating a bottleneck.

**4) Why is this problematic for recruitment and credential-based decision making?**

The lack of real-time access to credential data means that hiring decisions, scholarship awards, or license issuances are delayed. In high-stakes settings like healthcare, law enforcement, or government contracts, this slows down onboarding and creates risk. For example, the fake nursing diploma scandal in the U.S. (Putri, 2024) could have been detected earlier if real-time verification were available.

**5) Why hasn't automation been prioritized in credential verification?**

There is still limited awareness among institutions about the possibility of secure automation. Many are also unsure how to implement verification without exposing sensitive data. In other cases, institutions assume that fraud is rare or manageable, so they tolerate delays.

#### 1.2.6.2 Root Cause Evaluation

The core problem is that there is no shared, interoperable infrastructure for credential verification. Traditional credentialing systems are institution-specific and siloed, with no federated registry or verifiable credential wallet. This forces every verification request to be done from scratch, which is done by contacting the issuer or requesting a reprint, leading to delays, inconsistency, and higher operational costs.

#### 1.2.6.3 Opportunity

Our system supports interoperable, API-accessible digital credential wallets where issuers can register credentials on a permissioned blockchain. Authorized verifiers can check credential validity instantly via accessing the hash sent by the user associated with the credential, eliminating the need for emails or manual confirmation. This not only reduces verification time from days to seconds but also supports better decision-making in time-sensitive contexts like employment, licensing, and scholarships.

### 1.2.7 Specific Problem #7 — No Tamper-Evident Logs or Version History

This is a data integrity problem because traditional credential systems do not maintain logs that track changes, issuance events, revocations, or reprints. Without version history or cryptographic trails, any modified or duplicated document appears indistinguishable from the original. The absence of tamper-evident mechanisms prevents detection of unauthorized changes, damaging trust and traceability.

#### 1.2.7.1 5 Whys Analysis

**1) Why can't tampered credentials be detected?**

Traditional systems treat credentials as single-version documents stored in folders or PDFs. There is no log of who issued it, when, or whether it was reissued or revoked.

**2) Why aren't credential systems designed to record history?**

Legacy systems are focused on storage, not traceability. They lack append-only logs or change-tracking mechanisms, which are standard in blockchain or digital signature systems. This makes it impossible to determine if a credential has changed over time.

**3) Why is this lack of version control dangerous?**

Without a history of issuance and updates, fraud cannot be easily detected. Employers might trust outdated, forged, or revoked credentials. This creates legal and reputational risks.

**4) Why is fraud not detected without version control?**

Fraud is difficult to detect because there is no way to confirm if a credential was altered after it was issued or if it's the latest version. Without any metadata attached to the document, there's no chain of custody to follow.

**5) Why aren't these systems designed with traceability?**

Legacy systems were built with a focus on simply storing data, not on its authenticity or traceability. There was little to no thought about protecting credentials from alteration or forgery.

#### 1.2.7.2 Root Cause Evaluation

Credentials issued using traditional systems are static and versionless. The systems do not store metadata about issuance events, edits, or revocations, making all documents equally unverifiable once printed or shared. This opens pathways to fraud.

#### 1.2.7.3 Opportunity

Our system uses blockchain's immutable audit trails to log every event in a credential's lifecycle — issuance, edits, and revocations. Employers and verifiers can view timestamps and change history, preventing forgery and reinforcing trust.

### 1.2.8 Specific Problem #8 — No Unified Registry or Searchable Credential Index

This is a discoverability and access problem. Credentials are stored in isolated silos like individual school databases or printed archives, which prevents global search or cross-institutional validation. Without a unified index or registry, credentials are hard to locate or verify.

#### 1.2.8.1 5 Why Analysis

**1) Why can't credentials be found quickly?**

Most employers or institutions don't have access to school databases. If a school closes or changes staff, the credential may become unverifiable.

**2) Why isn't there a centralized directory?**

Credential systems are built independently with no interoperability or national registry.

**3) Why is there no interoperability between these systems?**

The lack of standardization and regulations means there's no push for institutions to adopt a common data format, further preventing any meaningful integration.

**4) Why hasn't a national registry been implemented?**

There has been no strong policy mandate or initiative to establish a central registry. Each institution or agency operates in isolation, and they may not see the immediate need for such a system.

**5) Why can't schools, employers, or verifiers easily access these credentials?**

Since the data is decentralized and siloed, even those with legitimate access cannot quickly retrieve or validate credentials without relying on manual processes or contacting the issuer directly.

#### 1.2.8.2 Root Cause Analysis

Credential data exists in isolated formats across institutions with no common lookup infrastructure, making verification difficult or impossible if the issuer is unresponsive.

#### 1.2.8.3 Opportunity

Our system enables a searchable, permissioned registry of issued credentials. Verifiers with user consent can look up credentials in seconds using a unique ID or QR code — eliminating the need for manual chasing or guesswork.

### 1.2.9 Specific Problem #9 — Credentials Are Not Interoperable Across Systems

This is a data portability issue. Traditional credentials are often PDFs or scanned images that cannot be read by machines, imported to HR systems, or connected to digital wallets. This creates friction, especially in job platforms or institutional systems.

#### 1.2.9.1 5 Whys Analysis

**1) Why can't credentials be reused in different systems?**

Credential formats lack structure and standards (e.g., JSON-LD, Open Badges). Avesco HR manually encodes details from certificates because PDFs can't be parsed (Appendix D.2).

**2) Why weren't credentials built to be machine-readable?**

Traditional focus was on visual presentation, not machine interpretation. As Freeman et al. (n.d.) note, current formats limit automation and scaling.

**3) Why don't these systems use standardized formats?**

The lack of awareness and understanding of the importance of standardization, along with a reliance on outdated technologies, prevented adoption of interoperable formats like JSON-LD or Open Badges.

**4) Why does this lead to inefficiencies in credential verification?**

Because the data isn't structured, it requires manual extraction and data entry into various systems, increasing the risk of error and reducing overall efficiency. This also slows down processes such as job applications or admissions, where fast verification is key.

**5) Why does this lead to slow verification and increased errors?**

Because traditional credential formats lack automated validation mechanisms, verifiers must manually check the authenticity of credentials by contacting issuers or performing additional steps, which delays the verification process and increases the chances of human error.

#### 1.2.9.2 Root Cause Evaluation

Credentials are not structured using interoperable data formats. As a result, they can't be integrated with systems that require structured input (e.g., job portals, academic apps).

#### 1.2.9.3 Opportunity

Our platform supports verifiable credentials in machine-readable, standards-based formats (W3C VC), ensuring seamless import/export with third-party systems.
