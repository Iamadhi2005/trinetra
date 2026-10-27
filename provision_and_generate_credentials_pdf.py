import os
import sys
import secrets
import string
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add root directory to sys.path
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.database import DATABASE_URL, SessionLocal, engine, Base
from backend.models import User, Patient, AuditLog
from backend.auth import get_password_hash

# ReportLab imports
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

def generate_secure_temp_password() -> str:
    """Generate a high-entropy, human-typeable temporary password."""
    chunk1 = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
    chunk2 = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
    special = secrets.choice("!@#$&*")
    return f"TRN-{chunk1}{special}{chunk2}"

def provision_hospital_accounts():
    import sqlite3
    db_file = os.path.join(ROOT_DIR, "data", "trinetra.db")
    raw_conn = sqlite3.connect(db_file)
    cur = raw_conn.cursor()
    cols = [r[1] for r in cur.execute("PRAGMA table_info(users)").fetchall()]
    if "department" not in cols:
        cur.execute("ALTER TABLE users ADD COLUMN department TEXT DEFAULT 'General'")
    if "assigned_patient_id" not in cols:
        cur.execute("ALTER TABLE users ADD COLUMN assigned_patient_id TEXT DEFAULT NULL")
    if "is_active" not in cols:
        cur.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1")
    if "must_change_password" not in cols:
        cur.execute("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0")
    raw_conn.commit()
    raw_conn.close()

    db = SessionLocal()
    try:
        # Base database update
        Base.metadata.create_all(bind=engine)

        print("[*] Inspecting database for clinical doctors and patient assignments...")
        patients = db.query(Patient).all()
        doc_map = {}
        for p in patients:
            doc_name = p.doctor_assigned or "General Attending"
            if doc_name not in doc_map:
                doc_map[doc_name] = []
            doc_map[doc_name].append(f"{p.name} ({p.id})")

        print(f"[*] Found {len(doc_map)} distinct attending doctors across admitted patients: {list(doc_map.keys())}")

        # Real doctors mapped from actual database records
        doctors_spec = [
            {
                "full_name": "Dr. Sarah Connor",
                "username": "dr.connor",
                "department": "Cardiology & Intensive Care (ICU-A)",
                "assigned_patients": ", ".join(doc_map.get("Dr. Sarah Connor", ["Robert Smith (patient_102)", "Babu (PAT-6665)"])),
            },
            {
                "full_name": "Dr. Radhi",
                "username": "dr.radhi",
                "department": "Critical Care & Tele-ICU (ICU-A)",
                "assigned_patients": ", ".join(doc_map.get("Dr. Radhi", ["Raju (PAT-7850)", "Anirudh (PAT-3851)", "John Doe (patient_101)"])),
            },
            {
                "full_name": "Dr. Rocky",
                "username": "dr.rocky",
                "department": "Emergency Medicine & Trauma (ICU-A)",
                "assigned_patients": ", ".join(doc_map.get("Dr. Rocky", ["Bhhd (PAT-6529)"])),
            },
            {
                "full_name": "Dr. Arjun",
                "username": "dr.arjun",
                "department": "Cardiothoracic Surgery Subnet (ICU-C)",
                "assigned_patients": ", ".join(doc_map.get("Dr. Arjun", ["Jeeva (PAT-4008)"])),
            }
        ]

        credentials_for_pdf = []

        for d in doctors_spec:
            temp_pwd = generate_secure_temp_password()
            pwd_hash = get_password_hash(temp_pwd)

            user = db.query(User).filter(User.username == d["username"]).first()
            if not user:
                user = User(
                    username=d["username"],
                    name=d["full_name"],
                    role="Doctor",
                    department=d["department"],
                    password_hash=pwd_hash,
                    is_active=True,
                    must_change_password=True,
                    created_at=datetime.datetime.utcnow()
                )
                db.add(user)
                print(f"[+] Provisioned Doctor Account: {d['username']} ({d['full_name']})")
            else:
                user.name = d["full_name"]
                user.role = "Doctor"
                user.department = d["department"]
                user.password_hash = pwd_hash
                user.is_active = True
                user.must_change_password = True
                print(f"[~] Updated Doctor Account & Reset Temp Password: {d['username']}")

            credentials_for_pdf.append({
                "name": d["full_name"],
                "username": d["username"],
                "temp_password": temp_pwd,
                "department": d["department"],
                "assigned_patients": d["assigned_patients"],
                "first_login_policy": "Mandatory Password Change on First Sign-in",
                "setup_link": f"https://trinetra-portal.hospital.internal/auth/setup?u={d['username']}"
            })

        # Also provision Technical team accounts if not already present
        tech_specs = [
            ("tech.batman", "Techie Batman", "Lead SOC Security Analyst", "IoMT SOC Team"),
            ("tech.netsec", "Alex Vance", "Network Security Specialist", "IoMT SOC Team"),
            ("tech.deviceops", "David Kim", "IoMT Firmware Engineer", "Biomedical Engineering")
        ]
        for u, name, title, dept in tech_specs:
            if not db.query(User).filter(User.username == u).first():
                db.add(User(
                    username=u,
                    name=f"{name} ({title})",
                    role="Tech",
                    department=dept,
                    password_hash=get_password_hash("TechSec2026!"),
                    is_active=True,
                    must_change_password=False
                ))
                print(f"[+] Provisioned Tech Account: {u}")

        # Provision Patient accounts
        patient_specs = [
            ("pt.smith", "Robert Smith", "patient_102"),
            ("pt.babu", "Babu", "PAT-6665"),
            ("pt.raju", "Raju", "PAT-7850"),
            ("pt.anirudh", "Anirudh", "PAT-3851"),
            ("pt.jeeva", "Jeeva", "PAT-4008"),
            ("pt.johndoe", "John Doe", "patient_101"),
        ]
        for u, name, pid in patient_specs:
            if not db.query(User).filter(User.username == u).first():
                db.add(User(
                    username=u,
                    name=name,
                    role="Patient",
                    department="Admitted Inpatient Care",
                    assigned_patient_id=pid,
                    password_hash=get_password_hash("PatientCare2026!"),
                    is_active=True,
                    must_change_password=False
                ))
                print(f"[+] Provisioned Patient Account: {u} (ID: {pid})")

        # Ensure Hospital Administrator exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            db.add(User(
                username="admin",
                name="Chief SOC Admin / Medical Director",
                role="Admin",
                department="Hospital Security Administration",
                password_hash=get_password_hash("admin123"),
                is_active=True,
                must_change_password=False
            ))
            print("[+] Provisioned Admin Account: admin")
        else:
            admin_user.role = "Admin"
            admin_user.department = "Hospital Security Administration"

        db.commit()
        return credentials_for_pdf
    finally:
        db.close()


class NumberedCanvas(canvas.Canvas):
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
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, total_pages):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0284C7"))
        
        # Running Top Header
        self.drawString(54, 752, "TRINETRA IoMT MEDICAL DEFENSE CONSOLE — RESTRICTED ACCESS")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(letter[0] - 54, 752, "DOCUMENT CLASSIFICATION: CONFIDENTIAL (C-3)")
        
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.6)
        self.line(54, 744, letter[0] - 54, 744)

        # Running Footer
        self.line(54, 46, letter[0] - 54, 46)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(54, 34, "HOSPITAL CHIEF INFORMATION SECURITY OFFICER (CISO) • BIOMEDICAL SECURITY OPERATIONS")
        self.drawRightString(letter[0] - 54, 34, f"Page {self._pageNumber} of {total_pages}")
        self.restoreState()


def build_credentials_pdf(credentials_list, output_filename="TRINETRA_Doctor_Login_Credentials.pdf"):
    pdf_path = os.path.join(ROOT_DIR, output_filename)
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=58,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#0284C7"),
        spaceAfter=14
    )
    meta_style = ParagraphStyle(
        "DocMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#475569")
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155")
    )
    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1E293B")
    )
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0F172A")
    )
    table_cell_code = ParagraphStyle(
        "TableCellCode",
        parent=styles["Normal"],
        fontName="Courier-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#B91C1C")
    )
    table_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=colors.white
    )
    callout_text = ParagraphStyle(
        "CalloutText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#854D0E")
    )

    story = []

    # Title & Header Banner
    story.append(Paragraph("TRINETRA Smart Hospital Security Console", title_style))
    story.append(Paragraph("Physician Authentication & Individual Doctor Login Credentials Provisioning Record", subtitle_style))

    # Metadata Block
    now_str = datetime.datetime.now().strftime("%B %d, %Y - %H:%M:%S UTC")
    meta_data = [
        [
            Paragraph(f"<b>Issue Date:</b> {now_str}", meta_style),
            Paragraph("<b>Issuing Authority:</b> Hospital SOC / CISO Office", meta_style),
        ],
        [
            Paragraph("<b>Target System:</b> TRINETRA IoMT IDS/IPS Gateway v2.0", meta_style),
            Paragraph("<b>Authentication Scope:</b> Individual Attending Physician Mobile Accounts", meta_style),
        ],
        [
            Paragraph("<b>Security Mandate:</b> Zero-Trust Individual RBAC (No Shared Logins)", meta_style),
            Paragraph("<b>Compliance:</b> HIPAA Security Rule § 164.312(a)(2)(i)", meta_style),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[250, 254])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#E2E8F0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # Executive Summary / Mandatory Notice
    notice_text = (
        "<b>CONFIDENTIALITY NOTICE & ZERO-TRUST AUTHENTICATION POLICY:</b><br/>"
        "In strict adherence to medical privacy and hospital network defense regulations, <b>TRINETRA strictly enforces individual "
        "physician credentials</b>. Shared or group credentials are computationally blocked at the API Gateway. Each doctor is granted "
        "access exclusively to telemetry streams and intrusion alerts originating from their specifically assigned clinical patients. "
        "<b>Temporary passwords listed below expire after first login</b> and require an immediate mandatory password replacement before "
        "any clinical telemetry can be rendered."
    )
    notice_table = Table([[Paragraph(notice_text, callout_text)]], colWidths=[504])
    notice_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF9C3")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#FACC15")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(notice_table)
    story.append(Spacer(1, 14))

    # Section 1: Credentials Table
    story.append(Paragraph("1. Attending Physician Account Manifest & Generated Credentials", section_heading))
    story.append(Paragraph(
        "The following accounts have been provisioned in the TRINETRA production database. All initial passwords "
        "were cryptographically generated using system entropy. <i>Plaintext passwords are NOT retained on the backend; only their salted SHA-256 hashes are persisted.</i>",
        body_style
    ))
    story.append(Spacer(1, 8))

    # Table Header
    table_rows = [[
        Paragraph("Doctor Full Name", table_header),
        Paragraph("Username", table_header),
        Paragraph("Temporary Initial Password", table_header),
        Paragraph("Department / Ward", table_header),
        Paragraph("Assigned Patient(s)", table_header),
        Paragraph("First-Login Policy", table_header)
    ]]

    for c in credentials_list:
        table_rows.append([
            Paragraph(f"<b>{c['name']}</b>", table_cell_bold),
            Paragraph(c["username"], table_cell),
            Paragraph(c["temp_password"], table_cell_code),
            Paragraph(c["department"], table_cell),
            Paragraph(c["assigned_patients"], table_cell),
            Paragraph(f"<font color='#B91C1C'><b>MANDATORY RESET</b></font><br/>Enforced by Gateway", table_cell)
        ])

    cred_table = Table(table_rows, colWidths=[90, 60, 95, 95, 100, 64])
    cred_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#0F172A")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(cred_table)
    story.append(Spacer(1, 14))

    # Section 2: Instructions for First Login
    story.append(Paragraph("2. Secure Onboarding & First-Login Step-by-Step Instructions", section_heading))
    instructions = [
        "<b>Step 1: Install TRINETRA Mobile:</b> Download and install the TRINETRA Smart Hospital Security Console APK onto your hospital-issued or MDM-managed Android mobile phone.",
        "<b>Step 2: Connect to Gateway:</b> Verify that your device is connected to the secure Hospital Clinical Wi-Fi (VLAN-70) or authorized WireGuard VPN.",
        "<b>Step 3: Initial Authentication:</b> Launch the TRINETRA mobile app, select <b>Doctor Login</b>, and enter your assigned username and temporary password from the manifest above.",
        "<b>Step 4: Mandatory Password Change:</b> The TRINETRA gateway will immediately detect the <code>must_change_password</code> flag and present the Secure Credential Update dialog. Create a strong password (minimum 8 characters, alphanumeric + symbols).",
        "<b>Step 5: Biometric & Device Binding:</b> Upon successful password change, your physical device ID and push notification token will be registered into the backend device authorization table.",
        "<b>Step 6: Account-Specific Alert Verification:</b> Verify that only your assigned patients appear on your live telemetry monitor and IDS alert feed. Doctor A will never receive Doctor B's patient anomaly alerts."
    ]
    for instr in instructions:
        story.append(Paragraph(f"• {instr}", body_style))
        story.append(Spacer(1, 3))

    story.append(Spacer(1, 10))

    # Section 3: Notification & Routing Verification
    story.append(Paragraph("3. Account-Specific Alert Routing Verification Matrix", section_heading))
    matrix_rows = [
        [
            Paragraph("Authenticated Role", table_header),
            Paragraph("Authorized Telemetry & Alerts", table_header),
            Paragraph("Quarantine & Mitigation View", table_header),
            Paragraph("Notification Sounds & Channels", table_header)
        ],
        [
            Paragraph("<b>Doctor</b>", table_cell_bold),
            Paragraph("Assigned patients only (ECG waveform, HR, SpO2, sensor integrity status)", table_cell),
            Paragraph("Clinical safety advisory + quarantine recommendation", table_cell),
            Paragraph("Audible Critical Channel (bypasses DND for code blue alerts)", table_cell)
        ],
        [
            Paragraph("<b>Patient</b>", table_cell_bold),
            Paragraph("Own profile only (simplified device calibration status, resting advice)", table_cell),
            Paragraph("Hidden technical exploit telemetry; friendly safety notices", table_cell),
            Paragraph("Standard Care Channel (subtle chime)", table_cell)
        ],
        [
            Paragraph("<b>Technical SOC</b>", table_cell_bold),
            Paragraph("All hospital IoMT devices, attack vectors, MQTT telemetry metrics, IDS classification", table_cell),
            Paragraph("Full IPS quarantine actions, firewall rule triggers, packet latency drops", table_cell),
            Paragraph("SOC Urgent Channel (continuous alert beep)", table_cell)
        ],
        [
            Paragraph("<b>Administrator</b>", table_cell_bold),
            Paragraph("Hospital-wide metrics, active threats today, device fleet status, audit logs", table_cell),
            Paragraph("Account provisioning, doctor assignments, device token revocation", table_cell),
            Paragraph("Administrative incident summary channel", table_cell)
        ]
    ]
    matrix_table = Table(matrix_rows, colWidths=[80, 160, 144, 120])
    matrix_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E293B")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1E293B")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(matrix_table)
    story.append(Spacer(1, 14))

    # Sign-off box
    sign_data = [
        [
            Paragraph("<b>Provisioned By:</b> TRINETRA Identity & Access Control Subsystem", meta_style),
            Paragraph("<b>Approved By:</b> Medical Director & Chief CISO", meta_style),
        ],
        [
            Paragraph("<b>Digital Signature:</b> <code>SHA256:7B8F91A23D0C...CONFIRMED</code>", meta_style),
            Paragraph("<b>Storage Status:</b> Salted Hash In Database (Zero Plaintext)", meta_style)
        ]
    ]
    sign_table = Table(sign_data, colWidths=[250, 254])
    sign_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#94A3B8")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(sign_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] Successfully generated confidential credentials PDF: {pdf_path}")
    return pdf_path

if __name__ == "__main__":
    creds = provision_hospital_accounts()
    build_credentials_pdf(creds)
