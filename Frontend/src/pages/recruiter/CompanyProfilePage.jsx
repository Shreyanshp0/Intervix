import { useEffect, useState } from 'react';
import { Building2, Globe, Save, UserSquare2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import api from '../../services/api';
import { API_ROUTES } from '../../constants/apiRoutes';
import { useAuthStore } from '../../store/useAuthStore';

const TextareaField = ({ label, ...props }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-300">{label}</label>
    <textarea
      className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-surface/50 px-4 py-3 text-sm text-gray-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
      {...props}
    />
  </div>
);

const CompanyProfilePage = () => {
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    workEmail: '',
    phone: '',
    title: '',
    profilePhoto: '',
    bio: '',
    linkedin: '',
    twitter: ''
  });
  const [companyForm, setCompanyForm] = useState({
    name: '',
    logo: '',
    industry: '',
    companySize: '',
    website: '',
    description: '',
    recruiterName: '',
    recruiterTitle: '',
    recruiterEmail: '',
    recruiterPhone: '',
    linkedin: '',
    twitter: '',
    facebook: '',
    instagram: ''
  });
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const bootstrapAuth = useAuthStore((state) => state.bootstrapAuth);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get(API_ROUTES.recruiter.me);
        const { profile, company } = response.data;
        setProfileForm({
          fullName: profile?.fullName || '',
          workEmail: profile?.workEmail || '',
          phone: profile?.phone || '',
          title: profile?.title || '',
          profilePhoto: profile?.profilePhoto || '',
          bio: profile?.bio || '',
          linkedin: profile?.socialLinks?.linkedin || '',
          twitter: profile?.socialLinks?.twitter || ''
        });
        setCompanyForm({
          name: company?.name || '',
          logo: company?.logo || '',
          industry: company?.industry || '',
          companySize: company?.companySize || '',
          website: company?.website || '',
          description: company?.description || '',
          recruiterName: company?.recruiterDetails?.recruiterName || '',
          recruiterTitle: company?.recruiterDetails?.recruiterTitle || '',
          recruiterEmail: company?.recruiterDetails?.recruiterEmail || '',
          recruiterPhone: company?.recruiterDetails?.recruiterPhone || '',
          linkedin: company?.socialLinks?.linkedin || '',
          twitter: company?.socialLinks?.twitter || '',
          facebook: company?.socialLinks?.facebook || '',
          instagram: company?.socialLinks?.instagram || ''
        });
      } catch (error) {
        setMessage(error.response?.data?.message || 'Failed to load recruiter workspace.');
      }
    };

    void loadProfile();
  }, []);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handleCompanyChange = (event) => {
    const { name, value } = event.target;
    setCompanyForm((current) => ({ ...current, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      await Promise.all([
        api.put(API_ROUTES.recruiter.me, {
          fullName: profileForm.fullName,
          workEmail: profileForm.workEmail,
          phone: profileForm.phone,
          title: profileForm.title,
          profilePhoto: profileForm.profilePhoto,
          bio: profileForm.bio,
          socialLinks: {
            linkedin: profileForm.linkedin,
            twitter: profileForm.twitter
          }
        }),
        api.put(API_ROUTES.recruiter.companyMe, {
          name: companyForm.name,
          logo: companyForm.logo,
          industry: companyForm.industry,
          companySize: companyForm.companySize,
          website: companyForm.website,
          description: companyForm.description,
          recruiterDetails: {
            recruiterName: companyForm.recruiterName,
            recruiterTitle: companyForm.recruiterTitle,
            recruiterEmail: companyForm.recruiterEmail,
            recruiterPhone: companyForm.recruiterPhone
          },
          socialLinks: {
            linkedin: companyForm.linkedin,
            twitter: companyForm.twitter,
            facebook: companyForm.facebook,
            instagram: companyForm.instagram
          }
        })
      ]);
      await bootstrapAuth();
      setMessage('Recruiter and company profiles saved successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to save recruiter workspace.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="glass-card rounded-[28px] p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-accent">Recruiter onboarding</div>
            <h1 className="mt-3 text-3xl font-semibold text-white">Shape a company-facing hiring profile</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              This workspace separates recruiter identity from company data so your hiring stack stays normalized and ready for future job, pipeline, and team modules.
            </p>
          </div>
          <Button type="submit" className="gap-2 bg-accent text-slate-950 hover:bg-sky-300" isLoading={isSaving}>
            <Save size={16} />
            Save workspace
          </Button>
        </div>
        {message ? <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200">{message}</div> : null}
      </div>

      <section className="glass-card rounded-[28px] p-6 lg:p-8">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <UserSquare2 size={22} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Recruiter profile</h2>
            <p className="mt-1 text-sm text-gray-400">Editable recruiter identity for ownership, communication, and brand trust.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Full Name" name="fullName" value={profileForm.fullName} onChange={handleProfileChange} />
          <Input label="Work Email" name="workEmail" type="email" value={profileForm.workEmail} onChange={handleProfileChange} />
          <Input label="Phone" name="phone" value={profileForm.phone} onChange={handleProfileChange} />
          <Input label="Title" name="title" value={profileForm.title} onChange={handleProfileChange} />
          <Input label="Profile Photo URL" className="md:col-span-2" name="profilePhoto" value={profileForm.profilePhoto} onChange={handleProfileChange} />
          <div className="md:col-span-2">
            <TextareaField label="Bio" name="bio" value={profileForm.bio} onChange={handleProfileChange} />
          </div>
          <Input label="LinkedIn" name="linkedin" value={profileForm.linkedin} onChange={handleProfileChange} />
          <Input label="Twitter" name="twitter" value={profileForm.twitter} onChange={handleProfileChange} />
        </div>
      </section>

      <section className="glass-card rounded-[28px] p-6 lg:p-8">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
            <Building2 size={22} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Company profile</h2>
            <p className="mt-1 text-sm text-gray-400">Company attributes are isolated so multiple recruiters can eventually share the same organization cleanly.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Company Name" name="name" value={companyForm.name} onChange={handleCompanyChange} />
          <Input label="Industry" name="industry" value={companyForm.industry} onChange={handleCompanyChange} />
          <Input label="Company Size" name="companySize" value={companyForm.companySize} onChange={handleCompanyChange} />
          <Input label="Website" icon={Globe} name="website" value={companyForm.website} onChange={handleCompanyChange} />
          <Input label="Logo URL" className="md:col-span-2" name="logo" value={companyForm.logo} onChange={handleCompanyChange} />
          <div className="md:col-span-2">
            <TextareaField label="Description" name="description" value={companyForm.description} onChange={handleCompanyChange} />
          </div>
        </div>

        <div className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 md:grid-cols-2">
          <Input label="Recruiter Name" name="recruiterName" value={companyForm.recruiterName} onChange={handleCompanyChange} />
          <Input label="Recruiter Title" name="recruiterTitle" value={companyForm.recruiterTitle} onChange={handleCompanyChange} />
          <Input label="Recruiter Email" name="recruiterEmail" value={companyForm.recruiterEmail} onChange={handleCompanyChange} />
          <Input label="Recruiter Phone" name="recruiterPhone" value={companyForm.recruiterPhone} onChange={handleCompanyChange} />
          <Input label="Company LinkedIn" name="linkedin" value={companyForm.linkedin} onChange={handleCompanyChange} />
          <Input label="Company Twitter" name="twitter" value={companyForm.twitter} onChange={handleCompanyChange} />
          <Input label="Facebook" name="facebook" value={companyForm.facebook} onChange={handleCompanyChange} />
          <Input label="Instagram" name="instagram" value={companyForm.instagram} onChange={handleCompanyChange} />
        </div>
      </section>
    </form>
  );
};

export default CompanyProfilePage;
