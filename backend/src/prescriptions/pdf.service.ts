import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PdfService {
  constructor(private prisma: PrismaService) { }

  /**
   * Generate prescription PDF
   */
  async generatePrescriptionPDF(prescriptionId: string, res: Response) {
    // Fetch prescription with all details
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: {
          include: {
            vitals: true,
          },
        },
        doctor: true,
        items: {
          include: {
            medicine: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=prescription_${prescription.patient.token}_${Date.now()}.pdf`,
    );

    // Pipe PDF to response
    doc.pipe(res);

    // ========== HEADER ==========
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#4F46E5')
      .text('HMS Hospital', 50, 50);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6B7280')
      .text('Modern Healthcare Management System', 50, 80)
      .text('Address: 123 Medical Street, Healthcare City', 50, 95)
      .text('Phone: +1 (555) 123-4567 | Email: info@hms-hospital.com', 50, 110);

    // Horizontal line
    doc
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .moveTo(50, 130)
      .lineTo(545, 130)
      .stroke();

    // ========== PRESCRIPTION TITLE ==========
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('PRESCRIPTION', 50, 150);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6B7280')
      .text(`Date: ${new Date(prescription.createdAt).toLocaleDateString()}`, 50, 175)
      .text(`Prescription ID: ${prescription.id.slice(0, 8).toUpperCase()}`, 50, 190);

    // ========== PATIENT & DOCTOR INFO ==========
    let yPosition = 220;

    // Patient Info Box
    doc
      .rect(50, yPosition, 240, 100)
      .fillAndStroke('#F3F4F6', '#E5E7EB');

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('PATIENT INFORMATION', 60, yPosition + 10);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#374151')
      .text(`Name: ${prescription.patient.name}`, 60, yPosition + 30)
      .text(`Age: ${prescription.patient.age} | Gender: ${prescription.patient.gender}`, 60, yPosition + 45)
      .text(`Mobile: ${prescription.patient.mobile}`, 60, yPosition + 60)
      .text(`Token: #${prescription.patient.token}`, 60, yPosition + 75);

    // Doctor Info Box
    doc
      .rect(305, yPosition, 240, 100)
      .fillAndStroke('#EEF2FF', '#C7D2FE');

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('DOCTOR INFORMATION', 315, yPosition + 10);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#374151')
      .text(`Dr. ${prescription.doctor.name}`, 315, yPosition + 30)
      .text(`Specialty: ${prescription.doctor.specialty}`, 315, yPosition + 45)
      .text(`Registration: ${prescription.doctor.username}`, 315, yPosition + 60);

    yPosition += 120;

    // ========== VITALS (if available) ==========
    if (prescription.patient.vitals) {
      const vitals = prescription.patient.vitals;

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#1F2937')
        .text('VITALS', 50, yPosition);

      yPosition += 20;

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#374151')
        .text(
          `BP: ${vitals.bp}  |  Pulse: ${vitals.pulse} bpm  |  Temp: ${vitals.temperature}°F  |  SpO2: ${vitals.spo2}%  |  Weight: ${vitals.weight} kg  |  BMI: ${vitals.bmi}`,
          50,
          yPosition,
        );

      yPosition += 30;
    }

    // ========== DIAGNOSIS ==========
    if (prescription.diagnosis) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#1F2937')
        .text('DIAGNOSIS', 50, yPosition);

      yPosition += 20;

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#374151')
        .text(prescription.diagnosis, 50, yPosition, { width: 495 });

      yPosition += 40;
    }

    // ========== MEDICINES TABLE ==========
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1F2937')
      .text('MEDICINES', 50, yPosition);

    yPosition += 25;

    // Table Header
    doc
      .rect(50, yPosition, 495, 25)
      .fillAndStroke('#4F46E5', '#4F46E5');

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#FFFFFF')
      .text('Medicine Name', 60, yPosition + 8, { width: 150 })
      .text('Dosage', 220, yPosition + 8, { width: 80 })
      .text('Frequency', 310, yPosition + 8, { width: 100 })
      .text('Duration', 420, yPosition + 8, { width: 100 });

    yPosition += 25;

    // Table Rows
    prescription.items.forEach((item, index) => {
      const rowColor = index % 2 === 0 ? '#F9FAFB' : '#FFFFFF';

      doc
        .rect(50, yPosition, 495, 30)
        .fillAndStroke(rowColor, '#E5E7EB');

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#1F2937')
        .text(item.medicine.name, 60, yPosition + 10, { width: 150 })
        .text(item.dosage, 220, yPosition + 10, { width: 80 })
        .text(String(item.frequency), 310, yPosition + 10, { width: 100 })
        .text(String(item.duration), 420, yPosition + 10, { width: 100 });

      yPosition += 30;

      // Instructions (if any)
      if (item.instructions) {
        doc
          .fontSize(8)
          .font('Helvetica-Oblique')
          .fillColor('#6B7280')
          .text(`Note: ${item.instructions}`, 60, yPosition, { width: 475 });

        yPosition += 20;
      }
    });

    yPosition += 10;

    // ========== NOTES ==========
    if (prescription.notes) {
      yPosition += 10;

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#1F2937')
        .text('NOTES', 50, yPosition);

      yPosition += 20;

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#374151')
        .text(prescription.notes, 50, yPosition, { width: 495 });

      yPosition += 40;
    }

    // ========== SIGNATURE ==========
    yPosition += 30;

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#374151')
      .text('Doctor\'s Signature: _________________________', 320, yPosition);

    yPosition += 40;

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#9CA3AF')
      .text(`Dr. ${prescription.doctor.name}`, 320, yPosition)
      .text(prescription.doctor.specialty, 320, yPosition + 12);

    // ========== FOOTER ==========
    doc
      .fontSize(8)
      .font('Helvetica-Oblique')
      .fillColor('#9CA3AF')
      .text(
        'This is a computer-generated prescription. Valid for 30 days from the date of issue.',
        50,
        750,
        { align: 'center', width: 495 },
      );

    // Finalize PDF
    doc.end();
  }
}
