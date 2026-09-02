// import { useSession } from "./hooks/useSession";
// import { AuthPage } from "./pages/AuthPage";
// import { DashboardPage } from "./pages/DashboardPage";
//   import { useSearchParams } from "react-router-dom";

// export default function App() {
//   const { session, isLoggedIn, login, logout } = useSession();

// const [searchParams] = useSearchParams();

// const token = searchParams.get("auth");
//   token && login(atob(token.replace(/-/g, "+").replace(/_/g, "/")))
//   if (!isLoggedIn) return <AuthPage onLogin={login} />;

//   return <DashboardPage session={session} onLogout={logout} />;
// }




import { Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "./hooks/useSession";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { session,isLoggedIn , login, logout} = useSession();

  return isLoggedIn ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage/>} />
      
      <Route path="/dashboard" element={<AuthCallbackPage/>} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage/>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}