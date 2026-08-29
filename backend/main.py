import json
import os
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.services.allocation import run_allocation
from app.services.matching import calculate_match_score


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Smart Internship Allocation Engine",
    description="SIH 2026 MVP - PM Internship Smart Allocation",
    version="2.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATA HELPERS
# ============================================================

def get_data_path(filename: str):
    """Return absolute path of a backend/data JSON file."""

    base_dir = os.path.dirname(os.path.abspath(__file__))

    data_dir = os.path.join(
        base_dir,
        "data"
    )

    os.makedirs(
        data_dir,
        exist_ok=True
    )

    return os.path.join(
        data_dir,
        filename
    )


def load_data(filename: str):
    """Load JSON data safely."""

    path = get_data_path(filename)

    if not os.path.exists(path):
        return []

    try:
        with open(
                path,
                "r",
                encoding="utf-8"
        ) as file:

            data = json.load(file)

            return data if isinstance(data, list) else []

    except json.JSONDecodeError:

        print(
            f"ERROR: Invalid JSON in {filename}"
        )

        return []


def save_data(filename: str, data):
    """Save JSON data safely."""

    path = get_data_path(filename)

    with open(
            path,
            "w",
            encoding="utf-8"
    ) as file:

        json.dump(
            data,
            file,
            indent=2,
            ensure_ascii=False
        )


def find_student(students, student_id):
    """Find a student by ID."""

    return next(
        (
            student
            for student in students
            if int(student.get("id", -1))
               == int(student_id)
        ),
        None
    )


def find_internship(internships, internship_id):
    """Find internship by ID."""

    return next(
        (
            internship
            for internship in internships
            if int(internship.get("id", -1))
               == int(internship_id)
        ),
        None
    )


def find_application(applications, application_id):
    """Find application by ID."""

    return next(
        (
            application
            for application in applications
            if int(application.get("id", -1))
               == int(application_id)
        ),
        None
    )


def normalize_status(status):
    """Normalize application status."""

    return (
        str(status or "pending")
        .lower()
        .replace("_", " ")
        .replace("-", " ")
        .strip()
    )


def is_allocated_status(status):
    """Check whether application is allocated."""

    return normalize_status(status) == "allocated"


def has_student_allocation(applications, student_id):
    """Check whether student already has an allocation."""

    return any(
        int(application.get("student_id", -1))
        == int(student_id)
        and is_allocated_status(
            application.get("status")
        )
        for application in applications
    )


def get_student_allocated_application(
        applications,
        student_id
):
    """Return student's allocated application."""

    return next(
        (
            application
            for application in applications
            if int(application.get("student_id", -1))
               == int(student_id)
               and is_allocated_status(
            application.get("status")
        )
        ),
        None
    )


def get_internship_application_count(
        applications,
        internship_id
):
    """Return number of active applications."""

    return sum(
        1
        for application in applications
        if int(application.get("internship_id", -1))
        == int(internship_id)
        and normalize_status(
            application.get("status")
        )
        not in {
            "cancelled",
            "rejected"
        }
    )


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "success": True,
        "message":
            "Smart Internship Allocation Engine is running",
        "status": "success",
        "version": "2.0.0"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():

    return {
        "success": True,
        "status": "healthy",
        "service":
            "Smart Internship Allocation Engine"
    }


# ============================================================
# STUDENTS
# ============================================================

@app.get("/students")
def get_students():

    students = load_data(
        "students.json"
    )

    return {
        "success": True,
        "total": len(students),
        "students": students
    }


# ============================================================
# SINGLE STUDENT
# ============================================================

@app.get("/students/{student_id}")
def get_student(
        student_id: int
):

    students = load_data(
        "students.json"
    )

    student = find_student(
        students,
        student_id
    )

    if not student:

        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message":
                    "Student not found"
            }
        )

    return {
        "success": True,
        "student": student
    }


# ============================================================
# INTERNSHIPS - GET
# ============================================================

@app.get("/internships")
def get_internships():

    internships = load_data(
        "internships.json"
    )

    return {
        "success": True,
        "total": len(internships),
        "internships": internships
    }


# ============================================================
# SINGLE INTERNSHIP
# ============================================================

@app.get("/internships/{internship_id}")
def get_single_internship(
        internship_id: int
):

    internships = load_data(
        "internships.json"
    )

    applications = load_data(
        "applications.json"
    )

    internship = find_internship(
        internships,
        internship_id
    )

    if not internship:

        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message":
                    "Internship not found"
            }
        )

    application_count = get_internship_application_count(
        applications,
        internship_id
    )

    seats = int(
        internship.get(
            "seats",
            0
        )
    )

    return {
        "success": True,
        "internship": internship,
        "applications": application_count,
        "remaining_seats": max(
            seats - application_count,
            0
        )
    }


# ============================================================
# APPLICATIONS - GET ALL
# ============================================================

@app.get("/applications")
def get_applications(
        company: Optional[str] = Query(default=None),
        student_id: Optional[int] = Query(default=None),
        status: Optional[str] = Query(default=None)
):

    applications = load_data(
        "applications.json"
    )

    students = load_data(
        "students.json"
    )

    internships = load_data(
        "internships.json"
    )

    enriched_applications = []

    for application in applications:

        student = find_student(
            students,
            application.get("student_id")
        )

        internship = find_internship(
            internships,
            application.get("internship_id")
        )

        if not internship:
            continue

        # ----------------------------------------------------
        # COMPANY FILTER
        # ----------------------------------------------------

        if company is not None:

            if internship.get("company") != company:
                continue

        # ----------------------------------------------------
        # STUDENT FILTER
        # ----------------------------------------------------

        if student_id is not None:

            if int(
                    application.get(
                        "student_id",
                        -1
                    )
            ) != int(student_id):

                continue

        # ----------------------------------------------------
        # STATUS FILTER
        # ----------------------------------------------------

        if status is not None:

            if normalize_status(
                    application.get("status")
            ) != normalize_status(status):

                continue

        # ----------------------------------------------------
        # ENRICH APPLICATION
        # ----------------------------------------------------

        enriched_applications.append({

            "id":
                application.get("id"),

            "application_id":
                application.get("id"),

            "student_id":
                application.get(
                    "student_id"
                ),

            "student_name":
                (
                    student.get("name")
                    if student
                    else "Unknown Student"
                ),

            "internship_id":
                application.get(
                    "internship_id"
                ),

            "internship_title":
                internship.get(
                    "title",
                    "Internship"
                ),

            "company":
                internship.get(
                    "company",
                    ""
                ),

            "sector":
                internship.get(
                    "sector",
                    ""
                ),

            "location":
                internship.get(
                    "location",
                    ""
                ),

            "duration":
                internship.get(
                    "duration",
                    ""
                ),

            "status":
                application.get(
                    "status",
                    "pending"
                ),

            "score":
                application.get(
                    "score"
                ),

            "ai_score":
                application.get(
                    "ai_score"
                ),

            "reasons":
                application.get(
                    "reasons",
                    []
                )
        })

    return {

        "success": True,

        "total":
            len(enriched_applications),

        "applications":
            enriched_applications
    }


# ============================================================
# APPLICATION MODEL
# ============================================================

class ApplicationCreate(BaseModel):

    student_id: int = Field(
        ...,
        gt=0
    )

    internship_id: int = Field(
        ...,
        gt=0
    )


# ============================================================
# STUDENT: APPLY FOR INTERNSHIP
# ============================================================

@app.post("/applications")
def create_application(
        application: ApplicationCreate
):

    students = load_data(
        "students.json"
    )

    internships = load_data(
        "internships.json"
    )

    applications = load_data(
        "applications.json"
    )

    # --------------------------------------------------------
    # CHECK STUDENT
    # --------------------------------------------------------

    student = find_student(
        students,
        application.student_id
    )

    if not student:

        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message":
                    "Student not found"
            }
        )

    # --------------------------------------------------------
    # CHECK INTERNSHIP
    # --------------------------------------------------------

    internship = find_internship(
        internships,
        application.internship_id
    )

    if not internship:

        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message":
                    "Internship not found"
            }
        )

    # --------------------------------------------------------
    # CHECK EXISTING ALLOCATION
    # --------------------------------------------------------

    if has_student_allocation(
            applications,
            application.student_id
    ):

        return JSONResponse(
            status_code=409,
            content={
                "success": False,
                "message":
                    "You already have an internship allocation. You cannot apply for another internship."
            }
        )

    # --------------------------------------------------------
    # CHECK DUPLICATE
    # --------------------------------------------------------

    already_applied = any(

        int(item.get("student_id", -1))
        == int(application.student_id)

        and

        int(item.get("internship_id", -1))
        == int(application.internship_id)

        for item in applications
    )

    if already_applied:

        return JSONResponse(
            status_code=409,
            content={
                "success": False,
                "message":
                    "Student has already applied for this internship"
            }
        )

    # --------------------------------------------------------
    # CHECK SEATS
    # --------------------------------------------------------

    seats = int(
        internship.get(
            "seats",
            0
        )
    )

    current_applications = get_internship_application_count(
        applications,
        application.internship_id
    )

    # NOTE:
    # Applications are not blocked when seats are full.
    # Seats are allocation seats, not application limits.

    # --------------------------------------------------------
    # GENERATE APPLICATION ID
    # --------------------------------------------------------

    if applications:

        new_id = (
                max(
                    int(item.get("id", 0))
                    for item in applications
                )
                + 1
        )

    else:

        new_id = 1001

    # --------------------------------------------------------
    # CREATE APPLICATION
    # --------------------------------------------------------

    new_application = {

        "id":
            new_id,

        "student_id":
            application.student_id,

        "internship_id":
            application.internship_id,

        "status":
            "pending"
    }

    applications.append(
        new_application
    )

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    save_data(
        "applications.json",
        applications
    )

    return {

        "success":
            True,

        "message":
            "Application submitted successfully",

        "application":
            new_application,

        "student":
            student.get(
                "name",
                "Student"
            ),

        "internship":
            internship.get(
                "title",
                "Internship"
            ),

        "company":
            internship.get(
                "company",
                ""
            ),

        "remaining_seats":
            max(
                seats -
                current_applications -
                1,
                0
            )
    }


# ============================================================
# COMPANY: CREATE INTERNSHIP
# ============================================================

class InternshipCreate(BaseModel):

    company: str = Field(
        ...,
        min_length=1
    )

    title: str = Field(
        ...,
        min_length=1
    )

    sector: str = Field(
        ...,
        min_length=1
    )

    required_skills: list[str] = []

    location: str = Field(
        ...,
        min_length=1
    )

    seats: int = Field(
        ...,
        gt=0
    )

    minimum_cgpa: float = Field(
        ...,
        ge=0,
        le=10
    )

    duration: str = Field(
        ...,
        min_length=1
    )


@app.post("/internships")
def create_internship(
        internship: InternshipCreate
):

    internships = load_data(
        "internships.json"
    )

    # --------------------------------------------------------
    # GENERATE ID
    # --------------------------------------------------------

    if internships:

        new_id = (
                max(
                    int(item.get("id", 0))
                    for item in internships
                )
                + 1
        )

    else:

        new_id = 101

    # --------------------------------------------------------
    # CREATE
    # --------------------------------------------------------

    new_internship = {

        "id":
            new_id,

        "company":
            internship.company.strip(),

        "title":
            internship.title.strip(),

        "sector":
            internship.sector.strip(),

        "required_skills":
            internship.required_skills,

        "location":
            internship.location.strip(),

        "seats":
            internship.seats,

        "minimum_cgpa":
            internship.minimum_cgpa,

        "duration":
            internship.duration.strip()
    }

    internships.append(
        new_internship
    )

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    save_data(
        "internships.json",
        internships
    )

    return {

        "success":
            True,

        "message":
            "Internship created successfully",

        "internship":
            new_internship
    }


# ============================================================
# ALLOCATION - RUN SMART ALLOCATION
# ============================================================

@app.post("/allocation/run")
def run_allocation_engine(
        company: Optional[str] = Query(default=None)
):

    students = load_data(
        "students.json"
    )

    internships = load_data(
        "internships.json"
    )

    applications = load_data(
        "applications.json"
    )

    # ========================================================
    # RUN ALLOCATION ENGINE
    # ========================================================

    result = run_allocation(

        students,

        internships,

        applications,

        company=company
    )

    if not isinstance(result, dict):

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message":
                    "Allocation engine returned invalid data."
            }
        )

    allocations = result.get(
        "allocations",
        []
    )

    # ========================================================
    # ALLOCATED APPLICATION IDS
    # ========================================================

    allocated_application_ids = {

        int(
            allocation["application_id"]
        )

        for allocation in allocations

        if allocation.get(
            "application_id"
        ) is not None
    }

    # ========================================================
    # CURRENT SCOPE
    # ========================================================

    if company:

        current_internship_ids = {

            int(
                internship["id"]
            )

            for internship in internships

            if internship.get(
                "company"
            ) == company
        }

    else:

        current_internship_ids = {

            int(
                internship["id"]
            )

            for internship in internships
        }

    # ========================================================
    # UPDATE APPLICATION STATUS
    # ========================================================

    for application in applications:

        application_id = int(
            application.get(
                "id",
                -1
            )
        )

        internship_id = int(
            application.get(
                "internship_id",
                -1
            )
        )

        # ----------------------------------------------------
        # ALLOCATED
        # ----------------------------------------------------

        if application_id in allocated_application_ids:

            application["status"] = "allocated"

        # ----------------------------------------------------
        # CURRENT ALLOCATION SCOPE
        # ----------------------------------------------------

        elif internship_id in current_internship_ids:

            application["status"] = "not_selected"

            application.pop(
                "score",
                None
            )

            application.pop(
                "ai_score",
                None
            )

            application.pop(
                "reasons",
                None
            )

    # ========================================================
    # SAVE ALLOCATION DETAILS
    # ========================================================

    for allocation in allocations:

        application_id = allocation.get(
            "application_id"
        )

        if application_id is None:
            continue

        application = find_application(
            applications,
            application_id
        )

        if not application:
            continue

        application["status"] = "allocated"

        application["score"] = allocation.get(
            "score"
        )

        application["ai_score"] = allocation.get(
            "ai_score"
        )

        application["reasons"] = allocation.get(
            "reasons",
            []
        )

    # ========================================================
    # SAFETY:
    # ONE STUDENT = ONE ALLOCATION
    # ========================================================

    allocated_students = set()

    for application in applications:

        if not is_allocated_status(
                application.get("status")
        ):
            continue

        student_id = int(
            application.get(
                "student_id",
                -1
            )
        )

        if student_id in allocated_students:

            print(
                "WARNING: Duplicate allocation detected for student:",
                student_id
            )

        allocated_students.add(
            student_id
        )

    # ========================================================
    # SAVE
    # ========================================================

    save_data(
        "applications.json",
        applications
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    result["success"] = True

    result["company"] = company

    result["allocated_students"] = len(
        allocated_students
    )

    result["allocated_applications"] = len(
        allocated_application_ids
    )

    return result


# ============================================================
# ALLOCATION: RESET
# ============================================================

@app.post("/allocation/reset")
def reset_allocation():

    applications = load_data(
        "applications.json"
    )

    reset_count = 0

    # ========================================================
    # RESET ONLY ALLOCATION RESULTS
    # ========================================================

    for application in applications:

        status = normalize_status(
            application.get("status")
        )

        # ----------------------------------------------------
        # RESET ALLOCATED / NOT SELECTED APPLICATIONS
        # ----------------------------------------------------

        if status in {
            "allocated",
            "not selected"
        }:

            application["status"] = "pending"

            # Remove previous allocation results
            application.pop(
                "score",
                None
            )

            application.pop(
                "ai_score",
                None
            )

            application.pop(
                "reasons",
                None
            )

            reset_count += 1

    # ========================================================
    # SAVE ONLY APPLICATIONS
    # ========================================================

    save_data(
        "applications.json",
        applications
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "success":
            True,

        "message":
            "Allocation reset successfully.",

        "reset_applications":
            reset_count,

        "students":
            "All students are now unallocated.",

        "companies":
            "Company data was not changed.",

        "internships":
            "Internship data was not changed."
    }


# ============================================================
# STUDENT: GET MY ALLOCATION
# ============================================================

@app.get("/students/{student_id}/allocation")
def get_student_allocation(
        student_id: int
):

    students = load_data(
        "students.json"
    )

    internships = load_data(
        "internships.json"
    )

    applications = load_data(
        "applications.json"
    )

    # ========================================================
    # FIND STUDENT
    # ========================================================

    student = find_student(
        students,
        student_id
    )

    if not student:

        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message":
                    "Student not found"
            }
        )

    # ========================================================
    # STUDENT APPLICATIONS
    # ========================================================

    student_applications = [

        application

        for application in applications

        if int(
            application.get(
                "student_id",
                -1
            )
        ) == int(student_id)
    ]

    # ========================================================
    # FIND ALLOCATION
    # ========================================================

    allocated_application = (
        get_student_allocated_application(
            applications,
            student_id
        )
    )

    # ========================================================
    # NO ALLOCATION
    # ========================================================

    if not allocated_application:

        return {

            "success":
                True,

            "student_id":
                student_id,

            "student_name":
                student.get(
                    "name",
                    "Student"
                ),

            "allocated":
                None,

            "applications":
                build_student_application_results(
                    student,
                    student_applications,
                    internships
                ),

            "message":
                "No internship has been allocated yet."
        }

    # ========================================================
    # FIND INTERNSHIP
    # ========================================================

    internship = find_internship(
        internships,
        allocated_application.get(
            "internship_id"
        )
    )

    if not internship:

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message":
                    "Allocated internship not found"
            }
        )

    # ========================================================
    # SCORE
    # ========================================================

    score = allocated_application.get(
        "score"
    )

    ai_score = allocated_application.get(
        "ai_score"
    )

    reasons = allocated_application.get(
        "reasons",
        []
    )

    # ========================================================
    # FALLBACK SCORE
    # ========================================================

    if score is None or ai_score is None:

        try:

            match = calculate_match_score(
                student,
                internship
            )

            if score is None:

                score = match.get(
                    "score"
                )

            if ai_score is None:

                ai_score = match.get(
                    "ai_score"
                )

            if not reasons:

                reasons = match.get(
                    "reasons",
                    []
                )

        except Exception as error:

            print(
                "Score calculation error:",
                error
            )

    # ========================================================
    # ALLOCATION OBJECT
    # ========================================================

    allocated = {

        "application_id":
            allocated_application.get(
                "id"
            ),

        "student_id":
            student_id,

        "student_name":
            student.get(
                "name",
                "Student"
            ),

        "internship_id":
            internship.get(
                "id"
            ),

        "internship_title":
            internship.get(
                "title",
                "Internship"
            ),

        "company":
            internship.get(
                "company",
                ""
            ),

        "location":
            internship.get(
                "location",
                ""
            ),

        "sector":
            internship.get(
                "sector",
                ""
            ),

        "duration":
            internship.get(
                "duration",
                ""
            ),

        "seats":
            internship.get(
                "seats"
            ),

        "minimum_cgpa":
            internship.get(
                "minimum_cgpa"
            ),

        "score":
            score,

        "ai_score":
            ai_score,

        "reasons":
            reasons,

        "status":
            "Allocated"
    }

    # ========================================================
    # RETURN
    # ========================================================

    return {

        "success":
            True,

        "student_id":
            student_id,

        "student_name":
            student.get(
                "name",
                "Student"
            ),

        "allocated":
            allocated,

        "applications":
            build_student_application_results(
                student,
                student_applications,
                internships
            )
    }


# ============================================================
# HELPER:
# BUILD STUDENT APPLICATION RESULTS
# ============================================================

def build_student_application_results(
        student,
        student_applications,
        internships
):

    results = []

    for application in student_applications:

        internship = find_internship(
            internships,
            application.get(
                "internship_id"
            )
        )

        if not internship:
            continue

        results.append({

            "id":
                application.get(
                    "id"
                ),

            "application_id":
                application.get(
                    "id"
                ),

            "student_id":
                student.get(
                    "id"
                ),

            "student_name":
                student.get(
                    "name",
                    "Student"
                ),

            "internship_id":
                internship.get(
                    "id"
                ),

            "internship_title":
                internship.get(
                    "title",
                    "Internship"
                ),

            "company":
                internship.get(
                    "company",
                    ""
                ),

            "sector":
                internship.get(
                    "sector",
                    ""
                ),

            "location":
                internship.get(
                    "location",
                    ""
                ),

            "duration":
                internship.get(
                    "duration",
                    ""
                ),

            "status":
                application.get(
                    "status",
                    "pending"
                ),

            "score":
                application.get(
                    "score"
                ),

            "ai_score":
                application.get(
                    "ai_score"
                ),

            "reasons":
                application.get(
                    "reasons",
                    []
                )
        })

    return results


# ============================================================
# ALIAS:
# /allocation/student/{student_id}
# ============================================================

@app.get("/allocation/student/{student_id}")
def get_student_allocation_alias(
        student_id: int
):

    return get_student_allocation(
        student_id
    )


# ============================================================
# STUDENT: GET MY APPLICATIONS
# ============================================================

@app.get("/students/{student_id}/applications")
def get_student_applications(
        student_id: int
):

    applications = load_data(
        "applications.json"
    )

    students = load_data(
        "students.json"
    )

    internships = load_data(
        "internships.json"
    )

    # ========================================================
    # CHECK STUDENT
    # ========================================================

    student = find_student(
        students,
        student_id
    )

    if not student:

        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message":
                    "Student not found"
            }
        )

    # ========================================================
    # BUILD RESULT
    # ========================================================

    result = build_student_application_results(
        student,
        [
            application
            for application in applications
            if int(
            application.get(
                "student_id",
                -1
            )
        ) == int(student_id)
        ],
        internships
    )

    return {

        "success":
            True,

        "total":
            len(result),

        "applications":
            result
    }


# ============================================================
# STUDENT: CHECK APPLICATION STATUS
# ============================================================

@app.get(
    "/students/{student_id}/applications/{application_id}"
)
def get_student_application(
        student_id: int,
        application_id: int
):

    applications = load_data(
        "applications.json"
    )

    students = load_data(
        "students.json"
    )

    internships = load_data(
        "internships.json"
    )

    student = find_student(
        students,
        student_id
    )

    if not student:

        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message":
                    "Student not found"
            }
        )

    application = find_application(
        applications,
        application_id
    )

    if not application:

        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message":
                    "Application not found"
            }
        )

    if int(
            application.get(
                "student_id",
                -1
            )
    ) != int(student_id):

        return JSONResponse(
            status_code=403,
            content={
                "success": False,
                "message":
                    "You are not authorized to view this application."
            }
        )

    internship = find_internship(
        internships,
        application.get(
            "internship_id"
        )
    )

    if not internship:

        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message":
                    "Internship not found"
            }
        )

    return {

        "success":
            True,

        "application": {

            "application_id":
                application.get(
                    "id"
                ),

            "student_id":
                student_id,

            "student_name":
                student.get(
                    "name",
                    "Student"
                ),

            "internship_id":
                internship.get(
                    "id"
                ),

            "internship_title":
                internship.get(
                    "title"
                ),

            "company":
                internship.get(
                    "company"
                ),

            "location":
                internship.get(
                    "location",
                    ""
                ),

            "sector":
                internship.get(
                    "sector",
                    ""
                ),

            "duration":
                internship.get(
                    "duration",
                    ""
                ),

            "status":
                application.get(
                    "status",
                    "pending"
                ),

            "score":
                application.get(
                    "score"
                ),

            "ai_score":
                application.get(
                    "ai_score"
                ),

            "reasons":
                application.get(
                    "reasons",
                    []
                )
        }
    }


# ============================================================
# ALLOCATION: SUMMARY
# ============================================================

@app.get("/allocation/summary")
def get_allocation_summary(
        company: Optional[str] = Query(default=None)
):

    applications = load_data(
        "applications.json"
    )

    internships = load_data(
        "internships.json"
    )

    students = load_data(
        "students.json"
    )

    if company:

        internship_ids = {

            int(
                internship["id"]
            )

            for internship in internships

            if internship.get(
                "company"
            ) == company
        }

    else:

        internship_ids = {

            int(
                internship["id"]
            )

            for internship in internships
        }

    scoped_applications = [

        application

        for application in applications

        if int(
            application.get(
                "internship_id",
                -1
            )
        ) in internship_ids
    ]

    allocated = [

        application

        for application
        in scoped_applications

        if is_allocated_status(
            application.get(
                "status"
            )
        )
    ]

    not_selected = [

        application

        for application
        in scoped_applications

        if normalize_status(
            application.get("status")
        ) == "not selected"
    ]

    pending = [

        application

        for application
        in scoped_applications

        if normalize_status(
            application.get("status")
        ) == "pending"
    ]

    return {

        "success":
            True,

        "company":
            company,

        "total_students":
            len(students),

        "total_internships":
            len(
                internship_ids
            ),

        "total_applications":
            len(
                scoped_applications
            ),

        "allocated":
            len(allocated),

        "not_selected":
            len(not_selected),

        "pending":
            len(pending)
    }


# ============================================================
# ERROR HANDLER
# ============================================================

@app.exception_handler(Exception)
async def global_exception_handler(
        request,
        exc
):

    print(
        "GLOBAL SERVER ERROR:",
        exc
    )

    return JSONResponse(

        status_code=500,

        content={

            "success":
                False,

            "message":
                "Internal server error",

            "detail":
                str(exc)
        }
    )