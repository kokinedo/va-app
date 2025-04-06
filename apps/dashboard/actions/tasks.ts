'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { TaskStatus, Role, Membership } from '@prisma/client';
import { getAuthContext } from '@workspace/auth/context'; // Use basic auth for VA tasks
import { db } from '@workspace/database';
import { ForbiddenError, NotFoundError } from '@workspace/common/errors';

import { authActionClient, authOrganizationActionClient } from './safe-action';

// ---- Validation Schemas ----

const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assignedToId: z.string().uuid('Invalid user ID format'),
  dueDate: z.coerce.date().optional(),
  // Removed organizationId from schema, will use ctx.organization.id
});

const UpdateTaskStatusSchema = z.object({
  taskId: z.string().cuid('Invalid task ID format'),
  status: z.nativeEnum(TaskStatus),
  submissionDetails: z.string().optional(),
});

// ---- Server Actions ----

/**
 * Creates a new task. Requires ADMIN privileges.
 */
export const createTask = authOrganizationActionClient
  .metadata({ actionName: 'createTask' })
  .schema(CreateTaskSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Find the user's role in the current organization
    const membership = ctx.session.user.memberships.find(
      (m) => m.organizationId === ctx.organization.id
    );

    if (membership?.role !== Role.ADMIN) { // Use Role enum
      throw new ForbiddenError('Only admins can create tasks.');
    }

    // Ensure the assigned user is part of the organization
    const memberExists = await db.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: ctx.organization.id, // Use ctx.organization.id
          userId: parsedInput.assignedToId
        }
      },
    });
    if (!memberExists) {
      throw new NotFoundError('Assigned user not found in this organization.');
    }

    const task = await db.task.create({
      data: {
        title: parsedInput.title,
        description: parsedInput.description,
        assignedToId: parsedInput.assignedToId,
        dueDate: parsedInput.dueDate,
        // Tasks are implicitly linked to the organization via the assigned user's membership
      },
    });

    revalidatePath('/dashboard/tasks'); // Adjust path as needed
    return { success: true, task };
  });

/**
 * Fetches all tasks for the user's organization. Requires ADMIN privileges.
 */
export const getAdminTasks = authOrganizationActionClient
  .metadata({ actionName: 'getAdminTasks' })
  .action(async ({ ctx }) => {
    const membership = ctx.session.user.memberships.find(
      (m) => m.organizationId === ctx.organization.id
    );

    if (membership?.role !== Role.ADMIN) { // Use Role enum
      throw new ForbiddenError('Only admins can view all organization tasks.');
    }

    // Fetch tasks where the assigned user belongs to the admin's organization
    const tasks = await db.task.findMany({
      where: {
        assignedTo: {
          memberships: {
            some: {
              organizationId: ctx.organization.id, // Use ctx.organization.id
            },
          },
        },
      },
      include: {
        assignedTo: { // Include basic user details
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tasks;
  });

/**
 * Fetches tasks assigned to the currently logged-in VA (MEMBER).
 */
export const getVaTasks = authActionClient // Use basic auth, no org/role check needed beyond the query
  .metadata({ actionName: 'getVaTasks' })
  .action(async ({ ctx }) => {
    const tasks = await db.task.findMany({
      where: {
        assignedToId: ctx.session.user.id, // Use ctx.session.user.id
      },
      orderBy: {
        dueDate: 'asc', // Or createdAt: 'desc' or other relevant sorting
      },
    });

    return tasks;
  });

/**
 * Updates the status of a task.
 * Admins can update any task in their org.
 * VAs (Members) can only update tasks assigned to them, and only to specific statuses.
 */
export const updateTaskStatus = authOrganizationActionClient
  .metadata({ actionName: 'updateTaskStatus' })
  .schema(UpdateTaskStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { taskId, status, submissionDetails } = parsedInput;

    const task = await db.task.findUnique({
      where: { id: taskId },
      // Include membership to check org indirectly
      include: { assignedTo: { include: { memberships: true } } }
    });

    if (!task) {
      throw new NotFoundError('Task not found.');
    }

    // Ensure the task belongs to the user's current organization context
    const taskBelongsToOrg = task.assignedTo.memberships.some(
      (m: Membership) => m.organizationId === ctx.organization.id
    );
    if (!taskBelongsToOrg) {
      throw new NotFoundError('Task not found in this organization.'); // Or ForbiddenError
    }

    const membership = ctx.session.user.memberships.find(
      (m) => m.organizationId === ctx.organization.id
    );
    const userRole = membership?.role;
    const isUserAdmin = userRole === Role.ADMIN;
    const isUserAssigned = task.assignedToId === ctx.session.user.id; // Use ctx.session.user.id

    // Permission check: Must be admin OR the assigned VA
    if (!isUserAdmin && !isUserAssigned) {
      throw new ForbiddenError('You do not have permission to update this task.');
    }

    // Restriction for VAs (Members)
    if (!isUserAdmin && isUserAssigned) {
      const allowedStatusesForVa: TaskStatus[] = [
        TaskStatus.IN_PROGRESS,
        TaskStatus.COMPLETED,
        TaskStatus.REVIEW,
      ];
      // Direct enum comparison
      if (!allowedStatusesForVa.includes(status)) {
        throw new ForbiddenError(
          `You can only update the status to IN_PROGRESS, COMPLETED, or REVIEW.`
        );
      }

      const requiresDetails = status === TaskStatus.COMPLETED || status === TaskStatus.REVIEW;

      // VAs cannot update submission details if status is not COMPLETED or REVIEW
      if (submissionDetails && !requiresDetails) {
         throw new ForbiddenError('Submission details can only be added when status is COMPLETED or REVIEW.');
      }
       // Ensure submission details are provided if moving to COMPLETED or REVIEW
       if (!submissionDetails && requiresDetails) {
         throw new ForbiddenError('Submission details are required when marking task as COMPLETED or REVIEW.');
       }
    }


    // Update the task
    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: {
        status: status,
        // Clear details if not completed/review, otherwise use provided value
        submissionDetails: (status === TaskStatus.COMPLETED || status === TaskStatus.REVIEW) ? submissionDetails : null,
      },
    });

    revalidatePath('/dashboard/tasks'); // Adjust path as needed
    revalidatePath(`/dashboard/tasks/${taskId}`); // Revalidate specific task page if exists
    return { success: true, task: updatedTask };
  }); 