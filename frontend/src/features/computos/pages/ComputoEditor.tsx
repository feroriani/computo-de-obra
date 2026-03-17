import { useParams, useNavigate } from "react-router-dom";

export function ComputoEditor() {
  const { versionId } = useParams<{ versionId: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-primary hover:underline"
          >
            ← Volver a cómputos
          </button>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          Editor del cómputo <span className="font-mono">{versionId}</span> (próximamente).
        </div>
      </div>
    </div>
  );
}
