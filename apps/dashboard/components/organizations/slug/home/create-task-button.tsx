'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, PlusIcon } from 'lucide-react';
import { useForm, type SubmitHandler, FormProvider } from 'react-hook-form';
import { z } from 'zod';

import { Role } from '@prisma/client'; // Assuming Role enum is available
import { Button } from '@workspace/ui/components/button';
import { Calendar } from '@workspace/ui/components/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@workspace/ui/components/dialog';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form';
import { Input } from '@workspace/ui/components/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@workspace/ui/components/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@workspace/ui/components/select';
import { toast } from '@workspace/ui/components/sonner';
import { Textarea } from '@workspace/ui/components/textarea';
import { cn } from '@workspace/ui/lib/utils';
import { format } from 'date-fns';

import { createTask } from '~/actions/tasks'; // Import the server action
import { getAssignableMembers } from '~/actions/members/get-assignable-members'; // Import the new server action

// Define the shape of the member data expected from the action
type AssignableMember = {
  id: string;
  name: string | null;
  email: string | null;
};

// Define the form schema using Zod
const createTaskFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assignedToId: z.string().uuid('Assignee is required'),
  dueDate: z.date().optional()
});

type CreateTaskFormValues = z.infer<typeof createTaskFormSchema>;

export function CreateTaskButton() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [members, setMembers] = React.useState<AssignableMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(true);

  const methods = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      assignedToId: undefined,
      dueDate: undefined
    }
  });

  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting, isDirty, isValid }
  } = methods;

  // Fetch members when the modal is opened
  React.useEffect(() => {
    if (isOpen) {
      setIsLoadingMembers(true);
      getAssignableMembers() // Call the new server action
        .then((result) => {
          if (!result) { // Check if result is defined first
            console.error('Server action failed unexpectedly.');
            toast.error('Failed to load members for assignment.');
            setMembers([]);
          } else if (result.serverError) { // Now safe to check serverError
            console.error('Server action error:', result.serverError);
            toast.error('Failed to load members for assignment.');
            setMembers([]);
          } else {
            setMembers(result.data ?? []); // Set members from action data
          }
        })
        .catch((error) => {
          console.error('Failed to fetch members:', error);
          toast.error('Failed to load members for assignment.');
          setMembers([]); // Ensure members is empty on error
        })
        .finally(() => {
          setIsLoadingMembers(false);
        });
    } else {
      // Reset members when modal closes to avoid stale data
      setMembers([]);
    }
  }, [isOpen]);

  const onSubmit: SubmitHandler<CreateTaskFormValues> = async (values) => {
    const result = await createTask(values); // Pass validated form values

    if (result?.serverError || result?.validationErrors) {
      toast.error(result?.serverError || 'Validation failed. Please check the form.');
    } else {
      toast.success('Task created successfully!');
      setIsOpen(false); // Close modal on success
      reset(); // Reset form fields
    }
  };

  // Handle modal open/close state changes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      reset(); // Reset form when closing modal
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="-ml-1 mr-2 size-4 shrink-0" />
          Create New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new task for your team member.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a brief description of the task"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="assignedToId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To</FormLabel>
                   <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoadingMembers} // Disable while loading
                    >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingMembers ? "Loading members..." : "Select a team member"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members.length > 0 ? (
                        members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name || 'Unnamed User'} ({member.email || 'No Email'})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="-" disabled>
                          {isLoadingMembers ? "Loading..." : "No members found"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-[240px] pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} // Disable past dates
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)} // Use handler to ensure reset
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!isDirty || !isValid || isSubmitting}>
                {isSubmitting ? 'Creating Task...' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
} 