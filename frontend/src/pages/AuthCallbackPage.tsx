import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSession } from "../hooks/useSession";

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useSession();

  useEffect(() => {
    const token = searchParams.get("auth");

    if (token) {
      const decoded = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
      login(decoded);

      navigate("/", { replace: true });
    }
  }, [searchParams]);

  return <div>Logging in...</div>;
}