
import React, { useState, useRef } from 'react';
import { Participant } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { generatePrPdf } from '../services/pdfService';

interface SuccessViewProps {
  participant: Participant;
  onRegisterAnother: () => void;
}

// New component for displaying the review
const PRReviewDisplay: React.FC<{ review: Participant['prDraftReview'] }> = ({ review }) => {
  const scoreColor = review.score >= 8 ? 'text-green-600' : review.score >= 5 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 className="text-md font-semibold text-gray-800 mb-3">AI-Powered PR Review</h4>
      <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
        <div className="flex-shrink-0">
          <div className={`relative h-20 w-20`}>
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <path
                className="text-gray-200"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <path
                className={`${scoreColor} transition-all duration-1000 ease-out`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeDasharray={`${review.score * 10}, 100`}
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
              />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${scoreColor}`}>
              {review.score}<span className="text-base font-normal text-gray-500">/10</span>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <ul className="space-y-1.5 list-disc list-inside">
            {review.feedback.map((item, index) => (
              <li key={index} className="text-sm text-gray-700">{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const SuccessView: React.FC<SuccessViewProps> = ({ participant, onRegisterAnother }) => {
  const [editedPr, setEditedPr] = useState(participant.prDraft);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = () => {
    generatePrPdf(participant, editedPr);
  };
  
  const handleDownloadQr = () => {
    if (!qrCodeRef.current) return;

    const svgElement = qrCodeRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    
    // Render at a higher resolution for better quality
    const scale = 3;
    const svgSize = svgElement.getBoundingClientRect();
    canvas.width = svgSize.width * scale;
    canvas.height = svgSize.height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR_Code_${participant.name.replace(/\s/g, '_')}.png`;
      downloadLink.href = pngFile;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };


  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-4xl mx-auto animate-fade-in">
      <div className="text-center">
        <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Registration Successful!</h2>
        <p className="mt-2 text-sm text-gray-600">
          Welcome, {participant.name}! Your details have been saved and your PR draft is ready.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <h3 className="text-lg font-medium text-gray-900">Generated PR Draft</h3>
          <p className="text-sm text-gray-500 mb-2">You can edit the text below. An AI-powered review is provided for your reference.</p>
          <textarea
            value={editedPr}
            onChange={(e) => setEditedPr(e.target.value)}
            rows={8}
            className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
          />
          <PRReviewDisplay review={participant.prDraftReview} />
        </div>
        <div className="flex flex-col items-center justify-start bg-gray-50 p-4 rounded-md">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Your Unique QR Code</h3>
          <div className="p-2 bg-white rounded-lg shadow-inner" ref={qrCodeRef}>
             <QRCodeSVG value={participant.id} size={160} />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">Use this for attendance confirmation.</p>
          <button
            onClick={handleDownloadQr}
            className="mt-3 inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="-ml-0.5 mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            Download QR
          </button>
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row-reverse items-center justify-between gap-4">
        <div className="flex gap-4">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Save PR as PDF
            </button>
        </div>
        <button
          onClick={onRegisterAnother}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Register Another Participant
        </button>
      </div>
    </div>
  );
};

export default SuccessView;