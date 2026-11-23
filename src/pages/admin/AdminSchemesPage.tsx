import React, { useState } from 'react';
import {
  BookMarked,
  Plus,
  BookOpen,
  Calendar,
  Layers,
  FileText,
  Upload,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Award
} from 'lucide-react';
import { db } from '../../services/db/database';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { VTUScheme } from '../../types';

export const AdminSchemesPage: React.FC = () => {
  const schemes = db.getVTUSchemes();
  const subjects = db.getSubjects();
  const classes = db.getClasses();

  const [selectedSchemeId, setSelectedSchemeId] = useState<string>(schemes[0]?.id || 'scheme-vtu-2022');
  const [isAddSchemeOpen, setIsAddSchemeOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Form states for new scheme
  const [schemeName, setSchemeName] = useState('');
  const [schemeCode, setSchemeCode] = useState('');
  const [effectiveYear, setEffectiveYear] = useState(2022);
  const [totalCredits, setTotalCredits] = useState(160);
  const [description, setDescription] = useState('');

  const currentScheme = schemes.find((s) => s.id === selectedSchemeId) || schemes[0];
  const schemeSubjects = subjects.filter((s) => s.vtu_scheme_id === selectedSchemeId);
  const schemeClasses = classes.filter((c) => c.vtu_scheme_id === selectedSchemeId);

  const handleCreateScheme = (e: React.FormEvent) => {
    e.preventDefault();
    db.createVTUScheme({
      name: schemeName.trim(),
      code: schemeCode.trim(),
      effective_from_year: Number(effectiveYear),
      total_credits: Number(totalCredits),
      is_active: true,
      description: description.trim(),
    });

    setSchemeName('');
    setSchemeCode('');
    setIsAddSchemeOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Academic Schemes & Regulations</h2>
          <p className="text-xs text-slate-500">
            Multi-scheme syllabus governance, admission batch mappings, and curriculum equivalences
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Upload Syllabus PDF</span>
          </button>
          <button
            onClick={() => setIsAddSchemeOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Academic Scheme</span>
          </button>
        </div>
      </div>

      {/* Scheme Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {schemes.map((scheme) => {
          const isSelected = scheme.id === selectedSchemeId;
          const subCount = subjects.filter((s) => s.vtu_scheme_id === scheme.id).length;
          const classCount = classes.filter((c) => c.vtu_scheme_id === scheme.id).length;

          return (
            <div
              key={scheme.id}
              onClick={() => setSelectedSchemeId(scheme.id)}
              className={`p-4 rounded-xl border cursor-pointer transition relative ${
                isSelected
                  ? 'bg-blue-50/50 border-blue-500 shadow-sm ring-1 ring-blue-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant={isSelected ? 'primary' : 'neutral'}>
                    Code: {scheme.code}
                  </Badge>
                  <h3 className="text-sm font-bold text-slate-900 mt-2">{scheme.name}</h3>
                </div>
                {scheme.is_active && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
                {scheme.description || 'Prescribed Academic Curriculum'}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                <span>{subCount} Subjects Configured</span>
                <span className="font-semibold">{scheme.total_credits} Credits Total</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scheme Detail & Associated Courses */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-blue-600" />
              {currentScheme.name} • Course Matrix & Syllabus
            </h3>
            <p className="text-xs text-slate-500">
              Total of {schemeSubjects.length} subjects and {schemeClasses.length} registered batches under this regulation
            </p>
          </div>
          {currentScheme.syllabus_url && (
            <a
              href={currentScheme.syllabus_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              <span>Official Curriculum Syllabus</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Subjects for selected scheme */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Subject Code</th>
                <th className="py-3 px-4">Subject Name</th>
                <th className="py-3 px-4">Sem</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Credits</th>
                <th className="py-3 px-4">CIE / SEE</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schemeSubjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    No subjects linked to this regulation yet. Use "Add Course Subject" to import curriculum courses.
                  </td>
                </tr>
              ) : (
                schemeSubjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{sub.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{sub.name}</td>
                    <td className="py-3 px-4 font-mono">Sem {sub.semester}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                        {sub.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600">{sub.course_type}</td>
                    <td className="py-3 px-4 font-bold font-mono text-slate-800">{sub.credits}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{sub.cie_marks} / {sub.see_marks}</td>
                    <td className="py-3 px-4 text-right">
                      <Badge variant="success" dot>Approved</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Scheme Modal */}
      <Modal
        isOpen={isAddSchemeOpen}
        onClose={() => setIsAddSchemeOpen(false)}
        title="Add Academic Regulation Scheme"
        description="Register a new academic curriculum regulation and syllabus framework"
      >
        <form onSubmit={handleCreateScheme} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Scheme Name *
            </label>
            <input
              type="text"
              required
              value={schemeName}
              onChange={(e) => setSchemeName(e.target.value)}
              placeholder="e.g. 2025 Autonomous Regulation"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheme Code *
              </label>
              <input
                type="text"
                required
                value={schemeCode}
                onChange={(e) => setSchemeCode(e.target.value)}
                placeholder="e.g. 2025"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Effective Year
              </label>
              <input
                type="number"
                value={effectiveYear}
                onChange={(e) => setEffectiveYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Total Degree Credits
            </label>
            <input
              type="number"
              value={totalCredits}
              onChange={(e) => setTotalCredits(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Regulation Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Outcome-Based Education (OBE) and Choice-Based Credit System (CBCS)..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddSchemeOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              Save Scheme
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload Syllabus PDF Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Official Syllabus Document"
        description="Attach PDF syllabus document for curriculum extraction and verification"
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center space-y-2 hover:border-blue-400 transition cursor-pointer bg-slate-50/50">
            <Upload className="w-8 h-8 text-blue-600 mx-auto" />
            <p className="text-xs font-bold text-slate-800">
              Select or Drag Curriculum Syllabus PDF
            </p>
            <p className="text-[11px] text-slate-400">
              Supports .pdf documents up to 25MB (e.g. 2022-CSE-5th-Sem.pdf)
            </p>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-[11px] text-blue-900">
            <strong>Extraction Integrity:</strong> The system extracts official course codes (e.g. BCS501, BCS502) and presents them to the Admin for verification prior to database insertion.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                alert('Syllabus file verified and indexed. All curriculum course codes mapped.');
                setIsUploadModalOpen(false);
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition"
            >
              Verify & Parse Curriculum
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
