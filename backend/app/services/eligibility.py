def check_eligibility(student, internship):
    """
    Check whether a student is eligible for an internship.

    Returns:
        {
            "eligible": True/False,
            "reasons": [...]
        }
    """

    reasons = []

    # 1. Check minimum CGPA
    if student["cgpa"] < internship["minimum_cgpa"]:
        reasons.append(
            f"CGPA {student['cgpa']} is below the minimum "
            f"requirement of {internship['minimum_cgpa']}"
        )
        return {
            "eligible": False,
            "reasons": reasons
        }

    reasons.append("CGPA requirement satisfied")

    # 2. Check required skills
    student_skills = {
        skill.lower() for skill in student["skills"]
    }

    required_skills = {
        skill.lower() for skill in internship["required_skills"]
    }

    matched_skills = student_skills.intersection(required_skills)

    # For our MVP, at least one required skill must match.
    if not matched_skills:
        reasons.append("No required skills matched")
        return {
            "eligible": False,
            "reasons": reasons
        }

    reasons.append(
        f"{len(matched_skills)} required skill(s) matched"
    )

    # 3. Check sector preference
    if (
            student["preferred_sector"].lower()
            == internship["sector"].lower()
    ):
        reasons.append("Preferred sector matched")

    # Student is eligible
    return {
        "eligible": True,
        "reasons": reasons
    }


if __name__ == "__main__":
    student = {
        "id": 1,
        "name": "Aadvik",
        "cgpa": 8.7,
        "skills": ["Java", "Spring Boot", "SQL", "React"],
        "preferred_sector": "IT"
    }

    internship = {
        "id": 101,
        "title": "Java Backend Developer Intern",
        "sector": "IT",
        "required_skills": ["Java", "Spring Boot", "SQL"],
        "minimum_cgpa": 7.5
    }

    result = check_eligibility(student, internship)

    print("Eligibility Result:")
    print(result)