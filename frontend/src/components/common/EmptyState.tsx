interface Props {
    message: string;
  }
  
  export default function EmptyState({
    message,
  }: Props) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
        {message}
      </div>
    );
  }