import { useEffect, useMemo, useState } from "react"

import { ArrowLeft, ArrowUpRight, Download } from "lucide-react"

import { showCloudOrbixAlert } from "../alert"

interface RiskRegisterPageProps {
  dark: boolean

  user?: { roles: string[] firstName?: string lastName?: string email?: string }

  onOpenProject: (projectId: string) => void
}

type RiskRow = {
  id: number

  client_id?: number

  clientId?: string

  projectId?: string

  project_id?: string

  client_name?: string

  customer_name?: string

  initiative_name?: string

  risk_title?: string

  risk_category?: string

  status?: string

  date_raised?: string

  raised_by?: string

  description?: string

  probability?: string

  impact?: string

  impact_description?: string

  mitigation?: string

  owner?: string

  comments_actions?: string

  project_manager?: string

  account_manager?: string

  created_at?: string
}

const projectStatuses = [
  "On-track",
  "ON Hold",
  "Delayed",
  "Completed",
  "Cancelled",
]

const riskTone = (value?: string) => {
  const normalized = String(value || "").toLowerCase()

  if (normalized.includes("high") || normalized === "red") return "text-red-600"

  if (normalized.includes("medium") || normalized === "amber")
    return "text-amber-600"

  return "text-emerald-600"
}

const getProjectId = (risk: RiskRow) => {
  const candidates = [
    risk.projectId,
    risk.project_id,
    risk.clientId,
    risk.client_id,
  ]

    .filter((value) => value !== undefined && value !== null)

    .flatMap((value) =>
      String(value)
        .split(",")
        .map((part) => part.trim()),
    )

    .filter(Boolean)

  return (
    candidates.find((candidate) =>
      /^(?:CLT-|PS[A-Z]{3}\d{2}\d{3}$)/i.test(candidate),
    ) ||
    candidates.find((candidate) => !/^\d+$/.test(candidate)) ||
    candidates[0] ||
    ""
  )
}

export default function RiskRegisterPage({
  dark,
  user,
  onOpenProject,
}: RiskRegisterPageProps) {
  const [risks, setRisks] = useState<RiskRow[]>([])

  const [loading, setLoading] = useState(true)

  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("clmp-token")

    if (!token) return

    fetch("/api/projects/risks", {
      headers: { Authorization: `Bearer ${token}` },
    })

      .then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(new Error("Unable to load risks")),
      )

      .then((payload: { risks?: RiskRow[] }) => setRisks(payload.risks || []))

      .catch(() => setRisks([]))

      .finally(() => setLoading(false))
  }, [])

  const totals = useMemo(
    () => ({
      total: risks.length,

      onTrack: risks.filter((risk) => risk.status === "On-track").length,

      completed: risks.filter((risk) => risk.status === "Completed").length,
    }),
    [risks],
  )

  const downloadRiskRegister = async () => {
    setDownloading(true)

    try {
      const token = localStorage.getItem("clmp-token")

      const response = await fetch("/api/projects/risks/export", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const responseText = await response.text()

        let responseMessage = ""

        if (
          response.headers.get("content-type")?.includes("application/json")
        ) {
          try {
            responseMessage = JSON.parse(responseText).message || ""
          } catch {
            responseMessage = ""
          }
        }

        throw new Error(
          responseMessage ||
            `Unable to download risk register (HTTP ${response.status}).`,
        )
      }

      if (!response.headers.get("content-type")?.includes(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )) {
        throw new Error(
          "The server did not return an Excel workbook. Restart the backend and try again.",
        )
      }

      const url = URL.createObjectURL(await response.blob())

      const link = window.document.createElement("a")

      link.href = url

      link.download = "risk-register.xlsx"

      link.click()

      window.setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to download risk register."

      showCloudOrbixAlert(message, "error")
    } finally {
      setDownloading(false)
    }
  }

  const bg = dark ? "#1E293B" : "#FFFFFF"

  const border = dark ? "#334155" : "#E2E8F0"

  const muted = dark ? "#94A3B8" : "#64748B"

  const text = dark ? "#E2E8F0" : "#0F172A"

  return (
    <div
      className="p-6 space-y-6"
      style={{ background: dark ? "#0F172A" : "#F1F5F9", color: text }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Risk register</h1>
          <p className="text-xs mt-1" style={{ color: muted }}>
            All project risks and their current delivery status
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void downloadRiskRegister()}
            disabled={downloading || loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold disabled:opacity-50"
            style={{ borderColor: border, background: bg, color: text }}
          >
            <Download className="w-3.5 h-3.5" />{" "}
            {downloading ? "Downloading…" : "Download Excel"}
          </button>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold"
            style={{ borderColor: border, background: bg, color: text }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="rounded-xl border p-4"
          style={{ background: bg, borderColor: border }}
        >
          <div
            className="text-[10px] uppercase tracking-wide"
            style={{ color: muted }}
          >
            Total risks
          </div>
          <div className="mt-3 text-2xl font-bold">{totals.total}</div>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ background: bg, borderColor: border }}
        >
          <div
            className="text-[10px] uppercase tracking-wide"
            style={{ color: muted }}
          >
            On-track
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-500">
            {totals.onTrack}
          </div>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ background: bg, borderColor: border }}
        >
          <div
            className="text-[10px] uppercase tracking-wide"
            style={{ color: muted }}
          >
            Completed
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-500">
            {totals.completed}
          </div>
        </div>
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: bg, borderColor: border }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] w-full text-[10px] border-collapse">
            <thead>
              <tr style={{ background: "#E6370F", color: "#FFFFFF" }}>
                {[
                  "Risk ID",

                  "Project",

                  "Customer Name",

                  "Initiative",

                  "Status",

                  "Category",

                  "PM",

                  "Date Raised",

                  "Raised By",

                  "Risk Description",

                  "Probability",

                  "Impact",

                  "Impact Description",

                  "Mitigation",

                  "Owner",

                  "Comments / Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="p-2 text-left border"
                    style={{ borderColor: "#111827" }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    className="p-5 text-xs"
                    style={{ color: muted }}
                    colSpan={16}
                  >
                    Loading risks…
                  </td>
                </tr>
              ) : risks.length ? (
                risks.map((risk) => {
                  const projectId = getProjectId(risk)

                  const projectName =
                    risk.client_name || risk.customer_name || "Unknown project"

                  const riskId = `R${risk.id}`

                  return (
                    <tr
                      key={risk.id}
                      className="border-b align-top"
                      style={{
                        borderColor: border,
                        background: dark ? "#334155" : "#E5E7EB",
                      }}
                    >
                      <td
                        className="p-2 border"
                        style={{ borderColor: border }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (projectId) onOpenProject(projectId)
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-blue-600"
                          disabled={!projectId}
                          title="Open project"
                        >
                          {riskId} <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                      <td
                        className="p-2 border"
                        style={{ borderColor: border }}
                      >
                        <button
                          type="button"
                          onClick={() => projectId && onOpenProject(projectId)}
                          className="font-medium text-left underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:no-underline"
                          style={{ color: text }}
                          disabled={!projectId}
                          title="Open project"
                        >
                          {projectName}
                        </button>
                      </td>
                      <td
                        className="p-2 border"
                        style={{ borderColor: border }}
                      >
                        {risk.customer_name || projectName}
                      </td>
                      <td
                        className="p-2 border"
                        style={{ borderColor: border }}
                      >
                        {risk.initiative_name || "-"}
                      </td>
                      <td
                        className="p-2 border"
                        style={{ borderColor: border }}
                      >
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-semibold ${
                            risk.status === "Delayed" ||
                            risk.status === "ON Hold"
                              ? "bg-amber-100 text-amber-700"
                              : risk.status === "Cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {projectStatuses.includes(risk.status || "")
                            ? risk.status
                            : "On-track"}
                        </span>
                      </td>
                      <td
                        className="p-2 border"
                        style={{ borderColor: border }}
                      >
                        {risk.risk_category || "-"}
                      </td>
                      <td
                        className="p-2 border"
                        style={{ borderColor: border }}
                      >
                        {risk.project_manager || risk.account_manager || "-"}
                      </td>
                      <td
                        className="p-2 border"
                        style={{ borderColor: border }}
                      >
                        {risk.date_raised || "-"}
                      </td>
                      <td
                        className="p-2 border"
                        style={{ borderColor: border }}
                      >
                        {risk.raised_by || "-"}
                      </td>
                      <td
                        className="p-2 border"
                        style={{ borderColor: border }}
                      >
                        {risk.risk_title || risk.description || "-"}
                      </td>
                      <td
                        className={`p-2 border font-semibold ${riskTone(risk.probability)}`}
                        style={{ borderColor: border }}
                      >
                        {risk.probability || "-"}
                      </td>
                      <td
                        className={`p-2 border font-semibold ${riskTone(risk.impact)}`}
                        style={{ borderColor: border }}
                      >
                        {risk.impact || "-"}
                      </td>
                      <td
                        className="p-2 border"
                        style={{ borderColor: border }}
                      >
                        {risk.impact_description || "-"}
                      </td>
                      <td
                        className="p-2 border"
                        style={{ borderColor: border }}
                      >
                        {risk.mitigation || "-"}
                      </td>
                      <td
                        className="p-2 border"
                        style={{ borderColor: border }}
                      >
                        {risk.owner || "-"}
                      </td>
                      <td
                        className="p-2 border"
                        style={{ borderColor: border }}
                      >
                        {risk.comments_actions || "-"}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td
                    className="p-5 text-xs"
                    style={{ color: muted }}
                    colSpan={16}
                  >
                    No risks found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
