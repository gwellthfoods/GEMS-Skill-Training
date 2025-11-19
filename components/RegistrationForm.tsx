import React, { useState, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { QRCodeCanvas } from 'qrcode.react';
import { Participant } from '../types';
import { generatePRDraft, reviewPRDraft, enhanceParticipantPhoto } from '../services/geminiService';
import { addParticipantToSheet } from '../services/googleSheetService';

interface RegistrationFormProps {
  onRegistrationSuccess: (participant: Participant) => void;
  googleSheetUrl: string;
}

const generateQRCodeDataURL = (text: string): Promise<string> => {
  return new Promise(resolve => {
    const tempContainer = document.createElement('div');
    // Hide the container from view and screen readers
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tempContainer);

    const root = createRoot(tempContainer);

    const cleanup = () => {
      // Use setTimeout to ensure cleanup happens after the current event loop.
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
      }, []); // Empty dependency array as `text` is from closure and `resolve` is stable

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
}> = ({ id, label, type = 'text', value, onChange, required = false }) => (
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


const RegistrationForm: React.FC<RegistrationFormProps> = ({ onRegistrationSuccess, googleSheetUrl }) => {
  const [formData, setFormData] = useState({
    name: '', address1: '', address2: '', city: '', collegeName: '', course: '',
    referredBy: '', nativeAddress: '', pinCode: '', hobbies: '', goals: '',
    other: '', mobile: '', email: '', programEnrolled: '', startDate: '',
    endDate: '', targetAudience: '',
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPhotoEnhancing, setIsPhotoEnhancing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isConfigured = googleSheetUrl && googleSheetUrl.startsWith('https://script.google.com');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoName(file.name);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const originalPhoto = reader.result as string;
        setPhoto(originalPhoto); // Show original photo immediately
        setIsPhotoEnhancing(true);
        setError('');
        try {
          const enhancedPhoto = await enhanceParticipantPhoto(originalPhoto);
          setPhoto(enhancedPhoto); // Replace with enhanced photo
        } catch (err) {
          console.error("Photo enhancement failed:", err);
          setError("Could not enhance photo, using original."); // Inform user
        } finally {
          setIsPhotoEnhancing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!photo) {
        setError('Please upload a photo.');
        return;
    }
    setError('');
    setIsLoading(true);

    try {
      const participantId = `GWP-${new Date().getFullYear()}-${Date.now()}`;
      
      // Step 1: Generate QR Code
      const qrCode = await generateQRCodeDataURL(participantId);
      if (!qrCode) {
        throw new Error("Failed to generate QR Code. Please try again.");
      }

      // Step 2: Generate PR Draft
      const prDraft = await generatePRDraft(formData);

      // Step 3: Review the generated PR Draft
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
      
      // Step 4: Store participant data in Google Sheet (only if configured)
      if (isConfigured) {
        try {
          await addParticipantToSheet(newParticipant, googleSheetUrl);
        } catch (sheetError) {
          console.error("Failed to save to Google Sheets", sheetError);
          // Don't block success; just warn or log. 
          // Since we are moving to success view, we rely on local storage.
        }
      }

      // Step 5: Proceed to success view
      onRegistrationSuccess(newParticipant);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Participant Registration</h2>
      <p className="text-sm text-gray-600 mb-6">Enter details for the Skill Training Program in Food Processing and Agriculture.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Participant Photo <span className="text-red-500">*</span>
                </label>
                <div className="relative w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-2">
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
                <input type="file" accept="image/*" capture="user" onChange={handlePhotoChange} className="hidden" ref={fileInputRef} required />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50" disabled={isPhotoEnhancing}>
                  {photo ? 'Change Photo' : 'Take or Upload Photo'}
                </button>
                {photoName && <span className="text-xs text-gray-500 mt-1 truncate max-w-full">{photoName}</span>}
            </div>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2"><InputField id="name" label="Full Name" value={formData.name} onChange={handleChange} required /></div>
              <InputField id="mobile" label="Mobile Number" type="tel" value={formData.mobile} onChange={handleChange} required />
              <InputField id="email" label="Email Address" type="email" value={formData.email} onChange={handleChange} required />
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
          <InputField id="collegeName" label="College Name" value={formData.collegeName} onChange={handleChange} required />
          <InputField id="course" label="Course / Carrier" value={formData.course} onChange={handleChange} required />
          <InputField id="referredBy" label="Referred By" value={formData.referredBy} onChange={handleChange} />
          <SelectField id="targetAudience" label="Category" value={formData.targetAudience} onChange={handleChange} options={['SHG', 'Student', 'Start-up']} required />
        </div>

        <div className="pt-6 border-t">
          <TextAreaField id="hobbies" label="Hobbies" value={formData.hobbies} onChange={handleChange} />
        </div>
        <div>
          <TextAreaField id="goals" label="Goals" value={formData.goals} onChange={handleChange} />
        </div>
        <div>
          <TextAreaField id="other" label="Other Information" value={formData.other} onChange={handleChange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
            <SelectField
              id="programEnrolled"
              label="Program Enrolled"
              value={formData.programEnrolled}
              onChange={handleChange}
              options={["Food Processing & Packaging", "Sales & Marketing", "Agroeconomics"]}
              required
            />
            <InputField id="startDate" label="Program Start Date" type="date" value={formData.startDate} onChange={handleChange} required />
            <InputField id="endDate" label="Program End Date" type="date" value={formData.endDate} onChange={handleChange} required />
        </div>
        
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <div className="flex justify-end pt-6 border-t">
          <button
            type="submit"
            disabled={isLoading || isPhotoEnhancing}
            className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting Registration...
              </>
            ) : (
              'Register & Generate PR'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegistrationForm;