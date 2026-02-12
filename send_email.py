import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

smtp_server = "smtp.gmail.com"
smtp_port = 587
email = "collin.marnell@gmail.com"
password = "nkixmbomynslllxf"

msg = MIMEMultipart()
msg["From"] = email
msg["To"] = email
msg["Subject"] = "Speakeasy - System Architecture & Data Flow"

body = """Hi Collin,

Attached is the comprehensive system architecture document for Speakeasy covering:

- Executive summary
- Architecture diagram
- Detailed data flow (submission, grading pipeline, analytics)
- Component descriptions
- Security overview
- Third-party services and certifications
- Data retention and privacy notes

The document is in Markdown format, ready for PDF conversion if needed.

Best,
Jarvis"""

msg.attach(MIMEText(body, "plain"))

with open("/home/ubuntu/clawd/speakeasy-temp/docs/system-architecture.md", "rb") as f:
    part = MIMEBase("application", "octet-stream")
    part.set_payload(f.read())
    encoders.encode_base64(part)
    part.add_header("Content-Disposition", "attachment; filename=speakeasy-system-architecture.md")
    msg.attach(part)

with smtplib.SMTP(smtp_server, smtp_port) as server:
    server.starttls()
    server.login(email, password)
    server.sendmail(email, email, msg.as_string())
    print("Email sent successfully!")
