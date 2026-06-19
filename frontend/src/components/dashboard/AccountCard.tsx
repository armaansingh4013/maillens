import Card from "../common/Card";

interface Props {
  name: string;
  email: string;
  userId: string;
}

export default function AccountCard({
  name,
  email,
  userId,
}: Props) {
  return (
    <Card>
      <h2 className="mb-4 text-2xl font-bold">
        Account
      </h2>

      <div className="space-y-3">
        <div>
          <p className="text-slate-400">
            Name
          </p>
          <p>{name}</p>
        </div>

        <div>
          <p className="text-slate-400">
            Email
          </p>
          <p>{email}</p>
        </div>

        <div>
          <p className="text-slate-400">
            User ID
          </p>
          <p className="break-all">
            {userId}
          </p>
        </div>
      </div>
    </Card>
  );
}