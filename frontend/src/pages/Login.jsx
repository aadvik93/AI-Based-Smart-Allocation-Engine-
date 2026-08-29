import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState("student");

  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ============================================================
  // LOAD STUDENTS
  // ============================================================

  useEffect(() => {
    if (role !== "student") {
      return;
    }

    const loadStudents = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/students`
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load students"
          );
        }

        const data = await response.json();

        const studentList = Array.isArray(
          data.students
        )
          ? data.students
          : [];

        setStudents(studentList);

        if (studentList.length > 0) {
          setSelectedStudentId(
            String(studentList[0].id)
          );
        } else {
          setSelectedStudentId("");
        }

      } catch (err) {
        console.error(
          "Student loading error:",
          err
        );

        setError(
          "Unable to load students. Make sure the backend is running."
        );

      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [role]);

  // ============================================================
  // STUDENT LOGIN
  // ============================================================

  const handleStudentLogin = () => {
    const selectedStudent =
      students.find(
        (student) =>
          Number(student.id) ===
          Number(selectedStudentId)
      );

    if (!selectedStudent) {
      setError("Please select a student.");
      return;
    }

    // Clear previous login
    localStorage.removeItem(
      "currentUser"
    );

    const currentUser = {
      id: selectedStudent.id,
      name: selectedStudent.name,
      role: "student",
    };

    localStorage.setItem(
      "currentUser",
      JSON.stringify(currentUser)
    );

    console.log(
      "Student logged in:",
      currentUser
    );

    navigate("/student", {
      replace: true,
    });
  };

  // ============================================================
  // COMPANY LOGIN
  // ============================================================

  const handleCompanyLogin = () => {
    const companyName =
      "DataSphere Technologies";

    // Clear previous login
    localStorage.removeItem(
      "currentUser"
    );

    const currentUser = {
      id: "company-1",
      name: companyName,
      role: "company",
      company: companyName,
      company_name: companyName,
    };

    localStorage.setItem(
      "currentUser",
      JSON.stringify(currentUser)
    );

    console.log(
      "Company logged in:",
      currentUser
    );

    navigate("/company", {
      replace: true,
    });
  };

  // ============================================================
  // CONTINUE
  // ============================================================

  const handleContinue = () => {
    setError("");

    if (role === "student") {
      handleStudentLogin();
      return;
    }

    if (role === "company") {
      handleCompanyLogin();
    }
  };

  // ============================================================
  // CHANGE ROLE
  // ============================================================

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setError("");

    if (newRole === "company") {
      setSelectedStudentId("");
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="login-page">

      <div className="login-card">

        {/* ==================================================
            TITLE
        ================================================== */}

        <h1>
          Smart Allocation Engine
        </h1>

        <p>
          Internship allocation powered by
          intelligent matching
        </p>

        {/* ==================================================
            ROLE SELECTOR
        ================================================== */}

        <div className="role-selector">

          <button
            type="button"
            className={
              role === "student"
                ? "active"
                : ""
            }
            onClick={() =>
              handleRoleChange("student")
            }
          >
            Student
          </button>

          <button
            type="button"
            className={
              role === "company"
                ? "active"
                : ""
            }
            onClick={() =>
              handleRoleChange("company")
            }
          >
            Company
          </button>

        </div>

        {/* ==================================================
            STUDENT LOGIN
        ================================================== */}

        {role === "student" && (

          <div className="login-section">

            <label htmlFor="student">
              Select Student
            </label>

            <select
              id="student"
              value={selectedStudentId}
              onChange={(event) =>
                setSelectedStudentId(
                  event.target.value
                )
              }
              disabled={loading}
            >

              <option value="">
                Select Student
              </option>

              {students.map((student) => (

                <option
                  key={student.id}
                  value={student.id}
                >
                  {student.name}
                </option>

              ))}

            </select>

            {error && (
              <p className="error-message">
                {error}
              </p>
            )}

          </div>
        )}

        {/* ==================================================
            COMPANY LOGIN
        ================================================== */}

        {role === "company" && (

          <div className="login-section">

            <label>
              Company Account
            </label>

            <div className="company-account">

              <strong>
                DataSphere Technologies
              </strong>

              <span>
                Company Account
              </span>

            </div>

            {error && (
              <p className="error-message">
                {error}
              </p>
            )}

          </div>
        )}

        {/* ==================================================
            CONTINUE BUTTON
        ================================================== */}

        <button
          type="button"
          className="continue-button"
          onClick={handleContinue}
          disabled={
            loading ||
            (
              role === "student" &&
              !selectedStudentId
            )
          }
        >

          {loading
            ? "Loading..."
            : role === "student"
              ? "Continue as Student"
              : "Continue as Company"}

        </button>

      </div>

    </div>
  );
}

export default Login;