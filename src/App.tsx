import { AdminDashboard } from "@/features/admin-items";
import { AuthProvider, LoginForm, ProtectedRoute } from "@/features/auth";
import { EventDetailsPage, OurStoryPage } from "@/features/public-pages";
import { WishlistPage } from "@/features/public-wishlist";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<WishlistPage />} />
            <Route path="/our-story" element={<OurStoryPage />} />
            <Route path="/event-details" element={<EventDetailsPage />} />
            <Route path="/admin/login" element={<LoginForm />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
