import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Mail, Phone, RefreshCw } from 'lucide-react';
import { apiService } from '@/services/api';
import BgvFormRunner, { SubmitResult } from '@/components/BgvForm/BgvFormRunner';
import {
  FormTemplate,
  legacyTemplateFromFormConfig,
  prepareForCandidate,
} from '@/lib/bgvForm/types';
import { FormValues, initialFormValues, mergeSavedProgress } from '@/lib/bgvForm/formState';

// The candidate's BGV form. Everything about the form itself — steps, fields,
// labels, validation, documents — comes from the template the server resolves
// for this candidate (see Zella-Screenings-backend/services/bgvForm/).

// Opening the camera or gallery backgrounds the browser, and low-memory
// Android phones discard the tab — it reloads from scratch on return. The
// step is kept per-tab so that reload lands back where the candidate was
// instead of on page 1 (reported by many candidates as "redirected to the
// first page while uploading pictures").
const stepStorageKey = (token?: string) => `bgv-step:${token}`;
const readSavedStep = (token?: string): string | null => {
  try { return sessionStorage.getItem(stepStorageKey(token)); } catch { return null; }
};

interface LoadedForm {
  template: FormTemplate;
  values: FormValues;
  uploads: Record<string, string>;
  companyName: string;
}

const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-green-50 to-white">
    {children}
  </div>
);

const DocumentCollectionPage = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<LoadedForm | null>(null);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        setLoading(true);
        const response: any = await apiService.getDocumentCollectionByToken(token);
        if (!response.success || !response.data) {
          setError(response.code === 'FORM_UPDATED'
            ? { title: 'This form has been updated', message: response.message }
            : { title: 'Link Error', message: response.message || 'Invalid or expired link' });
          return;
        }
        const data = response.data;
        // Older servers send only the toggle config; derive the same form.
        const template: FormTemplate = data.formTemplate
          || prepareForCandidate(legacyTemplateFromFormConfig(data.formConfig), {});

        const uploads: Record<string, string> = {};
        for (const group of [data.documents, data.customDocuments]) {
          for (const [key, doc] of Object.entries<any>(group || {})) {
            if (doc?.s3Key) uploads[key] = doc.docName || 'Uploaded';
          }
        }

        setForm({
          template,
          values: mergeSavedProgress(template, initialFormValues(template), data.formData, {
            name: data.name, phone: data.phone, email: data.email,
          }),
          uploads,
          companyName: data.companyName,
        });
      } catch (err: any) {
        setError({ title: 'Link Error', message: err?.message || 'Failed to load' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const rememberStep = useCallback((stepId: string) => {
    try { sessionStorage.setItem(stepStorageKey(token), stepId); } catch { /* private mode: reload starts at step 1 */ }
  }, [token]);

  const saveProgress = useCallback(async (formData: FormValues) => {
    await apiService.saveDocumentCollectionProgress(token!, { formData });
  }, [token]);

  const upload = useCallback(async (uploadKey: string, file: File) => {
    const response = await apiService.uploadDocumentCollectionDocument(token!, file, uploadKey);
    if (!response.success) throw new Error(response.message || 'Upload failed');
  }, [token]);

  const submit = useCallback(async (formData: FormValues): Promise<SubmitResult> => {
    const response: any = await apiService.submitDocumentCollection(token!, { formData });
    if (!response.success) {
      // The server re-validates and returns 422 with a field-path error map.
      return { ok: false, fieldErrors: response.fieldErrors, message: response.message || 'Failed to submit' };
    }
    try { sessionStorage.removeItem(stepStorageKey(token)); } catch { /* ignore */ }
    setSubmitted(true);
    return { ok: true };
  }, [token]);

  if (loading) {
    return (
      <PageShell>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-green mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </PageShell>
    );
  }

  if (error || !form) {
    const updated = error?.title === 'This form has been updated';
    return (
      <PageShell>
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6 text-center">
            {updated
              ? <RefreshCw className="w-12 h-12 text-brand-green mx-auto mb-4" />
              : <div className="text-red-500 text-5xl mb-4">&#9888;</div>}
            <h2 className="text-xl font-bold text-gray-900 mb-2">{error?.title || 'Link Error'}</h2>
            <p className="text-gray-600">{error?.message || 'Invalid or expired link'}</p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (submitted) {
    return (
      <PageShell>
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-brand-green rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Form Submitted Successfully!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for completing your BGV form. We have received your submission and will review it shortly.
            </p>
            <div className="bg-brand-green-50 p-4 rounded-lg border border-brand-green-200">
              <p className="text-sm text-gray-700">A confirmation email will be sent to you shortly.</p>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-green-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-md border-b-4 border-brand-green">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-4">
            <img src="/logo.jpg" alt="Zella Screenings" className="h-10 sm:h-16 object-contain" />
            <div className="flex flex-col sm:items-end items-center text-center sm:text-right">
              <a href="mailto:start@zellascreenings.com" className="text-xs sm:text-sm text-gray-600 flex items-center gap-1.5 sm:gap-2 hover:text-brand-green">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="break-all">start@zellascreenings.com</span>
              </a>
              <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>+91 7982938489 / +91 9871967859</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">BGV Form &amp; Document Collection</h1>
          <p className="text-sm sm:text-base text-gray-600">On behalf of <strong>{form.companyName}</strong></p>
        </div>

        <BgvFormRunner
          template={form.template}
          initialValues={form.values}
          initialUploads={form.uploads}
          initialStepId={readSavedStep(token)}
          onStepChange={rememberStep}
          onSaveProgress={saveProgress}
          onUpload={upload}
          onSubmit={submit}
        />

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8 text-sm text-gray-500 bg-white p-4 sm:p-6 rounded-lg shadow">
          <p className="font-medium text-gray-700 mb-2">Need Help?</p>
          <p className="break-words">Contact us at <a href="mailto:start@zellascreenings.com" className="text-brand-green hover:underline font-medium">start@zellascreenings.com</a></p>
          <p className="mt-1 break-words">Phone: <a href="tel:+917982938489" className="hover:text-brand-green">+91 7982938489</a> / <a href="tel:+919871967859" className="hover:text-brand-green">+91 9871967859</a></p>
          <p className="mt-4 text-xs text-gray-400">&copy; {new Date().getFullYear()} Zella Screenings. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentCollectionPage;
