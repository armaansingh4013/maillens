interface Props {
    backend: string;
    account: string;
    digest: string;
  }
  
  export default function StatsPanel({
    backend,
    account,
    digest,
  }: Props) {
    const stats = [
      {
        label: "Backend",
        value: backend,
      },
      {
        label: "Account",
        value: account,
      },
      {
        label: "Digest",
        value: digest,
      },
    ];
  
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <p className="text-slate-400">
              {item.label}
            </p>
  
            <h3 className="mt-2 text-2xl font-bold">
              {item.value}
            </h3>
          </div>
        ))}
      </div>
    );
  }