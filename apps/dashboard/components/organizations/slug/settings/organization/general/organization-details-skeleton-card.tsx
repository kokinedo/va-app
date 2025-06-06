import * as React from 'react';

import {
  Card,
  CardContent,
  CardFooter,
  type CardProps
} from '@workspace/ui/components/card';
import { Separator } from '@workspace/ui/components/separator';
import { Skeleton } from '@workspace/ui/components/skeleton';

export function OrgnizationDetailsSkeletonCard(
  props: CardProps
): React.JSX.Element {
  return (
    <Card {...props}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col space-y-2"
            >
              <Skeleton className="h-[17px] w-20 my-[3.5px]" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="flex w-full justify-end pt-6">
        <Skeleton className="h-9 w-16" />
      </CardFooter>
    </Card>
  );
}
