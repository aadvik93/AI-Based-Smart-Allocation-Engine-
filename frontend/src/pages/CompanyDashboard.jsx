import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";


// ============================================================
// EMPTY FORM
// ============================================================

const EMPTY_FORM = {
  title: "",
  sector: "",
  required_skills: "",
  location: "",
  seats: "",
  minimum_cgpa: "",
  duration: "",
};


// ============================================================
// COMPANY DASHBOARD
// ============================================================

const CompanyDashboard = () => {

  // ==========================================================
  // STATE
  // ==========================================================

  const [activeTab, setActiveTab] =
    useState("internships");

  const [internships, setInternships] =
    useState([]);

  const [applications, setApplications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [applicationsLoading, setApplicationsLoading] =
    useState(false);

  const [applicationsError, setApplicationsError] =
    useState("");

  const [internshipForm, setInternshipForm] =
    useState(EMPTY_FORM);

  const [postLoading, setPostLoading] =
    useState(false);

  const [postError, setPostError] =
    useState("");

  const [postSuccess, setPostSuccess] =
    useState("");

  const [allocationResults, setAllocationResults] =
    useState(null);

  const [allocationLoading, setAllocationLoading] =
    useState(false);

  const [allocationError, setAllocationError] =
    useState("");

  // NEW: separate reset loading state
  const [resetLoading, setResetLoading] =
    useState(false);

  // NEW: reset success message
  const [resetSuccess, setResetSuccess] =
    useState("");


  // ==========================================================
  // CURRENT COMPANY
  // ==========================================================

  const currentCompany = useMemo(() => {

    try {

      const storedUser =
        localStorage.getItem("currentUser");

      if (!storedUser) {

        return {
          name: "DataSphere Technologies",
          role: "company",
          id: null,
        };

      }

      const user =
        JSON.parse(storedUser);

      return {

        name:
          user.company ||
          user.company_name ||
          user.name ||
          "DataSphere Technologies",

        role:
          user.role ||
          "company",

        id:
          user.id ||
          user.company_id ||
          null,

      };

    } catch (err) {

      console.error(
        "Unable to read current company:",
        err
      );

      return {
        name: "DataSphere Technologies",
        role: "company",
        id: null,
      };

    }

  }, []);


  const companyName =
    currentCompany.name;


  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {

    localStorage.removeItem(
      "currentUser"
    );

    window.location.href = "/";

  };


  // ==========================================================
  // FETCH INTERNSHIPS
  // ==========================================================

  const fetchInternships =
    useCallback(async () => {

      try {

        setError("");

        const response =
          await api.get("/internships");

        const data =
          response.data?.internships || [];

        setInternships(
          Array.isArray(data)
            ? data
            : []
        );

        return Array.isArray(data)
          ? data
          : [];

      } catch (err) {

        console.error(
          "Failed to fetch internships:",
          err
        );

        setError(
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to load internships."
        );

        return [];

      }

    }, []);


  // ==========================================================
  // FETCH APPLICATIONS
  // ==========================================================

  const fetchApplications =
    useCallback(async () => {

      try {

        setApplicationsLoading(true);

        setApplicationsError("");

        const response =
          await api.get(
            "/applications",
            {
              params: {
                company: companyName,
              },
            }
          );

        const data =
          response.data?.applications || [];

        setApplications(
          Array.isArray(data)
            ? data
            : []
        );

        return Array.isArray(data)
          ? data
          : [];

      } catch (err) {

        console.error(
          "Failed to fetch applications:",
          err
        );

        setApplicationsError(
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to load applications."
        );

        return [];

      } finally {

        setApplicationsLoading(false);

      }

    }, [companyName]);


  // ==========================================================
  // COMPANY INTERNSHIPS
  // ==========================================================

  const companyInternships =
    useMemo(() => {

      const normalizedCompany =
        String(companyName || "")
          .trim()
          .toLowerCase();

      return internships.filter(
        (internship) => {

          const internshipCompany =
            String(
              internship.company || ""
            )
              .trim()
              .toLowerCase();

          return (
            internshipCompany ===
            normalizedCompany
          );

        }
      );

    }, [
      internships,
      companyName,
    ]);


  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  const loadDashboard =
    useCallback(async () => {

      try {

        setLoading(true);

        setError("");

        await Promise.all([
          fetchInternships(),
          fetchApplications(),
        ]);

      } catch (err) {

        console.error(
          "Dashboard loading error:",
          err
        );

      } finally {

        setLoading(false);

      }

    }, [
      fetchInternships,
      fetchApplications,
    ]);


  // ==========================================================
  // POST INTERNSHIP
  // ==========================================================

  const handlePostInternship =
    async (event) => {

      event.preventDefault();

      setPostError("");
      setPostSuccess("");

      try {

        setPostLoading(true);


        // ----------------------------------------------------
        // TITLE
        // ----------------------------------------------------

        const title =
          internshipForm.title.trim();

        if (!title) {

          setPostError(
            "Please enter an internship title."
          );

          return;

        }


        // ----------------------------------------------------
        // SECTOR
        // ----------------------------------------------------

        const sector =
          internshipForm.sector.trim();

        if (!sector) {

          setPostError(
            "Please enter a sector."
          );

          return;

        }


        // ----------------------------------------------------
        // SKILLS
        // ----------------------------------------------------

        const skills =
          internshipForm.required_skills
            .split(",")
            .map(
              (skill) =>
                skill.trim()
            )
            .filter(Boolean);

        if (skills.length === 0) {

          setPostError(
            "Please enter at least one required skill."
          );

          return;

        }


        // ----------------------------------------------------
        // LOCATION
        // ----------------------------------------------------

        const location =
          internshipForm.location.trim();

        if (!location) {

          setPostError(
            "Please enter a location."
          );

          return;

        }


        // ----------------------------------------------------
        // SEATS
        // ----------------------------------------------------

        const seats =
          Number(
            internshipForm.seats
          );

        if (
          !Number.isInteger(seats) ||
          seats <= 0
        ) {

          setPostError(
            "Number of positions must be a positive integer."
          );

          return;

        }


        // ----------------------------------------------------
        // CGPA
        // ----------------------------------------------------

        const minimumCgpa =
          Number(
            internshipForm.minimum_cgpa
          );

        if (
          Number.isNaN(minimumCgpa) ||
          minimumCgpa < 0 ||
          minimumCgpa > 10
        ) {

          setPostError(
            "Minimum CGPA must be between 0 and 10."
          );

          return;

        }


        // ----------------------------------------------------
        // DURATION
        // ----------------------------------------------------

        const duration =
          internshipForm.duration.trim();

        if (!duration) {

          setPostError(
            "Please enter internship duration."
          );

          return;

        }


        // ----------------------------------------------------
        // PAYLOAD
        // ----------------------------------------------------

        const payload = {

          company:
            companyName,

          title:
            title,

          sector:
            sector,

          required_skills:
            skills,

          location:
            location,

          seats:
            seats,

          minimum_cgpa:
            minimumCgpa,

          duration:
            duration,

        };


        // ----------------------------------------------------
        // API
        // ----------------------------------------------------

        const response =
          await api.post(
            "/internships",
            payload
          );


        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        console.log(
          "Internship created:",
          response.data
        );

        setPostSuccess(
          "Internship posted successfully."
        );

        setInternshipForm(
          EMPTY_FORM
        );


        await fetchInternships();


        setActiveTab(
          "internships"
        );

      } catch (err) {

        console.error(
          "Failed to post internship:",
          err
        );

        setPostError(
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to post internship. Please try again."
        );

      } finally {

        setPostLoading(false);

      }

    };


  // ==========================================================
  // RUN SMART ALLOCATION
  // ==========================================================

  const handleRunAllocation =
    async () => {

      if (
        allocationLoading ||
        resetLoading
      ) {
        return;
      }

      try {

        setAllocationLoading(true);

        setAllocationError("");
        setResetSuccess("");

        setAllocationResults(null);


        // ----------------------------------------------------
        // RUN BACKEND ENGINE
        // ----------------------------------------------------

        const response =
          await api.post(
            "/allocation/run",
            null,
            {
              params: {
                company:
                  companyName,
              },
            }
          );


        const result =
          response.data;


        console.log(
          "Allocation result:",
          result
        );


        if (
          result?.success === false
        ) {

          throw new Error(
            result.message ||
            "Allocation failed."
          );

        }


        setAllocationResults(
          result
        );


        // ----------------------------------------------------
        // REFRESH APPLICATIONS
        // ----------------------------------------------------

        await fetchApplications();


        // ----------------------------------------------------
        // REFRESH INTERNSHIPS
        // ----------------------------------------------------

        await fetchInternships();

      } catch (err) {

        console.error(
          "Allocation error:",
          err
        );

        setAllocationError(
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Unable to run smart allocation."
        );

      } finally {

        setAllocationLoading(false);

      }

    };


  // ==========================================================
  // RESET ALLOCATION
  // ==========================================================

  const handleResetAllocation =
    async () => {

      if (
        resetLoading ||
        allocationLoading
      ) {
        return;
      }


      // ------------------------------------------------------
      // CONFIRMATION
      // ------------------------------------------------------

      const confirmed =
        window.confirm(
          "Are you sure you want to reset the allocation?\n\n" +
          "All students will become unallocated.\n\n" +
          "Students, applications, internships and company data " +
          "will not be deleted."
        );


      if (!confirmed) {
        return;
      }


      try {

        setResetLoading(true);

        setAllocationError("");

        setResetSuccess("");

        setAllocationResults(null);


        // ----------------------------------------------------
        // RESET BACKEND ALLOCATION
        // ----------------------------------------------------

        const response =
          await api.post(
            "/allocation/reset"
          );


        console.log(
          "Allocation reset:",
          response.data
        );


        // ----------------------------------------------------
        // REFRESH APPLICATIONS
        // ----------------------------------------------------

        await fetchApplications();


        // ----------------------------------------------------
        // REFRESH INTERNSHIPS
        // ----------------------------------------------------

        await fetchInternships();


        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        setResetSuccess(
          response.data?.message ||
          "Allocation reset successfully."
        );


      } catch (err) {

        console.error(
          "Reset allocation error:",
          err
        );

        setAllocationError(
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Unable to reset allocation."
        );

      } finally {

        setResetLoading(false);

      }

    };


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    loadDashboard();

  }, [loadDashboard]);


  // ==========================================================
  // STATISTICS
  // ==========================================================

  const totalApplications =
    applications.length;


  const allocatedCount =
    applications.filter(
      (application) =>
        String(
          application.status || ""
        )
          .toLowerCase()
          .trim() ===
        "allocated"
    ).length;


  const pendingCount =
    applications.filter(
      (application) =>
        String(
          application.status || ""
        )
          .toLowerCase()
          .trim() ===
        "pending"
    ).length;


  const notSelectedCount =
    applications.filter(
      (application) =>
        String(
          application.status || ""
        )
          .toLowerCase()
          .replace(/[_-]/g, " ")
          .trim() ===
        "not selected"
    ).length;


  const totalSeats =
    companyInternships.reduce(
      (total, internship) =>
        total +
        Number(
          internship.seats || 0
        ),
      0
    );


  // ==========================================================
  // STATUS HELPERS
  // ==========================================================

  const normalizeStatus =
    (status) => {

      return String(
        status || "pending"
      )
        .toLowerCase()
        .replace(
          /[_-]/g,
          " "
        )
        .trim();

    };


  const formatStatus =
    (status) => {

      return normalizeStatus(
        status
      ).replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );

    };


  const getStatusClass =
    (status) => {

      return normalizeStatus(
        status
      ).replace(
        /\s+/g,
        "-"
      );

    };


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (

      <div className="company-dashboard">

        <div className="dashboard-loading">

          Loading company dashboard...

        </div>

      </div>

    );

  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {

    return (

      <div className="company-dashboard">

        <div className="dashboard-error">

          {error}

        </div>


        <button
          className="primary-button"
          onClick={
            loadDashboard
          }
        >
          Try Again
        </button>

      </div>

    );

  }


  // ==========================================================
  // DASHBOARD
  // ==========================================================

  return (

    <div className="company-dashboard">


      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="dashboard-header">

        <div>

          <h1>
            Company Dashboard
          </h1>

          <p>
            Manage internships and find
            the best student matches.
          </p>

        </div>


        <div className="company-info">

          <strong>
            {companyName}
          </strong>

          <span>
            Company Account
          </span>


          <button
            type="button"
            className="logout-button"
            onClick={
              handleLogout
            }
          >
            Logout
          </button>

        </div>

      </div>


      {/* ======================================================
          STATISTICS
      ====================================================== */}

      <div className="dashboard-stats">


        <div className="stat-card">

          <span className="stat-number">

            {companyInternships.length}

          </span>

          <span className="stat-label">

            Internships

          </span>

        </div>


        <div className="stat-card">

          <span className="stat-number">

            {totalApplications}

          </span>

          <span className="stat-label">

            Applications

          </span>

        </div>


        <div className="stat-card">

          <span className="stat-number">

            {totalSeats}

          </span>

          <span className="stat-label">

            Total Seats

          </span>

        </div>


        <div className="stat-card">

          <span className="stat-number">

            {allocatedCount}

          </span>

          <span className="stat-label">

            Allocated

          </span>

        </div>

      </div>


      {/* ======================================================
          TABS
      ====================================================== */}

      <div className="dashboard-tabs">


        <button
          className={
            activeTab === "internships"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "internships"
            )
          }
        >
          Internships
        </button>


        <button
          className={
            activeTab === "post"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("post")
          }
        >
          Post Internship
        </button>


        <button
          className={
            activeTab === "applications"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "applications"
            )
          }
        >
          Applications
        </button>


        <button
          className={
            activeTab === "allocation"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "allocation"
            )
          }
        >
          Smart Allocation
        </button>

      </div>


      {/* ======================================================
          INTERNSHIPS
      ====================================================== */}

      {activeTab === "internships" && (

        <div
          className="internships-section"
          id="internships"
        >

          <div className="section-header">

            <div>

              <h2>
                Your Internships
              </h2>

              <p>
                Internship opportunities
                posted by {companyName}.
              </p>

            </div>


            <button
              className="secondary-button"
              onClick={
                fetchInternships
              }
            >
              Refresh
            </button>

          </div>


          {companyInternships.length === 0 ? (

            <div className="empty-state">

              <h3>
                No internships found
              </h3>

              <p>
                You have not posted any
                internships yet.
              </p>


              <button
                className="primary-button"
                onClick={() =>
                  setActiveTab("post")
                }
              >
                Post Internship
              </button>

            </div>

          ) : (

            <div className="internships-list">

              {companyInternships.map(
                (internship) => (

                  <div
                    className="internship-card"
                    key={
                      internship.id
                    }
                  >

                    <div className="internship-details">

                      <h3>
                        {internship.title}
                      </h3>


                      <p>
                        <strong>
                          Company:
                        </strong>{" "}
                        {internship.company}
                      </p>


                      <p>
                        <strong>
                          Sector:
                        </strong>{" "}
                        {internship.sector}
                      </p>


                      <p>
                        <strong>
                          Location:
                        </strong>{" "}
                        {internship.location}
                      </p>


                      <p>
                        <strong>
                          Seats:
                        </strong>{" "}
                        {internship.seats}
                      </p>


                      <p>
                        <strong>
                          Minimum CGPA:
                        </strong>{" "}
                        {internship.minimum_cgpa}
                      </p>


                      <p>
                        <strong>
                          Duration:
                        </strong>{" "}
                        {internship.duration}
                      </p>


                      <p>
                        <strong>
                          Required Skills:
                        </strong>{" "}
                        {Array.isArray(
                          internship.required_skills
                        )
                          ? internship.required_skills.join(
                              ", "
                            )
                          : internship.required_skills}
                      </p>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      )}


      {/* ======================================================
          POST INTERNSHIP
      ====================================================== */}

      {activeTab === "post" && (

        <div className="form-container">

          <h2>
            Post New Internship
          </h2>

          <p>
            Create an internship opportunity
            for students.
          </p>


          <form
            onSubmit={
              handlePostInternship
            }
          >


            <label>

              Internship Title

              <input
                type="text"
                value={
                  internshipForm.title
                }
                onChange={(e) =>
                  setInternshipForm({
                    ...internshipForm,
                    title:
                      e.target.value,
                  })
                }
                placeholder="Software Development Intern"
                required
              />

            </label>


            <label>

              Sector

              <input
                type="text"
                value={
                  internshipForm.sector
                }
                onChange={(e) =>
                  setInternshipForm({
                    ...internshipForm,
                    sector:
                      e.target.value,
                  })
                }
                placeholder="IT"
                required
              />

            </label>


            <label>

              Required Skills

              <input
                type="text"
                value={
                  internshipForm.required_skills
                }
                onChange={(e) =>
                  setInternshipForm({
                    ...internshipForm,
                    required_skills:
                      e.target.value,
                  })
                }
                placeholder="Python, SQL, React"
                required
              />

              <small>
                Separate skills using commas.
              </small>

            </label>


            <label>

              Location

              <input
                type="text"
                value={
                  internshipForm.location
                }
                onChange={(e) =>
                  setInternshipForm({
                    ...internshipForm,
                    location:
                      e.target.value,
                  })
                }
                placeholder="Bengaluru"
                required
              />

            </label>


            <label>

              Number of Positions

              <input
                type="number"
                min="1"
                step="1"
                value={
                  internshipForm.seats
                }
                onChange={(e) =>
                  setInternshipForm({
                    ...internshipForm,
                    seats:
                      e.target.value,
                  })
                }
                placeholder="5"
                required
              />

            </label>


            <label>

              Minimum CGPA

              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={
                  internshipForm.minimum_cgpa
                }
                onChange={(e) =>
                  setInternshipForm({
                    ...internshipForm,
                    minimum_cgpa:
                      e.target.value,
                  })
                }
                placeholder="7.5"
                required
              />

            </label>


            <label>

              Duration

              <input
                type="text"
                value={
                  internshipForm.duration
                }
                onChange={(e) =>
                  setInternshipForm({
                    ...internshipForm,
                    duration:
                      e.target.value,
                  })
                }
                placeholder="6 months"
                required
              />

            </label>


            <button
              type="submit"
              className="primary-button"
              disabled={
                postLoading
              }
            >

              {postLoading
                ? "Posting..."
                : "Post Internship"}

            </button>


            {postError && (

              <p className="error-message">

                {postError}

              </p>

            )}


            {postSuccess && (

              <p className="success-message">

                ✓ {postSuccess}

              </p>

            )}

          </form>

        </div>

      )}


      {/* ======================================================
          APPLICATIONS
      ====================================================== */}

      {activeTab === "applications" && (

        <div
          className="applications-section"
          id="applications"
        >

          <div className="section-header">

            <div>

              <h2>
                Student Applications
              </h2>

              <p>
                Applications received for
                your internships.
              </p>

            </div>


            <button
              className="secondary-button"
              onClick={
                fetchApplications
              }
              disabled={
                applicationsLoading
              }
            >

              {applicationsLoading
                ? "Refreshing..."
                : "Refresh"}

            </button>

          </div>


          {/* SUMMARY */}

          <div className="application-summary">

            <span>
              Total:
            </span>

            <strong>
              {totalApplications}
            </strong>

            <span>
              Pending:
            </span>

            <strong>
              {pendingCount}
            </strong>

            <span>
              Allocated:
            </span>

            <strong>
              {allocatedCount}
            </strong>

            <span>
              Not Selected:
            </span>

            <strong>
              {notSelectedCount}
            </strong>

          </div>


          {/* APPLICATION ERROR */}

          {applicationsError && (

            <div className="dashboard-error">

              {applicationsError}

            </div>

          )}


          {/* LOADING */}

          {applicationsLoading ? (

            <div className="empty-state">

              Loading applications...

            </div>

          ) : applications.length === 0 ? (

            <div className="empty-state">

              <h3>
                No applications yet
              </h3>

              <p>
                Students have not applied
                for your internships yet.
              </p>

            </div>

          ) : (

            <div className="applications-list">

              {applications.map(
                (
                  application,
                  index
                ) => {

                  const applicationId =
                    application.application_id ??
                    application.id ??
                    index;


                  const status =
                    application.status ||
                    "pending";


                  const normalizedStatus =
                    normalizeStatus(
                      status
                    );


                  return (

                    <div
                      className="application-card"
                      key={
                        `${applicationId}-${application.student_id}`
                      }
                    >

                      <div className="application-details">

                        <h3>
                          {application.student_name ||
                            `Student ${application.student_id}`}
                        </h3>


                        <p>
                          <strong>
                            Student ID:
                          </strong>{" "}
                          {application.student_id}
                        </p>


                        <p>
                          <strong>
                            Internship:
                          </strong>{" "}
                          {application.internship_title ||
                            `Internship #${application.internship_id}`}
                        </p>


                        <p>
                          <strong>
                            Location:
                          </strong>{" "}
                          {application.location ||
                            "—"}
                        </p>


                        <p>
                          <strong>
                            Application ID:
                          </strong>{" "}
                          #{applicationId}
                        </p>


                        {/* MATCH SCORE */}

                        {application.score !== null &&
                          application.score !== undefined && (

                            <p>
                              <strong>
                                Match Score:
                              </strong>{" "}
                              {Number(
                                application.score
                              ).toFixed(2)}
                              %
                            </p>

                          )}


                        {/* AI SCORE */}

                        {application.ai_score !== null &&
                          application.ai_score !== undefined && (

                            <p>
                              <strong>
                                AI Compatibility:
                              </strong>{" "}
                              {Number(
                                application.ai_score
                              ).toFixed(2)}
                              %
                            </p>

                          )}

                      </div>


                      <div className="application-status">

                        <span
                          className={`status-badge ${getStatusClass(
                            status
                          )}`}
                        >

                          {normalizedStatus ===
                          "allocated"
                            ? "✓ Allocated"
                            : formatStatus(
                                status
                              )}

                        </span>


                        {/* REASONS */}

                        {Array.isArray(
                          application.reasons
                        ) &&
                          application.reasons.length >
                            0 && (

                            <details>

                              <summary>
                                View match reasons
                              </summary>

                              <ul>

                                {application.reasons.map(
                                  (
                                    reason,
                                    reasonIndex
                                  ) => (

                                    <li
                                      key={
                                        reasonIndex
                                      }
                                    >
                                      {reason}
                                    </li>

                                  )
                                )}

                              </ul>

                            </details>

                          )}

                      </div>

                    </div>

                  );

                }
              )}

            </div>

          )}

        </div>

      )}


      {/* ======================================================
          SMART ALLOCATION
      ====================================================== */}

      {activeTab === "allocation" && (

        <div
          className="allocation-section"
          id="allocation"
        >

          <h2>
            Smart Internship Allocation
          </h2>

          <p>
            The AI-powered allocation engine
            considers eligibility, skills,
            CGPA, location, sector and
            semantic compatibility.
          </p>


          {/* INFO */}

          <div className="allocation-info">

            <p>
              <strong>
                Company:
              </strong>{" "}
              {companyName}
            </p>

            <p>
              <strong>
                Internships:
              </strong>{" "}
              {companyInternships.length}
            </p>

            <p>
              <strong>
                Applications:
              </strong>{" "}
              {totalApplications}
            </p>

            <p>
              <strong>
                Available Seats:
              </strong>{" "}
              {totalSeats}
            </p>

          </div>


          {/* ==================================================
              ALLOCATION ACTIONS
              ================================================== */}

          <div className="allocation-actions">

            {/* RUN ALLOCATION */}

            <button
              type="button"
              className="primary-button"
              onClick={
                handleRunAllocation
              }
              disabled={
                allocationLoading ||
                resetLoading ||
                companyInternships.length === 0 ||
                totalApplications === 0
              }
            >

              {allocationLoading
                ? "Running Smart Allocation..."
                : "Run Smart Allocation"}

            </button>


            {/* RESET ALLOCATION */}

            <button
              type="button"
              className="reset-button"
              onClick={
                handleResetAllocation
              }
              disabled={
                allocationLoading ||
                resetLoading
              }
            >

              {resetLoading
                ? "Resetting Allocation..."
                : "↻ Reset Allocation"}

            </button>

          </div>


          {/* ==================================================
              WARNING
              ================================================== */}

          {(
            companyInternships.length === 0 ||
            totalApplications === 0
          ) && (

            <p className="dashboard-error">

              {companyInternships.length === 0
                ? "Post at least one internship before running allocation."
                : "Students must apply before allocation can be run."}

            </p>

          )}


          {/* ==================================================
              RESET SUCCESS
              ================================================== */}

          {resetSuccess && (

            <div className="success-message">

              ✓ {resetSuccess}

            </div>

          )}


          {/* ==================================================
              ALLOCATION ERROR
              ================================================== */}

          {allocationError && (

            <p className="error-message">

              {allocationError}

            </p>

          )}


          {/* ==================================================
              RESULTS
              ================================================== */}

          {allocationResults && (

            <div className="allocation-results">


              {/* ==================================================
                  SUCCESS
                  ================================================== */}

              <div className="success-message">

                ✓ Smart allocation completed successfully.

              </div>


              {/* ==================================================
                  STATISTICS
                  ================================================== */}

              {allocationResults.statistics && (

                <div className="allocation-stats">


                  <div className="stat-card">

                    <span className="stat-number">

                      {
                        allocationResults
                          .statistics
                          .total_students
                      }

                    </span>

                    <span className="stat-label">
                      Total Students
                    </span>

                  </div>


                  <div className="stat-card">

                    <span className="stat-number">

                      {
                        allocationResults
                          .statistics
                          .total_applications
                      }

                    </span>

                    <span className="stat-label">
                      Applications
                    </span>

                  </div>


                  <div className="stat-card">

                    <span className="stat-number">

                      {
                        allocationResults
                          .statistics
                          .total_seats
                      }

                    </span>

                    <span className="stat-label">
                      Total Seats
                    </span>

                  </div>


                  <div className="stat-card">

                    <span className="stat-number">

                      {
                        allocationResults
                          .statistics
                          .total_allocated
                      }

                    </span>

                    <span className="stat-label">
                      Allocated
                    </span>

                  </div>


                  <div className="stat-card">

                    <span className="stat-number">

                      {
                        allocationResults
                          .statistics
                          .total_unallocated
                      }

                    </span>

                    <span className="stat-label">
                      Unallocated
                    </span>

                  </div>

                </div>

              )}


              {/* ==================================================
                  ALLOCATED STUDENTS
                  ================================================== */}

              <div className="allocated-students">

                <h3>
                  Allocated Students
                </h3>


                {allocationResults
                  .allocations?.length > 0 ? (

                  <div>

                    {allocationResults
                      .allocations
                      .map(
                        (
                          allocation
                        ) => (

                          <div
                            className="allocation-card"
                            key={
                              allocation.application_id
                            }
                          >

                            <h3>
                              {
                                allocation.student_name
                              }
                            </h3>


                            <p>
                              <strong>
                                Internship:
                              </strong>{" "}
                              {
                                allocation.internship_title
                              }
                            </p>


                            <p>
                              <strong>
                                Company:
                              </strong>{" "}
                              {
                                allocation.company
                              }
                            </p>


                            <p>
                              <strong>
                                Application:
                              </strong>{" "}
                              #
                              {
                                allocation.application_id
                              }
                            </p>


                            <p>
                              <strong>
                                Match Score:
                              </strong>{" "}
                              {Number(
                                allocation.score || 0
                              ).toFixed(2)}
                              %
                            </p>


                            <p>
                              <strong>
                                AI Compatibility:
                              </strong>{" "}
                              {Number(
                                allocation.ai_score || 0
                              ).toFixed(2)}
                              %
                            </p>


                            <div className="allocation-status">

                              ✓ Allocated

                            </div>


                            {/* MATCH REASONS */}

                            {Array.isArray(
                              allocation.reasons
                            ) &&
                              allocation.reasons.length >
                                0 && (

                                <div className="allocation-reasons">

                                  <h4>
                                    Why This Student Was Matched
                                  </h4>


                                  <ul>

                                    {allocation.reasons.map(
                                      (
                                        reason,
                                        index
                                      ) => (

                                        <li
                                          key={
                                            index
                                          }
                                        >
                                          ✓ {reason}
                                        </li>

                                      )
                                    )}

                                  </ul>

                                </div>

                              )}

                          </div>

                        )
                      )}

                  </div>

                ) : (

                  <div className="empty-state">

                    No students were allocated.

                  </div>

                )}

              </div>


              {/* ==================================================
                  UNALLOCATED
                  ================================================== */}

              {allocationResults
                .unallocated_students
                ?.length > 0 && (

                <div className="unallocated-section">

                  <h3>
                    Unallocated Applicants
                  </h3>


                  <p>

                    {
                      allocationResults
                        .unallocated_students
                        .length
                    }{" "}

                    applicant(s) were not allocated.

                  </p>


                  <ul>

                    {allocationResults
                      .unallocated_students
                      .map(
                        (
                          student,
                          index
                        ) => (

                          <li
                            key={
                              student.student_id ??
                              index
                            }
                          >

                            {student.student_name}

                          </li>

                        )
                      )}

                  </ul>

                </div>

              )}

            </div>

          )}

        </div>

      )}

    </div>

  );

};


export default CompanyDashboard;