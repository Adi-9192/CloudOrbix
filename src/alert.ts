export type CloudOrbixAlert = {
  message: string
  tone?: "info" | "success" | "warning" | "error"
}

export const showCloudOrbixAlert = (
  message: string,
  tone: CloudOrbixAlert["tone"] = "info",
) => {
  window.dispatchEvent(
    new CustomEvent<CloudOrbixAlert>("cloudorbix-alert", {
      detail: { message, tone },
    }),
  )
}
