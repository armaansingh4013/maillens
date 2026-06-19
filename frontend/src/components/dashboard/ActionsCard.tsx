import Card from "../common/Card";

const actions = [
  {
    key: "sync",
    label: "Sync Gmail",
  },
  {
    key: "summarize",
    label: "Summarize Inbox",
  },
  {
    key: "embed",
    label: "Embed Emails",
  },
  {
    key: "digest",
    label: "Build Digest",
  },
];

interface Props {
  onAction: (
    action: string
  ) => Promise<void>;
}

export default function ActionsCard({
  onAction,
}: Props) {
  return (
    <Card>
      <h2 className="mb-6 text-2xl font-bold">
        Actions
      </h2>

      <div className="grid gap-4">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={() =>
              onAction(action.key)
            }
            className="rounded-xl bg-indigo-600 p-4 font-semibold"
          >
            {action.label}
          </button>
        ))}
      </div>
    </Card>
  );
}