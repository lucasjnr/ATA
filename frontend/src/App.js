import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "sonner";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import NewMeeting from "@/pages/NewMeeting";
import MeetingDetail from "@/pages/MeetingDetail";
import ConductMeeting from "@/pages/ConductMeeting";
import AtaEditor from "@/pages/AtaEditor";
import Deliberations from "@/pages/Deliberations";
import Layout from "@/components/Layout";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Protected><Dashboard /></Protected>} />
            <Route path="/meetings/new" element={<Protected><NewMeeting /></Protected>} />
            <Route path="/meetings/:id" element={<Protected><MeetingDetail /></Protected>} />
            <Route path="/meetings/:id/conduct" element={<Protected><ConductMeeting /></Protected>} />
            <Route path="/meetings/:id/ata" element={<Protected><AtaEditor /></Protected>} />
            <Route path="/deliberations" element={<Protected><Deliberations /></Protected>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
