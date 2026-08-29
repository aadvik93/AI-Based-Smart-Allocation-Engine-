import json
import os

from ortools.linear_solver import pywraplp

from app.services.eligibility import check_eligibility
from app.services.matching import calculate_match_score


# ============================================================
# DATA HELPER
# ============================================================

def load_json(filename):
    """
    Load JSON data from backend/data.
    """

    current_dir = os.path.dirname(__file__)

    data_path = os.path.join(
        current_dir,
        "../../data",
        filename
    )

    with open(
            data_path,
            "r",
            encoding="utf-8"
    ) as file:

        return json.load(file)


# ============================================================
# NORMALIZE ID
# ============================================================

def normalize_id(value):
    """
    Convert IDs to integers wherever possible.

    This prevents bugs when JSON contains:
        101
    and another object contains:
        "101"
    """

    try:
        return int(value)
    except (TypeError, ValueError):
        return value


# ============================================================
# SMART ALLOCATION ENGINE
# ============================================================

def run_allocation(
        students,
        internships,
        applications,
        company=None
):
    """
    Smart internship allocation engine.

    Rules:

    1. Only valid student applications are considered.
    2. Student must satisfy eligibility.
    3. A student can receive only ONE internship.
    4. Internship seats cannot be exceeded.
    5. Total matching score is maximized.
    6. Company filter can be applied.
    7. Previously rejected applications are NOT reconsidered.
    8. Existing allocated applications are NOT accidentally
       treated as new candidates.
    """

    # ========================================================
    # STEP 1: NORMALIZED LOOKUPS
    # ========================================================

    students_by_id = {
        normalize_id(student["id"]): student
        for student in students
    }

    internships_by_id = {
        normalize_id(internship["id"]): internship
        for internship in internships
    }

    # ========================================================
    # STEP 2: SELECT INTERNSHIPS
    # ========================================================

    if company:

        selected_internships = [
            internship
            for internship in internships
            if str(internship.get("company", "")).strip().lower()
               == str(company).strip().lower()
        ]

    else:

        selected_internships = internships

    selected_internship_ids = {
        normalize_id(internship["id"])
        for internship in selected_internships
    }

    # ========================================================
    # STEP 3: GENERATE CANDIDATES
    # ========================================================

    candidates = []

    for application in applications:

        application_id = normalize_id(
            application.get("id")
        )

        student_id = normalize_id(
            application.get("student_id")
        )

        internship_id = normalize_id(
            application.get("internship_id")
        )

        student = students_by_id.get(
            student_id
        )

        internship = internships_by_id.get(
            internship_id
        )

        # ----------------------------------------------------
        # Invalid application
        # ----------------------------------------------------

        if not student or not internship:
            continue

        # ----------------------------------------------------
        # Company filter
        # ----------------------------------------------------

        if (
                company
                and internship_id not in selected_internship_ids
        ):
            continue

        # ========================================================
        # APPLICATION STATUS
        # ========================================================
        # allocated applications should not be reconsidered.
        # cancelled/rejected applications should not be considered.
        # pending and not_selected applications can be reconsidered
        # when the allocation engine is run again.

        status = str(
            application.get(
                "status",
                "pending"
            )
        ).lower().strip()

        if status in {
            "allocated",
            "cancelled",
            "rejected"
        }:
            continue

        # ----------------------------------------------------
        # Eligibility
        # ----------------------------------------------------

        eligibility = check_eligibility(
            student,
            internship
        )

        if not eligibility.get(
                "eligible",
                False
        ):
            continue

        # ----------------------------------------------------
        # Match score
        # ----------------------------------------------------

        match = calculate_match_score(
            student,
            internship
        )

        candidates.append({

            "application_id":
                application_id,

            "student_id":
                student_id,

            "student_name":
                student.get(
                    "name",
                    "Unknown Student"
                ),

            "internship_id":
                internship_id,

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

            "score":
                match.get(
                    "score",
                    0
                ),

            "ai_score":
                match.get(
                    "ai_score",
                    0
                ),

            "reasons":
                (
                        eligibility.get(
                            "reasons",
                            []
                        )
                        +
                        match.get(
                            "reasons",
                            []
                        )
                )
        })

    # ========================================================
    # NO CANDIDATES
    # ========================================================

    if not candidates:

        total_applications = sum(
            1
            for application in applications
            if normalize_id(
                application.get("internship_id")
            ) in selected_internship_ids
        )

        total_seats = sum(
            int(
                internship.get(
                    "seats",
                    0
                )
            )
            for internship in selected_internships
        )

        return {

            "allocations": [],

            "unallocated_students": [],

            "statistics": {

                "total_students":
                    len(students),

                "total_internships":
                    len(selected_internships),

                "total_applications":
                    total_applications,

                "total_seats":
                    total_seats,

                "total_allocated":
                    0,

                "total_unallocated":
                    0,

                "candidate_count":
                    0
            }
        }

    # ========================================================
    # STEP 4: CREATE SOLVER
    # ========================================================

    solver = pywraplp.Solver.CreateSolver(
        "SCIP"
    )

    if not solver:

        raise RuntimeError(
            "Could not create OR-Tools SCIP solver."
        )

    # ========================================================
    # STEP 5: DECISION VARIABLES
    # ========================================================

    allocation_variables = []

    for index, candidate in enumerate(
            candidates
    ):

        variable = solver.BoolVar(
            f"x_{index}_{candidate['application_id']}"
        )

        allocation_variables.append(
            variable
        )

    # ========================================================
    # STEP 6: ONE INTERNSHIP PER STUDENT
    # ========================================================

    student_ids = {
        candidate["student_id"]
        for candidate in candidates
    }

    for student_id in student_ids:

        student_variables = [

            allocation_variables[index]

            for index, candidate
            in enumerate(candidates)

            if candidate["student_id"]
               == student_id
        ]

        if student_variables:

            solver.Add(
                sum(student_variables) <= 1
            )

    # ========================================================
    # STEP 7: INTERNSHIP SEAT LIMIT
    # ========================================================

    for internship in selected_internships:

        internship_id = normalize_id(
            internship["id"]
        )

        internship_variables = [

            allocation_variables[index]

            for index, candidate
            in enumerate(candidates)

            if candidate["internship_id"]
               == internship_id
        ]

        if internship_variables:

            seats = max(
                0,
                int(
                    internship.get(
                        "seats",
                        0
                    )
                )
            )

            solver.Add(
                sum(internship_variables)
                <= seats
            )

    # ========================================================
    # STEP 8: MAXIMIZE MATCH SCORE
    # ========================================================

    objective = solver.Objective()

    for index, candidate in enumerate(
            candidates
    ):

        objective.SetCoefficient(
            allocation_variables[index],
            float(
                candidate.get(
                    "score",
                    0
                )
            )
        )

    objective.SetMaximization()

    # ========================================================
    # STEP 9: SOLVE
    # ========================================================

    status = solver.Solve()

    if status not in (
            pywraplp.Solver.OPTIMAL,
            pywraplp.Solver.FEASIBLE
    ):

        raise RuntimeError(
            "Could not find a feasible allocation."
        )

    # ========================================================
    # STEP 10: COLLECT ALLOCATIONS
    # ========================================================

    allocations = []

    for index, candidate in enumerate(
            candidates
    ):

        if (
                allocation_variables[index]
                        .solution_value()
                > 0.5
        ):

            allocations.append(
                candidate.copy()
            )

    # ========================================================
    # SORT BY SCORE
    # ========================================================

    allocations.sort(
        key=lambda item: (
            float(
                item.get(
                    "score",
                    0
                )
            ),
            float(
                item.get(
                    "ai_score",
                    0
                )
            )
        ),
        reverse=True
    )

    # ========================================================
    # STEP 11: ALLOCATED STUDENTS
    # ========================================================

    allocated_student_ids = {

        normalize_id(
            allocation["student_id"]
        )

        for allocation in allocations
    }

    # ========================================================
    # STEP 12: RELEVANT STUDENTS
    # ========================================================

    relevant_student_ids = {

        normalize_id(
            candidate["student_id"]
        )

        for candidate in candidates
    }

    # ========================================================
    # STEP 13: UNALLOCATED STUDENTS
    # ========================================================

    unallocated_students = []

    for student_id in relevant_student_ids:

        if student_id in allocated_student_ids:
            continue

        student = students_by_id.get(
            student_id
        )

        if not student:
            continue

        unallocated_students.append({

            "student_id":
                student_id,

            "student_name":
                student.get(
                    "name",
                    "Unknown Student"
                )
        })

    # ========================================================
    # SORT UNALLOCATED STUDENTS
    # ========================================================

    unallocated_students.sort(
        key=lambda item:
        item["student_name"]
    )

    # ========================================================
    # STEP 14: STATISTICS
    # ========================================================

    total_applications = sum(

        1

        for application in applications

        if normalize_id(
            application.get(
                "internship_id"
            )
        )
        in selected_internship_ids
    )

    total_seats = sum(

        max(
            0,
            int(
                internship.get(
                    "seats",
                    0
                )
            )
        )

        for internship in selected_internships
    )

    total_candidates = len(
        candidates
    )

    # ========================================================
    # RETURN
    # ========================================================

    return {

        "allocations":
            allocations,

        "unallocated_students":
            unallocated_students,

        "statistics": {

            "total_students":
                len(students),

            "total_internships":
                len(selected_internships),

            "total_applications":
                total_applications,

            "total_candidates":
                total_candidates,

            "total_seats":
                total_seats,

            "total_allocated":
                len(allocations),

            "total_unallocated":
                len(
                    unallocated_students
                ),

            "allocation_rate":
                round(
                    (
                            len(allocations)
                            /
                            total_candidates
                            * 100
                    )
                    if total_candidates
                    else 0,
                    2
                )
        }
    }


# ============================================================
# DEMO / TEST
# ============================================================

if __name__ == "__main__":

    students = load_json(
        "students.json"
    )

    internships = load_json(
        "internships.json"
    )

    applications = load_json(
        "applications.json"
    )

    result = run_allocation(
        students,
        internships,
        applications
    )

    print()
    print("=" * 60)
    print("SMART ALLOCATION ENGINE")
    print("=" * 60)

    # ========================================================
    # ALLOCATED STUDENTS
    # ========================================================

    print()
    print("ALLOCATED STUDENTS")
    print("-" * 60)

    if not result["allocations"]:

        print(
            "No students were allocated."
        )

    else:

        for allocation in result[
            "allocations"
        ]:

            print(
                f"{allocation['student_name']} "
                f"-> "
                f"{allocation['internship_title']} "
                f"({allocation['company']})"
            )

            print(
                f"  Match Score: "
                f"{allocation['score']}%"
            )

            print(
                f"  AI Compatibility: "
                f"{allocation['ai_score']}%"
            )

            print("  Reasons:")

            for reason in allocation[
                "reasons"
            ]:

                print(
                    f"    - {reason}"
                )

    # ========================================================
    # UNALLOCATED STUDENTS
    # ========================================================

    print()
    print("STUDENTS WITHOUT ALLOCATION")
    print("-" * 60)

    if not result[
        "unallocated_students"
    ]:

        print(
            "None"
        )

    else:

        for student in result[
            "unallocated_students"
        ]:

            print(
                student["student_name"]
            )

    # ========================================================
    # STATISTICS
    # ========================================================

    print()
    print("STATISTICS")
    print("-" * 60)

    statistics = result[
        "statistics"
    ]

    for key, value in statistics.items():

        print(
            f"{key}: {value}"
        )