import * as React from 'react';
import { type Metadata } from 'next';

import { ChangeEmailExpiredCard } from '~/components/auth/change-email/change-email-expired-card';
import { createTitle } from '~/lib/formatters';

export const metadata: Metadata = {
  title: createTitle('Expired change request')
};

export default function ChangeEmailExpiredPage(): React.JSX.Element {
  return <ChangeEmailExpiredCard />;
}
