"use client";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSourceLabel } from "@/lib/jobs/normalize";
import type { ParsedImportRow } from "@/lib/imports/jobs-file";
import { ExternalLink } from "lucide-react";

interface ImportJobsTableProps {
  rows: ParsedImportRow[];
}

function formatSalary(row: ParsedImportRow): string {
  if (row.salary) return row.salary;
  if (row.salary_min && row.salary_max) {
    return `${Math.round(row.salary_min / 1000)}k–${Math.round(row.salary_max / 1000)}k ${row.salary_currency ?? "EUR"}`;
  }
  return "—";
}

export function ImportJobsTable({ rows }: ImportJobsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No valid jobs to preview.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Contract</TableHead>
            <TableHead>Remote</TableHead>
            <TableHead>Salary</TableHead>
            <TableHead>Published</TableHead>
            <TableHead className="text-right">Link</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.url}-${row.rowNumber}`}>
              <TableCell className="max-w-[220px] font-medium">
                <span className="line-clamp-2">{row.title}</span>
              </TableCell>
              <TableCell>{row.company}</TableCell>
              <TableCell>
                <Badge variant="outline">{formatSourceLabel(row.source)}</Badge>
              </TableCell>
              <TableCell>{row.location ?? "—"}</TableCell>
              <TableCell>{row.contract_type ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary">{row.remote_mode ?? (row.remote ? "remote" : "onsite")}</Badge>
              </TableCell>
              <TableCell>{formatSalary(row)}</TableCell>
              <TableCell>
                {row.posted_at
                  ? new Date(row.posted_at).toLocaleDateString("fr-FR")
                  : "—"}
              </TableCell>
              <TableCell className="text-right">
                <a
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
