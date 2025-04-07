'use client';

import * as React from 'react';
import { Task, TaskStatus, User } from '@prisma/client'; // Import necessary types
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  // Sorting functions (optional for header clicks)
  getSortedRowModel as getSortedRowModelFn, // renamed to avoid conflict if used
  Row, // Import Row type
} from '@tanstack/react-table';
import { format, formatDistanceToNow } from 'date-fns';
import { ArrowUpDown, MoreHorizontal, XIcon } from 'lucide-react'; // Added ArrowUpDown for sorting indication

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import { Badge } from '@workspace/ui/components/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from '@workspace/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from '@workspace/ui/lib/utils'; // Import cn for conditional classes
import { useMediaQuery } from '@workspace/ui/hooks/use-media-query'; // Assuming hook exists
import { MediaQueries } from '@workspace/ui/lib/media-queries'; // Assuming queries exist
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card"; // Import Card components

// Define the shape of the task data expected by the table
// This includes the nested 'assignedTo' user information
export type AdminTaskDto = Task & {
  assignedTo: Pick<User, 'id' | 'name' | 'image' | 'email'>;
};

// Helper function to get initials for Avatar fallback
const getInitials = (name?: string | null) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

// Helper function to format status enum
const formatStatus = (status: TaskStatus) => {
   return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// ----- Reusable Task Actions Dropdown -----
function TaskActions({ task }: { task: AdminTaskDto }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => alert(`View details: ${task.title}`)}>
          View Details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => alert(`Edit task: ${task.title}`)}>
            Edit Task
        </DropdownMenuItem>
        <DropdownMenuItem
         className="text-destructive focus:text-destructive focus:bg-destructive/10"
         onClick={() => alert(`Delete task: ${task.title}`)}
        >
            Delete Task
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ----- Stacked Rectangular Mobile Task Entry -----
function TaskEntry({ task }: { task: AdminTaskDto }) {
   const status = task.status;
   let statusVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
    switch (status) {
      case TaskStatus.PENDING: statusVariant = 'secondary'; break;
      case TaskStatus.IN_PROGRESS: statusVariant = 'default'; break;
      case TaskStatus.REVIEW: statusVariant = 'outline'; break;
      case TaskStatus.COMPLETED: case TaskStatus.APPROVED: statusVariant = 'secondary'; break;
    }

  return (
    <div className="w-full border-b p-4 last:border-b-0">
       <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b">
         <div className="flex items-center space-x-3">
            <Avatar className="size-8 flex-shrink-0">
              <AvatarImage src={task.assignedTo.image ?? undefined} alt={task.assignedTo.name ?? 'User'} />
              <AvatarFallback className="text-xs">{getInitials(task.assignedTo.name)}</AvatarFallback>
            </Avatar>
             <div className="overflow-hidden">
                 <p className="text-sm font-medium leading-none truncate">{task.assignedTo.name || 'Unnamed User'}</p>
             </div>
          </div>
          <div className="flex-shrink-0 pl-2">
             <TaskActions task={task} />
          </div>
      </CardHeader>
       <CardContent className="p-4 space-y-3">
         <p className="text-sm font-semibold leading-snug">{task.title}</p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge variant={statusVariant} className="text-xs whitespace-nowrap px-2 py-0.5 h-[18px]">
                {formatStatus(status)}
            </Badge>
             <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                <span>Created: {format(task.createdAt, 'PP')}</span>
                {task.dueDate && <span>Due: {format(task.dueDate, 'PP')}</span>}
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 pt-1">
              {task.description}
            </p>
          )}
      </CardContent>
    </div>
  );
}

// ----- Desktop Table Column Definitions -----
const getColumns = (): ColumnDef<AdminTaskDto>[] => [
  {
    accessorKey: 'title',
    header: ({ column }) => (
       <Button
         variant="ghost"
         onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
         className="px-2 py-1 h-auto -ml-2 text-xs sm:text-sm"
       >
         Task Title
         <ArrowUpDown className="ml-1.5 h-3 w-3" />
       </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium text-sm">{row.getValue('title')}</div>
    ),
    size: 250,
  },
  {
    accessorKey: 'assignedTo',
    header: ({ column }) => (
       <Button
         variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
         className="px-2 py-1 h-auto -ml-2 text-xs sm:text-sm"
       >
         Assigned VA
         <ArrowUpDown className="ml-1.5 h-3 w-3" />
       </Button>
    ),
    cell: ({ row }) => {
      const user = row.getValue('assignedTo') as AdminTaskDto['assignedTo'];
      return (
        <div className="flex items-center space-x-3">
           <Avatar className="size-8">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? 'User'} />
            <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium">{user.name || 'Unnamed User'}</span>
        </div>
      );
    },
    enableColumnFilter: false,
    sortingFn: (rowA, rowB) => (rowA.original.assignedTo.name ?? '').localeCompare(rowB.original.assignedTo.name ?? ''),
    size: 200,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
       <Button
         variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
         className="px-2 py-1 h-auto -ml-2 text-xs sm:text-sm"
       >
         Status
         <ArrowUpDown className="ml-1.5 h-3 w-3" />
       </Button>
     ),
    cell: ({ row }) => {
      const status = row.getValue('status') as TaskStatus;
      let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
      switch (status) {
        case TaskStatus.PENDING:
          variant = 'secondary'; break;
        case TaskStatus.IN_PROGRESS:
          variant = 'default'; break;
        case TaskStatus.REVIEW:
          variant = 'outline'; break;
        case TaskStatus.COMPLETED:
        case TaskStatus.APPROVED:
          variant = 'secondary'; break;
      }
      return <Badge variant={variant} className="text-xs whitespace-nowrap px-2 py-0.5 h-[18px]">{formatStatus(status)}</Badge>;
    },
    filterFn: 'equals',
    size: 130,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
       <Button
         variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
         className="px-2 py-1 h-auto -ml-2 text-xs sm:text-sm"
       >
         Created
         <ArrowUpDown className="ml-1.5 h-3 w-3" />
       </Button>
     ),
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground whitespace-nowrap">{format(new Date(row.getValue('createdAt')), 'PP')}</div>
    ),
    enableColumnFilter: false,
    size: 120,
  },
  {
    accessorKey: 'dueDate',
    header: ({ column }) => (
       <Button
         variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
         className="px-2 py-1 h-auto -ml-2 text-xs sm:text-sm"
       >
         Due Date
         <ArrowUpDown className="ml-1.5 h-3 w-3" />
       </Button>
     ),
    cell: ({ row }) => {
      const dueDate = row.getValue('dueDate');
      return <div className="text-sm text-muted-foreground whitespace-nowrap">{dueDate ? format(new Date(dueDate as string), 'PP') : '-'}</div>;
    },
    enableColumnFilter: false,
    size: 120,
  },
  {
    id: 'actions',
    header: () => <div className="text-right pr-2 text-xs sm:text-sm">Actions</div>,
    cell: ({ row }) => {
      const task = row.original;
      return (
        <div className="text-right">
          <TaskActions task={task} />
        </div>
      );
    },
     enableColumnFilter: false,
     enableSorting: false,
     size: 80,
  },
];

// ----- Main TaskTable Component -----
interface TaskTableProps {
  tasks: AdminTaskDto[];
}

export function TaskTable({ tasks }: TaskTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  // Media Query Hook
  const isDesktop = useMediaQuery(MediaQueries.MdUp, { ssr: false }); // Use 'md' breakpoint (768px)

  // Memoize columns
  const columns = React.useMemo(() => getColumns(), []);
  // Get unique statuses for the filter dropdown
  const uniqueStatuses = React.useMemo(() => {
     const statuses = new Set(tasks.map(task => task.status));
     return Array.from(statuses).sort(); // Sort alphabetically
   }, [tasks]);


  const table = useReactTable({
    data: tasks,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModelFn(), // Use the renamed import
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // Get column filter values safely
  const titleFilter = table.getColumn('title')?.getFilterValue() as string ?? '';
  const statusFilter = table.getColumn('status')?.getFilterValue() as string ?? '';

  const isFiltered = table.getState().columnFilters.length > 0 || table.getState().globalFilter !== '';

  // Get the current rows after filtering/sorting
  const currentRows = table.getRowModel().rows;

  return (
    <div>
        {/* Filter Toolbar: Remove bottom margin, keep border/rounding */}
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3 bg-card px-4 pt-4 pb-3 rounded-lg border"> {/* Keep border/rounding here */}

            {/* Global Search Group */}
            <div className="flex flex-col space-y-1.5">
              <label htmlFor="global-filter" className="text-xs font-medium text-muted-foreground">Search All</label>
              <Input
                id="global-filter"
                placeholder="Search..."
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="h-9 w-full sm:w-[180px] lg:w-[240px]"
              />
            </div>

             {/* Title Filter Group */}
             <div className="flex flex-col space-y-1.5">
                <label htmlFor="title-filter" className="text-xs font-medium text-muted-foreground">Task Title</label>
                <Input
                    id="title-filter"
                    placeholder="Filter..."
                    value={titleFilter}
                    onChange={(event) =>
                        table.getColumn('title')?.setFilterValue(event.target.value)
                    }
                    className="h-9 w-full sm:w-[180px] lg:w-[240px]"
                />
             </div>

             {/* Status Filter Group */}
             <div className="flex flex-col space-y-1.5">
               <label htmlFor="status-filter" className="text-xs font-medium text-muted-foreground">Status</label>
                <Select
                    value={statusFilter}
                    onValueChange={(value) =>
                        table.getColumn('status')?.setFilterValue(value === 'all' ? '' : value)
                    }
                >
                    <SelectTrigger className="h-9 w-full sm:w-[160px]" id="status-filter">
                    <SelectValue placeholder="Filter..." />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {uniqueStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                        {formatStatus(status)}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
             </div>

           {/* Reset Button */}
           <div className="ml-auto self-end pb-0.5">
             {isFiltered && (
                 <Button
                    variant="ghost"
                    onClick={() => {
                        table.resetColumnFilters();
                        setGlobalFilter('');
                    }}
                    className="h-9 px-3 text-xs sm:text-sm"
                 >
                    Reset
                    <XIcon className="ml-1.5 h-3 w-3" />
                 </Button>
             )}
           </div>
        </div>

        {/* Conditional Rendering: Table (Desktop) or Stacked Entries (Mobile) */}
        {isDesktop ? (
            // --- Desktop Table View ---
            <div className="mt-4 overflow-x-auto rounded-lg border shadow-sm bg-card">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="border-b hover:bg-transparent">
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          style={{ width: header.getSize() !== 150 ? `${header.getSize()}px` : undefined }}
                          className={cn(
                              "h-12 px-4 align-middle text-xs font-medium text-muted-foreground whitespace-nowrap",
                              header.column.getCanSort() && "cursor-pointer select-none"
                          )}
                        >
                           {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {currentRows?.length ? (
                    currentRows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="px-4 py-3 align-middle text-sm">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                        {isFiltered ? "No tasks match your filters." : "No tasks found."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
        ) : (
          // --- Mobile Stacked View ---
           <div className="border-x border-b rounded-b-lg bg-card overflow-hidden">
            {currentRows?.length ? (
                currentRows.map((row) => (
                  <TaskEntry key={row.id} task={row.original} />
                ))
              ) : (
                <div className="text-center text-muted-foreground py-10 px-4 h-32 flex items-center justify-center">
                  {isFiltered ? "No tasks match your filters." : "No tasks found."}
                </div>
              )
            }
           </div>
        )}
      </div>
  );
} 