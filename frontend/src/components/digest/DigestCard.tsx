import Card from "../common/Card";

interface Props {
  digest: any;
  loading: boolean;
  onLoad: () => void;
}

export default function DigestCard({
  digest,
  loading,
  onLoad,
}: Props) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Daily Digest
        </h2>

        <button
          onClick={onLoad}
          className="rounded-xl bg-indigo-600 px-4 py-2"
        >
          {loading
            ? "Loading..."
            : "Load"}
        </button>
      </div>

      {!digest ? (
        <p className="text-slate-400">
          No digest loaded
        </p>
      ) : (
        <pre className="whitespace-pre-wrap text-sm">
          {digest.content}
        </pre>
      )}
    </Card>
  );
}