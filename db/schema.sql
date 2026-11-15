-- schema.sql
-- Creates the students table.
-- Run this while connected to the students_db database
-- (pgAdmin Query Tool, or: psql -d students_db -f db/schema.sql).

-- Remove any previous copy of the table so this script can be re-run
-- to reset the database to a clean state.
DROP TABLE IF EXISTS students;

CREATE TABLE students (
    -- SERIAL = integer that auto-increments from a sequence; PRIMARY KEY
    -- makes it the unique, non-null identifier of each student.
    student_id      SERIAL PRIMARY KEY,

    -- Both names are required.
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,

    -- Required, and no two students may share the same email address.
    email           TEXT NOT NULL UNIQUE,

    -- Optional: may be NULL if the enrollment date is not known yet.
    enrollment_date DATE
);
