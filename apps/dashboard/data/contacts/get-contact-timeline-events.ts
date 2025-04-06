import 'server-only';

import { unstable_cache as cache } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { ValidationError } from '@workspace/common/errors';
import { ActorType } from '@workspace/database';
import { prisma } from '@workspace/database/client';

import {
  Caching,
  defaultRevalidateTimeInSeconds,
  OrganizationCacheKey
} from '~/data/caching';
import {
  getContactTimelineEventsSchema,
  type GetContactTimelineEventsSchema
} from '~/schemas/contacts/get-contact-timeline-events-schema';
import type {
  ActivityTimelineEventDto,
  CommentTimelineEventDto,
  TimelineEventDto
} from '~/types/dtos/timeline-event-dto';
import { SortDirection } from '~/types/sort-direction';

export async function getContactTimelineEvents(
  input: GetContactTimelineEventsSchema
): Promise<TimelineEventDto[]> {
  const ctx = await getAuthOrganizationContext();

  const result = getContactTimelineEventsSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()));
  }
  const parsedInput = result.data;

  return cache(
    async () => {
      const [activities, comments] = await prisma.$transaction([
        prisma.contactActivity.findMany({
          where: {
            contactId: parsedInput.contactId,
            contact: {
              organizationId: ctx.organization.id
            }
          },
          select: {
            id: true,
            contactId: true,
            actionType: true,
            actorType: true,
            actorId: true,
            metadata: true,
            occurredAt: true
          },
          orderBy: {
            occurredAt: SortDirection.Desc
          }
        }),
        prisma.contactComment.findMany({
          where: {
            contactId: parsedInput.contactId,
            contact: {
              organizationId: ctx.organization.id
            }
          },
          select: {
            id: true,
            contactId: true,
            text: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            createdAt: SortDirection.Desc
          }
        })
      ]);

      const actorIds = [
        ...new Set(
          activities
            .filter((activity) => activity.actorType === ActorType.MEMBER)
            .map((activity) => activity.actorId)
        )
      ];
      const actors = await prisma.user.findMany({
        where: {
          id: { in: actorIds }
        },
        select: {
          id: true,
          name: true,
          image: true
        }
      });

      const mappedActivities: ActivityTimelineEventDto[] = activities.map(
        (activity) => {
          const actor = actors.find((actor) => actor.id === activity.actorId);
          return {
            id: activity.id,
            contactId: activity.contactId,
            type: 'activity',
            actionType: activity.actionType,
            actorType: activity.actorType,
            metadata: activity.metadata,
            occurredAt: activity.occurredAt,
            actor: {
              id: actor?.id ?? '',
              name: actor?.name ?? '',
              image: actor?.image ?? undefined
            }
          };
        }
      );

      const mappedComments: CommentTimelineEventDto[] = comments.map(
        (comment) => ({
          id: comment.id,
          contactId: comment.contactId,
          type: 'comment',
          text: comment.text,
          edited: comment.createdAt.getTime() !== comment.updatedAt.getTime(),
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          sender: {
            id: comment.user.id,
            name: comment.user.name,
            image: comment.user.image ?? undefined
          }
        })
      );

      const sorted: TimelineEventDto[] = [
        ...mappedActivities,
        ...mappedComments
      ].sort((a, b) => {
        const dateA = (
          a.type === 'activity' ? a.occurredAt : a.createdAt
        ).getTime();
        const dateB = (
          b.type === 'activity' ? b.occurredAt : b.createdAt
        ).getTime();
        return dateB - dateA;
      });

      return sorted;
    },
    Caching.createOrganizationKeyParts(
      OrganizationCacheKey.ContactTimelineEvents,
      ctx.organization.id,
      parsedInput.contactId
    ),
    {
      revalidate: defaultRevalidateTimeInSeconds,
      tags: [
        Caching.createOrganizationTag(
          OrganizationCacheKey.ContactTimelineEvents,
          ctx.organization.id,
          parsedInput.contactId
        ),
        Caching.createOrganizationTag(
          OrganizationCacheKey.Contact,
          ctx.organization.id,
          parsedInput.contactId
        ),
        Caching.createOrganizationTag(
          OrganizationCacheKey.Contacts,
          ctx.organization.id
        )
      ]
    }
  )();
}
