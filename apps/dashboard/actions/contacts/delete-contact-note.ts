'use server';

import { revalidateTag } from 'next/cache';

import { NotFoundError } from '@workspace/common/errors';
import { prisma } from '@workspace/database/client';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { deleteContactNoteSchema } from '~/schemas/contacts/delete-contact-note-schema';

export const deleteContactNote = authOrganizationActionClient
  .metadata({ actionName: 'deleteContactNote' })
  .schema(deleteContactNoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const count = await prisma.contactNote.count({
      where: {
        id: parsedInput.id,
        contact: {
          organizationId: ctx.organization.id
        }
      }
    });
    if (count < 1) {
      throw new NotFoundError('Contact note not found');
    }

    const note = await prisma.contactNote.delete({
      where: { id: parsedInput.id },
      select: { contactId: true }
    });

    revalidateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.ContactNotes,
        ctx.organization.id,
        note.contactId
      )
    );
  });
