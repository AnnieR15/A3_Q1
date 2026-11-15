# Students CRUD Application (PostgreSQL + Node.js)

A command-line application that connects to a PostgreSQL database and performs
the four CRUD operations on a `students` table:

| Function | What it does |
| --- | --- |
| `getAllStudents()` | Retrieves and displays every record in the `students` table. |
| `addStudent(first_name, last_name, email, enrollment_date)` | Inserts a new student record. |
| `updateStudentEmail(student_id, new_email)` | Updates the email address of the student with that `student_id`. |
| `deleteStudent(student_id)` | Deletes the record of the student with that `student_id`. |

## Demonstration video

**Video link:** [(https://youtu.be/rcYO6Sf_56Q)](https://www.youtube.com/watch?v=rcYO6Sf_56Q)

## Project structure

```
students-crud-app/
├── db/
│   ├── schema.sql        Creates the students table
│   └── seed.sql          Inserts the three initial students
├── src/
│   ├── db.js             Connection to PostgreSQL (settings read from .env)
│   ├── students.js       The four functions listed above
│   └── index.js          Command-line interface: menu, input checks, error messages
├── .env.example          Template for the connection settings
├── docker-compose.yml    Optional: PostgreSQL + pgAdmin in Docker
└── package.json          Dependencies: pg (PostgreSQL driver), dotenv
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- PostgreSQL and pgAdmin 4, **or** Docker Desktop (see Option B below)

## Step 1 - Set up the database

### 1a. Get a PostgreSQL server

**Option A - PostgreSQL is already installed.** Open pgAdmin and connect to
your server. Nothing else to do here.

**Option B - use Docker.** From the project folder, first create the `.env`
file (Step 2, item 2), then run:

```
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` and pgAdmin at
<http://localhost:5050>. Log in to pgAdmin with `admin@example.com` /
`admin`, then choose **Add New Server** and enter:

| Field | Value |
| --- | --- |
| General → Name | anything, e.g. `Students` |
| Connection → Host name/address | `db` |
| Connection → Port | `5432` |
| Connection → Username | `postgres` |
| Connection → Password | `postgres` (the `PGPASSWORD` value in `.env`) |

> If port 5432 is already used by another PostgreSQL on your computer, set
> `PGPORT=5433` in `.env` before running `docker compose up -d`. The values
> to enter in pgAdmin stay the same (`db`, port `5432`), because pgAdmin
> talks to the database inside Docker's own network.

### 1b. Create the database

In pgAdmin, right-click **Databases → Create → Database...**, name it
`students_db`, and save. (Equivalent SQL: `CREATE DATABASE students_db;`)

### 1c. Create the table and insert the initial data

In pgAdmin, right-click **students_db → Query Tool**, then:

1. Open `db/schema.sql` (or paste its contents) and click **Execute**.
   This creates the `students` table.
2. Open `db/seed.sql` (or paste its contents) and click **Execute**.
   This inserts John Doe, Jane Smith and Jim Beam.

Check the result with `SELECT * FROM students;` - it should return 3 rows.

## Step 2 - Install and configure the application

There is nothing to compile; Node.js runs the source files directly.

1. Install the dependencies (from the project folder):

   ```
   npm install
   ```

2. Create your settings file by copying the template:

   ```
   cp .env.example .env
   ```

   (In the Windows Command Prompt, use `copy .env.example .env`.)

3. Open `.env` and set `PGPASSWORD` to the password of your PostgreSQL
   `postgres` user. Change the other values only if your server differs
   from the defaults:

   | Setting | Default | Meaning |
   | --- | --- | --- |
   | `PGHOST` | `localhost` | Computer the server runs on |
   | `PGPORT` | `5432` | Port the server listens on |
   | `PGUSER` | `postgres` | PostgreSQL user name |
   | `PGPASSWORD` | `postgres` | That user's password |
   | `PGDATABASE` | `students_db` | Database created in Step 1b |

## Step 3 - Run the application

### Interactive menu

```
npm start
```

```
===== Students Database =====
1. Show all students        getAllStudents()
2. Add a student            addStudent()
3. Update a student's email updateStudentEmail()
4. Delete a student         deleteStudent()
5. Exit
Choose an option (1-5):
```

Type a number and press Enter. The application asks for any values the
operation needs (for example, the name and email of a new student).

### Single commands

Each function can also be run directly, which performs one operation and exits:

```
node src/index.js getAll
node src/index.js add Alice Wong alice.wong@example.com 2023-09-03
node src/index.js updateEmail 4 alice.w@example.com
node src/index.js delete 4
```

Example output of `getAll`:

```
student_id | first_name | last_name | email                  | enrollment_date
-----------+------------+-----------+------------------------+----------------
1          | John       | Doe       | john.doe@example.com   | 2023-09-01
2          | Jane       | Smith     | jane.smith@example.com | 2023-09-01
3          | Jim        | Beam      | jim.beam@example.com   | 2023-09-02
(3 rows)
```

After an add, update or delete, refresh the table in pgAdmin
(`SELECT * FROM students ORDER BY student_id;`) to see the change.

## How the functions work

All four functions are in `src/students.js`. Each one sends a single
parameterized SQL statement, so user input is never executed as SQL.

- **`getAllStudents()`** runs `SELECT ... FROM students ORDER BY student_id`
  and prints the rows as a table (or a message if the table is empty).
- **`addStudent(...)`** runs `INSERT ... RETURNING` and prints the new
  student together with the `student_id` PostgreSQL generated for it. The
  enrollment date is optional; leaving it out stores `NULL`.
- **`updateStudentEmail(student_id, new_email)`** runs
  `UPDATE ... WHERE student_id = $1 RETURNING`. If no student has that id, it
  says so and changes nothing.
- **`deleteStudent(student_id)`** runs
  `DELETE ... WHERE student_id = $1 RETURNING`. If no student has that id, it
  says so and changes nothing.

## Error handling

Invalid input and database errors are reported as plain messages instead of
stack traces, and the menu keeps running afterwards. Examples:

| Situation | Message |
| --- | --- |
| Email already used by another student | `That email address already belongs to another student. Emails must be unique.` |
| `student_id` is not a number | `student_id must be a positive whole number (got "abc").` |
| Impossible date such as `2023-02-30` | `That is not a valid date. Use YYYY-MM-DD with a real calendar date.` |
| Blank first name, last name or email | `first_name is required.` |
| PostgreSQL is not running | `Could not connect to PostgreSQL at localhost:5432. Is the server running?` |
| Wrong password in `.env` | `PostgreSQL rejected the user name or password. Check PGUSER and PGPASSWORD in .env.` |
| Table not created yet | `The students table does not exist. Run db/schema.sql and db/seed.sql first (see README).` |

## Resetting the data

Run `db/schema.sql` and then `db/seed.sql` again in the pgAdmin Query Tool.
`schema.sql` drops and re-creates the table, so `student_id` starts from 1 again.

If you used Docker, stop the containers with `docker compose down`
(add `-v` to also delete the stored data).
