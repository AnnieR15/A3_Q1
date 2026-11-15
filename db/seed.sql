-- seed.sql
-- Populates the students table with the initial data set.
-- Run this once, after db/schema.sql.
-- student_id is not listed: PostgreSQL assigns 1, 2, 3 automatically.

INSERT INTO students (first_name, last_name, email, enrollment_date) VALUES
('John', 'Doe', 'john.doe@example.com', '2023-09-01'),
('Jane', 'Smith', 'jane.smith@example.com', '2023-09-01'),
('Jim', 'Beam', 'jim.beam@example.com', '2023-09-02');
