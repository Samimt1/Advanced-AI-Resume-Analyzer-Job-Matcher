
"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit, UploadCloud, FileText, BriefcaseBusiness,
  Sparkles, LoaderCircle, CheckCircle2, AlertTriangle,
  X, ArrowRight, Search, Download, RotateCcw,
  ShieldCheck, Target, Zap
} from "lucide-react";
import { toast, Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

type Result = {
  overall_score: number;
  semantic_score: number;
  required_skill_score: number;
  preferred_skill_score: number;
  matched_required_skills: string[];
  missing_required_skills: string[];
  matched_preferred_skills: string[];
  disclaimer: string;
};

function ScoreRing({ score }: { score: number }) {
  const safeScore = Math.max(0, Math.min(100, score));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative mx-auto h-44 w-44">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={radius} fill="none"
          stroke="#1e293b" strokeWidth="10" />
        <motion.circle
          cx="64" cy="64" r={radius} fill="none"
          stroke={safeScore >= 75 ? "#34d399" : safeScore >= 50 ? "#fbbf24" : "#fb7185"}
          strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - safeScore / 100) }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">{safeScore.toFixed(1)}%</span>
        <span className="text-xs text-slate-400">Overall Match</span>
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const value = Math.max(0, Math.min(100, score));
  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-3 text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold text-white">{value.toFixed(1)}%</span>
      </div>
      <Progress value={value} className="h-2 bg-slate-800" />
    </div>
  );
}

function SkillList({
  skills,
  matched = true,
}: {
  skills: string[];
  matched?: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = skills.filter(s =>
    s.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search skills..."
          className="border-slate-700 bg-slate-950 pl-9 text-white"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {filtered.map(skill => (
          <Badge
            key={skill}
            variant="outline"
            className={matched
              ? "border-emerald-700 bg-emerald-950 px-3 py-1.5 text-emerald-300"
              : "border-amber-700 bg-amber-950 px-3 py-1.5 text-amber-300"}
          >
            {matched
              ? <CheckCircle2 className="mr-1 h-3 w-3" />
              : <AlertTriangle className="mr-1 h-3 w-3" />}
            {skill}
          </Badge>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-500">No skills found.</p>
        )}
      </div>
    </div>
  );
}

async function getResponseData(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    const message = typeof detail === "string"
      ? detail
      : detail ? JSON.stringify(detail) : "Request failed";
    throw new Error(message);
  }
  return data;
}

export default function Home() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [resume, setResume] = useState("");
  const [filename, setFilename] = useState("");
  const [job, setJob] = useState("");
  const [required, setRequired] = useState("Python, React, FastAPI");
  const [preferred, setPreferred] = useState("Docker, AWS");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  async function parseFile(file?: File) {
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx"].includes(extension || "")) {
      toast.error("Only PDF and DOCX files are supported");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File must be smaller than 5 MB");
      return;
    }

    setBusy(true);
    setError("");
    setResult(null);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch(`${API}/resumes/parse`, {
        method: "POST",
        body,
      });
      const data = await getResponseData(response);
      setResume(data.text);
      setFilename(data.filename || file.name);
      toast.success("Resume parsed successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    void parseFile(e.target.files?.[0]);
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (!busy) void parseFile(e.dataTransfer.files[0]);
  }

  async function analyze() {
    if (resume.trim().length < 20 || job.trim().length < 20) {
      toast.error("Provide a resume and job description");
      return;
    }

    setBusy(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API}/matches/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resume,
          job_description: job,
          required_skills: required.split(",").map(s => s.trim()).filter(Boolean),
          preferred_skills: preferred.split(",").map(s => s.trim()).filter(Boolean),
        }),
      });

      const data = await getResponseData(response);
      setResult(data as Result);
      toast.success("Analysis completed");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResume("");
    setFilename("");
    setJob("");
    setRequired("Python, React, FastAPI");
    setPreferred("Docker, AWS");
    setResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function downloadReport() {
    if (!result) return;
    const blob = new Blob(
      [JSON.stringify({
        filename, job_description: job,
        analysis: result,
        generated_at: new Date().toISOString()
      }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "careermatch-report.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#080f1f] text-white">
      <Toaster richColors position="top-right" />

      <header className="border-b border-slate-800 bg-slate-950/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2.5">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                CareerMatch <span className="text-blue-400">AI</span>
              </h1>
              <p className="text-xs text-slate-400">Intelligent Career Insights</p>
            </div>
          </div>
          <Badge className="border border-blue-700 bg-blue-950 text-blue-300">
            <Sparkles className="mr-1 h-3 w-3" /> AI Powered
          </Badge>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <Badge variant="outline" className="border-blue-800 text-blue-300">
            <Zap className="mr-1 h-3 w-3" /> Resume Intelligence
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Unlock your <span className="text-blue-400">career potential.</span>
          </h2>
          <p className="max-w-2xl text-slate-400">
            Upload your resume, compare it with a job description,
            and discover your strengths and missing skills.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-800 bg-slate-900 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="text-blue-400" />
                1. Your Resume
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !busy && fileRef.current?.click()}
                onKeyDown={e => {
                  if ((e.key === "Enter" || e.key === " ") && !busy) {
                    e.preventDefault();
                    fileRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Upload resume"
                className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
                  dragging
                    ? "border-blue-400 bg-blue-950/40"
                    : "border-slate-700 bg-slate-950 hover:border-blue-500"
                }`}
              >
                <UploadCloud className="mx-auto mb-3 h-10 w-10 text-blue-400" />
                <p className="font-medium">
                  {filename || "Drop your resume here"}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  or click to browse · PDF / DOCX · Max 5 MB
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={busy}
                />
              </div>

              {filename && (
                <div className="flex items-center justify-between rounded-lg bg-slate-800 p-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="truncate">{filename}</span>
                  </span>
                  <Button size="icon" variant="ghost" disabled={busy}
                    onClick={() => {
                      setFilename(""); setResume(""); setResult(null);
                    }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Resume content</span>
                <span className="text-xs text-slate-500">{resume.length} characters</span>
              </div>
              <Textarea
                value={resume}
                onChange={e => { setResume(e.target.value); setResult(null); }}
                rows={12}
                placeholder="Upload a resume or paste your resume text here..."
                className="resize-y border-slate-700 bg-slate-950 text-white"
              />
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BriefcaseBusiness className="text-violet-400" />
                2. Target Job
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="job" className="text-sm font-medium">
                  Job Description
                </label>
                <Textarea
                  id="job"
                  value={job}
                  onChange={e => { setJob(e.target.value); setResult(null); }}
                  rows={9}
                  placeholder="Paste the full job description here..."
                  className="border-slate-700 bg-slate-950 text-white"
                />
                <p className="text-right text-xs text-slate-500">
                  {job.length} characters
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="required" className="text-sm font-medium">
                  Required Skills
                </label>
                <Input
                  id="required"
                  value={required}
                  onChange={e => { setRequired(e.target.value); setResult(null); }}
                  placeholder="React, Python, FastAPI"
                  className="border-slate-700 bg-slate-950 text-white"
                />
                <div className="flex flex-wrap gap-1.5">
                  {required.split(",").map(s => s.trim()).filter(Boolean).map((s, i) => (
                    <Badge key={`${s}-${i}`} variant="secondary"
                      className="bg-blue-950 text-blue-300">{s}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="preferred" className="text-sm font-medium">
                  Preferred Skills
                </label>
                <Input
                  id="preferred"
                  value={preferred}
                  onChange={e => { setPreferred(e.target.value); setResult(null); }}
                  placeholder="Docker, AWS"
                  className="border-slate-700 bg-slate-950 text-white"
                />
                <div className="flex flex-wrap gap-1.5">
                  {preferred.split(",").map(s => s.trim()).filter(Boolean).map((s, i) => (
                    <Badge key={`${s}-${i}`} variant="secondary"
                      className="bg-violet-950 text-violet-300">{s}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={analyze}
            disabled={busy || resume.trim().length < 20 || job.trim().length < 20}
            className="h-12 flex-1 bg-blue-600 text-white hover:bg-blue-700"
          >
            {busy ? (
              <><LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
            ) : (
              <><Sparkles className="mr-2 h-5 w-5" /> Analyze Resume Match
                <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
          <Button variant="outline" disabled={busy} onClick={reset}
            className="h-12 border-slate-700 bg-slate-900 text-white hover:bg-slate-800 hover:text-white">
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {result && (
            <motion.section
              key="results"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold">Your Match Analysis</h3>
                  <p className="text-sm text-slate-400">
                    Personalized resume-to-job comparison
                  </p>
                </div>
                <Button variant="outline" onClick={downloadReport}
                  className="border-slate-700 bg-slate-900 text-white hover:bg-slate-800 hover:text-white">
                  <Download className="mr-2 h-4 w-4" /> Export JSON
                </Button>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <Card className="border-slate-800 bg-slate-900 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="h-5 w-5 text-emerald-400" />
                      Overall Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScoreRing score={result.overall_score} />
                    <p className="mt-3 text-center text-sm text-slate-400">
                      {result.overall_score >= 75 ? "Strong Match" :
                       result.overall_score >= 50 ? "Moderate Match" : "Needs Improvement"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900 text-white md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Match Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-7 py-3">
                    <ScoreBar label="Semantic Similarity" score={result.semantic_score} />
                    <ScoreBar label="Required Skills" score={result.required_skill_score} />
                    <ScoreBar label="Preferred Skills" score={result.preferred_skill_score} />
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-800 bg-slate-900 text-white">
                <CardHeader>
                  <CardTitle className="text-lg">Skills Intelligence</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="matched">
                    <TabsList className="mb-5 h-auto flex-wrap bg-slate-950">
                      <TabsTrigger value="matched">
                        Matched ({result.matched_required_skills.length})
                      </TabsTrigger>
                      <TabsTrigger value="missing">
                        Missing ({result.missing_required_skills.length})
                      </TabsTrigger>
                      <TabsTrigger value="preferred">
                        Preferred ({result.matched_preferred_skills.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="matched">
                      <SkillList skills={result.matched_required_skills} />
                    </TabsContent>
                    <TabsContent value="missing">
                      <SkillList skills={result.missing_required_skills} matched={false} />
                    </TabsContent>
                    <TabsContent value="preferred">
                      <SkillList skills={result.matched_preferred_skills} />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <div className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5">
                <ShieldCheck className="h-5 w-5 shrink-0 text-blue-400" />
                <p className="text-sm text-slate-400">{result.disclaimer}</p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <footer className="border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          CareerMatch AI · Development prototype. Avoid uploading sensitive personal
          information until authentication and privacy protections are implemented.
        </footer>
      </div>
    </main>
  );
}
