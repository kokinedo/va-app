import * as React from 'react';
import { TaskStatus, type User } from '@prisma/client'; // Make sure User and TaskStatus are imported

// Assuming getAdminTasks is no longer directly needed here for dummy data
// import { getAdminTasks } from '~/actions/tasks';
import { TaskTable, type AdminTaskDto } from '~/components/organizations/slug/tasks/task-table';

// --- DUMMY DATA GENERATION (Remove when using real data) ---

const DUMMY_USERS: Pick<User, 'id' | 'name' | 'image' | 'email'>[] = [
  {
    id: 'user_dummy_va_1',
    name: 'Alice VA',
    image: 'https://i.pravatar.cc/150?u=aliceva',
    email: 'alice.va@example.com',
  },
  {
    id: 'user_dummy_va_2',
    name: 'Bob Assistant',
    image: 'https://i.pravatar.cc/150?u=bobassistant',
    email: 'bob.assistant@example.com',
  },
  {
    id: 'user_dummy_va_3',
    name: 'Charlie Helper',
    image: null, // Test fallback avatar
    email: 'charlie.helper@example.com',
  },
  {
    id: 'user_dummy_va_4',
    name: 'Diana Specialist',
    image: 'https://i.pravatar.cc/150?u=diana',
    email: 'diana.specialist@example.com',
  },
];

const ALL_STATUSES = Object.values(TaskStatus);

function generateDummyTasks(count: number): AdminTaskDto[] {
  const tasks: AdminTaskDto[] = [];
  const now = new Date();

  const taskPrefixes = ['Review', 'Update', 'Create', 'Analyze', 'Draft', 'Finalize', 'Submit', 'Research'];
  const taskSuffixes = ['Document', 'Report', 'Spreadsheet', 'Presentation', 'Proposal', 'Summary', 'Notes', 'Plan'];

  for (let i = 0; i < count; i++) {
    const assignedUser = DUMMY_USERS[i % DUMMY_USERS.length];
    const status = ALL_STATUSES[i % ALL_STATUSES.length];
    const createdAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Within last 30 days
    const shouldHaveDueDate = Math.random() > 0.3; // 70% chance of having due date
    const dueDate = shouldHaveDueDate
      ? new Date(createdAt.getTime() + Math.random() * 60 * 24 * 60 * 60 * 1000) // Within 60 days of creation
      : null;

    tasks.push({
      id: `task_dummy_${i + 1}`,
      title: `${taskPrefixes[i % taskPrefixes.length]} ${taskSuffixes[i % taskSuffixes.length]} #${i + 1}`,
      description: Math.random() > 0.5 ? `Detailed description for dummy task ${i + 1}. Needs careful attention.` : null,
      status: status,
      createdAt: createdAt,
      updatedAt: new Date(createdAt.getTime() + Math.random() * (now.getTime() - createdAt.getTime())), // Random update time after creation
      dueDate: dueDate,
      assignedToId: assignedUser.id,
      assignedTo: assignedUser,
      submissionDetails: status === TaskStatus.COMPLETED || status === TaskStatus.REVIEW ? `Submission notes for task ${i + 1}` : null,
    });
  }
  return tasks;
}
// --- END DUMMY DATA ---

export default async function TasksPage(): Promise<React.JSX.Element> {
  // --- Use dummy data ---
  const tasks = generateDummyTasks(30); // Generate 30 dummy tasks
  // ----------------------

  /* --- Use real data (uncomment when ready) ---
    const result = await getAdminTasks();

    if (!result) {
       console.error("Server action failed unexpectedly.");
       return <TaskTable tasks={[]} />; // Render empty table on unexpected failure
    } else if (result.serverError || !result.data) {
      console.error("Failed to fetch admin tasks:", result.serverError);
      // Render the table with an empty array or show an error message
      return <TaskTable tasks={[]} />;\
    }

    // Now safe to access result.data
    const tasks = result.data as AdminTaskDto[];
  --- End real data --- */

  return <TaskTable tasks={tasks} />;
} 