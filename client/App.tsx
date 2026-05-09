import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Ankety from "./pages/Ankety";
import Ssylki from "./pages/Ssylki";
import QuestionnaireEditor from "./pages/QuestionnaireEditor";
import QuestionnairePreview from "./pages/QuestionnairePreview";
import SurveyEditor from "./pages/SurveyEditor";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/Login";
import PasswordResetRequest from "./pages/PasswordResetRequest";
import PasswordResetConfirm from "./pages/PasswordResetConfirm";
import AdminUsersPage from "./pages/AdminUsers";
import SurveyTaking from "./pages/SurveyTaking";
import ResponseDetail from "./pages/ResponseDetail";
import Reports from "./pages/Reports";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/password-reset" element={<PasswordResetRequest />} />
            <Route
              path="/password-reset/:token"
              element={<PasswordResetConfirm />}
            />
            <Route path="/take-survey/:surveyId" element={<SurveyTaking />} />
            <Route
              path="/survey/:surveyId/response/:responseId"
              element={
                <ProtectedRoute>
                  <ResponseDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/survey/:id"
              element={
                <ProtectedRoute>
                  <SurveyEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ankety"
              element={
                <ProtectedRoute>
                  <Ankety />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ankety/:id"
              element={
                <ProtectedRoute>
                  <QuestionnaireEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ankety/:id/preview"
              element={
                <ProtectedRoute>
                  <QuestionnairePreview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ssylki"
              element={
                <ProtectedRoute>
                  <Ssylki />
                </ProtectedRoute>
              }
            />
            <Route
              path="/otchety"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <NotFound />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
