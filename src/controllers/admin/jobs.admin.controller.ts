import { Request, Response } from 'express';
import { sendOk, sendError, sendCreated, sendNoContent } from '../../utils/response';
import { JobModel, JobApplicationModel } from '../../models/job.model';

export async function listJobs(_req: Request, res: Response) {
  try {
    const jobs = await (JobModel as any).find({}).sort({ createdAt: -1 }).lean();
    const mapped = jobs.map((j: any) => ({
      id: j._id,
      title: j.title,
      company: j.company,
      description: j.description,
      location: j.location,
      type: j.workType,
      salary: j.salary || '',
      category: j.category,
      requirements: j.requirements || [],
      contactEmail: j.contactEmail || '',
      companyLogo: j.companyLogo || '',
      isUrgent: j.isUrgent || false,
      isActive: j.isActive || false,
      applicants: j.applicantsCount || 0,
      views: j.viewsCount || 0,
      status: j.isActive ? 'active' : (new Date(j.expiresAt) < new Date() ? 'expired' : 'draft'),
      expiresAt: j.expiresAt,
      createdAt: j.createdAt
    }));
    return sendOk(res, mapped);
  } catch (e) { return sendError(res, 'Error listando trabajos', 500); }
}
export async function createJob(req: Request, res: Response) {
  try {
    const payload = req.body;
    console.log('[ADMIN] Iniciando creación de trabajo...');
    console.log('Creating job with payload:', JSON.stringify(payload, null, 2));
    const job = await JobModel.create(payload);
    console.log('Job created:', JSON.stringify(job, null, 2));
    
    // Map the response to include all fields consistently
    const mappedJob = {
      id: (job as any)._id,
      title: job.title,
      company: job.company,
      description: job.description,
      location: job.location,
      type: job.workType,
      salary: job.salary || '',
      category: job.category,
      requirements: job.requirements || [],
      contactEmail: job.contactEmail || '',
      companyLogo: job.companyLogo || '',
      isUrgent: job.isUrgent || false,
      isActive: job.isActive || false,
      applicants: (job as any).applicantsCount || 0,
      views: (job as any).viewsCount || 0,
      status: job.isActive ? 'active' : (new Date(job.expiresAt) < new Date() ? 'expired' : 'draft'),
      expiresAt: job.expiresAt,
      createdAt: job.createdAt
    };
    
    return sendCreated(res, mappedJob);
  } catch (e) { 
    console.error('Error creating job:', e);
    return sendError(res, 'Error creando trabajo', 500); 
  }
}
export async function updateJob(req: Request, res: Response) {
  try {
    const update: any = { ...req.body };
    // Map UI status to model flags
    if (typeof req.body.status === 'string') {
      if (req.body.status === 'active') update.isActive = true;
      if (req.body.status === 'draft') update.isActive = false;
    }
    const job = await JobModel.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!job) return sendError(res, 'Trabajo no encontrado', 404);
    
    // Map the response to include all fields consistently
    const mappedJob = {
      id: (job as any)._id,
      title: job.title,
      company: job.company,
      description: job.description,
      location: job.location,
      type: job.workType,
      salary: job.salary || '',
      category: job.category,
      requirements: job.requirements || [],
      contactEmail: job.contactEmail || '',
      companyLogo: job.companyLogo || '',
      isUrgent: job.isUrgent || false,
      isActive: job.isActive || false,
      applicants: (job as any).applicantsCount || 0,
      views: (job as any).viewsCount || 0,
      status: job.isActive ? 'active' : (new Date(job.expiresAt) < new Date() ? 'expired' : 'draft'),
      expiresAt: job.expiresAt,
      createdAt: job.createdAt
    };
    
    return sendOk(res, mappedJob);
  } catch (e) { return sendError(res, 'Error actualizando trabajo', 500); }
}
export async function deleteJob(req: Request, res: Response) {
  try {
    await JobModel.findByIdAndDelete(req.params.id);
    return sendNoContent(res);
  } catch (e) { return sendError(res, 'Error eliminando trabajo', 500); }
}
export async function getJobStats(_req: Request, res: Response) {
  try {
    const [total, active, totalApplicants, totalViews] = await Promise.all([
      JobModel.countDocuments(),
      JobModel.countDocuments({ isActive: true }),
      JobModel.aggregate([{ $group: { _id: null, sum: { $sum: '$applicantsCount' } } }]).then(r => r[0]?.sum || 0),
      JobModel.aggregate([{ $group: { _id: null, sum: { $sum: '$viewsCount' } } }]).then(r => r[0]?.sum || 0),
    ]);
    return sendOk(res, { total, active, totalApplicants, totalViews });
  } catch (e) { return sendError(res, 'Error estadísticas jobs', 500); }
}
export async function listApplications(_req: Request, res: Response) {
  try {
    const apps = await (JobApplicationModel as any)
      .find({})
      .sort({ createdAt: -1 })
      .populate('jobId', 'title')
      .populate('userId', 'displayName metroUsername')
      .lean();
    const mapped = apps.map((a: any) => ({
      id: a._id,
      jobTitle: a.jobId?.title,
      user: { displayName: a.userId?.displayName, metroUsername: a.userId?.metroUsername },
      status: a.status,
      createdAt: a.createdAt,
    }));
    return sendOk(res, mapped);
  } catch (e) { return sendError(res, 'Error listando postulaciones', 500); }
}


