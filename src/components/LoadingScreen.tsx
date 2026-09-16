export default function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4 text-center">
        <img
          src="/CloudOrbix.png"
          alt="Loading CloudOrbix"
          className="h-24 w-24 object-contain"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/CloudOrbix.png";
          }}
        />
        {/* <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200/30 border-t-blue-400" aria-hidden="true" /> */}
        <p className="text-sm font-semibold tracking-wide text-white">CloudOrbix</p>
        <img src="/Capgemini_Logo_Color_RGB.svg" alt="Capgemini" className="h-5 w-auto bg-white px-2 py-1" />
      </div>
    </main>
  );
}