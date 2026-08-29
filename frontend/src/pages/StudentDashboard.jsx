import { useEffect, useMemo, useState } from "react";

import {
  Briefcase,
  MapPin,
  Users,
  GraduationCap,
  Clock,
  CheckCircle,
  Trophy,
  RefreshCw,
  XCircle,
  Clock3,
  Sparkles,
} from "lucide-react";

import api from "../services/api";


// ============================================================
// STATUS HELPERS
// ============================================================

const normalizeStatus = (status) => {
  return String(status || "pending")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();
};


const formatStatus = (status) => {
  return normalizeStatus(status).replace(
    /\b\w/g,
    (letter) => letter.toUpperCase()
  );
};


// ============================================================
// STUDENT DASHBOARD
// ============================================================

function StudentDashboard() {

  // ============================================================
  // CURRENT STUDENT
  // ============================================================

  const getCurrentUser = () => {
    try {

      const storedUser =
        localStorage.getItem("currentUser");

      if (!storedUser) {
        return null;
      }

      return JSON.parse(storedUser);

    } catch (error) {

      console.error(
        "Failed to read currentUser:",
        error
      );

      return null;
    }
  };


  const currentUser = getCurrentUser();

  const studentId =
    Number(currentUser?.id || 1);

  const studentName =
    currentUser?.name || "Student";


  // ============================================================
  // STATE
  // ============================================================

  const [activeTab, setActiveTab] =
    useState("internships");

  const [internships, setInternships] =
    useState([]);

  const [applications, setApplications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [applicationError, setApplicationError] =
    useState("");

  const [allocation, setAllocation] =
    useState(null);

  const [allocationLoading, setAllocationLoading] =
    useState(false);

  const [allocationError, setAllocationError] =
    useState("");


  // ============================================================
  // DERIVED ALLOCATION DATA
  // ============================================================

  const isAllocated =
    Boolean(allocation);


  const allocatedInternshipId =
    allocation
      ? Number(allocation.internship_id)
      : null;


  const allocatedApplicationId =
    allocation
      ? Number(allocation.application_id)
      : null;


  // ============================================================
  // APPLICATION STATISTICS
  // ============================================================

  const applicationStats =
    useMemo(() => {

      let pending = 0;
      let allocated = 0;
      let notSelected = 0;

      applications.forEach(
        (application) => {

          const status =
            normalizeStatus(
              application.status
            );


          if (
            status === "allocated" ||
            status === "selected"
          ) {

            allocated++;

          } else if (
            status === "not selected"
          ) {

            notSelected++;

          } else {

            pending++;
          }

        }
      );


      // Allocation endpoint is the
      // final source of truth.

      if (
        isAllocated &&
        allocated === 0
      ) {

        allocated = 1;
      }


      return {
        total: applications.length,
        pending,
        allocated,
        notSelected,
      };

    }, [
      applications,
      isAllocated,
    ]);


  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {

    loadDashboard();

  }, [studentId]);


  // ============================================================
  // LOAD DASHBOARD
  // ============================================================

  const loadDashboard = async () => {

    try {

      setLoading(true);

      setError("");


      await Promise.all([
        fetchInternships(),
        fetchApplications(),
        fetchAllocation(),
      ]);

    } catch (error) {

      console.error(
        "Dashboard loading error:",
        error
      );

    } finally {

      setLoading(false);
    }
  };


  // ============================================================
  // FETCH INTERNSHIPS
  // ============================================================

  const fetchInternships = async () => {

    try {

      const response =
        await api.get("/internships");


      const data =
        response.data?.internships || [];


      setInternships(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (err) {

      console.error(
        "Failed to fetch internships:",
        err
      );


      setError(
        "Unable to load internships. Please make sure the backend is running."
      );

    }
  };


  // ============================================================
  // FETCH APPLICATIONS
  // ============================================================

  const fetchApplications = async () => {

    try {

      setApplicationError("");


      const response =
        await api.get(
          `/students/${studentId}/applications`
        );


      const data =
        response.data?.applications || [];


      setApplications(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (err) {

      console.error(
        "Failed to fetch student applications:",
        err
      );


      setApplicationError(
        "Unable to load your applications."
      );


      setApplications([]);
    }
  };


  // ============================================================
  // FETCH ALLOCATION
  // ============================================================

  const fetchAllocation = async () => {

    try {

      setAllocationLoading(true);

      setAllocationError("");


      /*
       * IMPORTANT:
       *
       * This endpoint only retrieves the student's
       * existing allocation.
       *
       * It does NOT run the allocation engine.
       */

      const response =
        await api.get(
          `/students/${studentId}/allocation`
        );


      const allocated =
        response.data?.allocated || null;


      setAllocation(allocated);

    } catch (err) {

      console.error(
        "Failed to fetch allocation:",
        err
      );


      setAllocationError(
        "Unable to load allocation."
      );


      setAllocation(null);

    } finally {

      setAllocationLoading(false);
    }
  };


  // ============================================================
  // REFRESH
  // ============================================================

  const handleRefresh = async () => {

    try {

      setRefreshing(true);

      setError("");

      await Promise.all([
        fetchInternships(),
        fetchApplications(),
        fetchAllocation(),
      ]);

    } finally {

      setRefreshing(false);
    }
  };


  // ============================================================
  // APPLY FOR INTERNSHIP
  // ============================================================

  const handleApply = async (
    internshipId
  ) => {

    // ----------------------------------------------------------
    // ALREADY ALLOCATED
    // ----------------------------------------------------------

    if (isAllocated) {

      alert(
        "You already have an internship allocation. You cannot apply for another internship."
      );

      return;
    }


    // ----------------------------------------------------------
    // DUPLICATE APPLICATION
    // ----------------------------------------------------------

    const alreadyApplied =
      applications.some(
        (application) =>
          Number(
            application.internship_id
          ) === Number(internshipId)
      );


    if (alreadyApplied) {

      alert(
        "You have already applied for this internship."
      );

      return;
    }


    // ----------------------------------------------------------
    // FIND INTERNSHIP
    // ----------------------------------------------------------

    const internship =
      internships.find(
        (item) =>
          Number(item.id) ===
          Number(internshipId)
      );


    // ----------------------------------------------------------
    // CHECK SEATS
    // ----------------------------------------------------------

    if (
      internship &&
      Number(internship.seats || 0) <= 0
    ) {

      alert(
        "This internship currently has no available seats."
      );

      return;
    }


    // ----------------------------------------------------------
    // SUBMIT
    // ----------------------------------------------------------

    try {

      const response =
        await api.post(
          "/applications",
          {
            student_id:
              studentId,

            internship_id:
              internshipId,
          }
        );


      if (response.data?.success) {

        alert(
          "Application submitted successfully!"
        );


        await fetchApplications();

      } else {

        alert(
          response.data?.message ||
            "Unable to submit application."
        );
      }

    } catch (err) {

      console.error(
        "Application failed:",
        err
      );


      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Unable to submit application.";


      alert(message);
    }
  };


  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {

    localStorage.removeItem(
      "currentUser"
    );

    window.location.href = "/";
  };


  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {

    return (

      <div className="dashboard-container">

        <div className="empty-state">

          <RefreshCw
            size={32}
            className="loading-icon"
          />

          <h2>
            Loading your dashboard...
          </h2>

          <p>
            Please wait while we load your
            internships, applications and
            allocation.
          </p>

        </div>

      </div>
    );
  }


  // ============================================================
  // ERROR
  // ============================================================

  if (
    error &&
    internships.length === 0
  ) {

    return (

      <div className="dashboard-container">

        <div className="error-card">

          <h2>
            Student Dashboard
          </h2>

          <p>
            {error}
          </p>

          <button
            className="apply-button"
            onClick={handleRefresh}
          >
            Try Again
          </button>

        </div>

      </div>
    );
  }


  // ============================================================
  // MAIN STATISTICS
  // ============================================================

  const totalInternships =
    internships.length;


  const totalApplications =
    applications.length;


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <div className="dashboard-container">


      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="dashboard-header">

        <div>

          <h1>
            Welcome, {studentName} 👋
          </h1>

          <p>
            Manage your internship applications
            and smart allocation.
          </p>

        </div>


        <div>

          <button
            type="button"
            onClick={handleRefresh}
            className="refresh-button"
            disabled={refreshing}
          >

            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}

          </button>


          <button
            type="button"
            onClick={handleLogout}
            className="logout-button"
          >
            Logout
          </button>

        </div>

      </div>


      {/* ======================================================
          ALLOCATION SUCCESS BANNER
      ====================================================== */}

      {isAllocated && (

        <div className="allocated-message">

          <div className="allocated-icon">
            🎉
          </div>

          <strong>
            INTERNSHIP ALLOCATED
          </strong>

          <h4>
            Congratulations, {studentName}!
          </h4>

          <p>
            You have successfully been allocated:
          </p>

          <p>
            <strong>
              {allocation?.internship_title}
            </strong>
          </p>

          <p>
            {allocation?.company}
          </p>

          {allocation?.location && (

            <p>
              📍 {allocation.location}
            </p>

          )}

          {allocation?.score !== undefined && (

            <p>
              Match Score:{" "}
              <strong>
                {Number(
                  allocation.score
                ).toFixed(2)}
                %
              </strong>
            </p>

          )}

          <span className="allocated-badge">
            ✓ ALLOCATED
          </span>

          <p className="allocation-warning">
            You cannot apply for another
            internship because you already
            have an allocation.
          </p>

        </div>

      )}


      {/* ======================================================
          STATISTICS
      ====================================================== */}

      <div className="dashboard-stats">


        {/* TOTAL INTERNSHIPS */}

        <div className="stat-card">

          <Briefcase size={25} />

          <div>

            <h3>
              {totalInternships}
            </h3>

            <p>
              Internships
            </p>

          </div>

        </div>


        {/* APPLICATIONS */}

        <div className="stat-card">

          <CheckCircle size={25} />

          <div>

            <h3>
              {totalApplications}
            </h3>

            <p>
              Applications
            </p>

          </div>

        </div>


        {/* PENDING */}

        <div className="stat-card">

          <Clock3 size={25} />

          <div>

            <h3>
              {applicationStats.pending}
            </h3>

            <p>
              Pending
            </p>

          </div>

        </div>


        {/* ALLOCATED */}

        <div className="stat-card">

          <Trophy size={25} />

          <div>

            <h3>
              {applicationStats.allocated}
            </h3>

            <p>
              Allocated
            </p>

          </div>

        </div>


        {/* NOT SELECTED */}

        <div className="stat-card">

          <XCircle size={25} />

          <div>

            <h3>
              {applicationStats.notSelected}
            </h3>

            <p>
              Not Selected
            </p>

          </div>

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
            setActiveTab("internships")
          }
        >
          Internships
        </button>


        <button
          className={
            activeTab === "applications"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("applications")
          }
        >
          My Applications
        </button>


        <button
          className={
            activeTab === "allocation"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("allocation")
          }
        >
          Allocation
        </button>

      </div>


      {/* ======================================================
          INTERNSHIPS TAB
      ====================================================== */}

      {activeTab === "internships" && (

        <section
          className="section"
          id="internships-section"
        >

          <div className="section-header">

            <div>

              <h2>
                Available Internships
              </h2>

              <p>
                Find an internship that matches
                your skills and preferences.
              </p>

            </div>


            <button
              className="refresh-button"
              onClick={handleRefresh}
              disabled={refreshing}
            >

              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "spin"
                    : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}

            </button>

          </div>


          {/* ERROR */}

          {error && (

            <div className="error-card">

              <p>
                {error}
              </p>

            </div>

          )}


          {/* NO INTERNSHIPS */}

          {internships.length === 0 ? (

            <div className="empty-state">

              <div className="empty-icon">
                📭
              </div>

              <h3>
                No internships available
              </h3>

              <p>
                Please check again later.
              </p>

            </div>

          ) : (

            <div className="internship-grid">

              {internships.map(
                (internship) => {

                  const internshipId =
                    Number(
                      internship.id
                    );


                  const application =
                    applications.find(
                      (item) =>
                        Number(
                          item.internship_id
                        ) === internshipId
                    );


                  const alreadyApplied =
                    Boolean(application);


                  const isThisAllocatedInternship =
                    isAllocated &&
                    internshipId ===
                      allocatedInternshipId;


                  const status =
                    normalizeStatus(
                      application?.status
                    );


                  const isNotSelected =
                    status ===
                    "not selected";


                  return (

                    <div
                      className={
                        isThisAllocatedInternship
                          ? "internship-card allocated-card"
                          : "internship-card"
                      }
                      key={
                        internship.id
                      }
                    >


                      {/* COMPANY ICON */}

                      <div className="company-icon">

                        <Briefcase
                          size={24}
                        />

                      </div>


                      {/* TITLE */}

                      <h3>
                        {internship.title}
                      </h3>


                      {/* COMPANY */}

                      <h4>
                        {internship.company}
                      </h4>


                      {/* SECTOR */}

                      {internship.sector && (

                        <p className="internship-sector">

                          {internship.sector}

                        </p>

                      )}


                      {/* DETAILS */}

                      <div className="internship-info">


                        <p>

                          <MapPin
                            size={16}
                          />

                          <span>
                            Location:{" "}
                            {internship.location}
                          </span>

                        </p>


                        <p>

                          <GraduationCap
                            size={16}
                          />

                          <span>
                            Minimum CGPA:{" "}
                            {internship.minimum_cgpa}
                          </span>

                        </p>


                        <p>

                          <Clock
                            size={16}
                          />

                          <span>
                            Duration:{" "}
                            {internship.duration}
                          </span>

                        </p>


                        <p>

                          <Users
                            size={16}
                          />

                          <span>
                            Seats:{" "}
                            {internship.seats}
                          </span>

                        </p>

                      </div>


                      {/* REQUIRED SKILLS */}

                      <div className="skills-section">

                        <strong>
                          Required Skills
                        </strong>


                        <div className="skills">

                          {Array.isArray(
                            internship.required_skills
                          ) &&

                            internship.required_skills.map(
                              (skill) => (

                                <span
                                  key={skill}
                                >
                                  {skill}
                                </span>

                              )
                            )}

                        </div>

                      </div>


                      {/* =================================================
                          ACTION AREA
                      ================================================= */}


                      {isThisAllocatedInternship ? (

                        <div className="allocated-message">

                          <div className="allocated-icon">
                            🎉
                          </div>

                          <strong>
                            YOUR INTERNSHIP
                          </strong>

                          <h4>
                            {internship.title}
                          </h4>

                          <p>
                            {internship.company}
                          </p>

                          <p>
                            📍{" "}
                            {internship.location}
                          </p>

                          <span className="allocated-badge">
                            ✓ ALLOCATED
                          </span>

                        </div>

                      ) : isAllocated ? (

                        <div className="application-closed">

                          🔒 Application Closed

                          <p>
                            You already have an
                            internship allocation.
                          </p>

                        </div>

                      ) : isNotSelected ? (

                        <div className="application-closed">

                          <XCircle
                            size={18}
                          />

                          Not Selected

                          <p>
                            You were not selected
                            for this internship.
                          </p>

                        </div>

                      ) : alreadyApplied ? (

                        <button
                          className="apply-button"
                          disabled
                        >
                          {status === "allocated"
                            ? "Allocated ✓"
                            : "Already Applied ✓"}
                        </button>

                      ) : (

                        <button
                          className="apply-button"
                          onClick={() =>
                            handleApply(
                              internship.id
                            )
                          }
                        >
                          Apply Now
                        </button>

                      )}

                    </div>

                  );

                }
              )}

            </div>

          )}

        </section>

      )}


      {/* ======================================================
          APPLICATIONS TAB
      ====================================================== */}

      {activeTab === "applications" && (

        <section
          className="section"
          id="applications-section"
        >

          <div className="section-header">

            <div>

              <h2>
                My Applications
              </h2>

              <p>
                Track all your internship
                applications.
              </p>

            </div>


            <button
              className="refresh-button"
              onClick={handleRefresh}
              disabled={refreshing}
            >

              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "spin"
                    : ""
                }
              />

              {refreshing
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
              {applicationStats.total}
            </strong>

            <span>
              {" | "}
            </span>

            <span>
              Pending:
            </span>

            <strong>
              {applicationStats.pending}
            </strong>

            <span>
              {" | "}
            </span>

            <span>
              Allocated:
            </span>

            <strong>
              {applicationStats.allocated}
            </strong>

            <span>
              {" | "}
            </span>

            <span>
              Not Selected:
            </span>

            <strong>
              {applicationStats.notSelected}
            </strong>

          </div>


          {/* ERROR */}

          {applicationError && (

            <div className="error-card">

              <p>
                {applicationError}
              </p>

              <button
                className="apply-button"
                onClick={
                  fetchApplications
                }
              >
                Retry
              </button>

            </div>

          )}


          {/* EMPTY */}

          {!applicationError &&
            applications.length === 0 && (

              <div className="empty-state">

                <div className="empty-icon">
                  📄
                </div>

                <h3>
                  No applications yet
                </h3>

                <p>
                  Apply for an internship to see
                  your applications here.
                </p>

              </div>

            )}


          {/* APPLICATION LIST */}

          {applications.length > 0 && (

            <div className="applications-list">

              {applications.map(
                (
                  application,
                  index
                ) => {

                  const internship =
                    internships.find(
                      (item) =>
                        Number(
                          item.id
                        ) ===
                        Number(
                          application.internship_id
                        )
                    );


                  const applicationId =
                    application.application_id ??
                    application.id ??
                    index;


                  const normalizedStatus =
                    normalizeStatus(
                      application.status
                    );


                  const isApplicationAllocated =
                    normalizedStatus ===
                      "allocated" ||
                    normalizedStatus ===
                      "selected" ||
                    Number(
                      applicationId
                    ) ===
                      allocatedApplicationId;


                  const isNotSelected =
                    normalizedStatus ===
                    "not selected";


                  return (

                    <div
                      className={
                        isApplicationAllocated
                          ? "application-card allocated-application"
                          : "application-card"
                      }
                      key={
                        `${applicationId}-${application.internship_id}`
                      }
                    >


                      {/* ICON */}

                      <div className="application-icon">

                        {isApplicationAllocated ? (

                          <Trophy
                            size={24}
                          />

                        ) : isNotSelected ? (

                          <XCircle
                            size={24}
                          />

                        ) : (

                          <Clock
                            size={24}
                          />

                        )}

                      </div>


                      {/* DETAILS */}

                      <div className="application-details">

                        <h3>
                          {application.internship_title ||
                            internship?.title ||
                            "Internship"}
                        </h3>


                        <h4>
                          {application.company ||
                            internship?.company ||
                            "Company information unavailable"}
                        </h4>


                        <p>

                          <MapPin
                            size={16}
                          />

                          {application.location ||
                            internship?.location ||
                            "Location unavailable"}

                        </p>


                        <p>
                          Application ID: #
                          {applicationId}
                        </p>

                      </div>


                      {/* STATUS */}

                      <div className="application-status">

                        {isApplicationAllocated ? (

                          <div className="status-allocated">

                            ✓ Allocated

                          </div>

                        ) : isNotSelected ? (

                          <div className="status-not-selected">

                            Not Selected

                          </div>

                        ) : (

                          <div className="status-pending">

                            ⏳ Pending

                          </div>

                        )}

                      </div>

                    </div>

                  );

                }
              )}

            </div>

          )}

        </section>

      )}


      {/* ======================================================
          ALLOCATION TAB
      ====================================================== */}

      {activeTab === "allocation" && (

        <section
          className="section"
          id="allocation-section"
        >

          <div className="section-header">

            <div>

              <h2>
                My Smart Allocation
              </h2>

              <p>
                Your internship allocation based on
                skills, CGPA, preferences and AI
                compatibility.
              </p>

            </div>


            <button
              className="refresh-button"
              onClick={fetchAllocation}
              disabled={
                allocationLoading
              }
            >

              <RefreshCw
                size={16}
                className={
                  allocationLoading
                    ? "spin"
                    : ""
                }
              />

              {allocationLoading
                ? "Checking..."
                : "Check Allocation"}

            </button>

          </div>


          {/* LOADING */}

          {allocationLoading && (

            <div className="empty-state">

              <RefreshCw
                size={32}
                className="loading-icon"
              />

              <h3>
                Loading allocation...
              </h3>

              <p>
                Please wait.
              </p>

            </div>

          )}


          {/* ERROR */}

          {!allocationLoading &&
            allocationError && (

              <div className="error-card">

                <h3>
                  Unable to load allocation
                </h3>

                <p>
                  {allocationError}
                </p>

                <button
                  className="apply-button"
                  onClick={
                    fetchAllocation
                  }
                >
                  Try Again
                </button>

              </div>

            )}


          {/* NO ALLOCATION */}

          {!allocationLoading &&
            !allocationError &&
            !allocation && (

              <div className="empty-state">

                <div className="empty-icon">
                  🎯
                </div>

                <h3>
                  No allocation yet
                </h3>

                <p>
                  You have applied for internships,
                  but an internship has not been
                  allocated to you yet.
                </p>

                <p>
                  Your applications remain pending
                  until the company runs the smart
                  allocation process.
                </p>

                <button
                  className="apply-button"
                  onClick={
                    fetchAllocation
                  }
                >
                  Check Allocation
                </button>

              </div>

            )}


          {/* ALLOCATION FOUND */}

          {!allocationLoading &&
            !allocationError &&
            allocation && (

              <div className="student-allocation-result">


                {/* SUCCESS HEADER */}

                <div className="allocation-success-header">

                  <div className="success-icon">

                    <CheckCircle
                      size={34}
                    />

                  </div>


                  <div>

                    <h2>
                      🎉 Congratulations,{" "}
                      {studentName}!
                    </h2>

                    <p>
                      You have been successfully
                      allocated an internship.
                    </p>

                  </div>

                </div>


                {/* INTERNSHIP */}

                <div className="allocated-internship-card">

                  <div className="allocated-company-icon">

                    <Briefcase
                      size={32}
                    />

                  </div>


                  <div className="allocated-internship-info">

                    <span className="allocation-label">

                      Allocated Internship

                    </span>


                    <h2>
                      {allocation.internship_title ||
                        "Internship"}
                    </h2>


                    <h3>
                      {allocation.company ||
                        "Company"}
                    </h3>


                    {allocation.location && (

                      <p>
                        📍{" "}
                        {allocation.location}
                      </p>

                    )}


                    {allocation.sector && (

                      <p>
                        <strong>
                          Sector:
                        </strong>{" "}
                        {allocation.sector}
                      </p>

                    )}


                    {allocation.duration && (

                      <p>
                        <strong>
                          Duration:
                        </strong>{" "}
                        {allocation.duration}
                      </p>

                    )}


                    {allocation.application_id !==
                      undefined && (

                      <p>
                        <strong>
                          Application ID:
                        </strong>{" "}
                        #
                        {allocation.application_id}
                      </p>

                    )}


                    <span className="allocated-badge">
                      ✓ ALLOCATED
                    </span>

                  </div>

                </div>


                {/* =================================================
                    MATCH SCORES
                ================================================= */}

                {(allocation.score !==
                  undefined ||
                  allocation.ai_score !==
                    undefined) && (

                  <div className="student-score-grid">


                    {/* FINAL SCORE */}

                    {allocation.score !==
                      undefined && (

                      <div className="student-score-card">

                        <Trophy
                          size={22}
                        />

                        <span>
                          Final Match Score
                        </span>


                        <strong>
                          {Number(
                            allocation.score
                          ).toFixed(2)}
                          %
                        </strong>


                        <small>
                          Overall compatibility
                        </small>

                      </div>

                    )}


                    {/* AI SCORE */}

                    {allocation.ai_score !==
                      undefined && (

                      <div className="student-score-card ai-score-card">

                        <Sparkles
                          size={22}
                        />

                        <span>
                          AI Compatibility
                        </span>


                        <strong>
                          {Number(
                            allocation.ai_score
                          ).toFixed(2)}
                          %
                        </strong>


                        <small>
                          AI-based compatibility
                        </small>

                      </div>

                    )}

                  </div>

                )}


                {/* =================================================
                    WHY SELECTED
                ================================================= */}

                {Array.isArray(
                  allocation.reasons
                ) &&
                  allocation.reasons.length >
                    0 && (

                    <div className="selection-reasons">

                      <h3>
                        Why You Were Selected
                      </h3>


                      <p className="selection-subtitle">

                        Your allocation was based on
                        the following matching factors:

                      </p>


                      <div className="student-reasons-list">

                        {allocation.reasons.map(
                          (
                            reason,
                            index
                          ) => (

                            <div
                              className="student-reason-item"
                              key={index}
                            >

                              <CheckCircle
                                size={18}
                              />

                              <span>
                                {reason}
                              </span>

                            </div>

                          )
                        )}

                      </div>

                    </div>

                  )}


                {/* =================================================
                    SMART ALLOCATION INFORMATION
                ================================================= */}

                <div className="allocation-note">

                  <strong>
                    🤖 Smart Allocation
                  </strong>


                  <p>
                    The system considers your
                    skills, CGPA, preferred sector,
                    preferred location and AI
                    compatibility to determine the
                    best internship match.
                  </p>

                </div>

              </div>

            )}

        </section>

      )}

    </div>
  );
}


export default StudentDashboard;