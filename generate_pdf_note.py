import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and print total page count."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "TRINETRA IoMT: Next-Gen Zero-Trust Intrusion Detection & Defense System")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 742, letter[0] - 54, 742)
            
        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 45, letter[0] - 54, 45)
        
        self.drawString(54, 32, "CONFIDENTIAL & PROPRIETARY — ACADEMIC & TECHNICAL SPECIFICATION")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 32, page_str)
        self.restoreState()

def build_pdf():
    output_pdf = "TRINETRA_IoMT_Master_Project_Note.pdf"
    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    C_PRIMARY = colors.HexColor("#0F172A")    # Deep Navy
    C_SECONDARY = colors.HexColor("#0284C7")  # Medical Sky Blue
    C_ACCENT = colors.HexColor("#0D9488")     # Cyber Teal
    C_DARK = colors.HexColor("#1E293B")       # Slate
    C_BG_LIGHT = colors.HexColor("#F8FAFC")   # Soft Grey
    C_ALERT = colors.HexColor("#DC2626")      # Crimson Red

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=C_PRIMARY,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=C_SECONDARY,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=C_PRIMARY,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=C_SECONDARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=C_DARK,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'BodyDarkBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=body_style,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0F172A")
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#0369A1")
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=C_DARK
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    story = []

    # ==================== COVER / TITLE BLOCK ====================
    story.append(Paragraph("🛡️ TRINETRA IoMT", title_style))
    story.append(Paragraph("Next-Generation Intrusion Detection & Zero-Trust Autonomous Defense System for Internet of Medical Things", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=C_SECONDARY, spaceBefore=0, spaceAfter=12))

    meta_table_data = [
        [
            Paragraph("<b>Version:</b> 2.4.0 (Pure ML Edition)", body_style),
            Paragraph("<b>Date:</b> September 2026", body_style),
            Paragraph("<b>Status:</b> Production / Validated", body_style)
        ],
        [
            Paragraph("<b>Environment:</b> Fast-API + Next.js 16 + React Native", body_style),
            Paragraph("<b>Dataset:</b> CIC-IoMT-2024 (UNB)", body_style),
            Paragraph("<b>AI Models:</b> Isolation Forest & Random Forest", body_style)
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[170, 170, 164])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # ==================== SECTION 1: EXECUTIVE ABSTRACT ====================
    story.append(Paragraph("1. Executive Summary & Problem Statement", h1_style))
    story.append(Paragraph(
        "The <b>Internet of Medical Things (IoMT)</b> connects life-critical medical instruments—including bedside electrocardiogram (ECG) monitors, smart infusion pumps, implantable pacemakers, and pulse oximeters—to smart hospital networks. While this hyper-connectivity enhances clinical diagnostics, it introduces severe vulnerabilities: medical devices frequently rely on legacy unencrypted protocols (e.g., raw MQTT, unauthenticated TCP), exposing them to in-transit telemetry falsification, Denial of Service (DoS) floods, and medication overdose attacks.",
        body_style
    ))
    story.append(Paragraph(
        "Unlike corporate IT systems where cyber threats compromise data confidentiality or cause financial loss, attacks on IoMT directly threaten <b>human life</b>. Falsified biometrics can deceive ICU doctors into missing acute cardiac arrest, or prompt lethal drug over-infusions. <b>TRINETRA</b> solves this via a dual-tier AI intrusion detection system (IDS) coupled with an autonomous Zero-Trust Intrusion Prevention System (IPS) that detects, analyzes, and isolates threats in sub-millisecond time.",
        body_style
    ))

    # Callout Box: Why IT Security Fails in IoMT
    callout_data = [[
        Paragraph("<b>Key Healthcare Security Dilemma:</b> Traditional corporate firewalls (Snort, Zeek) only inspect IP/TCP packet headers. They cannot detect <i>clinical data poisoning</i> where an adversary transmits valid MQTT frames with lethal dosage commands (500 mL/h). TRINETRA bridges this gap with simultaneous physiological and network anomaly fusion.", callout_style)
    ]]
    callout_box = Table(callout_data, colWidths=[504])
    callout_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0F9FF")),
        ('LINELEFT', (0,0), (0,0), 3, C_SECONDARY),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#BAE6FD")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(callout_box)
    story.append(Spacer(1, 10))

    # ==================== SECTION 2: SYSTEM ARCHITECTURE ====================
    story.append(Paragraph("2. System & Software Architecture", h1_style))
    story.append(Paragraph(
        "TRINETRA is structured as a 5-tier decoupled micro-architecture following the classical engineering paradigm: "
        "<b>Sensors / Input Data &rarr; Ingestion & Pre-Processing &rarr; Dual-Tier AI IDS &rarr; Zero-Trust Prevention &rarr; Presentation & Outputs</b>.",
        body_style
    ))

    # Embed Architecture Image if available
    img_path = r"C:\Users\USER\.gemini\antigravity-ide\brain\ba024749-d85e-4e53-8955-d1018fc59c48\software_system_architecture_1789287378459.jpg"
    if os.path.exists(img_path):
        try:
            story.append(Image(img_path, width=504, height=270))
            story.append(Spacer(1, 6))
            story.append(Paragraph("<i>Figure 2.1: Formal 5-Tier Software and System Architecture of TRINETRA IoMT</i>", ParagraphStyle('Cap', parent=body_style, fontSize=7.5, textColor=colors.HexColor("#64748B"), alignment=1)))
            story.append(Spacer(1, 8))
        except Exception:
            pass

    # Tier Table Breakdown
    tier_table_data = [
        [Paragraph("Tier Layer", table_header), Paragraph("Key Modules", table_header), Paragraph("Signal / Data In", table_header), Paragraph("Action / Output", table_header)],
        [
            Paragraph("<b>Tier 1: Perception</b>", table_cell),
            Paragraph("ECG, SpO2, Pump, Pacemaker", table_cell),
            Paragraph("Biopotentials (mV), Optical absorption", table_cell),
            Paragraph("Digitized telemetry & MQTT frames", table_cell)
        ],
        [
            Paragraph("<b>Tier 2: Ingestion</b>", table_cell),
            Paragraph("Feature Extractor, HMAC Checker", table_cell),
            Paragraph("Raw JSON, packet timestamps", table_cell),
            Paragraph("5 CIC-IoMT flow features + HMAC state", table_cell)
        ],
        [
            Paragraph("<b>Tier 3: AI Engine</b>", table_cell),
            Paragraph("Isolation Forest & Random Forest", table_cell),
            Paragraph("Biometrics + 5 Flow features", table_cell),
            Paragraph("Anomaly Score & Threat Probability", table_cell)
        ],
        [
            Paragraph("<b>Tier 4: Prevention</b>", table_cell),
            Paragraph("Autonomous IPS, KVO Actuator", table_cell),
            Paragraph("Unified Threat Score (&gt; 0.80)", table_cell),
            Paragraph("MAC Quarantine, 1.0 mL/h KVO Fallback", table_cell)
        ],
        [
            Paragraph("<b>Tier 5: Presentation</b>", table_cell),
            Paragraph("Next.js 16 Web & Mobile App", table_cell),
            Paragraph("Verified telemetry & Alarm signals", table_cell),
            Paragraph("50Hz Canvas ECG, Push Alarms, DB Log", table_cell)
        ],
    ]
    tier_table = Table(tier_table_data, colWidths=[90, 130, 134, 150])
    tier_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, C_BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(tier_table)
    story.append(Spacer(1, 14))

    # ==================== SECTION 3: MACHINE LEARNING SPECIFICATIONS ====================
    story.append(Paragraph("3. Machine Learning Engine & Mathematical Formulation", h1_style))
    story.append(Paragraph(
        "TRINETRA decouples defense into two dedicated machine learning models operating in parallel:",
        body_style
    ))
    
    story.append(Paragraph("<b>3.1 Layer 1: Physiological Guard (Unsupervised Isolation Forest)</b>", h2_style))
    story.append(Paragraph(
        "Monitors clinical plausibility without requiring prior attack labels. It evaluates 4 biometric inputs: Heart Rate (bpm), SpO2 (%), Lead Impedance (&Omega;), and Infusion Flow Rate (mL/h).",
        body_style
    ))
    story.append(Paragraph(
        "<b>Mathematical Formula:</b> Anomaly score s(x, n) = 2<sup>-E(h(x)) / c(n)</sup>, where E(h(x)) is average path length across isolation trees and c(n) is the average path length of unsuccessful searches in a Binary Search Tree. Values s &ge; 0.6 indicate acute physiological anomalies.",
        body_style
    ))

    story.append(Paragraph("<b>3.2 Layer 2: Cyber Network Guard (Supervised Random Forest)</b>", h2_style))
    story.append(Paragraph(
        "Trained on 100,000+ flow records from the benchmark <b>CIC-IoMT-2024</b> dataset across 5 statistical network features:",
        body_style
    ))

    features_table_data = [
        [Paragraph("Feature Name", table_header), Paragraph("Header", table_header), Paragraph("Description", table_header), Paragraph("Normal Range", table_header), Paragraph("Attack State", table_header)],
        [Paragraph("Duration", table_cell), Paragraph("Duration", table_cell), Paragraph("Flow session duration (ms)", table_cell), Paragraph("1.0 - 5.0", table_cell), Paragraph("Micro-bursts or long holds", table_cell)],
        [Paragraph("Packet Rate", table_cell), Paragraph("Rate", table_cell), Paragraph("Transmission frequency (pkts/s)", table_cell), Paragraph("0.5 - 5.0", table_cell), Paragraph("Surges &gt; 80 - 250", table_cell)],
        [Paragraph("Packet Size", table_cell), Paragraph("Tot size", table_cell), Paragraph("Cumulative byte volume", table_cell), Paragraph("120 - 500", table_cell), Paragraph("Massive volumetric floods", table_cell)],
        [Paragraph("AVG Size", table_cell), Paragraph("AVG", table_cell), Paragraph("Mean packet payload bytes", table_cell), Paragraph("128 - 256", table_cell), Paragraph("Fragmented frame spikes", table_cell)],
        [Paragraph("IAT", table_cell), Paragraph("IAT", table_cell), Paragraph("Inter-Arrival Time (ms)", table_cell), Paragraph("200 - 1000", table_cell), Paragraph("Drops &lt; 5 ms in floods", table_cell)],
    ]
    feat_table = Table(features_table_data, colWidths=[80, 60, 164, 90, 110])
    feat_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_DARK),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, C_BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
    ]))
    story.append(feat_table)
    story.append(Spacer(1, 14))

    # ==================== SECTION 4: THREAT MITIGATION MATRIX ====================
    story.append(Paragraph("4. Attack Vectors & Autonomous Mitigation Matrix", h1_style))
    story.append(Paragraph(
        "TRINETRA implements zero-trust graduated responses based on attack vector severity:",
        body_style
    ))

    threat_table_data = [
        [Paragraph("Vector", table_header), Paragraph("Severity", table_header), Paragraph("Target Device", table_header), Paragraph("Attack Mechanism", table_header), Paragraph("Autonomous IPS Mitigation", table_header)],
        [
            Paragraph("<b>Override</b>", table_cell),
            Paragraph("<font color='#DC2626'><b>Critical</b></font>", table_cell),
            Paragraph("Infusion Pump", table_cell),
            Paragraph("Lethal overdose command (500 mL/h) & rapid pacing (180 ppm)", table_cell),
            Paragraph("<b>KVO Safe Fallback (1.0 mL/h)</b> + MAC Quarantine", table_cell)
        ],
        [
            Paragraph("<b>Drain</b>", table_cell),
            Paragraph("<font color='#D97706'><b>High</b></font>", table_cell),
            Paragraph("Battery Subsystem", table_cell),
            Paragraph("Continuous high-draw power cycling draining 5% battery/s", table_cell),
            Paragraph("Power-Throttle Activated & Subsystem Isolated", table_cell)
        ],
        [
            Paragraph("<b>Fault</b>", table_cell),
            Paragraph("<font color='#2563EB'><b>Warning</b></font>", table_cell),
            Paragraph("ECG Monitor", table_cell),
            Paragraph("Loose lead with 10,000 &Omega; contact impedance spike", table_cell),
            Paragraph("Nurse Station Lead Inspection Alert Dispatched", table_cell)
        ],
        [
            Paragraph("<b>DoS</b>", table_cell),
            Paragraph("<font color='#DC2626'><b>Critical</b></font>", table_cell),
            Paragraph("Network Gateway", table_cell),
            Paragraph("High-rate packet flood (&gt; 200 pkts/s) dropping alarms", table_cell),
            Paragraph("Rate-Limiter Active & Source IP Blackholed", table_cell)
        ],
        [
            Paragraph("<b>MitM</b>", table_cell),
            Paragraph("<font color='#DC2626'><b>Critical</b></font>", table_cell),
            Paragraph("Pulse Oximeter", table_cell),
            Paragraph("Forged vitals with invalid HMAC-SHA256 signatures", table_cell),
            Paragraph("Corrupted Packets Dropped + Port Quarantine", table_cell)
        ],
        [
            Paragraph("<b>Replay</b>", table_cell),
            Paragraph("<font color='#D97706'><b>High</b></font>", table_cell),
            Paragraph("Bedside Monitor", table_cell),
            Paragraph("Looping recorded healthy vitals to mask cardiac arrest", table_cell),
            Paragraph("Timestamp Expiry & CUSUM Zero-Variance Drop", table_cell)
        ],
    ]
    threat_table = Table(threat_table_data, colWidths=[55, 55, 80, 154, 160])
    threat_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, C_BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(threat_table)
    story.append(Spacer(1, 14))

    # ==================== SECTION 5: VIVA DEFENSE MASTER Q&A ====================
    story.append(Paragraph("5. Academic Viva & Project Defense Master Guide", h1_style))
    
    qa_list = [
        ("Q1: What is the core novelty of TRINETRA over standard hospital security?",
         "Standard IT firewalls (Snort, Zeek) only inspect packet headers and cannot detect clinical data poisoning where an attacker sends legitimate MQTT frames with lethal dosage rates. TRINETRA uses a dual-tier AI architecture evaluating both cyber flow features and physiological plausibility, coupled with an automated actuator override (KVO mode) to safeguard patient life."),
        
        ("Q2: Why is Isolation Forest used for Layer 1 instead of a supervised classifier?",
         "Every patient has a unique baseline (e.g., resting heart rate varies from 50 to 100 bpm). Supervised classifiers require pre-labeled attack datasets for every clinical scenario. Isolation Forest is unsupervised; it models the patient's multidimensional normal space and isolates anomalous deviations without prior labels."),

        ("Q3: How does the system prevent vein thrombosis during an infusion pump attack?",
         "Instead of shutting down the pump completely (which causes intravenous blood clotting and vein collapse), TRINETRA's Zero-Trust IPS actuates a Keep-Vein-Open (KVO) safe mode delivering a harmless 1.0 mL/h flow rate to preserve vascular access."),

        ("Q4: What dataset was used for training, and why was it chosen?",
         "Trained on CIC-IoMT-2024 (Canadian Institute for Cybersecurity, UNB). It is the 2024 healthcare benchmark testbed featuring 40+ hardware and simulated medical devices operating across MQTT, BLE, Zigbee, and Wi-Fi."),

        ("Q5: How does the 50Hz ECG generator achieve smooth animation without lag?",
         "It computes an analytical Fourier-Gaussian PQRST mathematical formula streamed at 50Hz over WebSockets and rendered onto an HTML5 Canvas using double buffering, completely eliminating DOM overhead.")
    ]

    for q, a in qa_list:
        story.append(Paragraph(f"<b>{q}</b>", body_bold))
        story.append(Paragraph(f"<i>Answer:</i> {a}", body_style))
        story.append(Spacer(1, 4))

    # Build PDF with dynamic page numbering
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Master PDF successfully generated: {output_pdf}")

if __name__ == "__main__":
    build_pdf()
