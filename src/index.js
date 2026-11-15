// index.js
// Entry point: the command-line interface of the application.
//
//   node src/index.js                  -> interactive menu
//   node src/index.js <command> [...]  -> run a single operation and exit
//
// This file only deals with input and output: it reads and validates what
// the user typed, calls the matching function in students.js, and turns any
// error into a readable message.

import readline from 'node:readline';
import { pool } from './db.js';
import {
  getAllStudents,
  addStudent,
  updateStudentEmail,
  deleteStudent,
} from './students.js';

const USAGE = `Usage:
  node src/index.js                                                  interactive menu
  node src/index.js getAll                                           list all students
  node src/index.js add <first_name> <last_name> <email> [date]      add a student
  node src/index.js updateEmail <student_id> <new_email>             change a student's email
  node src/index.js delete <student_id>                              delete a student

  [date] is the enrollment date as YYYY-MM-DD and may be omitted.`;

const MENU = `
===== Students Database =====
1. Show all students        getAllStudents()
2. Add a student            addStudent()
3. Update a student's email updateStudentEmail()
4. Delete a student         deleteStudent()
5. Exit`;

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

/** An error caused by what the user typed, as opposed to a database failure. */
class UserInputError extends Error {}

/** Thrown when the keyboard input ends (Ctrl+C / Ctrl+D) while the menu is waiting. */
class InputClosedError extends Error {}

// Largest value of a PostgreSQL INTEGER, the type of student_id.
const MAX_STUDENT_ID = 2147483647;

/** Converts text to a student_id, rejecting anything that is not a positive integer. */
function parseStudentId(text) {
  const id = /^\d+$/.test(text ?? '') ? Number(text) : NaN;
  if (!(id >= 1 && id <= MAX_STUDENT_ID)) {
    throw new UserInputError(
      `student_id must be a positive whole number (got "${text ?? ''}").`,
    );
  }
  return id;
}

/** Returns the trimmed text, rejecting missing or blank values. */
function requireText(text, fieldName) {
  const trimmed = (text ?? '').trim();
  if (trimmed === '') {
    throw new UserInputError(`${fieldName} is required.`);
  }
  return trimmed;
}

/**
 * Checks the shape of an optional date. Blank means "no date" (NULL).
 * PostgreSQL itself rejects impossible dates such as 2023-02-30.
 */
function parseOptionalDate(text) {
  const trimmed = (text ?? '').trim();
  if (trimmed === '') {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new UserInputError(
      `enrollment_date must look like YYYY-MM-DD (got "${trimmed}").`,
    );
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// Error messages
// ---------------------------------------------------------------------------

/**
 * Turns an error into a message for the user. PostgreSQL identifies each
 * kind of failure with a five-character code (err.code); the common ones
 * are translated here, anything else falls back to the original message.
 */
function describeError(err) {
  if (err instanceof UserInputError) {
    return err.message;
  }
  switch (err.code) {
    case '23505': // unique_violation
      return 'That email address already belongs to another student. Emails must be unique.';
    case '23502': // not_null_violation
      return `A value is required for "${err.column}".`;
    case '22007': // invalid_datetime_format
    case '22008': // datetime_field_overflow
      return 'That is not a valid date. Use YYYY-MM-DD with a real calendar date.';
    case '42P01': // undefined_table
      return 'The students table does not exist. Run db/schema.sql and db/seed.sql first (see README).';
    case '3D000': // invalid_catalog_name
      return `The database "${pool.options.database}" does not exist. Create it first (see README).`;
    case '28P01': // invalid_password
      return 'PostgreSQL rejected the user name or password. Check PGUSER and PGPASSWORD in .env.';
    case 'ECONNREFUSED': // nothing is listening on the host/port
      return `Could not connect to PostgreSQL at ${pool.options.host}:${pool.options.port}. Is the server running?`;
    default:
      return err.message || String(err);
  }
}

// ---------------------------------------------------------------------------
// Running an operation
// ---------------------------------------------------------------------------

/**
 * Validates the arguments of one command and calls the matching function.
 * Used by both the single-command mode and the interactive menu.
 * @param {string} command - getAll | add | updateEmail | delete
 * @param {string[]} args - the command's arguments, as typed by the user
 */
async function runCommand(command, args) {
  switch (command) {
    case 'getAll':
      await getAllStudents();
      break;
    case 'add':
      await addStudent(
        requireText(args[0], 'first_name'),
        requireText(args[1], 'last_name'),
        requireText(args[2], 'email'),
        parseOptionalDate(args[3]),
      );
      break;
    case 'updateEmail':
      await updateStudentEmail(
        parseStudentId(args[0]),
        requireText(args[1], 'new_email'),
      );
      break;
    case 'delete':
      await deleteStudent(parseStudentId(args[0]));
      break;
    default:
      throw new UserInputError(`Unknown command "${command}".\n\n${USAGE}`);
  }
}

/**
 * Shows the menu repeatedly, asking for the values each operation needs,
 * until the user chooses Exit. An error in one operation is reported and
 * the menu continues.
 */
async function runMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  // Ctrl+C closes the input, which ends the menu cleanly (see `ask`).
  rl.on('SIGINT', () => rl.close());

  // Remember when the input has ended: a closed interface can no longer prompt.
  let inputOpen = true;
  rl.on('close', () => {
    inputOpen = false;
  });

  // Reads typed lines one at a time, in order.
  const lines = rl[Symbol.asyncIterator]();

  /** Shows a prompt and waits for the user's answer. */
  const ask = async (question) => {
    if (inputOpen) {
      rl.setPrompt(question);
      rl.prompt();
    } else {
      // Input already ended (e.g. answers piped in from a file), but lines
      // that arrived before it ended can still be waiting to be read.
      process.stdout.write(question);
    }
    const { value, done } = await lines.next();
    if (done) {
      throw new InputClosedError();
    }
    return value.trim();
  };

  try {
    while (true) {
      console.log(MENU);
      const choice = await ask('Choose an option (1-5): ');
      if (choice === '5') {
        break;
      }

      try {
        switch (choice) {
          case '1':
            await runCommand('getAll', []);
            break;
          case '2':
            await runCommand('add', [
              await ask('First name: '),
              await ask('Last name: '),
              await ask('Email: '),
              await ask('Enrollment date (YYYY-MM-DD, leave blank for none): '),
            ]);
            break;
          case '3':
            await runCommand('updateEmail', [
              await ask('student_id of the student to update: '),
              await ask('New email: '),
            ]);
            break;
          case '4':
            await runCommand('delete', [
              await ask('student_id of the student to delete: '),
            ]);
            break;
          default:
            console.log('Please enter a number from 1 to 5.');
        }
      } catch (err) {
        if (err instanceof InputClosedError) {
          throw err; // stop the menu; handled below
        }
        console.error(`Error: ${describeError(err)}`);
      }
    }
  } catch (err) {
    // Input ending is a normal way to leave the menu; anything else is not.
    if (!(err instanceof InputClosedError)) {
      throw err;
    }
    console.log();
  } finally {
    rl.close();
  }
  console.log('Goodbye.');
}

// ---------------------------------------------------------------------------
// Program start
// ---------------------------------------------------------------------------

const [command, ...args] = process.argv.slice(2);

try {
  if (command === undefined) {
    await runMenu();
  } else if (['help', '--help', '-h'].includes(command)) {
    console.log(USAGE);
  } else {
    await runCommand(command, args);
  }
} catch (err) {
  console.error(`Error: ${describeError(err)}`);
  process.exitCode = 1; // report failure to the shell
} finally {
  // Close the database connections so the program can exit.
  await pool.end();
}
