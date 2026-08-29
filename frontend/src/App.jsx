import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import CompanyDashboard from "./pages/CompanyDashboard";

// ============================================================
// GET CURRENT USER
// ============================================================

const getCurrentUser = () => {
  try {
    const storedUser = localStorage.getItem("currentUser");

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser);
  } catch (error) {
    console.error("Invalid currentUser:", error);

    localStorage.removeItem("currentUser");

    return null;
  }
};

// ============================================================
// PROTECTED ROUTE
// ============================================================

const ProtectedRoute = ({ children, allowedRole }) => {
  const user = getCurrentUser();

  // No login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Wrong role
  if (user.role !== allowedRole) {
    if (user.role === "student") {
      return <Navigate to="/student" replace />;
    }

    if (user.role === "company") {
      return <Navigate to="/company" replace />;
    }

    // Unknown role
    localStorage.removeItem("currentUser");

    return <Navigate to="/" replace />;
  }

  return children;
};

// ============================================================
// LOGIN ROUTE
// ============================================================

const LoginRoute = () => {
  const user = getCurrentUser();

  // Already logged in
  if (user?.role === "student") {
    return <Navigate to="/student" replace />;
  }

  if (user?.role === "company") {
    return <Navigate to="/company" replace />;
  }

  return <Login />;
};

// ============================================================
// APP
// ============================================================

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ==================================================
            LOGIN
        ================================================== */}

        <Route
          path="/"
          element={<LoginRoute />}
        />

        {/* ==================================================
            STUDENT DASHBOARD
        ================================================== */}

        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            COMPANY DASHBOARD
        ================================================== */}

        <Route
          path="/company"
          element={
            <ProtectedRoute allowedRole="company">
              <CompanyDashboard />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            UNKNOWN ROUTE
        ================================================== */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;