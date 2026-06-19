interface Props {
    children: React.ReactNode;
    className?: string;
  }
  
  export default function Card({
    children,
    className = "",
  }: Props) {
    return (
      <div
        className={`rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 ${className}`}
      >
        {children}
      </div>
    );
  }