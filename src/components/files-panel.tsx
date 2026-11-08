import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { Panel } from "@/components/ui";

export type AttachedFile = {
  id: string;
  name: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  updatedAt: Date;
};

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesPanel({
  files,
  fileRecordTypeId,
  targetRecordTypeId,
  targetRecordId,
}: Readonly<{
  files: AttachedFile[];
  fileRecordTypeId?: string | null;
  targetRecordTypeId: string;
  targetRecordId: string;
}>) {
  const addHref = fileRecordTypeId
    ? `/records/${fileRecordTypeId}/new?targetRecordTypeId=${encodeURIComponent(targetRecordTypeId)}&targetRecordId=${encodeURIComponent(targetRecordId)}`
    : null;

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 p-4">
        <h2 className="text-sm font-semibold">Files</h2>
        {addHref ? (
          <Link href={addHref} className="inline-flex items-center gap-2 rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            Add file
          </Link>
        ) : null}
      </div>
      {files.length ? (
        <div className="divide-y divide-neutral-100">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-950">{file.name}</p>
                <p className="truncate text-sm text-neutral-500">{file.fileName} - {file.mimeType} - {fileSize(file.sizeBytes)}</p>
              </div>
              <a href={file.fileUrl} download={file.fileName} className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-neutral-200 bg-white" aria-label={`Download ${file.name}`}>
                <Download className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      ) : (
        <p className="p-4 text-sm text-neutral-500">No files are attached to this record.</p>
      )}
    </Panel>
  );
}
