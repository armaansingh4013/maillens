interface Props {
    email: string;
  }
  
  export default function HeroSection({
    email,
  }: Props) {
    return (
      <section className="mb-8">
        <span className="rounded-full border border-cyan-500/30 px-4 py-2 text-sm text-cyan-400">
          MailLens Control Center
        </span>
  
        <h1 className="mt-6 text-5xl font-bold">
          Welcome Back
        </h1>
  
        <p className="mt-3 text-slate-400">
          Signed in as {email}
        </p>
      </section>
    );
  }