import type { ComponentPropsWithoutRef, ReactNode } from 'react';

function classes(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ');
}

type AdminTableContainerProps = ComponentPropsWithoutRef<'div'>;

export function AdminTableContainer({ className, ...props }: AdminTableContainerProps) {
  return (
    <div
      className={classes(
        'relative overflow-x-auto border border-default bg-neutral-primary-soft',
        className,
      )}
      {...props}
    />
  );
}

type AdminTableProps = ComponentPropsWithoutRef<'table'>;

export function AdminTable({ className, ...props }: AdminTableProps) {
  return (
    <table
      className={classes('w-full min-w-max text-left text-sm text-body rtl:text-right', className)}
      {...props}
    />
  );
}

type AdminTableHeaderProps = ComponentPropsWithoutRef<'thead'>;

export function AdminTableHeader({ className, ...props }: AdminTableHeaderProps) {
  return (
    <thead className={classes('border-b border-default bg-faint-purple', className)} {...props} />
  );
}

type AdminTableHeaderCellProps = ComponentPropsWithoutRef<'th'>;

export function AdminTableHeaderCell({
  className,
  scope = 'col',
  ...props
}: AdminTableHeaderCellProps) {
  return (
    <th
      scope={scope}
      className={classes(
        'px-6 py-3 text-[1rem] font-medium tracking-wider text-dark-pink',
        className,
      )}
      {...props}
    />
  );
}

type AdminTableCellProps = ComponentPropsWithoutRef<'td'>;

export function AdminTableCell({ className, ...props }: AdminTableCellProps) {
  return <td className={classes('px-6 py-4 align-middle', className)} {...props} />;
}

type AdminTableStateRowProps = Readonly<{
  colSpan: number;
  children: ReactNode;
}>;

function AdminTableStateRow({ colSpan, children }: AdminTableStateRowProps) {
  return (
    <tr className="border-b border-default bg-neutral-primary">
      <AdminTableCell colSpan={colSpan} className="text-center text-gray-500">
        {children}
      </AdminTableCell>
    </tr>
  );
}

export function AdminTableLoadingRow({ colSpan, children }: AdminTableStateRowProps) {
  return <AdminTableStateRow colSpan={colSpan}>{children}</AdminTableStateRow>;
}

export function AdminTableEmptyRow({ colSpan, children }: AdminTableStateRowProps) {
  return <AdminTableStateRow colSpan={colSpan}>{children}</AdminTableStateRow>;
}

type AdminTableActionsProps = ComponentPropsWithoutRef<'div'>;

export function AdminTableActions({ className, ...props }: AdminTableActionsProps) {
  return (
    <div className={classes('flex items-center gap-3 whitespace-nowrap', className)} {...props} />
  );
}

type AdminTablePaginationProps = ComponentPropsWithoutRef<'nav'>;

export function AdminTablePagination({ className, ...props }: AdminTablePaginationProps) {
  return (
    <nav
      aria-label="Table pagination"
      className={classes('mt-4 flex items-center justify-end gap-3', className)}
      {...props}
    />
  );
}

type TruncatedValueProps = Readonly<{
  value: string;
  className?: string;
  children?: ReactNode;
  focusable?: boolean;
}>;

export function TruncatedValue({
  value,
  className,
  children,
  focusable = true,
}: TruncatedValueProps) {
  return (
    <span
      className={classes(
        'block max-w-56 truncate select-text focus:outline-none focus:ring-2 focus:ring-brand-medium',
        className,
      )}
      title={value}
      aria-label={value}
      tabIndex={focusable ? 0 : undefined}
    >
      {children ?? value}
    </span>
  );
}
