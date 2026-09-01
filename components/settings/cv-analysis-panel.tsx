"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMatchScoreColor } from "@/lib/jobs/utils";
import type { CvAnalysisResponse, CvAnalysisSeverity } from "@/types";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";

interface CvAnalysisPanelProps {
  analysis: CvAnalysisResponse | null;
  analyzing: boolean;
  loading: boolean;
  hasUnsavedCv: boolean;
  hasSavedCv: boolean;
  onAnalyze: () => void;
}

const SEVERITY_ORDER: Record<CvAnalysisSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function severityBadgeClass(severity: CvAnalysisSeverity): string {
  if (severity === "high") return "bg-destructive/10 text-destructive border-destructive/20";
  if (severity === "medium") return "bg-amber-500/10 text-amber-700 border-amber-500/20";
  return "bg-muted text-muted-foreground";
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold ${getMatchScoreColor(score)}`}>{score}</p>
    </div>
  );
}

function BulletList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-1 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>• {item}</li>
      ))}
    </ul>
  );
}

export function CvAnalysisPanel({
  analysis,
  analyzing,
  loading,
  hasUnsavedCv,
  hasSavedCv,
  onAnalyze,
}: CvAnalysisPanelProps) {
  const sortedRecommendations = analysis
    ? [...analysis.analysis.recommendations].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      )
    : [];

  const analyzeDisabled = analyzing || hasUnsavedCv || !hasSavedCv;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              CV analysis
            </CardTitle>
            <CardDescription>
              Internal heuristic review for ATS readability and product-role fit. Not a guarantee
              for any specific ATS.
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={onAnalyze}
            disabled={analyzeDisabled}
            variant={analysis?.is_stale ? "default" : "outline"}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />
            {analyzing ? "Analyzing..." : analysis ? "Re-analyze CV" : "Analyze CV"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasUnsavedCv && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
            Save your CV context before running analysis.
          </p>
        )}

        {!hasSavedCv && !hasUnsavedCv && (
          <p className="text-sm text-muted-foreground">
            Add and save your CV text to enable analysis.
          </p>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading previous analysis...</p>
        ) : null}

        {analysis ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Last analysis: {new Date(analysis.analyzed_at).toLocaleString()}</span>
              {analysis.is_stale && (
                <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  Stale — CV changed since last analysis
                </Badge>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <ScoreCard label="Overall" score={analysis.analysis.overall_score} />
              <ScoreCard label="Parsing" score={analysis.analysis.parsing_score} />
              <ScoreCard label="Structure" score={analysis.analysis.structure_score} />
              <ScoreCard label="Impact" score={analysis.analysis.impact_score} />
              <ScoreCard label="Keywords" score={analysis.analysis.keyword_score} />
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium">Recruiter summary</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {analysis.analysis.recruiter_summary}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Detected roles</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.analysis.detected_roles.length > 0 ? (
                    analysis.analysis.detected_roles.map((role) => (
                      <Badge key={role} variant="outline">
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">None detected</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Experience</p>
                <p className="text-sm text-muted-foreground">
                  {analysis.analysis.estimated_experience_years !== null
                    ? `${analysis.analysis.estimated_experience_years} years (estimated from CV)`
                    : "Not estimated from CV"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.analysis.detected_skills.slice(0, 12).map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Tools</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.analysis.detected_tools.slice(0, 12).map((tool) => (
                    <Badge key={tool} variant="secondary">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Languages</p>
                {analysis.analysis.detected_languages.length > 0 ? (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {analysis.analysis.detected_languages.map((lang) => (
                      <li key={`${lang.language}-${lang.level ?? ""}`}>
                        • {lang.language}
                        {lang.level ? ` (${lang.level})` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">None detected</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Industries</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.analysis.detected_industries.length > 0 ? (
                    analysis.analysis.detected_industries.map((industry) => (
                      <Badge key={industry} variant="outline">
                        {industry}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">None detected</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Strengths</p>
                <BulletList items={analysis.analysis.strengths} emptyLabel="None listed" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Weaknesses</p>
                <BulletList items={analysis.analysis.weaknesses} emptyLabel="None listed" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Missing product keywords</p>
              <div className="flex flex-wrap gap-1">
                {analysis.analysis.missing_product_keywords.length > 0 ? (
                  analysis.analysis.missing_product_keywords.map((keyword) => (
                    <Badge key={keyword} variant="outline">
                      {keyword}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None flagged</span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Recommendations</p>
              {sortedRecommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recommendations returned.</p>
              ) : (
                <div className="space-y-3">
                  {sortedRecommendations.map((rec) => (
                    <div key={rec.id} className="rounded-lg border p-4 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{rec.title}</p>
                        <Badge variant="outline" className={severityBadgeClass(rec.severity)}>
                          {rec.severity}
                        </Badge>
                        <Badge variant="secondary">{rec.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.explanation}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Evidence: </span>
                        {rec.evidence_from_cv}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Suggestion: </span>
                        {rec.suggested_improvement}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          !loading &&
          hasSavedCv &&
          !hasUnsavedCv && (
            <p className="text-sm text-muted-foreground">
              Click Analyze CV to get scores and recommendations based on your saved CV.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
