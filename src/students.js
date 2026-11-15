// students.js
// The four database operations on the students table.
//
// Every query is parameterized ($1, $2, ...): values are sent to PostgreSQL
// separately from the SQL text, so user input can never be executed as SQL.
//
// Database errors (duplicate email, invalid date, connection problems, ...)
// are not caught here. They propagate to the caller, and index.js turns them
// into readable messages in one place.

import { pool } from './db.js';

// Column list shared by every query so results always have the same shape.
const COLUMNS = 'student_id, first_name, last_name, email, enrollment_date';

/**
 * Retrieves all records from the students table and displays them.
 * @returns {Promise<object[]>} the student rows, ordered by student_id
 */
export async function getAllStudents() {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM students ORDER BY student_id`,
  );

  if (rows.length === 0) {
    console.log('The students table is empty.');
  } else {
    printTable(rows);
  }
  return rows;
}

/**
 * Inserts a new student record into the students table.
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} email - must not already belong to another student
 * @param {string|null} enrollmentDate - 'YYYY-MM-DD', or null if unknown
 * @returns {Promise<object>} the inserted row, including its new student_id
 */
export async function addStudent(firstName, lastName, email, enrollmentDate) {
  // RETURNING gives back the row as stored, including the generated student_id.
  const { rows } = await pool.query(
    `INSERT INTO students (first_name, last_name, email, enrollment_date)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUMNS}`,
    [firstName, lastName, email, enrollmentDate ?? null],
  );

  const student = rows[0];
  console.log(
    `Added student ${student.student_id}: ${student.first_name} ${student.last_name} <${student.email}>`,
  );
  return student;
}

/**
 * Updates the email address of the student with the given student_id.
 * @param {number} studentId
 * @param {string} newEmail - must not already belong to another student
 * @returns {Promise<object|null>} the updated row, or null if no such student
 */
export async function updateStudentEmail(studentId, newEmail) {
  const { rows } = await pool.query(
    `UPDATE students
     SET email = $2
     WHERE student_id = $1
     RETURNING ${COLUMNS}`,
    [studentId, newEmail],
  );

  // No row returned means the WHERE clause matched nothing.
  if (rows.length === 0) {
    console.log(`No student has student_id ${studentId}. Nothing was updated.`);
    return null;
  }

  console.log(`Updated the email of student ${studentId} to ${rows[0].email}`);
  return rows[0];
}

/**
 * Deletes the record of the student with the given student_id.
 * @param {number} studentId
 * @returns {Promise<object|null>} the deleted row, or null if no such student
 */
export async function deleteStudent(studentId) {
  const { rows } = await pool.query(
    `DELETE FROM students
     WHERE student_id = $1
     RETURNING ${COLUMNS}`,
    [studentId],
  );

  if (rows.length === 0) {
    console.log(`No student has student_id ${studentId}. Nothing was deleted.`);
    return null;
  }

  const student = rows[0];
  console.log(
    `Deleted student ${student.student_id}: ${student.first_name} ${student.last_name} <${student.email}>`,
  );
  return student;
}

/**
 * Prints rows as a text table with aligned columns.
 * @param {object[]} rows - at least one row; all rows have the same keys
 */
function printTable(rows) {
  const headers = Object.keys(rows[0]);

  // Convert every value to text first; NULL is shown as an empty cell.
  const table = rows.map((row) => headers.map((h) => String(row[h] ?? '')));

  // Each column is as wide as its longest cell (or its header).
  const widths = headers.map((header, col) =>
    Math.max(header.length, ...table.map((cells) => cells[col].length)),
  );
  const formatLine = (cells) =>
    cells.map((cell, col) => cell.padEnd(widths[col])).join(' | ').trimEnd();

  console.log(formatLine(headers));
  console.log(widths.map((width) => '-'.repeat(width)).join('-+-'));
  for (const cells of table) {
    console.log(formatLine(cells));
  }
  console.log(`(${rows.length} ${rows.length === 1 ? 'row' : 'rows'})`);
}
