import React, { useState, useMemo } from 'react';
import { Participant } from '../types';
import { generateCertificatePdf, generateInternLetterPdf } from '../services/pdfService';
import QRCodeScanner from './QRCodeScanner';
import { QRCodeSVG } from 'qrcode.react';

interface AdminDashboardProps {
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  onLogout: () => void;
  googleSheetUrl: string;
  setGoogleSheetUrl: React.Dispatch<React.SetStateAction<string>>;
}

const StatusBadge: React.FC<{ status: Participant['status'] }> = ({ status }) => {
    const statusStyles: { [key in Participant['status']]: string } = {
        Active: 'bg-green-100 text-green-800',
        Completed: 'bg-blue-100 text-blue-800',
        Dropped: 'bg-red-100 text-red-800',
        'Checked-In': 'bg-purple-100 text-purple-800',
    };
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status]}`}>
            {status}
        </span>
    );
};

const ParticipantCard: React.FC<{
  participant: Participant;
  onStatusChange: (newStatus: Participant['status']) => void;
  onViewDetails: () => void;
}> = ({ participant, onStatusChange, onViewDetails }) => {
  return (
    <div onClick={onViewDetails} className="bg-white rounded-lg shadow-md transition-shadow duration-300 hover:shadow-xl flex flex-col cursor-pointer">
      <div className="p-4 flex items-start gap-4">
        <img src={participant.photo} alt={participant.name} className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 transition-all duration-300 ease-in-out hover:scale-110 hover:border-green-500" />
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold text-gray-900 leading-tight">{participant.name}</h3>
            <StatusBadge status={participant.status} />
          </div>
          <p className="text-sm text-green-700 font-medium">{participant.programEnrolled}</p>
          <p className="text-sm text-gray-500 mt-1">{participant.email}</p>
          <p className="text-sm text-gray-500">{participant.mobile}</p>
        </div>
      </div>
      <div className="mt-auto px-4 py-3 bg-gray-50 border-t grid grid-cols-2 gap-4 items-center">
        <div>
          <label htmlFor={`status-${participant.id}`} className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            id={`status-${participant.id}`}
            value={participant.status}
            onClick={(e) => e.stopPropagation()} // Prevent card click when changing status
            onChange={(e) => onStatusChange(e.target.value as Participant['status'])}
            className="block w-full pl-2 pr-7 py-1 text-xs border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 rounded-md"
          >
            <option>Active</option>
            <option>Checked-In</option>
            <option>Completed</option>
            <option>Dropped</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); generateInternLetterPdf(participant); }}
            className="w-full text-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-md hover:bg-blue-200"
          >
            Intern Letter
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); generateCertificatePdf(participant); }}
            className="w-full text-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-md hover:bg-green-200"
          >
            Certificate
          </button>
        </div>
      </div>
    </div>
  );
};

const PRReviewDisplay: React.FC<{ review: Participant['prDraftReview'] }> = ({ review }) => {
  const scoreColor = review.score >= 8 ? 'text-green-600' : review.score >= 5 ? 'text-yellow-600' : 'text-red-600';
  return (
    <div className="mt-4 p-4 bg-gray-100 rounded-lg border">
      <h4 className="text-md font-semibold text-gray-800 mb-3">AI-Powered PR Review</h4>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className={`relative h-16 w-16`}>
            <svg className="w-full h-full" viewBox="0 0 36 36"><path className="text-gray-200" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" /><path className={`${scoreColor} transition-all duration-1000 ease-out`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" strokeDasharray={`${review.score * 10}, 100`} strokeLinecap="round" transform="rotate(-90 18 18)" /></svg>
            <div className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${scoreColor}`}>
              {review.score}<span className="text-sm font-normal text-gray-500">/10</span>
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

const DetailItem: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 break-words">{value || 'N/A'}</dd>
    </div>
);


const ParticipantDetailView: React.FC<{ participant: Participant, onClose: () => void }> = ({ participant, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-gray-50 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b flex justify-between items-start sticky top-0 bg-gray-50 z-10">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{participant.name}</h2>
                    <p className="text-sm text-gray-500">{participant.id}</p>
                </div>
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="p-4 sm:p-6 space-y-8">
                {/* --- Top Section --- */}
                <section className="grid md:grid-cols-3 gap-6 items-start">
                    <div className="flex flex-col items-center">
                        <img src={participant.photo} alt={participant.name} className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg" />
                    </div>
                    <div className="md:col-span-2 bg-white p-4 rounded-lg shadow-inner">
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                            <div><dt className="text-sm font-medium text-gray-500">Status</dt><dd className="mt-1"><StatusBadge status={participant.status} /></dd></div>
                            <DetailItem label="Category" value={participant.targetAudience} />
                            <DetailItem label="Program" value={participant.programEnrolled} />
                            <DetailItem label="Duration" value={`${participant.startDate} to ${participant.endDate}`} />
                        </dl>
                    </div>
                </section>
                
                {/* --- Biodata Section --- */}
                <section>
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Biodata</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <DetailItem label="Email Address" value={participant.email} />
                        <DetailItem label="Mobile Number" value={participant.mobile} />
                        <DetailItem label="Current Address" value={`${participant.address1}, ${participant.address2}, ${participant.city} - ${participant.pinCode}`} />
                        <DetailItem label="Native Address" value={participant.nativeAddress} />
                        <DetailItem label="College" value={participant.collegeName} />
                        <DetailItem label="Course" value={participant.course} />
                        <DetailItem label="Referred By" value={participant.referredBy} />
                    </dl>
                </section>
                
                {/* --- Personal Info Section --- */}
                <section>
                     <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Personal Information</h3>
                     <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <DetailItem label="Hobbies" value={participant.hobbies} />
                        <DetailItem label="Goals" value={participant.goals} />
                        <div className="sm:col-span-2"><DetailItem label="Other Info" value={participant.other} /></div>
                    </dl>
                </section>

                {/* --- PR & QR Section --- */}
                <section className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">PR Draft</h3>
                        <p className="text-sm text-gray-700 bg-white p-4 rounded-md shadow-inner italic leading-relaxed">"{participant.prDraft}"</p>
                        <PRReviewDisplay review={participant.prDraftReview} />
                    </div>
                    <div className="flex flex-col items-center justify-center bg-white p-4 rounded-lg shadow-inner">
                        <h4 className="text-md font-medium text-gray-900 mb-2">Unique QR Code</h4>
                        <div className="p-2 bg-white rounded-lg">
                            <QRCodeSVG value={participant.id} size={128} />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </div>
);


const AdminDashboard: React.FC<AdminDashboardProps> = ({ participants, setParticipants, onLogout, googleSheetUrl, setGoogleSheetUrl }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [programFilter, setProgramFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
    const [copied, setCopied] = useState(false);

    const appsScriptCode = `function doPost(e) {
  try {
    // --- Step 1: Access the Spreadsheet ---
    // IMPORTANT: Make sure your sheet is named "Participants". If not, change the name here.
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Participants");
    if (!sheet) {
      // Fallback to the first available sheet if "Participants" is not found.
      sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    }
    
    // Parse the incoming data from the GEMS registration form.
    var data = JSON.parse(e.postData.contents);

    // --- Step 2: Read the Headers from the Sheet ---
    // This is the key step. The script reads the first row of your sheet to get the column names.
    // This makes the integration flexible; you can reorder columns in the sheet without breaking the app.
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // --- Step 3: Map Data to Columns using Headers ---
    // The script iterates through the headers it just read. For each header (e.g., "name"),
    // it finds the matching piece of data from the submitted form and builds a new row in the correct order.
    var newRow = headers.map(function(header) {
      // Special handling for complex data like the PR review object, which is stored as a JSON string.
      if (header === 'prDraftReview' && typeof data[header] === 'object' && data[header] !== null) {
        return JSON.stringify(data[header]);
      }
      // Truncate very long base64 strings for photos and QR codes to avoid exceeding cell limits.
      if ((header === 'photo' || header === 'qrCode') && data[header] && data[header].length > 500) {
        return data[header].substring(0, 22) + '... [TRUNCATED]';
      }
      // If a header in the sheet doesn't have matching data from the form, it leaves the cell blank.
      return data[header] !== undefined ? data[header] : "";
    });

    // --- Step 4: Append the New Row ---
    // The perfectly ordered row is added to the bottom of the sheet.
    sheet.appendRow(newRow);

    // --- Step 5: Return a Success Response ---
    // This response is sent back, though the GEMS app doesn't process it due to CORS mode.
    // It's useful for testing the script directly.
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "success", "row": sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // If anything goes wrong, return an error message.
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(appsScriptCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const programOptions = useMemo(() => [
        "All", 
        ...Array.from(new Set(participants.map(p => p.programEnrolled)))
    ], [participants]);
    
    const statusOptions = ["All", "Active", "Checked-In", "Completed", "Dropped"];

    const handleStatusChange = (participantId: string, newStatus: Participant['status']) => {
        const updatedParticipants = participants.map(p =>
            p.id === participantId ? { ...p, status: newStatus } : p
        );
        setParticipants(updatedParticipants);
    };

    const handleScanSuccess = (participantId: string) => {
      const participant = participants.find(p => p.id === participantId);
      if (participant) {
          if (participant.status === 'Checked-In') {
              alert(`${participant.name} is already checked in.`);
          } else {
              handleStatusChange(participantId, 'Checked-In');
              alert(`Success! ${participant.name} has been checked in.`);
          }
      } else {
          alert("Participant not found. The QR code may be invalid.");
      }
      setIsScannerOpen(false);
    };

    const filteredParticipants = useMemo(() => participants.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesProgram = programFilter === 'All' || p.programEnrolled === programFilter;
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
        return matchesSearch && matchesProgram && matchesStatus;
    }), [participants, searchTerm, programFilter, statusFilter]);


    return (
        <div className="space-y-6">
             {!(googleSheetUrl && googleSheetUrl.startsWith('https://script.google.com')) && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-md shadow">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-800">
                      Action Required: Configure Google Sheet Integration
                    </p>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        The Web App URL for Google Sheets is not set. New participant registrations cannot be saved until this is configured. 
                        <a href="#config" className="font-semibold underline hover:text-yellow-800"> Please scroll down to the configuration section to set it up.</a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-grow">
                    <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
                    <p className="text-sm text-gray-600">
                        Showing {filteredParticipants.length} of {participants.length} total participants.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                      onClick={() => setIsScannerOpen(true)}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h-1m-2-13h1m-1 14v1m-13-2h1m14 0h1M4 12H3m3-8h1M4 8V7m13 2V8m-2 13v-1m-1-14v-1m-10 2v1m-1-11h-1M7 4H6m11 3v1M7 7V6m7 14v-1" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9h6v6H9z" /></svg>
                      Scan Attendance
                  </button>
                  <button
                      onClick={onLogout}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                      Logout
                  </button>
                </div>
            </div>
            
            <div id="config" className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration</h3>
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-sm text-blue-800 mb-4">
                      <p><span className="font-bold">Important:</span> To connect your Google Sheet, you must generate a special "Web App URL". The regular link to your spreadsheet will not work. Follow the steps below to create this URL.</p>
                    </div>
                    <div>
                        <label htmlFor="googleSheetUrl" className="block text-sm font-medium text-gray-700">
                        Google Sheet Web App URL
                        </label>
                        <div className="mt-1">
                        <input
                            type="url"
                            id="googleSheetUrl"
                            placeholder="e.g., https://script.google.com/macros/s/AKfycb.../exec"
                            value={googleSheetUrl}
                            onChange={(e) => setGoogleSheetUrl(e.target.value)}
                            className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                          <details className="bg-gray-50 p-3 rounded-md border">
                            <summary className="cursor-pointer font-medium text-green-700 hover:underline text-sm">
                              Click here for a Step-by-Step Guide to Get Your URL
                            </summary>
                            <div className="mt-4 space-y-4 text-sm text-gray-700">
                                <div>
                                    <h4 className="font-semibold text-gray-800">Step 1: Open Apps Script</h4>
                                    <p className="mt-1">Go to your Google Sheet, then click <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs">Extensions &gt; Apps Script</code> in the menu. <a href="https://docs.google.com/spreadsheets/d/1Qk7y7oLAJuvabmKjbG1H65kRnOdOwrtKyFCk3Hvymds/edit?usp=drive_link" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-semibold">Click here to open your sheet.</a></p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800">Step 2: Paste the Code</h4>
                                    <p className="mt-1">A new browser tab will open. Delete any existing code and paste the complete script below.</p>
                                    <div className="relative bg-gray-800 text-white p-4 rounded-md my-2 text-xs font-mono">
                                        <button onClick={handleCopy} className="absolute top-2 right-2 px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs transition-colors">
                                            {copied ? 'Copied!' : 'Copy'}
                                        </button>
                                        <pre className="overflow-x-auto whitespace-pre-wrap"><code>{appsScriptCode}</code></pre>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800">Step 3: Deploy as a Web App</h4>
                                    <p className="mt-1">Click the blue <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs">Deploy</code> button, select <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs">New deployment</code>, and use these exact settings:</p>
                                    <ul className="list-disc list-inside ml-4 mt-2 bg-white p-3 rounded border text-gray-800">
                                        <li><strong>Type:</strong> Web app</li>
                                        <li><strong>Execute as:</strong> Me (your email)</li>
                                        <li><strong>Who has access:</strong> Anyone</li>
                                    </ul>
                                    <p className="mt-2">Click <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs">Deploy</code> again and authorize the permissions when prompted.</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-red-600">Step 4: Copy the Final URL</h4>
                                    <p className="mt-1">After deploying, a new window will show your <strong className="text-red-600">Web app URL</strong>. This is the URL you need. Copy it and paste it into the input field above.</p>
                                </div>
                                <div className="pt-3 border-t text-xs text-gray-500">
                                    <p><strong className="font-medium">Why are these steps needed?</strong> This secure process turns your spreadsheet into a simple database that our app can safely add data to. It gives you full control and ensures your Google account remains secure.</p>
                                </div>
                            </div>
                          </details>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Filters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                        <select
                            value={programFilter}
                            onChange={(e) => setProgramFilter(e.target.value)}
                            className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        >
                            {programOptions.map(opt => <option key={opt} value={opt}>{opt === 'All' ? 'All Programs' : opt}</option>)}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        >
                            {statusOptions.map(opt => <option key={opt} value={opt}>{opt === 'All' ? 'All Statuses' : opt}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {filteredParticipants.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredParticipants.map(p => (
                        <ParticipantCard 
                            key={p.id} 
                            participant={p} 
                            onStatusChange={(newStatus) => handleStatusChange(p.id, newStatus)}
                            onViewDetails={() => setSelectedParticipant(p)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 bg-white rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900">No Participants Found</h3>
                    <p className="text-sm text-gray-500">
                        {participants.length > 0 ? "Your search and filter criteria did not match any participants." : "No participants have been registered yet."}
                    </p>
                </div>
            )}
            {isScannerOpen && (
                <QRCodeScanner
                    onScan={handleScanSuccess}
                    onClose={() => setIsScannerOpen(false)}
                />
            )}
            {selectedParticipant && (
                <ParticipantDetailView 
                    participant={selectedParticipant}
                    onClose={() => setSelectedParticipant(null)}
                />
            )}
        </div>
    );
};

export default AdminDashboard;