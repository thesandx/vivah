import Link from 'next/link';

import { buttonStyles } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

/**
 * The search, filter and sort bar of an admin list. A plain GET form, so the
 * filters live in the URL and need no JavaScript. A Server Component.
 */

export interface FilterMenu {
  name: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
}

export interface AdminFiltersProps {
  /** The tab the form belongs to; sent back as `view`. */
  view: string;
  query: string;
  menus: readonly FilterMenu[];
  /** Where "Clear" goes: the tab with no filters. */
  clearHref: string;
}

export function AdminFilters({ view, query, menus, clearHref }: AdminFiltersProps) {
  return (
    <form
      method="get"
      action="/admin"
      role="search"
      className="border-line rounded-card bg-surface grid gap-4 border-2 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4"
    >
      <input type="hidden" name="view" value={view} />
      <Input
        label="Search"
        name="q"
        type="search"
        defaultValue={query}
        hint="Names, address or phone"
        className="sm:col-span-2 lg:col-span-1"
      />
      {menus.map((menu) => (
        <Select
          key={menu.name}
          label={menu.label}
          name={menu.name}
          defaultValue={menu.value}
          options={menu.options}
        />
      ))}
      <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-4">
        <button type="submit" className={buttonStyles({ variant: 'primary' })}>
          Apply
        </button>
        <Link href={clearHref} className={buttonStyles({ variant: 'quiet' })}>
          Clear
        </Link>
      </div>
    </form>
  );
}
