"use client";
import { ChangeEvent, useState } from "react";
import { BrainCircuit, Upload, LoaderCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
type Result = {
  overall_score: number; semantic_score: number;
  required_skill_score: number; preferred_skill_score: number;
  matched_required_skills: string[]; missing_required_skills: string[];
  matched_preferred_skills: string[]; disclaimer: string;
};
export default function Home() {
  const [resume, setResume] = useState("");
  const [filename, setFilename] = useState("");
  const [job, setJob] = useState("");
  const [required, setRequired] = useState("Python, React, FastAPI");
  const [preferred, setPreferred] = useState("Docker, AWS");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch(`${API}/resumes/parse`, {method:"POST",body});
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Upload failed");
      setResume(data.text); setFilename(data.filename);
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setBusy(false); }
  }
  async function analyze() {
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch(`${API}/matches/analyze`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          resume_text:resume, job_description:job,
          required_skills:required.split(",").map(x=>x.trim()).filter(Boolean),
          preferred_skills:preferred.split(",").map(x=>x.trim()).filter(Boolean)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Analysis failed");
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Analysis failed"); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen p-6 md:p-12">
    <div className="mx-auto max-w-6xl">
      <header className="mb-10 flex items-center gap-3">
        <BrainCircuit className="text-blue-400" size={36}/>
        <div><h1 className="text-3xl font-bold">CareerMatch <span className="text-blue-400">AI</span></h1>
        <p className="text-sm text-slate-400">Advanced Resume Analyzer & Job Matcher · MVP</p></div>
      </header>
      <h2 className="mb-2 text-2xl font-semibold">Discover how your resume matches a job</h2>
      <p className="mb-6 text-slate-400">Upload a PDF or DOCX or paste text, then enter a job description.</p>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <h3 className="mb-3 text-lg font-semibold">1. Resume</h3>
          <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-blue-500 p-4">
            <Upload size={20}/>{filename || "Choose PDF or DOCX (max 5 MB)"}
            <input className="hidden" type="file" accept=".pdf,.docx" onChange={upload}/>
          </label>
          <textarea aria-label="Resume text" rows={12} value={resume} onChange={e=>setResume(e.target.value)}
            placeholder="Extracted resume text appears here..." className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3"/>
        </section>
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <h3 className="mb-3 text-lg font-semibold">2. Job Description</h3>
          <textarea aria-label="Job description" rows={7} value={job} onChange={e=>setJob(e.target.value)}
            placeholder="Paste the job description..." className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"/>
          <label className="block text-sm text-slate-400">Required skills (comma separated)</label>
          <input className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" value={required} onChange={e=>setRequired(e.target.value)}/>
          <label className="block text-sm text-slate-400">Preferred skills</label>
          <input className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3" value={preferred} onChange={e=>setPreferred(e.target.value)}/>
        </section>
      </div>
      <button disabled={busy || resume.length < 20 || job.length < 20} onClick={analyze}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 font-semibold disabled:opacity-40">
        {busy ? <><LoaderCircle className="animate-spin" size={20}/> Processing...</> : "Analyze Resume Match"}
      </button>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-900/40 p-4 text-red-200">{error}</p>}
      {result && <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <div className="flex items-center justify-between"><h3 className="text-xl font-semibold">AI Match Result</h3>
          <p className="text-3xl font-bold text-emerald-400">{result.overall_score.toFixed(1)} / 100</p></div>
        <div className="my-5 grid gap-3 sm:grid-cols-3">
          {([["Semantic",result.semantic_score],["Required skills",result.required_skill_score],["Preferred skills",result.preferred_skill_score]] as const).map(([label,value])=>
            <div key={label} className="rounded-xl bg-slate-950 p-4"><p className="text-sm text-slate-400">{label}</p><p className="text-2xl font-bold">{value.toFixed(1)}%</p></div>)}
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div><h4 className="mb-2 font-semibold text-emerald-400">Matched required skills</h4>
            <div className="flex flex-wrap gap-2">{result.matched_required_skills.map(s=><span key={s} className="rounded-full bg-emerald-900/50 px-3 py-1">{s}</span>)}</div></div>
          <div><h4 className="mb-2 font-semibold text-amber-400">Missing required skills</h4>
            <div className="flex flex-wrap gap-2">{result.missing_required_skills.map(s=><span key={s} className="rounded-full bg-amber-900/50 px-3 py-1">{s}</span>)}</div></div>
        </div>
        <p className="mt-6 text-sm text-slate-400">{result.disclaimer}</p>
      </section>}
      <p className="mt-8 text-xs text-slate-500">Development prototype. Do not upload sensitive personal resumes until authentication and privacy protections are implemented.</p>
    </div>
  </main>;
}
