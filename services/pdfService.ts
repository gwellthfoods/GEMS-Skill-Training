
import jsPDF from 'jspdf';
import { Participant } from '../types';

// A simple function to add a header to the PDFs
const addHeader = (doc: jsPDF, title: string) => {
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('GWellth Skill Training Program', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 35, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.line(20, 45, doc.internal.pageSize.getWidth() - 20, 45);
  doc.setFontSize(12);
};

export const generatePrPdf = (participant: Participant, prText: string) => {
  const doc = new jsPDF();
  addHeader(doc, 'Public Relations Draft');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Participant: ${participant.name}`, 20, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const splitText = doc.splitTextToSize(prText, 170); // 170 is width of text area
  doc.text(splitText, 20, 75);

  doc.save(`PR_Draft_${participant.name.replace(/\s/g, '_')}.pdf`);
};

export const generateCertificatePdf = (participant: Participant) => {
    const doc = new jsPDF('landscape');
    
    // Border
    doc.setLineWidth(1.5);
    doc.rect(5, 5, doc.internal.pageSize.width - 10, doc.internal.pageSize.height - 10);
    
    // Header
    doc.setFontSize(32);
    doc.setFont('times', 'bold');
    doc.text('GWellth', doc.internal.pageSize.width / 2, 30, { align: 'center' });
    doc.setFontSize(16);
    doc.setFont('times', 'normal');
    doc.text('Skill Training Program', doc.internal.pageSize.width / 2, 40, { align: 'center' });

    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('Certificate of Completion', doc.internal.pageSize.width / 2, 65, { align: 'center' });

    doc.setFontSize(16);
    doc.text('This is to certify that', doc.internal.pageSize.width / 2, 85, { align: 'center' });

    doc.setFontSize(24);
    doc.setFont('times', 'bolditalic');
    doc.text(participant.name, doc.internal.pageSize.width / 2, 105, { align: 'center' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    const completionText = `has successfully completed the skill training program in`;
    doc.text(completionText, doc.internal.pageSize.width / 2, 120, { align: 'center' });
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(participant.programEnrolled, doc.internal.pageSize.width / 2, 135, { align: 'center' });

    doc.setFontSize(14);
    doc.text(`from ${participant.startDate} to ${participant.endDate}`, doc.internal.pageSize.width / 2, 145, { align: 'center' });

    // Signatures
    const signatureY = 180;
    doc.setLineWidth(0.5);
    doc.line(40, signatureY, 120, signatureY);
    doc.line(doc.internal.pageSize.width - 120, signatureY, doc.internal.pageSize.width - 40, signatureY);

    doc.text('Program Coordinator', 80, signatureY + 5, { align: 'center' });
    doc.text('HR Manager', doc.internal.pageSize.width - 80, signatureY + 5, { align: 'center' });
    
    doc.save(`Certificate_${participant.name.replace(/\s/g, '_')}.pdf`);
};

export const generateInternLetterPdf = (participant: Participant) => {
    const doc = new jsPDF();
    addHeader(doc, 'Internship Offer Letter');
    
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 60);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`To,`, 20, 70);
    doc.text(participant.name, 20, 75);
    doc.text(participant.address1, 20, 80);
    doc.text(participant.city, 20, 85);

    doc.setFont('helvetica', 'normal');
    doc.text('Dear ' + participant.name + ',', 20, 100);

    const letterBody = `We are pleased to offer you an internship position at GWellth as part of our Skill Training Program. Your internship will focus on "${participant.programEnrolled}".\n\nThis opportunity is designed to provide you with hands-on experience in the field of food processing and agriculture. Your internship is scheduled to begin on ${participant.startDate} and will conclude on ${participant.endDate}.\n\nWe are confident that you will make a significant contribution to our team and are excited to welcome you.\n\nSincerely,`;
    
    const splitBody = doc.splitTextToSize(letterBody, 170);
    doc.text(splitBody, 20, 110);
    
    doc.text('The GWellth Team', 20, 180);
    
    doc.save(`Intern_Letter_${participant.name.replace(/\s/g, '_')}.pdf`);
};
