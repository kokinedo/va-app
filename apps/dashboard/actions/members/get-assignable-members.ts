'use server';

import { Role } from '@prisma/client';
import { getAuthOrganizationContext } from '@workspace/auth/context';
import { prisma } from '@workspace/database/client';

import { authOrganizationActionClient } from '~/actions/safe-action';

// Define the shape of the returned member data
type AssignableMember = {
  id: string;
  name: string | null;
  email: string | null;
};

/**
 * Server action to fetch members with the MEMBER role for task assignment.
 */
export const getAssignableMembers = authOrganizationActionClient
  .metadata({ actionName: 'getAssignableMembers' })
  // No input schema needed for this simple fetch
  .action(async ({ ctx }): Promise<AssignableMember[]> => {
    const members = await prisma.membership.findMany({
      where: {
        organizationId: ctx.organization.id,
        role: Role.MEMBER, // Filter for MEMBER role on the server
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc', // Optional: sort by name
        },
      },
    });

    // Map to the desired return type
    const assignableMembers: AssignableMember[] = members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
    }));

    return assignableMembers;
  }); 