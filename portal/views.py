import io
import uuid
from django.http import HttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from .forms import ApplicationForm
from .models import Application

DEMO_TITLE = "Bharat Janseva Demo Bank"
POSITION = "Customer Service Associate (Demo)"

def health(request):
    return HttpResponse("ok", content_type="text/plain")

def home(request):
    return render(request, "portal/home.html", {"position": POSITION, "demo_title": DEMO_TITLE})

@require_http_methods(["GET", "POST"])
def apply(request):
    if request.method == "POST":
        raw_key = request.POST.get("submission_key", "")
        try:
            submission_key = uuid.UUID(raw_key)
        except (ValueError, TypeError, AttributeError):
            submission_key = None
        if submission_key:
            existing = Application.objects.filter(submission_key=submission_key).first()
            if existing:
                return redirect("receipt", reference=existing.reference)
        form = ApplicationForm(request.POST)
        if form.is_valid() and submission_key:
            application = form.save(commit=False)
            application.submission_key = submission_key
            application.save()
            return redirect("receipt", reference=application.reference)
        if not submission_key:
            form.add_error(None, "Please refresh the form and submit again.")
    else:
        form = ApplicationForm()
    return render(request, "portal/apply.html", {
        "form": form, "submission_key": uuid.uuid4(), "position": POSITION, "demo_title": DEMO_TITLE,
    })

def receipt(request, reference):
    application = get_object_or_404(Application, reference=reference)
    return render(request, "portal/receipt.html", {"application": application, "demo_title": DEMO_TITLE})

def receipt_pdf(request, reference):
    application = get_object_or_404(Application, reference=reference)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=22*mm, bottomMargin=20*mm)
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="DemoTitle", parent=styles["Title"], textColor=colors.HexColor("#123b5d"), fontSize=18, leading=22, spaceAfter=5))
    styles.add(ParagraphStyle(name="Notice", parent=styles["Normal"], textColor=colors.HexColor("#9b3c21"), backColor=colors.HexColor("#fff1e8"), borderPadding=8, leading=15))
    story = [
        Paragraph("BHARAT JANSEVA DEMO BANK", styles["DemoTitle"]),
        Paragraph("APPLICATION SUBMISSION RECEIPT · DEMONSTRATION ONLY", styles["Heading2"]),
        Spacer(1, 7*mm),
        Paragraph("<b>DEMO ONLY — NOT AN OFFICIAL BANK RECEIPT</b><br/>This independent software demonstration is not affiliated with any real bank or recruitment authority. No job application has been made to an actual employer.", styles["Notice"]),
        Spacer(1, 8*mm),
        Paragraph("Application details", styles["Heading2"]),
    ]
    rows = [
        ["Reference number", str(application.reference)],
        ["Applicant name", application.full_name],
        ["Position", application.position],
        ["Email", application.email],
        ["Phone (test)", application.phone],
        ["Location", f"{application.city}, {application.state}"],
        ["Qualification", application.qualification],
        ["Passing year", str(application.passing_year)],
        ["Submitted at", timezone.localtime(application.submitted_at).strftime("%d %b %Y, %I:%M %p IST")],
        ["Status", "DEMO SUBMISSION RECORDED"],
    ]
    table = Table(rows, colWidths=[48*mm, 112*mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#eef3f7")),
        ("TEXTCOLOR", (0,0), (0,-1), colors.HexColor("#25445e")),
        ("FONTNAME", (0,0), (-1,-1), "Helvetica"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("GRID", (0,0), (-1,-1), .4, colors.HexColor("#d8e0e7")),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ]))
    story += [table, Spacer(1, 12*mm), Paragraph("Keep this receipt only as proof that the demo form was submitted to this test website. It is not proof of eligibility, selection, employment, or recruitment.", styles["BodyText"])]
    def watermark(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(colors.Color(.85, .2, .12, alpha=.14))
        canvas.setFont("Helvetica-Bold", 42)
        canvas.translate(A4[0]/2, A4[1]/2)
        canvas.rotate(35)
        canvas.drawCentredString(0, 0, "DEMO ONLY")
        canvas.restoreState()
    doc.build(story, onFirstPage=watermark, onLaterPages=watermark)
    response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="demo-receipt-{application.reference}.pdf"'
    return response
