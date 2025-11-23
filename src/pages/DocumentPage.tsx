import DocumentCard from "@/components/Documents/DocumentCard";
import { Button } from "@/components/ui/button";
import apiService from "@/services/api";
import { Case } from "@/types/case";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

const DocumentPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [caseData, setCaseData] = useState<Case | null>(null);

    useEffect(() => {
        const caseId = searchParams.get('caseId');
        if (caseId) {
            const fetchDocuments = async () => {
                const documents = await apiService.getCaseById(caseId);
                console.log(documents);
                if (documents.success && documents.data) {
                    console.log(documents.data.case);
                    setCaseData(documents.data.case);
                }
            };
            fetchDocuments();
        }
    }, [searchParams]);

    const handleOpenDocument = (s3Url: string) => {
        window.open(s3Url, '_blank', 'noopener,noreferrer');
    };

    const handleBackToCases = () => {
        const pageIndex = location.state?.pageIndex;
        navigate('/dashboard', {
            state: {
                activeTab: 'digilocker',
                pageIndex: pageIndex !== undefined ? pageIndex : 0
            }
        });
    };

    if (!caseData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading documents...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBackToCases}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Cases
                    </Button>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Documents</h1>
                <p className="text-gray-600">
                    Case: {caseData.code} - {caseData.name}
                </p>
            </div>

            {caseData.documentsStored && caseData.documentsStored.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {caseData.documentsStored.map((document, index) => (
                        <DocumentCard
                            key={`${document.docType}-${index}`}
                            document={document}
                            onOpenDocument={handleOpenDocument}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                    <p className="text-gray-500">This case doesn't have any stored documents yet.</p>
                </div>
            )}
        </div>
    );
};

export default DocumentPage;