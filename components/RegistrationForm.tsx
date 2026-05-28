
import React, { useState, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { QRCodeCanvas } from 'qrcode.react';
import { Participant } from '../types';
import { generatePRDraft, reviewPRDraft, enhanceParticipantPhoto, searchColleges, CollegeSearchResult, extractBiodata } from '../services/geminiService';
import { addParticipantToSheet } from '../services/googleSheetService';

interface RegistrationFormProps {
  onRegistrationSuccess: (participant: Participant) => void;
  googleSheetUrl: string;
  participants: Participant[];
}

const generateQRCodeDataURL = (text: string): Promise<string> => {
  return new Promise(resolve => {
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tempContainer);

    const root = createRoot(tempContainer);

    const cleanup = () => {
      setTimeout(() => {
        root.unmount();
        if (document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer);
        }
      }, 0);
    };

    const QRRenderer: React.FC = () => {
      const canvasRef = useCallback((canvasEl: HTMLCanvasElement | null) => {
        if (canvasEl) {
          const url = canvasEl.toDataURL('image/png');
          resolve(url);
          cleanup();
        }
      }, []);

      return <QRCodeCanvas value={text} size={256} ref={canvasRef} />;
    };
    
    root.render(<QRRenderer />);
  });
};


const InputField: React.FC<{
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  maxLength?: number;
}> = ({ id, label, type = 'text', value, onChange, required = false, maxLength }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="mt-1">
      <input
        type={type}
        name={id}
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        maxLength={maxLength}
        className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
      />
    </div>
  </div>
);

const TextAreaField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
}> = ({ id, label, value, onChange, rows = 3 }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
    <div className="mt-1">
      <textarea
        id={id}
        name={id}
        rows={rows}
        value={value}
        onChange={onChange}
        className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
      ></textarea>
    </div>
  </div>
);

const SelectField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  required?: boolean;
}> = ({ id, label, value, onChange, options, required = false }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        required={required}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
      >
        <option value="">Select an option</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
);


const RegistrationForm: React.FC<RegistrationFormProps> = ({ onRegistrationSuccess, googleSheetUrl, participants }) => {
  const [formData, setFormData] = useState({
    name: '', parentName: '', address1: '', address2: '', city: '', collegeName: '', semesterYear: '', course: '',
    referredBy: '', nativeAddress: '', pinCode: '', hobbies: '', goals: '',
    other: '', mobile: '', alternateMobile: '', email: '', programEnrolled: '', startDate: '',
    endDate: '', targetAudience: '', preferredLanguage: 'English' as 'English' | 'Hindi',
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>('');
  const [biodata, setBiodata] = useState<string | null>(null);
  const [biodataName, setBiodataName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPhotoEnhancing, setIsPhotoEnhancing] = useState<boolean>(false);
  const [isBiodataProcessing, setIsBiodataProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [editMobile, setEditMobile] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const biodataInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // College Search State
  const [collegeQuery, setCollegeQuery] = useState('');
  const [collegeResults, setCollegeResults] = useState<CollegeSearchResult[]>([]);
  const [isSearchingColleges, setIsSearchingColleges] = useState(false);
  const [isManualCollege, setIsManualCollege] = useState(false);
  const [selectedCollegeUrl, setSelectedCollegeUrl] = useState<string>('');

  const isConfigured = googleSheetUrl && googleSheetUrl.startsWith('https://script.google.com');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const handleBiodataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBiodataName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBiodata(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processFile = (file: File) => {
    setPhotoName(file.name);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const originalPhoto = reader.result as string;
      setPhoto(originalPhoto);
      setIsPhotoEnhancing(true);
      setError('');
      try {
        const enhancedPhoto = await enhanceParticipantPhoto(originalPhoto);
        setPhoto(enhancedPhoto);
      } catch (err) {
        console.error("Photo enhancement failed:", err);
        setError("Could not enhance photo, using original.");
      } finally {
        setIsPhotoEnhancing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please check permissions.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhoto(dataUrl);
        setPhotoName('captured_photo.jpg');
        
        // Trigger enhancement
        setIsPhotoEnhancing(true);
        enhanceParticipantPhoto(dataUrl).then(enhanced => {
          setPhoto(enhanced);
        }).catch(err => {
          console.error("Photo enhancement failed:", err);
        }).finally(() => {
          setIsPhotoEnhancing(false);
        });
      }
      stopCamera();
    }
  };

  const handleCollegeSearch = async () => {
    if (!collegeQuery.trim()) return;
    setIsSearchingColleges(true);
    setError('');
    try {
      const results = await searchColleges(collegeQuery);
      setCollegeResults(results);
      if (results.length === 0) {
        setError("No institutions found. Please try manual entry.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to search colleges. Try manual entry.");
    } finally {
      setIsSearchingColleges(false);
    }
  };

  const selectCollege = (college: CollegeSearchResult) => {
    setFormData(prev => ({ ...prev, collegeName: college.name }));
    setSelectedCollegeUrl(college.url);
    setCollegeQuery(college.name);
    setCollegeResults([]);
  };

  const handleEditSearch = () => {
    if (editMobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number to search.');
      return;
    }
    const participant = participants.find(p => p.mobile === editMobile);
    if (participant) {
      setFormData({
        name: participant.name,
        parentName: participant.parentName || '',
        address1: participant.address1,
        address2: participant.address2,
        city: participant.city,
        collegeName: participant.collegeName,
        semesterYear: participant.semesterYear || '',
        course: participant.course,
        referredBy: participant.referredBy,
        nativeAddress: participant.nativeAddress,
        pinCode: participant.pinCode,
        hobbies: participant.hobbies,
        goals: participant.goals,
        other: participant.other,
        mobile: participant.mobile,
        alternateMobile: participant.alternateMobile || '',
        email: participant.email,
        programEnrolled: participant.programEnrolled,
        startDate: participant.startDate,
        endDate: participant.endDate,
        targetAudience: participant.targetAudience,
        preferredLanguage: participant.preferredLanguage,
      });
      setPhoto(participant.photo);
      setPhotoName('existing_photo.jpg');
      setEditingParticipantId(participant.id);
      setIsEditMode(true);
      setError('');
      setCollegeQuery(participant.collegeName);
    } else {
      setError('No participant found with this mobile number.');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!photo) {
        setError('Please upload a photo.');
        return;
    }
    if (!formData.collegeName) {
        setError('Please select or enter a college name.');
        return;
    }
    if (formData.mobile.length !== 10) {
        setError('Mobile number must be exactly 10 digits.');
        return;
    }
    setError('');
    setIsLoading(true);

    try {
      const participantId = editingParticipantId || `GWP-${new Date().getFullYear()}-${Date.now()}`;
      const qrCode = await generateQRCodeDataURL(participantId);
      if (!qrCode) throw new Error("Failed to generate QR Code.");

      let extractedBiodata = "";
      if (biodata) {
        setIsBiodataProcessing(true);
        try {
          extractedBiodata = await extractBiodata(biodata);
        } catch (err) {
          console.error("Biodata extraction failed:", err);
        } finally {
          setIsBiodataProcessing(false);
        }
      }

      const prDraft = await generatePRDraft(formData, formData.preferredLanguage, extractedBiodata);
      const prDraftReview = await reviewPRDraft(prDraft);
      
      const newParticipant: Participant = {
        id: participantId,
        photo,
        qrCode,
        ...formData,
        prDraft,
        prDraftReview,
        status: 'Active',
      };
      
      if (isConfigured) {
        try {
          await addParticipantToSheet(newParticipant, googleSheetUrl);
        } catch (sheetError) {
          console.error("Failed to save to Google Sheets", sheetError);
        }
      }

      onRegistrationSuccess(newParticipant);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Participant Registration</h2>
      <p className="text-xs font-bold text-green-700 mb-3 uppercase tracking-wider">GEMS: GWellth Entrepreneurship and Management Skills</p>
      <p className="text-sm text-gray-600 mb-6">Enter details for the Skill Training Program in Food Processing and Agriculture.</p>

      {/* Login to Edit Section */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Already Registered? Login to Edit</h3>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-grow w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            </div>
            <input
              type="tel"
              placeholder="Enter Mobile Number"
              value={editMobile}
              onChange={(e) => setEditMobile(e.target.value)}
              className="pl-10 shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
              maxLength={10}
            />
          </div>
          <button
            type="button"
            onClick={handleEditSearch}
            className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
          >
            Login to Edit
          </button>
          {isEditMode && (
            <button
              type="button"
              onClick={() => {
                setIsEditMode(false);
                setEditingParticipantId(null);
                setFormData({
                  name: '', parentName: '', address1: '', address2: '', city: '', collegeName: '', semesterYear: '', course: '',
                  referredBy: '', nativeAddress: '', pinCode: '', hobbies: '', goals: '',
                  other: '', mobile: '', alternateMobile: '', email: '', programEnrolled: '', startDate: '',
                  endDate: '', targetAudience: '', preferredLanguage: 'English' as 'English' | 'Hindi',
                });
                setPhoto(null);
                setPhotoName('');
                setEditMobile('');
              }}
              className="text-xs text-red-600 hover:text-red-700 font-semibold"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Participant Photo <span className="text-red-500">*</span>
                </label>
                
                {isCameraOpen ? (
                  <div className="relative w-full aspect-square max-w-[240px] bg-black rounded-lg overflow-hidden mb-4 shadow-inner">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                      <button 
                        type="button" 
                        onClick={capturePhoto}
                        className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 shadow-lg transition-transform active:scale-95"
                        title="Capture Photo"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                      </button>
                      <button 
                        type="button" 
                        onClick={stopCamera}
                        className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 shadow-lg transition-transform active:scale-95"
                        title="Cancel"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-4 border-4 border-white shadow-md">
                      {photo ? (
                          <img src={photo} alt="Participant" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                      )}
                      {isPhotoEnhancing && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
                              <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <p className="text-white text-xs mt-2 text-center">Enhancing Photo...</p>
                          </div>
                      )}
                  </div>
                )}
                
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="flex flex-col space-y-2 w-full max-w-[200px]">
                  <button 
                    type="button" 
                    onClick={startCamera} 
                    className="inline-flex items-center justify-center px-4 py-2 border border-green-600 text-sm font-medium rounded-md text-green-600 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                    disabled={isPhotoEnhancing || isCameraOpen}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Take Photo
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                    disabled={isPhotoEnhancing || isCameraOpen}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Upload File
                  </button>
                </div>
                
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" ref={fileInputRef} />
                {photoName && !isCameraOpen && <span className="text-xs text-gray-500 mt-2 truncate max-w-full">{photoName}</span>}
            </div>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2"><InputField id="name" label="Full Name" value={formData.name} onChange={handleChange} required /></div>
              <div className="sm:col-span-2"><InputField id="parentName" label="Father/Mother Name" value={formData.parentName} onChange={handleChange} required /></div>
              <InputField id="mobile" label="Mobile Number (10 digits)" type="tel" value={formData.mobile} onChange={handleChange} required maxLength={10} />
              <InputField id="alternateMobile" label="Alternate Mobile Number" type="tel" value={formData.alternateMobile} onChange={handleChange} maxLength={10} />
              <div className="sm:col-span-2"><InputField id="email" label="Email Address" type="email" value={formData.email} onChange={handleChange} required /></div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Import Biodata / CV (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => biodataInputRef.current?.click()} 
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    {biodataName ? 'Change Biodata' : 'Upload Biodata'}
                  </button>
                  {biodataName && <span className="text-xs text-gray-500 truncate">{biodataName}</span>}
                </div>
                <input type="file" accept=".pdf,image/*,.doc,.docx" onChange={handleBiodataChange} className="hidden" ref={biodataInputRef} />
                <p className="mt-1 text-xs text-gray-500 italic">Upload your CV to help AI generate a more accurate PR draft.</p>
              </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
          <InputField id="address1" label="Address 1" value={formData.address1} onChange={handleChange} required />
          <InputField id="address2" label="Address 2" value={formData.address2} onChange={handleChange} />
          <InputField id="city" label="City" value={formData.city} onChange={handleChange} required />
          <InputField id="pinCode" label="Pin Code" value={formData.pinCode} onChange={handleChange} required />
          <div className="md:col-span-2"><InputField id="nativeAddress" label="Native Address" value={formData.nativeAddress} onChange={handleChange} /></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              College / Institution <span className="text-red-500">*</span>
            </label>
            {!isManualCollege ? (
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search Google Maps for college..."
                    value={collegeQuery}
                    onChange={(e) => setCollegeQuery(e.target.value)}
                    className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={handleCollegeSearch}
                    disabled={isSearchingColleges}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {isSearchingColleges ? '...' : 'Search'}
                  </button>
                </div>
                {collegeResults.length > 0 && (
                  <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-y-auto ring-1 ring-black ring-opacity-5">
                    {collegeResults.map((res, i) => (
                      <div
                        key={i}
                        className="p-3 hover:bg-green-50 cursor-pointer border-b last:border-0 group"
                        onClick={() => selectCollege(res)}
                      >
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-green-800">{res.name}</p>
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-blue-500 hover:underline inline-block mt-1"
                        >
                          View Location on Maps
                        </a>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500 italic flex items-center flex-wrap gap-2">
                    {formData.collegeName ? (
                      <>
                        <span>Selected: {formData.collegeName}</span>
                        {selectedCollegeUrl && (
                          <a 
                            href={selectedCollegeUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold not-italic bg-blue-50 px-2 py-0.5 rounded border border-blue-100 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            View on Maps
                          </a>
                        )}
                      </>
                    ) : 'Search real colleges on Google Maps.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => { 
                      setIsManualCollege(true); 
                      setFormData(p => ({...p, collegeName: ''})); 
                      setSelectedCollegeUrl('');
                    }}
                    className="text-xs text-green-600 hover:text-green-700 font-semibold"
                  >
                    Not listed? Enter manually
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  name="collegeName"
                  value={formData.collegeName}
                  onChange={handleChange}
                  placeholder="Type college name here..."
                  className="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsManualCollege(false)}
                  className="text-xs text-green-600 hover:text-green-700 font-semibold mt-1"
                >
                  Return to Maps Search
                </button>
              </div>
            )}
          </div>
          <InputField id="semesterYear" label="Semester / College Year" value={formData.semesterYear} onChange={handleChange} required />
          <SelectField 
            id="course" 
            label="Course / Professional Stream" 
            value={formData.course} 
            onChange={handleChange} 
            options={[
              "Engineering & Technology: B.Tech/M.Tech CSE (AI/ML, Cyber Security, Cloud Computing), Electronics & Computer Engg; Civil/Mechanical",
              "Management: BBA (ACCA/CMA), B.Com, MBA",
              "Law: BA LLB, BBA LLB, LLM",
              "Pharmacy/Health Sciences: B.Pharm/M.Pharm/D.Pharm, Nursing, Paramedical",
              "Agriculture/Applied & Life Sciences: BSc Agriculture, Biotech/Microbiology/Nutrition",
              "Others: (Mass Comm, HM, Liberal Arts, Computing): BA/MA Media, Hotel Mgmt, Humanities; 70+ total incl. diplomas"
            ]} 
            required 
          />
          <InputField id="referredBy" label="Referred By" value={formData.referredBy} onChange={handleChange} />
          <SelectField id="targetAudience" label="Category" value={formData.targetAudience} onChange={handleChange} options={['SHG', 'Student', 'Start-up']} required />
          <SelectField id="preferredLanguage" label="PR Draft Language" value={formData.preferredLanguage} onChange={handleChange} options={['English', 'Hindi']} required />
        </div>

        <div className="pt-6 border-t">
          <TextAreaField id="hobbies" label="Hobbies" value={formData.hobbies} onChange={handleChange} />
        </div>
        <div>
          <TextAreaField id="goals" label="Professional Goals" value={formData.goals} onChange={handleChange} />
        </div>
        <div>
          <TextAreaField id="other" label="Other Relevant Information" value={formData.other} onChange={handleChange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
            <SelectField
              id="programEnrolled"
              label="Program Enrolled"
              value={formData.programEnrolled}
              onChange={handleChange}
              options={["Food Processing & Packaging", "Sales & Marketing", "Agri-Entrepreneurship", "2-Day Course", "7-Day Course"]}
              required
            />
            <InputField id="startDate" label="Program Start Date" type="date" value={formData.startDate} onChange={handleChange} required />
            <InputField id="endDate" label="Program End Date" type="date" value={formData.endDate} onChange={handleChange} required />
        </div>
        
        {error && <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded">{error}</p>}

        <div className="flex justify-end pt-6 border-t">
          <button
            type="submit"
            disabled={isLoading || isPhotoEnhancing || isBiodataProcessing}
            className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading || isBiodataProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isBiodataProcessing ? 'Scanning Biodata...' : (isEditMode ? 'Updating Profile...' : 'Finalizing Profile...')}
              </>
            ) : (
              isEditMode ? 'Update & Generate PR' : 'Register & Generate PR'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegistrationForm;
