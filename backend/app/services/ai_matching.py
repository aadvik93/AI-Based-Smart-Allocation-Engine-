from sentence_transformers import SentenceTransformer


# ============================================================
# AI MODEL
# ============================================================

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

model = SentenceTransformer(MODEL_NAME)


# ============================================================
# BUILD STUDENT PROFILE TEXT
# ============================================================

def build_student_text(student):
    """
    Convert structured student information into natural language
    that the AI model can understand.
    """

    skills = ", ".join(
        student.get("skills", [])
    )

    interests = ", ".join(
        student.get("interests", [])
    )

    preferred_sector = student.get(
        "preferred_sector",
        ""
    )

    preferred_location = student.get(
        "preferred_location",
        ""
    )

    return (
        f"Student has skills in {skills}. "
        f"Interested in {interests}. "
        f"Preferred sector is {preferred_sector}. "
        f"Preferred location is {preferred_location}."
    )


# ============================================================
# BUILD INTERNSHIP TEXT
# ============================================================

def build_internship_text(internship):
    """
    Convert internship information into natural language.
    """

    skills = ", ".join(
        internship.get("required_skills", [])
    )

    sector = internship.get(
        "sector",
        ""
    )

    location = internship.get(
        "location",
        ""
    )

    title = internship.get(
        "title",
        ""
    )

    company = internship.get(
        "company",
        ""
    )

    return (
        f"{title} at {company}. "
        f"This internship requires skills in {skills}. "
        f"The sector is {sector}. "
        f"The location is {location}."
    )


# ============================================================
# AI COMPATIBILITY SCORE
# ============================================================

def calculate_ai_match_score(
        student,
        internship
):
    """
    Calculate semantic compatibility between
    a student and an internship.

    Returns a score from 0 to 100.
    """

    student_text = build_student_text(
        student
    )

    internship_text = build_internship_text(
        internship
    )

    embeddings = model.encode(
        [
            student_text,
            internship_text
        ],
        normalize_embeddings=True
    )

    similarity = float(
        embeddings[0] @ embeddings[1]
    )

    # Convert cosine similarity approximately
    # into a 0-100 score.

    score = max(
        0,
        min(
            100,
            similarity * 100
        )
    )

    return round(
        score,
        2
    )


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    student = {
        "skills": [
            "Java",
            "Spring Boot",
            "SQL"
        ],
        "interests": [
            "Backend Development"
        ],
        "preferred_sector": "IT",
        "preferred_location": "Bengaluru"
    }

    internship = {
        "title": "Java Backend Developer Intern",
        "company": "TechNova Solutions",
        "required_skills": [
            "Java",
            "Spring Boot",
            "SQL"
        ],
        "sector": "IT",
        "location": "Bengaluru"
    }

    score = calculate_ai_match_score(
        student,
        internship
    )

    print()
    print("=" * 50)
    print("AI MATCHING TEST")
    print("=" * 50)

    print(
        f"AI Compatibility Score: {score}%"
    )