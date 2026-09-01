"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { JOB_STATUSES, type JobFilters } from "@/types";

interface JobFiltersBarProps {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
  sources: string[];
}

export function JobFiltersBar({ filters, onChange, sources }: JobFiltersBarProps) {
  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <div className="space-y-2 xl:col-span-2">
        <Label htmlFor="search">Search</Label>
        <Input
          id="search"
          placeholder="Title, company..."
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-2">
        <Label>Source</Label>
        <Select
          value={filters.source ?? "all"}
          onValueChange={(v) =>
            onChange({ ...filters, source: !v || v === "all" ? undefined : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Location</Label>
        <Input
          placeholder="Paris..."
          value={filters.location ?? ""}
          onChange={(e) =>
            onChange({ ...filters, location: e.target.value || undefined })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) =>
            onChange({
              ...filters,
              status: !v || v === "all" ? undefined : (v as JobFilters["status"]),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {JOB_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Contract</Label>
        <Input
          placeholder="CDI, CDD..."
          value={filters.contractType ?? ""}
          onChange={(e) => onChange({ ...filters, contractType: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-2">
        <Label>Min salary</Label>
        <Input
          type="number"
          placeholder="55000"
          value={filters.minSalary ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              minSalary: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Min. match score</Label>
        <Select
          value={filters.minMatchScore?.toString() ?? "0"}
          onValueChange={(v) =>
            onChange({
              ...filters,
              minMatchScore: !v || v === "0" ? undefined : Number(v),
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any</SelectItem>
            <SelectItem value="50">50%+</SelectItem>
            <SelectItem value="70">70%+</SelectItem>
            <SelectItem value="80">80%+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Date</Label>
        <Select
          value={filters.postedWithinDays?.toString() ?? "0"}
          onValueChange={(v) =>
            onChange({
              ...filters,
              postedWithinDays: !v || v === "0" ? undefined : Number(v),
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any date</SelectItem>
            <SelectItem value="1">Last 24h</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col justify-end gap-3">
        <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
          <Label htmlFor="remote-only" className="text-sm">
            Remote only
          </Label>
          <Switch
            id="remote-only"
            checked={filters.remote === true}
            onCheckedChange={(checked) =>
              onChange({ ...filters, remote: checked ? true : undefined })
            }
          />
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
          <Label htmlFor="hybrid-only" className="text-sm">
            Hybrid
          </Label>
          <Switch
            id="hybrid-only"
            checked={filters.hybrid === true}
            onCheckedChange={(checked) =>
              onChange({ ...filters, hybrid: checked ? true : undefined })
            }
          />
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
          <Label htmlFor="last-24h" className="text-sm">
            Last 24h only
          </Label>
          <Switch
            id="last-24h"
            checked={filters.postedWithinHours === 24}
            onCheckedChange={(checked) =>
              onChange({
                ...filters,
                postedWithinHours: checked ? 24 : undefined,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
