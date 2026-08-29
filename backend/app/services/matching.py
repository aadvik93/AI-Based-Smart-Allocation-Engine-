from app.services.ai_matching import calculate_ai_match_score


# ============================================================
# HELPERS
# ============================================================

def normalize_text(value):
    """
    Safely normalize text for comparison.
    """

    if value is None:
        return ""

    return str(value).strip().lower()


def normalize_list(values):
    """
    Convert a list of values into a normalized set.
    """

    if not isinstance(values, list):
        return set()

    return {
        normalize_text(value)
        for value in values
        if normalize_text(value)
    }


# ============================================================
# MATCH SCORE
# ============================================================

def calculate_match_score(
        student,
        internship
):
    """
    Calculate AI-enhanced internship match score.

    TOTAL = 100

    AI Semantic Match : 40
    Skill Match       : 30
    Location Match    : 10
    CGPA              : 10
    Sector Match      : 10
    """

    score = 0.0

    reasons = []

    # ========================================================
    # 1. AI SEMANTIC MATCH - 40 POINTS
    # ========================================================

    try:

        ai_score = calculate_ai_match_score(
            student,
            internship
        )

    except Exception as error:

        print(
            "AI matching error:",
            error
        )

        ai_score = 0

    # --------------------------------------------------------
    # Keep AI score between 0 and 100
    # --------------------------------------------------------

    try:

        ai_score = float(
            ai_score
        )

    except (
            TypeError,
            ValueError
    ):

        ai_score = 0

    ai_score = max(
        0,
        min(
            100,
            ai_score
        )
    )

    ai_points = (
                        ai_score / 100
                ) * 40

    score += ai_points

    reasons.append(
        f"AI compatibility: {ai_score:.2f}%"
    )

    # ========================================================
    # 2. SKILL MATCH - 30 POINTS
    # ========================================================

    student_skills = normalize_list(
        student.get(
            "skills",
            []
        )
    )

    required_skills = normalize_list(
        internship.get(
            "required_skills",
            []
        )
    )

    matched_skills = (
        student_skills
        .intersection(
            required_skills
        )
    )

    if required_skills:

        skill_score = (
                              len(matched_skills)
                              /
                              len(required_skills)
                      ) * 30

    else:

        skill_score = 30

    score += skill_score

    if matched_skills:

        reasons.append(
            f"Matched {len(matched_skills)} required skill(s)"
        )

    else:

        reasons.append(
            "No required skills matched"
        )

    # ========================================================
    # 3. LOCATION MATCH - 10 POINTS
    # ========================================================

    preferred_location = normalize_text(
        student.get(
            "preferred_location"
        )
    )

    internship_location = normalize_text(
        internship.get(
            "location"
        )
    )

    if (
            preferred_location
            and internship_location
            and preferred_location
            == internship_location
    ):

        score += 10

        reasons.append(
            "Preferred location matched"
        )

    else:

        reasons.append(
            "Preferred location did not match"
        )

    # ========================================================
    # 4. CGPA - 10 POINTS
    # ========================================================

    try:

        cgpa = float(
            student.get(
                "cgpa",
                0
            )
        )

    except (
            TypeError,
            ValueError
    ):

        cgpa = 0

    # --------------------------------------------------------
    # Keep CGPA within normal 0-10 range
    # --------------------------------------------------------

    cgpa = max(
        0,
        min(
            10,
            cgpa
        )
    )

    cgpa_score = (
                         cgpa / 10
                 ) * 10

    score += cgpa_score

    reasons.append(
        f"CGPA score: {cgpa_score:.2f}/10"
    )

    # ========================================================
    # 5. SECTOR MATCH - 10 POINTS
    # ========================================================

    preferred_sector = normalize_text(
        student.get(
            "preferred_sector"
        )
    )

    internship_sector = normalize_text(
        internship.get(
            "sector"
        )
    )

    if (
            preferred_sector
            and internship_sector
            and preferred_sector
            == internship_sector
    ):

        score += 10

        reasons.append(
            "Preferred sector matched"
        )

    else:

        reasons.append(
            "Preferred sector did not match"
        )

    # ========================================================
    # FINAL SCORE
    # ========================================================

    score = max(
        0,
        min(
            100,
            score
        )
    )

    return {

        "score":
            round(
                score,
                2
            ),

        "ai_score":
            round(
                ai_score,
                2
            ),

        "reasons":
            reasons
    }


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    student = {

        "name":
            "Aadvik",

        "cgpa":
            8.7,

        "skills": [
            "Java",
            "Spring Boot",
            "SQL",
            "React"
        ],

        "interests": [
            "Backend Development"
        ],

        "preferred_location":
            "Bengaluru",

        "preferred_sector":
            "IT"
    }

    internship = {

        "title":
            "Java Backend Developer",

        "company":
            "TechNova Solutions",

        "required_skills": [
            "Java",
            "Spring Boot",
            "SQL"
        ],

        "location":
            "Bengaluru",

        "sector":
            "IT"
    }

    result = calculate_match_score(
        student,
        internship
    )

    print()
    print("=" * 60)
    print("AI-ENHANCED MATCHING TEST")
    print("=" * 60)

    print(
        f"Final Match Score: "
        f"{result['score']}%"
    )

    print(
        f"AI Compatibility: "
        f"{result['ai_score']}%"
    )

    print()
    print("Reasons:")

    for reason in result[
        "reasons"
    ]:

        print(
            f" - {reason}"
        )