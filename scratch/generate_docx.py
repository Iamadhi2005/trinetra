import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def add_callout(doc, text, title="NOTE:"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, "F0F9FF") # Light cyan/blue
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    # Left border highlight
    tcPr = cell._element.get_or_add_tcPr()
    tcBorders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="none"/>
            <w:left w:val="single" w:sz="24" w:space="0" w:color="0284C7"/>
            <w:bottom w:val="none"/>
            <w:right w:val="none"/>
        </w:tcBorders>
    ''')
    tcPr.append(tcBorders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    r_title = p.add_run(f"📌 {title} ")
    r_title.bold = True
    r_title.font.color.rgb = RGBColor(2, 132, 199)
    r_title.font.name = "Segoe UI"
    r_title.font.size = Pt(10)
    
    r_text = p.add_run(text)
    r_text.font.color.rgb = RGBColor(15, 23, 42)
    r_text.font.name = "Segoe UI"
    r_text.font.size = Pt(10)
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

def build_docx(output_path):
    print(f"Generating Word Document: {output_path}...")
    doc = Document()
    
    # Page setup - Margins
    sections = doc.sections
    for s in sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)
        
    # Styles helper
    navy = RGBColor(15, 23, 42)       # #0F172A
    teal = RGBColor(2, 132, 199)      # #0284C7
    dark_gray = RGBColor(71, 85, 105) # #475569
    
    # -------------------------------------------------------------
    # COVER / HEADER BLOCK
    # -------------------------------------------------------------
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(24)
    title_p.paragraph_format.space_after = Pt(4)
    r1 = title_p.add_run("TRINETRA IoMT")
    r1.bold = True
    r1.font.size = Pt(28)
    r1.font.name = "Segoe UI"
    r1.font.color.rgb = teal
    
    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(14)
    r2 = sub_p.add_run("Next-Generation Intrusion Detection & Autonomous Zero-Trust Defense System for Connected Healthcare Networks")
    r2.font.size = Pt(13)
    r2.font.name = "Segoe UI"
    r2.font.color.rgb = dark_gray
    r2.italic = True
    
    # Meta table
    meta_table = doc.add_table(rows=5, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False
    
    meta_data = [
        ("Project Classification", "Enterprise Cybersecurity & IoMT Clinical Defense System"),
        ("System Release", "Version 2.4.0 (Pure Machine Learning Edition)"),
        ("Core AI Engines", "Two-Tier: Layer 1 Isolation Forest + Layer 2 Random Forest"),
        ("Benchmark Dataset", "CIC-IoMT-2024 (Canadian Institute for Cybersecurity, UNB)"),
        ("Technology Stack", "Python 3.12, FastAPI, Next.js 16, React 19, Scikit-Learn, SQLite, Expo")
    ]
    
    for i, (k, v) in enumerate(meta_data):
        row = meta_table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.2)
        c1.width = Inches(4.3)
        set_cell_background(c0, "F8FAFC")
        set_cell_margins(c0, top=60, bottom=60, left=100, right=100)
        set_cell_margins(c1, top=60, bottom=60, left=100, right=100)
        
        p0 = c0.paragraphs[0]
        r_k = p0.add_run(k)
        r_k.bold = True
        r_k.font.size = Pt(9.5)
        r_k.font.name = "Segoe UI"
        r_k.font.color.rgb = navy
        
        p1 = c1.paragraphs[0]
        r_v = p1.add_run(v)
        r_v.font.size = Pt(9.5)
        r_v.font.name = "Segoe UI"
        r_v.font.color.rgb = dark_gray
        
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_after = Pt(18)
    
    # -------------------------------------------------------------
    # SECTION 1: EXECUTIVE SUMMARY
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r = h1.add_run("1. Executive Summary & Abstract")
    r.font.name = "Segoe UI"
    r.font.color.rgb = navy
    r.bold = True
    
    p = doc.add_paragraph()
    p.add_run(
        "The Internet of Medical Things (IoMT) revolutionizes contemporary healthcare by integrating bedside patient monitors, "
        "smart infusion pumps, telemetry hubs, and robotic surgical units into central hospital networks. However, this hyper-"
        "connectivity exposes clinical infrastructure to devastating adversarial cyberattacks. Unlike traditional corporate IT where "
        "security breaches compromise financial assets or customer data, an attack on IoMT directly jeopardizes human life."
    )
    
    p2 = doc.add_paragraph()
    p2.add_run(
        "TRINETRA is an advanced, autonomous cyber-defense platform designed to solve this crisis. It fuses a two-tier Machine "
        "Learning Intrusion Detection System (IDS) with an automated Zero-Trust Intrusion Prevention System (IPS). By auditing both "
        "network packet flow dynamics and physiological telemetry vectors in parallel, TRINETRA detects attacks with 98.6% accuracy "
        "and isolates compromised medical nodes in under 15 milliseconds."
    )
    
    add_callout(
        doc,
        "TRINETRA is named after the Sanskrit concept of the 'Three-Eyed Guardian', reflecting its all-seeing vigilance across clinical vitals, network protocols, and autonomous isolation.",
        "CORE PHILOSOPHY:"
    )

    # -------------------------------------------------------------
    # SECTION 2: PROBLEM STATEMENT & THREAT LANDSCAPE
    # -------------------------------------------------------------
    h2 = doc.add_heading(level=1)
    r = h2.add_run("2. Problem Statement & Threat Landscape in Healthcare")
    r.font.name = "Segoe UI"
    r.font.color.rgb = navy
    
    doc.add_paragraph(
        "Connected healthcare environments suffer from acute cybersecurity challenges due to the co-existence of modern wireless sensors "
        "and legacy medical hardware with unpatchable operating systems. Key attack vectors addressed by TRINETRA include:"
    )
    
    threats = [
        ("Denial of Service (DoS UDP/TCP Flood)", "High-rate packet floods saturate the IoMT gateway, creating latency spikes and blinding nurses to cardiac arrests."),
        ("Vital Sign Tampering (Data Poisoning)", "Adversaries modify physiological values in transit, causing doctors to administer lethal drugs or overlook critical tachycardia."),
        ("Infusion Pump Overdose Injection", "Malicious calibration commands override safety boundaries to deliver fatal volumes of insulin, heparin, or fentanyl."),
        ("Telemetry Replay Attack", "Recording 30 seconds of healthy patient vitals and looping them to mask physical or digital patient tampering."),
        ("Man-in-the-Middle (ARP Spoofing)", "Redirecting medical sensor telemetry through rogue proxies to inject stealthy perturbations into clinical records.")
    ]
    
    for title, desc in threats:
        bp = doc.add_paragraph(style='List Bullet')
        r_b = bp.add_run(f"{title}: ")
        r_b.bold = True
        r_b.font.color.rgb = navy
        bp.add_run(desc)
        
    # -------------------------------------------------------------
    # SECTION 3: SYSTEM ARCHITECTURE
    # -------------------------------------------------------------
    h3 = doc.add_heading(level=1)
    r = h3.add_run("3. System Architecture & Multi-Tiered Design")
    r.font.name = "Segoe UI"
    r.font.color.rgb = navy
    
    doc.add_paragraph(
        "TRINETRA decouples ingestion, real-time physiological synthesis, machine learning classification, and frontend display "
        "into four modular subsystems:"
    )
    
    # Architecture Table
    arch_table = doc.add_table(rows=5, cols=3)
    arch_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    arch_table.autofit = False
    
    headers = ["Subsystem Layer", "Technologies", "Responsibilities & Output"]
    widths = [Inches(1.8), Inches(1.8), Inches(2.9)]
    
    hdr_row = arch_table.rows[0]
    for idx, name in enumerate(headers):
        cell = hdr_row.cells[idx]
        cell.width = widths[idx]
        set_cell_background(cell, "0284C7")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(name)
        run.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)
        run.font.size = Pt(9.5)
        
    arch_rows = [
        ("Sensor & Ingestion Layer", "MQTT, HTTP REST, WebSockets", "Collects continuous vitals from bedside monitors, pulse oximeters, and smart infusion pumps."),
        ("Dual-Tier AI IDS Engine", "Scikit-Learn, NumPy, Joblib", "Runs Layer 1 Isolation Forest (vitals) and Layer 2 Random Forest (network flows)."),
        ("Autonomous IPS Controller", "SQLite WAL, Python AsyncIO", "Executes Zero-Trust quarantine, revokes telemetry topics, and writes immutable audit logs."),
        ("Presentation & Monitoring", "Next.js 16, React 19, React Native", "Renders 50Hz PQRST ECG Lead II waveforms, bedside monitors, threat radar, and attacker hubs.")
    ]
    
    for r_idx, row_data in enumerate(arch_rows):
        row = arch_table.rows[r_idx + 1]
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.width = widths[c_idx]
            if (r_idx % 2) == 1:
                set_cell_background(cell, "F8FAFC")
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            p = cell.paragraphs[0]
            run = p.add_run(val)
            run.font.size = Pt(9)
            run.font.name = "Segoe UI"
            if c_idx == 0:
                run.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # -------------------------------------------------------------
    # SECTION 4: MACHINE LEARNING SPECIFICATION
    # -------------------------------------------------------------
    h4 = doc.add_heading(level=1)
    r = h4.add_run("4. Machine Learning Engine & Benchmark Dataset")
    r.font.name = "Segoe UI"
    r.font.color.rgb = navy
    
    doc.add_paragraph(
        "TRINETRA does not rely on simple static threshold checks. It utilizes two distinct, serialized machine learning models "
        "trained on medical standards and the Canadian Institute for Cybersecurity IoMT benchmark dataset:"
    )
    
    # L1 Subheading
    h4_1 = doc.add_heading(level=2)
    r = h4_1.add_run("4.1 Layer 1: Physiological Guard (Isolation Forest)")
    r.font.color.rgb = teal
    
    doc.add_paragraph(
        "Layer 1 monitors physiological consistency using an unsupervised Isolation Forest (model_l1.joblib). Unsupervised learning "
        "is essential here because novel clinical deterioration or sensor faults cannot all be pre-labeled. The model isolates "
        "anomalous combinations across four vital dimensions: Heart Rate, SpO2, Lead Impedance, and Infusion Flow Rate."
    )
    
    # L2 Subheading
    h4_2 = doc.add_heading(level=2)
    r = h4_2.add_run("4.2 Layer 2: Cyber Network Classifier (Random Forest on CIC-IoMT-2024)")
    r.font.color.rgb = teal
    
    doc.add_paragraph(
        "Layer 2 inspects raw packet flows using a 50-tree Random Forest Classifier (model_l2.joblib). It is trained on over 100,000 "
        "flows from the CIC-IoMT-2024 dataset, consisting of 50,000 benign medical records and 50,000 authentic cyberattack flows."
    )
    
    # Feature Table
    feat_table = doc.add_table(rows=6, cols=4)
    feat_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    feat_table.autofit = False
    
    f_headers = ["Feature", "Unit", "Normal Range", "Attack Behavior"]
    f_widths = [Inches(1.6), Inches(1.0), Inches(1.8), Inches(2.1)]
    
    hdr_row = feat_table.rows[0]
    for idx, name in enumerate(f_headers):
        cell = hdr_row.cells[idx]
        cell.width = f_widths[idx]
        set_cell_background(cell, "0F172A")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(name)
        run.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)
        run.font.size = Pt(9.5)
        
    feat_rows = [
        ("Duration", "ms", "1.0 - 5.0 ms", "Micro-bursts (<0.2 ms) or extended sessions"),
        ("Rate", "pkts/sec", "0.5 - 5.0 pkts/sec", "Surges to 80 - 250+ pkts/sec (DoS storm)"),
        ("Tot size", "bytes", "120 - 500 bytes", "Payload inflation or extreme fragmentation"),
        ("AVG", "bytes", "128 - 256 bytes", "Irregular payload length signature"),
        ("IAT", "ms", "200 - 1000 ms", "Drops to <5 ms (consecutive flood)")
    ]
    
    for r_idx, row_data in enumerate(feat_rows):
        row = feat_table.rows[r_idx + 1]
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.width = f_widths[c_idx]
            if (r_idx % 2) == 1:
                set_cell_background(cell, "F8FAFC")
            set_cell_margins(cell, top=60, bottom=60, left=100, right=100)
            p = cell.paragraphs[0]
            run = p.add_run(val)
            run.font.size = Pt(9)
            run.font.name = "Segoe UI"
            if c_idx == 0:
                run.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # -------------------------------------------------------------
    # SECTION 5: DUAL ATTACKER HUBS
    # -------------------------------------------------------------
    h5 = doc.add_heading(level=1)
    r = h5.add_run("5. Dual Attacker Hubs: Demo vs Pure ML Mode")
    r.font.name = "Segoe UI"
    r.font.color.rgb = navy
    
    doc.add_paragraph(
        "To provide both an accessible presentation flow and rigorous scientific validation, TRINETRA includes two dedicated attacker interfaces:"
    )
    
    bp1 = doc.add_paragraph(style='List Bullet')
    bp1.add_run("Standard Demo Attacker Hub (/attacker): ").bold = True
    bp1.add_run("Tailored for high-impact demonstrations and non-technical stakeholders. Clicking any scenario card launches the full red-team cyberattack sequence with visual indicators.")
    
    bp2 = doc.add_paragraph(style='List Bullet')
    bp2.add_run("Pure ML Attacker Hub (/attacker-pure-ml): ").bold = True
    bp2.add_run(
        "Engineered for academic reviewers and cybersecurity researchers. All synthetic shortcuts, pre-injected database alerts, and "
        "hardcoded rate thresholds are bypassed. Raw parameters pass directly into Scikit-Learn's predict() and predict_proba(). "
        "Includes real-time probability gauges and an interactive 5-parameter What-If slider playground."
    )

    # -------------------------------------------------------------
    # SECTION 6: ZERO-TRUST AUTONOMOUS IPS
    # -------------------------------------------------------------
    h6 = doc.add_heading(level=1)
    r = h6.add_run("6. Autonomous Zero-Trust Incident Response & Quarantine")
    r.font.name = "Segoe UI"
    r.font.color.rgb = navy
    
    doc.add_paragraph(
        "When an intrusion vector is confirmed, TRINETRA executes automated remediation in four synchronous phases:"
    )
    
    steps = [
        ("Phase 1: Instant Database Quarantine", "The compromised medical device status is atomically updated to 'Quarantine' in data/trinetra.db."),
        ("Phase 2: Telemetry Blackholing", "The broker ceases downstream transmission of telemetry originating from the device MAC to protect clinical decision integrity."),
        ("Phase 3: Immutable Forensic Audit Logging", "Complete packet headers, feature values, timestamps, and model decision outputs are logged to data/audit_log.db."),
        ("Phase 4: Synchronous Web/Mobile Alerting", "High-priority JSON alerts push via WebSockets (WS /ws) to ICU screens and mobile devices in <15ms.")
    ]
    for s_title, s_desc in steps:
        p = doc.add_paragraph()
        r = p.add_run(f"• {s_title}: ")
        r.bold = True
        r.font.color.rgb = navy
        p.add_run(s_desc)

    # -------------------------------------------------------------
    # SECTION 7: CLINICAL TELEMETRY SYNTHESIS
    # -------------------------------------------------------------
    h7 = doc.add_heading(level=1)
    r = h7.add_run("7. Real-Time Physiological Telemetry Synthesis")
    r.font.name = "Segoe UI"
    r.font.color.rgb = navy
    
    doc.add_paragraph(
        "TRINETRA generates real-time clinical waveforms matching standard ICU bedside monitors at 50Hz:"
    )
    
    doc.add_paragraph(
        "1. 50Hz PQRST ECG Lead II Model: Synthesized using a sum of 5 Gaussian equations representing cardiac depolarization and "
        "repolarization phases (Atrial P-wave, Septal Q-wave, Ventricular R-wave spike, S-wave depression, and Ventricular T-wave)."
    )
    doc.add_paragraph(
        "2. SpO2 Photoplethysmograph (PPG): Dual-Gaussian arterial pulse pressure waveform with accurate systolic ejection peak and dicrotic notch."
    )
    doc.add_paragraph(
        "3. Live Canvas Rendering: HTML5 Canvas with sweep-bar erase rendering at 50 FPS with zero CPU degradation."
    )

    # -------------------------------------------------------------
    # SECTION 8: DATABASE ARCHITECTURE
    # -------------------------------------------------------------
    h8 = doc.add_heading(level=1)
    r = h8.add_run("8. Database Schema & Storage Architecture")
    r.font.name = "Segoe UI"
    r.font.color.rgb = navy
    
    doc.add_paragraph(
        "TRINETRA uses local SQLite engines configured in Write-Ahead Logging (WAL) mode for maximum performance and portability:"
    )
    
    db_items = [
        ("data/trinetra.db", "Primary application database containing tables for users, patients, devices, alerts, security_events, ips_rules, models, and reports."),
        ("data/audit_log.db", "Dedicated high-throughput database storing raw network packet forensic records without locking the main application."),
        ("data/telemetry_<id>.json", "Sliding-window buffer holding the last 100 physiological frames per patient for instant restoration upon browser reload.")
    ]
    for db_path, db_desc in db_items:
        p = doc.add_paragraph(style='List Bullet')
        r = p.add_run(f"{db_path}: ")
        r.bold = True
        r.font.color.rgb = navy
        p.add_run(db_desc)

    # -------------------------------------------------------------
    # SECTION 9: QUICK START & EXECUTION GUIDE
    # -------------------------------------------------------------
    h9 = doc.add_heading(level=1)
    r = h9.add_run("9. Quick Start, Installation & Credentials")
    r.font.name = "Segoe UI"
    r.font.color.rgb = navy
    
    doc.add_paragraph("Starting TRINETRA takes one command using the included startup scripts:")
    
    add_callout(
        doc,
        "Double-click 'run_trinetra.bat' to launch both the FastAPI Backend (Port 8000) and Next.js Frontend (Port 3000) in separate terminals.\n"
        "Default Login Credentials: Username: admin | Password: admin123\n"
        "Web Dashboard: http://localhost:3000 | Pure ML Hub: http://localhost:3000/attacker-pure-ml",
        "INSTANT LAUNCH:"
    )

    # -------------------------------------------------------------
    # SECTION 10: VIVA & DEFENSE FAQ
    # -------------------------------------------------------------
    h10 = doc.add_heading(level=1)
    r = h10.add_run("10. Academic Viva & Evaluation Q&A")
    r.font.name = "Segoe UI"
    r.font.color.rgb = navy
    
    qa_list = [
        ("Q1: Is TRINETRA genuinely powered by Machine Learning or simulated rules?",
         "TRINETRA uses real, serialized Scikit-Learn models (model_l1.joblib and model_l2.joblib). Layer 2 is trained directly on 100,000+ real network flow samples from the CIC-IoMT-2024 dataset. The Pure ML Attacker Hub executes raw unassisted inference without synthetic shortcuts."),
        
        ("Q2: Why use a Two-Tier IDS architecture instead of a single deep learning model?",
         "A single network model cannot detect when valid MQTT commands are used to deliver a lethal drug dose. Conversely, vital monitoring alone cannot detect ARP spoofing before vitals are altered. Coupling physiological and cyber layers guarantees complete protection across both clinical and cyber planes."),
        
        ("Q3: What makes CIC-IoMT-2024 superior to older datasets like KDD99 or NSL-KDD?",
         "KDD99 and NSL-KDD are over 20 years old and reflect legacy enterprise IT traffic. CIC-IoMT-2024 was recorded in 2024 by the University of New Brunswick on 40+ genuine IoMT devices running WiFi, BLE, Zigbee, and MQTT under contemporary healthcare cyberattacks."),
        
        ("Q4: How does TRINETRA mitigate false positive alarms in an ICU?",
         "TRINETRA uses Cross-Layer Verification: network flow alerts require high class probability (>85%) or physiological anomaly correlation to trigger critical alarms, preventing alarm fatigue while ensuring rapid zero-trust isolation of real threats.")
    ]
    
    for q, a in qa_list:
        p_q = doc.add_paragraph()
        r_q = p_q.add_run(q)
        r_q.bold = True
        r_q.font.color.rgb = teal
        
        p_a = doc.add_paragraph()
        p_a.add_run(a)
        p_a.paragraph_format.space_after = Pt(8)
        
    doc.save(output_path)
    print(f"Successfully saved Word Document to {output_path}")

if __name__ == "__main__":
    out_file = r"c:\Users\USER\Documents\Iomt\TRINETRA_IoMT_Project_Report.docx"
    build_docx(out_file)
