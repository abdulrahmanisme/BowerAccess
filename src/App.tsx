import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/providers/auth-provider";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import { NotFoundPage } from "@/routes/__root";
import { initPostHog } from "@/integrations/posthog";
import HomePage from "@/routes/index";
import LoginPage from "@/routes/login";
import AdminDashboardPage from "@/routes/admin";

initPostHog();

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="*" element={<NotFoundPage />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}
