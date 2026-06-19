import Card from "../common/Card";
import EmptyState from "../common/EmptyState";

interface Props {
  emails: any[];
  loading: boolean;
  onLoad: () => void;
}

export default function EmailsCard({
  emails,
  loading,
  onLoad,
}: Props) {
  return (
    <Card className="col-span-2">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Emails
        </h2>

        <button
          onClick={onLoad}
          className="rounded-xl bg-cyan-600 px-4 py-2"
        >
          {loading
            ? "Loading..."
            : "Load Emails"}
        </button>
      </div>

      {!emails.length ? (
        <EmptyState message="No emails loaded yet" />
      ) : (
        <div className="space-y-4">
          {emails.map((mail) => (
            <div
              key={mail.id}
              className="rounded-xl border border-slate-700 p-4"
            >
              <div className="mb-2 flex justify-between">
                <span className="font-semibold">
                  {mail.from}
                </span>

                <span className="text-sm text-slate-400">
                  {mail.date}
                </span>
              </div>

              <h3 className="font-bold">
                {mail.subject}
              </h3>

              <p className="mt-2 text-slate-400">
                {mail.snippet}
              </p>

              <details className="mt-3">
                <summary className="cursor-pointer">
                  View Body
                </summary>

                <p className="mt-2 whitespace-pre-wrap">
                  {mail.body}
                </p>
              </details>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}