import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocumentStored } from "@/types/case";
import { Calendar, CheckCircle, Clock, ExternalLink, FileText, XCircle } from "lucide-react";

interface DocumentCardProps {
    document: DocumentStored;
    onOpenDocument: (s3Key: string) => void;
}

const DocumentCard = ({ document, onOpenDocument }: DocumentCardProps) => {
    const getVerificationIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'verified':
            case 'approved':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'rejected':
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'pending':
            case 'processing':
                return <Clock className="w-4 h-4 text-yellow-500" />;
            default:
                return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    const getVerificationColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'verified':
            case 'approved':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'rejected':
            case 'failed':
                return 'text-red-600 bg-red-50 border-red-200';
            case 'pending':
            case 'processing':
                return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Card className="p-4 hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-gray-900 truncate">
                        {document.docType}
                    </h3>
                </div>
                {getVerificationIcon(document.verificationStatus)}
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Uploaded: {formatDate(document.uploadedAt)}</span>
                </div>

                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getVerificationColor(document.verificationStatus)}`}>
                    {getVerificationIcon(document.verificationStatus)}
                    <span className="capitalize">{document.verificationStatus}</span>
                </div>
            </div>

            <Button
                onClick={() => onOpenDocument(document.s3Url)}
                className="w-full group-hover:bg-blue-600 transition-colors duration-200"
                variant="default"
            >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Document
            </Button>
        </Card>
    );
};

export default DocumentCard;
