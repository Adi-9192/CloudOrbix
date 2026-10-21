import { useEffect, useState } from "react";
import { showCloudOrbixAlert } from "../alert";
import { ArrowLeft, Check, Upload } from "lucide-react";
import { MANDATORY_DOCUMENTS } from "../data/projectDocuments";

type DocumentsPageProps = { dark: boolean; clientId: string; onBack: () => void; readOnly?: boolean };
type Project = { client_name: string; client_id: string; project_manager: string; account_manager: string };
type ProjectDocument = { document_type?: string };

export default function DocumentsPage({ dark, clientId, onBack, readOnly = false }: DocumentsPageProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [linkUrls, setLinkUrls] = useState<Record<string, string>>({});

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

  const upload = async (file: File, documentType: string) => {
    setBusy(documentType);
    setMessage("");
    const form = new FormData();
    form.append("file", file);
    form.append("documentType", documentType);
    const response = await fetch(`/api/projects/${clientId}/documents`, { method: "POST", headers, body: form });
    const body = await response.json();
    if (!response.ok) { setMessage(body.message || "Unable to upload document."); showCloudOrbixAlert(body.message || "Unable to upload document.", "error"); }
    else { setDocuments((current) => [body.document, ...current]); setMessage("Document uploaded successfully."); showCloudOrbixAlert("Document uploaded successfully.", "success"); }
    setBusy("");
  };

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
          const uploaded = uploadedTypes.has(item.id);
          return <div key={item.id} className="py-3 flex items-center gap-3 flex-wrap" style={{ borderColor: border }}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${uploaded ? "bg-green-600 text-white" : "border"}`} style={{ borderColor: uploaded ? "#16A34A" : border }}>{uploaded && <Check className="w-3.5 h-3.5" />}</div>
            <span className="flex-1 min-w-[190px] text-xs font-semibold">{item.name}</span>
            {!readOnly && <>
              <div className="flex flex-1 min-w-[240px] gap-2">
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
                  className="rounded-md border px-2.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ borderColor: border, color: muted }}
                >
                  {busy === item.id ? "Saving..." : "Add link"}
                </button>
              </div>
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-white cursor-pointer" style={{ background: "#1E40AF" }}><Upload className="w-3.5 h-3.5" /> Upload<input type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, item.id); event.currentTarget.value = ""; }} /></label>
            </>}
          </div>;
        })}
      </div>
    </section>

  </div>;
}