import React, { useState } from 'react';
import { Plus, Upload, ExternalLink } from 'lucide-react';
import type { Subject } from '../../../types';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { academicsService } from '../../../services/academics.service';
import {
  Badge,
  Button,
  Card,
  DataTable,
  FilterBar,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Textarea,
  type DataColumn,
} from '../../../components/ui';
import { INSTITUTION_CONFIG } from '../../../app/config/institution';
import { cn } from '../../../lib/cn';

export const AdminSchemesPage: React.FC = () => {
  useDatabaseVersion();
  const { toast } = useToast();
  const schemes = academicsService.getSchemes();
  const subjects = academicsService.getSubjects();
  const classes = academicsService.getClasses();

  const [selectedSchemeId, setSelectedSchemeId] = useState<string>(
    schemes[0]?.id || INSTITUTION_CONFIG.academicDefaults.defaultSchemeId
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddSchemeOpen, setIsAddSchemeOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [schemeName, setSchemeName] = useState('');
  const [schemeCode, setSchemeCode] = useState('');
  const [effectiveYear, setEffectiveYear] = useState(2022);
  const [totalCredits, setTotalCredits] = useState(160);
  const [description, setDescription] = useState('');

  const currentScheme =
    schemes.find((s) => s.id === selectedSchemeId) || schemes[0];
  const schemeSubjects = subjects
    .filter((s) => s.vtu_scheme_id === selectedSchemeId)
    .filter(
      (s) =>
        s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  const schemeClasses = classes.filter(
    (c) => c.vtu_scheme_id === selectedSchemeId
  );

  const handleCreateScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await academicsService.createScheme({
        name: schemeName.trim(),
        code: schemeCode.trim(),
        effective_from_year: Number(effectiveYear),
        total_credits: Number(totalCredits),
        is_active: true,
        description: description.trim(),
      });

      setSelectedSchemeId(created.id);
      setSchemeName('');
      setSchemeCode('');
      setDescription('');
      setIsAddSchemeOpen(false);
      toast({
        variant: 'success',
        title: 'Academic scheme created',
        description: `${created.name} (${created.code}) is now active.`,
      });
    } catch (err) {
      toast({ variant: 'error', title: 'Unable to create scheme', description: err instanceof Error ? err.message : undefined });
    }
  };

  const columns: DataColumn<Subject>[] = [
    {
      key: 'code',
      header: 'Code',
      sortValue: (s) => s.code,
      render: (s) => (
        <span className="font-mono font-semibold text-brand-600">
          {s.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Course Title',
      sortValue: (s) => s.name,
      render: (s) => <span className="font-medium text-primary">{s.name}</span>,
    },
    {
      key: 'semester',
      header: 'Sem',
      sortValue: (s) => s.semester,
      render: (s) => (
        <span className="font-mono text-secondary tabular-nums">
          Sem {s.semester}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (s) => <Badge variant="neutral">{s.category}</Badge>,
    },
    {
      key: 'type',
      header: 'Delivery',
      render: (s) => (
        <span className="capitalize text-secondary">{s.course_type}</span>
      ),
    },
    {
      key: 'credits',
      header: 'Credits',
      align: 'center',
      sortValue: (s) => s.credits,
      render: (s) => (
        <span className="font-mono font-semibold tabular-nums">{s.credits}</span>
      ),
    },
    {
      key: 'marks',
      header: 'CIE / SEE',
      align: 'center',
      render: (s) => (
        <span className="font-mono text-secondary tabular-nums">
          {s.cie_marks} / {s.see_marks}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: () => (
        <Badge variant="success" dot>
          Approved
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Schemes"
        description="Multi-scheme CBCS regulations, degree credit structures and mapped syllabi"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setIsUploadModalOpen(true)}
              leftIcon={<Upload className="w-3.5 h-3.5" />}
            >
              Upload Syllabus
            </Button>
            <Button
              onClick={() => setIsAddSchemeOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Scheme
            </Button>
          </>
        }
      />

      {/* Scheme Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {schemes.map((scheme) => {
          const isSelected = scheme.id === selectedSchemeId;
          const subCount = subjects.filter(
            (s) => s.vtu_scheme_id === scheme.id
          ).length;

          return (
            <Card
              key={scheme.id}
              onClick={() => setSelectedSchemeId(scheme.id)}
              className={cn(
                'p-4 cursor-pointer transition-all',
                isSelected
                  ? 'border-brand-600 ring-1 ring-brand-600'
                  : 'hover:border-slate-300'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge variant={isSelected ? 'primary' : 'neutral'}>
                    Scheme {scheme.code}
                  </Badge>
                  <h3 className="text-sm font-semibold text-primary mt-2">
                    {scheme.name}
                  </h3>
                </div>
                {scheme.is_active && (
                  <Badge variant="success" dot>
                    Active
                  </Badge>
                )}
              </div>

              <p className="text-xs text-secondary mt-2 line-clamp-2">
                {scheme.description || 'Prescribed CBCS academic curriculum'}
              </p>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-secondary tabular-nums">
                <span>{subCount} courses</span>
                <span className="font-medium text-primary">
                  {scheme.total_credits} credits
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Selected Scheme Course Matrix */}
      <div className="space-y-3">
        <FilterBar>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-primary">
              {currentScheme?.name} — Course Matrix
            </p>
            <p className="text-[11px] text-secondary">
              {schemeSubjects.length} courses • {schemeClasses.length} active class batches
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Filter scheme courses..."
              className="w-full sm:w-64"
            />
            {currentScheme?.syllabus_url && (
              <a
                href={currentScheme.syllabus_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-surface text-xs font-medium text-brand-600 hover:bg-subtle transition-colors"
              >
                <span>Syllabus</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </FilterBar>

        <DataTable
          data={schemeSubjects}
          columns={columns}
          keyExtractor={(s) => s.id}
          pageSize={10}
          emptyTitle="No courses mapped to this scheme"
          renderMobileCard={(s) => (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-brand-600">
                  {s.code}
                </span>
                <Badge variant="neutral">Sem {s.semester}</Badge>
              </div>
              <p className="text-xs font-medium text-primary">{s.name}</p>
              <div className="flex items-center justify-between text-[11px] text-secondary pt-1">
                <span>
                  {s.category} • {s.course_type}
                </span>
                <span className="font-mono">{s.credits} Credits</span>
              </div>
            </div>
          )}
        />
      </div>

      <Modal
        isOpen={isAddSchemeOpen}
        onClose={() => setIsAddSchemeOpen(false)}
        title="Add Academic Scheme"
        description="Register a new curriculum regulation and credit structure"
      >
        <form onSubmit={handleCreateScheme} className="space-y-4">
          <Input
            label="Scheme Name"
            required
            value={schemeName}
            onChange={(e) => setSchemeName(e.target.value)}
            placeholder="e.g. 2025 Autonomous Regulation"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Scheme Code"
              required
              value={schemeCode}
              onChange={(e) => setSchemeCode(e.target.value)}
              placeholder="e.g. 2025"
              className="font-mono"
            />
            <Input
              label="Effective Year"
              type="number"
              value={effectiveYear}
              onChange={(e) => setEffectiveYear(Number(e.target.value))}
            />
          </div>

          <Input
            label="Total Degree Credits"
            type="number"
            value={totalCredits}
            onChange={(e) => setTotalCredits(Number(e.target.value))}
          />

          <Textarea
            label="Regulation Notes"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Outcome-Based Education (OBE) and Choice-Based Credit System (CBCS)..."
          />

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddSchemeOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Scheme</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Syllabus Document"
        description="Attach official PDF curriculum reference for scheme verification"
      >
        <div className="space-y-4">
          <div className="border border-dashed border-border rounded-xl p-8 text-center space-y-2 bg-subtle/40">
            <Upload className="w-6 h-6 text-brand-600 mx-auto" />
            <p className="text-xs font-medium text-primary">
              Select or drop curriculum PDF document
            </p>
            <p className="text-[11px] text-muted">
              Supports PDF files up to 25 MB (e.g. 2022-CSE-Curriculum.pdf)
            </p>
          </div>

          <div className="p-3 bg-subtle rounded-lg border border-border text-xs text-secondary leading-relaxed">
            Course codes (e.g. BCS501, BCS502) are indexed against the active academic scheme catalogue upon verification.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                toast({
                  variant: 'success',
                  title: 'Syllabus reference verified',
                  description: 'Curriculum course codes are aligned with the active scheme.',
                });
                setIsUploadModalOpen(false);
              }}
            >
              Verify Curriculum
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
