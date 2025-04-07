import * as React from 'react';
import { type Metadata } from 'next';

import {
  Page,
  PageBody,
  PageHeader,
  PagePrimaryBar,
} from '@workspace/ui/components/page';

import { OrganizationPageTitle } from '~/components/organizations/slug/organization-page-title';
import { createTitle } from '~/lib/formatters';

export const metadata: Metadata = {
  title: createTitle('Tasks'),
};

export type TasksLayoutProps = React.PropsWithChildren;

export default function TasksLayout({
  children,
}: TasksLayoutProps): React.JSX.Element {
  return (
    <Page>
      <PageHeader>
        <PagePrimaryBar>
          <OrganizationPageTitle title="Tasks" info="Manage tasks for your team" />
        </PagePrimaryBar>
      </PageHeader>
      <PageBody>{children}</PageBody>
    </Page>
  );
} 