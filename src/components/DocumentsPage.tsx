import { useEffect, useState } from "react";
import { showCloudOrbixAlert } from "../alert";
import { ArrowLeft, Check, ExternalLink, Trash2, X } from "lucide-react";
import { MANDATORY_DOCUMENTS } from "../data/projectDocuments";

type DocumentsPageProps = { dark: boolean; clientId: string; onBack: () => void; readOnly?: boolean };
type Project = { client_name: string; client_id: string; project_manager: string; account_manager: string };
type ProjectDocument = { id: number; file_name: string; blob_url: string; document_type?: string };

export default function DocumentsPage({ dark, clientId, onBack, readOnly = false }: DocumentsPageProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [linkUrls, setLinkUrls] = useState<Record<string, string>>({});
  const [documentToRemove, setDocumentToRemove] = useState<ProjectDocument | null>(null);

  const bg = dark ? "#1E293B" : "#FFFFFF";
  const border = dark ? "#334155" : "#E2E8F0";
  const text = dark ? "#E2E8F0" : "#0F172A";
  const muted = dark ? "#94A3B8" : "#64748B";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const headers = { Authorization: `Bearer ${localStorage.getItem("clmp-token")}` };

  const load = async () => {
    const response = await fetch(readOnly ? `/api/projects/repository/${clientId}` : `/api/projects/${clientId}`, { headers });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "Unable to load documents.");
    setProject(body.project);
    setDocuments(body.documents || []);
  };

  useEffect(() => {
    void load().catch((error) => { setMessage(error.message); showCloudOrbixAlert(error.message, "error"); });
  }, [clientId]);

  const saveDocumentLink = async (documentType: string, documentName: string) => {
    const url = linkUrls[documentType]?.trim();
    if (!url) return;
    setBusy(documentType);
    setMessage("");
    try {
      const response = await fetch(`/api/projects/${clientId}/documents/link`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ url, documentType, fileName: documentName }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to save document link.");
      setDocuments((current) => [body.document, ...current]);
      setLinkUrls((current) => ({ ...current, [documentType]: "" }));
      setMessage("Document link saved successfully.");
      showCloudOrbixAlert("Document link saved successfully.", "success");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to save document link.";
      setMessage(errorMessage);
      showCloudOrbixAlert(errorMessage, "error");
    } finally {
      setBusy("");
    }
  };

  const removeDocument = async () => {
    if (!documentToRemove) return;
    setBusy(`remove-${documentToRemove.id}`);
    setMessage("");
    try {
      const response = await fetch(
        `/api/projects/${clientId}/documents/${documentToRemove.id}`,
        { method: "DELETE", headers },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to remove document.");
      setDocuments((current) =>
        current.filter((document) => document.id !== documentToRemove.id),
      );
      setMessage("Document removed successfully.");
      showCloudOrbixAlert("Document removed successfully.", "success");
      setDocumentToRemove(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to remove document.";
      setMessage(errorMessage);
      showCloudOrbixAlert(errorMessage, "error");
    } finally {
      setBusy("");
    }
  };

  const uploadedTypes = new Set(documents.map((document) => document.document_type));
  const uploadedMandatory = MANDATORY_DOCUMENTS.filter((document) => uploadedTypes.has(document.id)).length;
  const progress = Math.round((uploadedMandatory / MANDATORY_DOCUMENTS.length) * 100);

  if (!project) return <div className="p-6 text-sm" style={{ color: muted }}>{message || "Loading documents..."}</div>;
  return <div className="p-6 space-y-5" style={{ color: text }}>
    <button onClick={onBack} className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#1E40AF" }}><ArrowLeft className="w-4 h-4" /> Back to project</button>
    <div><h1 className="text-xl font-bold">Project documents</h1><p className="text-xs mt-1" style={{ color: muted }}>{project.client_name} · {project.client_id}</p></div>
    {message && <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: border, color: muted }}>{message}</div>}

    <section className="rounded-xl border p-5" style={{ background: bg, borderColor: border }}>
      <div className="flex items-center justify-between gap-3 mb-2"><div><h2 className="font-semibold text-sm">Mandatory project documents</h2><p className="text-xs mt-1" style={{ color: muted }}>{uploadedMandatory} of {MANDATORY_DOCUMENTS.length} provided</p></div><span className="text-sm font-bold" style={{ color: progress === 100 ? "#16A34A" : "#1E40AF" }}>{progress}%</span></div>
      <div className="h-2 rounded-full" style={{ background: dark ? "#334155" : "#E2E8F0" }}><div className="h-2 rounded-full" style={{ width: `${progress}%`, background: progress === 100 ? "#16A34A" : "#1E40AF" }} /></div>
      <div className="mt-5 divide-y" style={{ borderColor: border }}>
        {MANDATORY_DOCUMENTS.map((item) => {
          const itemDocuments = documents.filter((document) => document.document_type === item.id);
          const uploaded = itemDocuments.length > 0;
          return (
            <div key={item.id} className="py-3 space-y-2" style={{ borderColor: border }}>
              <div className="flex items-center gap-3 flex-wrap">
                <div className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center ${uploaded ? "bg-green-600 text-white" : "border"}`} style={{ borderColor: uploaded ? "#16A34A" : border }}>
                  {uploaded && <Check className="w-3.5 h-3.5" />}
                </div>
                <span className="flex-1 min-w-[190px] text-xs font-semibold">{item.name}</span>
                {!readOnly && (
                  <div className="flex flex-1 min-w-[260px] gap-2">
                    <input
                      type="url"
                      value={linkUrls[item.id] || ""}
                      onChange={(event) => setLinkUrls((current) => ({ ...current, [item.id]: event.target.value }))}
                      placeholder="Paste document link"
                      aria-label={`${item.name} document link`}
                      className="min-w-0 flex-1 rounded-md border px-2.5 py-1.5 text-xs outline-none"
                      style={{ background: inputBg, borderColor: border, color: text }}
                    />
                    <button
                      type="button"
                      onClick={() => void saveDocumentLink(item.id, item.name)}
                      disabled={busy === item.id || !linkUrls[item.id]?.trim()}
                      className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: "#1E40AF" }}
                    >
                      {busy === item.id ? "Saving..." : "Save link"}
                    </button>
                  </div>
                )}
              </div>
              {itemDocuments.map((document) => (
                <div key={document.id} className="ml-8 flex items-center gap-2 text-xs">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" style={{ color: "#1E40AF" }} />
                  <a href={document.blob_url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:underline" style={{ color: "#1E40AF" }}>
                    {document.file_name}
                  </a>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setDocumentToRemove(document)}
                      disabled={busy === `remove-${document.id}`}
                      className="rounded-md p-1.5 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                      aria-label={`Remove ${document.file_name}`}
                      title="Remove document link"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>

    {documentToRemove && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="remove-document-title" className="w-full max-w-md rounded-xl border p-5 shadow-xl" style={{ background: bg, borderColor: border, color: text }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="remove-document-title" className="font-semibold">Remove document?</h2>
            <p className="mt-2 text-sm" style={{ color: muted }}>Are you sure you want to remove <strong>{documentToRemove.file_name}</strong>? This cannot be undone.</p>
          </div>
          <button type="button" onClick={() => setDocumentToRemove(null)} disabled={busy.startsWith("remove-")} className="rounded p-1 hover:bg-slate-500/10" aria-label="Close confirmation"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setDocumentToRemove(null)} disabled={busy.startsWith("remove-")} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50" style={{ borderColor: border, color: text }}>Cancel</button>
          <button type="button" onClick={() => void removeDocument()} disabled={busy.startsWith("remove-")} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy.startsWith("remove-") ? "Removing..." : "Remove document"}</button>
        </div>
      </div>
    </div>}
  </div>;
}