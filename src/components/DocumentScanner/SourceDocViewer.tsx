import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { docTypeLabel } from './fields';

interface DocUrl {
  docType: string;
  originalName: string;
  mime: string;
  url: string;
  candidateIndex?: number;
  quality?: { score: number; warnings: string[] } | null;
}

interface SourceDocViewerProps {
  docs: DocUrl[];
  /** Optional height class — overrides the default. Ignored when `sticky` is true. */
  heightClassName?: string;
  /** When true, the viewer becomes position:sticky pinned near the top of the
   *  viewport and uses viewport-relative height. As the field accordion on
   *  the left scrolls, the document on the right stays visible. */
  sticky?: boolean;
}

/**
 * Split-pane side: shows ONE of the candidate's source documents at a time,
 * with prev/next chevrons to cycle. Images render via <img>, PDFs via <iframe>
 * (browser's native PDF viewer). The URL is a pre-signed S3 URL good for ~1h.
 */
const SourceDocViewer: React.FC<SourceDocViewerProps> = ({ docs, heightClassName = 'h-[640px]', sticky = false }) => {
  const [index, setIndex] = useState(0);

  // When sticky, pin to viewport height minus a small offset for the page
  // header. When not sticky, use the caller-supplied height class.
  const effectiveSizing = sticky
    ? 'sticky top-4 h-[calc(100vh-6rem)]'
    : heightClassName;

  if (docs.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 border rounded-lg ${effectiveSizing}`}>
        <div className="text-sm text-gray-500">No source documents available for this candidate.</div>
      </div>
    );
  }

  const safeIndex = Math.min(Math.max(index, 0), docs.length - 1);
  const current = docs[safeIndex];
  const isImage = current.mime.startsWith('image/');
  const isPdf = current.mime === 'application/pdf';

  const goPrev = () => setIndex((i) => (i - 1 + docs.length) % docs.length);
  const goNext = () => setIndex((i) => (i + 1) % docs.length);

  return (
    <div className={`flex flex-col border rounded-lg bg-white overflow-hidden ${effectiveSizing}`}>
      <header className="flex items-center gap-2 px-3 py-2 border-b bg-gray-50">
        <Button
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={docs.length <= 1}
          className="h-7 w-7 p-0"
          aria-label="Previous document"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goNext}
          disabled={docs.length <= 1}
          className="h-7 w-7 p-0"
          aria-label="Next document"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 truncate">
            {isImage ? <ImageIcon className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" /> : <FileText className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />}
            <span className="truncate">{current.originalName}</span>
          </div>
          <div className="text-[11px] text-gray-500">
            {docTypeLabel(current.docType)} · {safeIndex + 1} of {docs.length}
          </div>
        </div>
        <a
          href={current.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800"
          title="Open in new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </header>

      <div className="flex-1 bg-gray-100 overflow-auto">
        {isImage ? (
          <img
            src={current.url}
            alt={current.originalName}
            className="w-full h-full object-contain bg-white"
          />
        ) : isPdf ? (
          <iframe
            src={current.url}
            title={current.originalName}
            className="w-full h-full border-0 bg-white"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-500 p-6 text-center">
            Preview not available for this file type. Click the icon above to open.
          </div>
        )}
      </div>
    </div>
  );
};

export default SourceDocViewer;
