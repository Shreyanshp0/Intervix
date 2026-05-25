import React, { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { BriefcaseBusiness, GraduationCap, Link2, MapPin, Save, Sparkles, UserRound } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { ResumeUpload } from '../../components/candidate/ResumeUpload';

const emptyEducation = { institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', grade: '', description: '' };
const emptyExperience = { company: '', title: '', employmentType: '', location: '', startDate: '', endDate: '', currentlyWorking: false, description: '', highlights: '' };
const emptyProject = { name: '', role: '', description: '', technologies: '', projectUrl: '', repositoryUrl: '', startDate: '', endDate: '' };

const normalizeFormValues = (profile) => ({
  name: profile?.name || '',
  email: profile?.email || '',
  phone: profile?.phone || '',
  profilePhoto: profile?.profilePhoto || '',
  location: profile?.location || '',
  aboutMe: profile?.aboutMe || '',
  rawSkills: profile?.skills?.raw?.join(', ') || '',
  normalizedSkills: profile?.skills?.normalized?.join(', ') || '',
  verifiedSkills: profile?.skills?.verified?.join(', ') || '',
  preferredRoles: profile?.preferredRoles?.join(', ') || '',
  github: profile?.github || '',
  linkedin: profile?.linkedin || '',
  portfolio: profile?.portfolio || '',
  resumeFileName: profile?.resume?.fileName || '',
  resumeFileUrl: profile?.resume?.fileUrl || '',
  education: profile?.education?.length ? profile.education : [emptyEducation],
  experience: profile?.experience?.length ? profile.experience.map((entry) => ({ ...entry, highlights: (entry.highlights || []).join('\n') })) : [emptyExperience],
  projects: profile?.projects?.length ? profile.projects.map((entry) => ({ ...entry, technologies: (entry.technologies || []).join(', ') })) : [emptyProject]
});

const splitCsv = (value = '') => value.split(',').map((item) => item.trim()).filter(Boolean);
const splitLines = (value = '') => value.split('\n').map((item) => item.trim()).filter(Boolean);

const TextareaField = React.forwardRef(({ label, ...props }, ref) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-300">{label}</label>
    <textarea
      ref={ref}
      className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-surface/50 px-4 py-3 text-sm text-gray-100 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
      {...props}
    />
  </div>
));

TextareaField.displayName = 'TextareaField';

const Section = ({ icon: Icon, title, description, children }) => (
  <section className="glass-card rounded-[28px] p-6 lg:p-8">
    <div className="mb-6 flex items-start gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Icon size={22} />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-gray-400">{description}</p>
      </div>
    </div>
    {children}
  </section>
);

const CandidateProfilePage = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const bootstrapAuth = useAuthStore((state) => state.bootstrapAuth);

  const { register, control, handleSubmit, reset } = useForm({
    defaultValues: normalizeFormValues()
  });

  const educationFields = useFieldArray({ control, name: 'education' });
  const experienceFields = useFieldArray({ control, name: 'experience' });
  const projectFields = useFieldArray({ control, name: 'projects' });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get('/candidate/profile/me');
        reset(normalizeFormValues(response.data.profile));
      } catch (error) {
        setMessage(error.response?.data?.message || 'Failed to load candidate profile.');
      }
    };

    void loadProfile();
  }, [reset]);

  const onSubmit = async (values) => {
    setIsSaving(true);
    setMessage('');
    try {
      await api.put('/candidate/profile/me', {
        name: values.name,
        email: values.email,
        phone: values.phone,
        profilePhoto: values.profilePhoto,
        location: values.location,
        aboutMe: values.aboutMe,
        github: values.github,
        linkedin: values.linkedin,
        portfolio: values.portfolio,
        preferredRoles: splitCsv(values.preferredRoles),
        skills: {
          raw: splitCsv(values.rawSkills),
          normalized: splitCsv(values.normalizedSkills),
          verified: splitCsv(values.verifiedSkills)
        },
        education: values.education,
        experience: values.experience.map((entry) => ({
          ...entry,
          highlights: splitLines(entry.highlights)
        })),
        projects: values.projects.map((entry) => ({
          ...entry,
          technologies: splitCsv(entry.technologies)
        })),
        resume: values.resumeFileName ? {
          fileName: values.resumeFileName,
          fileUrl: values.resumeFileUrl
        } : undefined
      });
      await bootstrapAuth();
      setMessage('Candidate profile saved successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to save candidate profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card rounded-[28px] p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-primary">
                <Sparkles size={14} />
                Candidate onboarding
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-white">Craft the profile recruiters actually want to review</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                This candidate portal stores structured profile data, normalized skills, and resume metadata so your profile can scale beyond a single AI interview workflow.
              </p>
            </div>
            <Button type="submit" form="candidate-profile-form" className="gap-2" isLoading={isSaving}>
              <Save size={16} />
              Save profile
            </Button>
          </div>
          {message ? <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200">{message}</div> : null}
        </div>

        <div className="glass-card rounded-[28px] p-6 lg:p-8">
          <div className="text-xs uppercase tracking-[0.25em] text-gray-500">Profile coverage</div>
          <div className="mt-3 text-4xl font-semibold text-white">Editable</div>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Contact info, biography, skills, education, experience, projects, links, preferred roles, and resume metadata all live here.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-gray-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Raw skills for intake and parsing</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Normalized skills for search and matching</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Verified skills for trust signals</div>
          </div>
        </div>
      </div>

      <ResumeUpload onUploadSuccess={(profileData) => {
        if (profileData) {
          reset(normalizeFormValues(profileData));
        }
      }} />

      <form id="candidate-profile-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Section icon={UserRound} title="Identity" description="Keep your core candidate record aligned with the auth account.">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Full Name" {...register('name')} />
            <Input label="Email" type="email" {...register('email')} />
            <Input label="Phone" {...register('phone')} />
            <Input label="Location" icon={MapPin} {...register('location')} />
            <Input label="Profile Photo URL" className="md:col-span-2" {...register('profilePhoto')} />
            <div className="md:col-span-2">
              <TextareaField label="About Me" {...register('aboutMe')} />
            </div>
          </div>
        </Section>

        <Section icon={Sparkles} title="Skills" description="Store free-form and structured skill signals side by side.">
          <div className="grid gap-4 lg:grid-cols-3">
            <TextareaField label="Raw Skills" placeholder="React, Node.js, MongoDB" {...register('rawSkills')} />
            <TextareaField label="Normalized Skills" placeholder="react, node.js, mongodb" {...register('normalizedSkills')} />
            <TextareaField label="Verified Skills" placeholder="react, mongodb" {...register('verifiedSkills')} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input label="Preferred Roles" placeholder="Frontend Engineer, Full Stack Developer" {...register('preferredRoles')} />
            <Input label="Resume File Name" placeholder="John_Doe_Resume.pdf" {...register('resumeFileName')} />
            <Input label="Resume URL" className="md:col-span-2" placeholder="https://..." {...register('resumeFileUrl')} />
          </div>
        </Section>

        <Section icon={GraduationCap} title="Education" description="Structured education entries improve candidate search quality.">
          <div className="space-y-4">
            {educationFields.fields.map((field, index) => (
              <div key={field.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Institution" {...register(`education.${index}.institution`)} />
                  <Input label="Degree" {...register(`education.${index}.degree`)} />
                  <Input label="Field of Study" {...register(`education.${index}.fieldOfStudy`)} />
                  <Input label="Grade" {...register(`education.${index}.grade`)} />
                  <Input label="Start Date" type="date" {...register(`education.${index}.startDate`)} />
                  <Input label="End Date" type="date" {...register(`education.${index}.endDate`)} />
                  <div className="md:col-span-2">
                    <TextareaField label="Description" {...register(`education.${index}.description`)} />
                  </div>
                </div>
                <button type="button" onClick={() => educationFields.remove(index)} className="mt-4 text-sm text-red-300">Remove education</button>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={() => educationFields.append(emptyEducation)}>Add education</Button>
          </div>
        </Section>

        <Section icon={BriefcaseBusiness} title="Experience" description="Capture role, scope, dates, and impact in an ATS-friendly structure.">
          <div className="space-y-4">
            {experienceFields.fields.map((field, index) => (
              <div key={field.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Company" {...register(`experience.${index}.company`)} />
                  <Input label="Title" {...register(`experience.${index}.title`)} />
                  <Input label="Employment Type" {...register(`experience.${index}.employmentType`)} />
                  <Input label="Location" {...register(`experience.${index}.location`)} />
                  <Input label="Start Date" type="date" {...register(`experience.${index}.startDate`)} />
                  <Input label="End Date" type="date" {...register(`experience.${index}.endDate`)} />
                  <label className="flex items-center gap-3 text-sm text-gray-300">
                    <input type="checkbox" className="rounded border-white/20 bg-surface" {...register(`experience.${index}.currentlyWorking`)} />
                    Currently working here
                  </label>
                  <div className="md:col-span-2">
                    <TextareaField label="Description" {...register(`experience.${index}.description`)} />
                  </div>
                  <div className="md:col-span-2">
                    <TextareaField label="Highlights" placeholder={'Led migration project\nImproved performance by 30%'} {...register(`experience.${index}.highlights`)} />
                  </div>
                </div>
                <button type="button" onClick={() => experienceFields.remove(index)} className="mt-4 text-sm text-red-300">Remove experience</button>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={() => experienceFields.append(emptyExperience)}>Add experience</Button>
          </div>
        </Section>

        <Section icon={Link2} title="Projects and links" description="Show practical work, code, and proof of execution.">
          <div className="space-y-4">
            {projectFields.fields.map((field, index) => (
              <div key={field.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Project Name" {...register(`projects.${index}.name`)} />
                  <Input label="Role" {...register(`projects.${index}.role`)} />
                  <Input label="Project URL" {...register(`projects.${index}.projectUrl`)} />
                  <Input label="Repository URL" {...register(`projects.${index}.repositoryUrl`)} />
                  <Input label="Start Date" type="date" {...register(`projects.${index}.startDate`)} />
                  <Input label="End Date" type="date" {...register(`projects.${index}.endDate`)} />
                  <div className="md:col-span-2">
                    <Input label="Technologies" placeholder="React, Tailwind, Express" {...register(`projects.${index}.technologies`)} />
                  </div>
                  <div className="md:col-span-2">
                    <TextareaField label="Description" {...register(`projects.${index}.description`)} />
                  </div>
                </div>
                <button type="button" onClick={() => projectFields.remove(index)} className="mt-4 text-sm text-red-300">Remove project</button>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={() => projectFields.append(emptyProject)}>Add project</Button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Input label="GitHub" {...register('github')} />
            <Input label="LinkedIn" {...register('linkedin')} />
            <Input label="Portfolio" {...register('portfolio')} />
          </div>
        </Section>
      </form>
    </div>
  );
};

export default CandidateProfilePage;
