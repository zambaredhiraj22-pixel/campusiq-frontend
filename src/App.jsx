import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import AdminDashboard from "./pages/AdminDashboard";

import FacultyDashboard from "./pages/FacultyDashboard";
import FacultyMockTests from "./pages/FacultyMockTests";
import FacultyQuestionBank from "./pages/FacultyQuestionBank";
import FacultyRegistration from "./pages/FacultyRegistration";
import FacultySkillVerification from "./pages/FacultySkillVerification";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import StudentAIInterview from "./pages/StudentAIInterview";
import StudentAIInterviewAttempt from "./pages/StudentAIInterviewAttempt";
import StudentAIInterviewInstructions from "./pages/StudentAIInterviewInstructions";
import StudentAIInterviewResult from "./pages/StudentAIInterviewResult";
import StudentAttendance from "./pages/StudentAttendance";
import StudentDashboard from "./pages/StudentDashboard";
import StudentInterviewProfile from "./pages/StudentInterviewProfile";
import StudentMockTests from "./pages/StudentMockTests";
import StudentProfile from "./pages/StudentProfile";
import StudentSkills from "./pages/StudentSkills";
import StudentTestAttempt from "./pages/StudentTestAttempt";
import StudentTestInstructions from "./pages/StudentTestInstructions";

import TpoCompanies from "./pages/TpoCompanies";
import TpoCompanyEligibility from "./pages/TpoCompanyEligibility";
import TpoDashboard from "./pages/TpoDashboard";
import TpoRegistration from "./pages/TpoRegistration";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Home />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/faculty/register"
        element={<FacultyRegistration />}
      />

      <Route
        path="/tpo/register"
        element={<TpoRegistration />}
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/profile"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <StudentProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/skills"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <StudentSkills />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/mock-tests"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <StudentMockTests />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/mock-tests/:mockTestId/instructions"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <StudentTestInstructions />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/mock-tests/:mockTestId/attempt"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <StudentTestAttempt />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/attendance"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <StudentAttendance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/ai-interview/profile"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <StudentInterviewProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/ai-interview"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <StudentAIInterview />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/ai-interview/:sessionId/instructions"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <StudentAIInterviewInstructions />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/ai-interview/:sessionId/attempt"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <StudentAIInterviewAttempt />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/ai-interview/:sessionId/result"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <StudentAIInterviewResult />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={["FACULTY"]}
          >
            <FacultyDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty/skills"
        element={
          <ProtectedRoute
            allowedRoles={["FACULTY"]}
          >
            <FacultySkillVerification />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty/questions"
        element={
          <ProtectedRoute
            allowedRoles={["FACULTY"]}
          >
            <FacultyQuestionBank />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty/mock-tests"
        element={
          <ProtectedRoute
            allowedRoles={["FACULTY"]}
          >
            <FacultyMockTests />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tpo/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={["TPO"]}
          >
            <TpoDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tpo/companies"
        element={
          <ProtectedRoute
            allowedRoles={["TPO"]}
          >
            <TpoCompanies />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tpo/company-eligibility"
        element={
          <ProtectedRoute
            allowedRoles={["TPO"]}
          >
            <TpoCompanyEligibility />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;