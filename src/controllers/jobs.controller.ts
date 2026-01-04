import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { JobModel, JobApplicationModel } from "../models/job.model";
import { SubscriptionModel } from "../models/subscription.model";
import { UserModel } from "../models/user.model";
import { ApplicantProfileModel } from "../models/applicant-profile.model";
import {
  checkDailyLimit,
  incrementUsage,
  FREE_USER_DAILY_LIMITS,
} from "../models/daily-usage.model";
import { sendOk, sendError, sendCreated } from "../utils/response";
import { NotificationHelpers } from "../services/notification.service";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configuración de multer para upload de CV
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads/cvs");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `cv-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos PDF"));
    }
  },
});

export const uploadCV = upload.single("cv");

export class JobsController {
  // Endpoint público para obtener trabajos (sin autenticación)
  static async getPublicJobs(req: Request, res: Response) {
    try {
      const jobs = await JobModel.find({}).sort({ createdAt: -1 }).limit(20);

      return sendOk(res, { jobs });
    } catch (error) {
      console.error("Error in getPublicJobs:", error);
      return sendError(res, "Error obteniendo trabajos", 500);
    }
  }

  // Verificar si el usuario tiene MetroPremium activo
  private static async hasActivePremium(userId: string): Promise<boolean> {
    const user = await UserModel.findById(userId);
    const subscription = await SubscriptionModel.findOne({
      userId,
      status: "active",
      endDate: { $gt: new Date() },
    });

    return user?.hasMetroPremium || !!subscription;
  }

  // Buscar empleos (Solo para usuarios Premium)
  static async searchJobs(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      // Verificar suscripción MetroPremium
      if (!(await JobsController.hasActivePremium(userId!))) {
        return sendError(res, "Requiere suscripción MetroPremium", 403);
      }

      const {
        query,
        category,
        location,
        workType,
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Construir filtros de búsqueda (simplificado)
      const filters: any = {
        expiresAt: { $gt: new Date() },
      };

      if (category && category !== "Todos") {
        filters.category = category;
      }

      if (location) {
        filters.location = new RegExp(location as string, "i");
      }

      if (workType) {
        filters.workType = workType;
      }

      // Búsqueda por texto
      if (query) {
        filters.$text = { $search: query as string };
      }

      // Ejecutar búsqueda
      const jobs = await JobModel.find(filters)
        .sort({ [sortBy as string]: sortOrder === "desc" ? -1 : 1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .select("-__v");

      const total = await JobModel.countDocuments(filters);

      return sendOk(res, {
        jobs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error searching jobs:", error);
      return sendError(res, "Error buscando empleos", 500);
    }
  }

  // Obtener empleos destacados
  static async getFeaturedJobs(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      // Verificar suscripción MetroPremium
      if (!(await JobsController.hasActivePremium(userId!))) {
        return sendError(res, "Requiere suscripción MetroPremium", 403);
      }

      // Simplificamos la consulta para devolver todos los trabajos disponibles
      console.log("Attempting to find jobs...");
      const featuredJobs = await JobModel.find({})
        .sort({ createdAt: -1 })
        .limit(10);

      console.log("Found jobs:", featuredJobs.length);
      return sendOk(res, featuredJobs);
    } catch (error) {
      console.error("Error in getFeaturedJobs:", error);
      return sendError(res, "Error obteniendo empleos destacados", 500);
    }
  }

  // Obtener detalles de un empleo
  static async getJobDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const { jobId } = req.params;
      const userId = req.user?.id;

      // Verificar suscripción MetroPremium
      if (!(await JobsController.hasActivePremium(userId!))) {
        return sendError(res, "Requiere suscripción MetroPremium", 403);
      }

      const job = await JobModel.findById(jobId);

      if (!job) {
        return sendError(res, "Empleo no encontrado", 404);
      }

      // Incrementar contador de vistas
      await JobModel.findByIdAndUpdate(jobId, {
        $inc: { viewsCount: 1 },
      });

      return sendOk(res, job);
    } catch (error) {
      return sendError(res, "Error obteniendo detalles del empleo", 500);
    }
  }

  // ADMIN: Crear empleo
  static async createJob(req: Request, res: Response) {
    try {
      const jobData = req.body;
      const job = new JobModel(jobData);
      await job.save();

      return sendOk(res, job, 201);
    } catch (error) {
      return sendError(res, "Error creando empleo", 500);
    }
  }

  // ADMIN: Obtener todos los empleos
  static async getAllJobs(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 20, category, status } = req.query;

      if (!userId) {
        return sendError(res, "Usuario no autenticado", 401);
      }

      // Verificar si el usuario es Premium
      const user = await UserModel.findById(userId).select(
        "hasMetroPremium metroPremiumExpiry"
      );
      const isPremium =
        user?.hasMetroPremium &&
        user?.metroPremiumExpiry &&
        user.metroPremiumExpiry > new Date();

      // Verificar límites diarios para usuarios FREE
      const dailyLimit = await checkDailyLimit(
        userId,
        "job_search",
        FREE_USER_DAILY_LIMITS.job_search,
        isPremium
      );

      if (!dailyLimit.canUse) {
        return sendError(
          res,
          "Límite diario de búsqueda alcanzado",
          429,
          "DAILY_LIMIT_REACHED",
          {
            currentUsage: dailyLimit.currentUsage,
            limit: dailyLimit.limit,
            feature: "job_search",
            upgradeUrl: "/subscription",
          }
        );
      }

      const filters: any = {};
      if (category) filters.category = category;
      if (status) filters.isActive = status === "active";

      // Registrar uso de búsqueda
      await incrementUsage(userId, "job_search", isPremium, {
        category,
        page: Number(page),
      });

      const jobs = await JobModel.find(filters)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .select(
          isPremium ? "" : "-salary -contactInfo.email -contactInfo.whatsapp"
        ); // Ocultar info sensible para FREE

      const total = await JobModel.countDocuments(filters);

      // Obtener nuevo uso después del incremento
      const newUsage = await checkDailyLimit(
        userId,
        "job_search",
        FREE_USER_DAILY_LIMITS.job_search,
        isPremium
      );

      return sendOk(res, {
        jobs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
        userLimits: {
          isPremium,
          dailyUsage: newUsage.currentUsage,
          dailyLimit: newUsage.limit,
          canViewMore: newUsage.canUse,
        },
      });
    } catch (error) {
      console.error("Error getting jobs:", error);
      return sendError(res, "Error obteniendo empleos", 500);
    }
  }

  // ADMIN: Actualizar empleo
  static async updateJob(req: AuthenticatedRequest, res: Response) {
    try {
      const { jobId } = req.params;
      const updates = req.body;

      const job = await JobModel.findByIdAndUpdate(jobId, updates, {
        new: true,
      });

      if (!job) {
        return sendError(res, "Empleo no encontrado", 404);
      }

      return sendOk(res, job);
    } catch (error) {
      return sendError(res, "Error actualizando empleo", 500);
    }
  }

  // ADMIN: Eliminar empleo
  static async deleteJob(req: AuthenticatedRequest, res: Response) {
    try {
      const { jobId } = req.params;

      await JobModel.findByIdAndDelete(jobId);
      return sendOk(res, { message: "Empleo eliminado exitosamente" });
    } catch (error) {
      return sendError(res, "Error eliminando empleo", 500);
    }
  }

  // ADMIN: Estadísticas de empleos
  static async getJobsStats(req: Request, res: Response) {
    try {
      const [
        totalJobs,
        activeJobs,
        jobsByCategory,
        recentApplications,
        topCompanies,
      ] = await Promise.all([
        JobModel.countDocuments(),
        JobModel.countDocuments({ isActive: true }),
        JobModel.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        JobModel.aggregate([
          {
            $match: {
              createdAt: {
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          },
          { $group: { _id: null, applications: { $sum: "$applicantsCount" } } },
        ]),
        JobModel.aggregate([
          { $match: { isActive: true } },
          {
            $group: {
              _id: "$company",
              jobCount: { $sum: 1 },
              totalApplicants: { $sum: "$applicantsCount" },
            },
          },
          { $sort: { jobCount: -1 } },
          { $limit: 10 },
        ]),
      ]);

      return sendOk(res, {
        totalJobs,
        activeJobs,
        expiredJobs: totalJobs - activeJobs,
        jobsByCategory,
        recentApplications: recentApplications[0]?.applications || 0,
        topCompanies,
      });
    } catch (error) {
      return sendError(res, "Error obteniendo estadísticas", 500);
    }
  }

  // Aplicar a un trabajo
  static async applyToJob(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { jobId } = req.params;
      
      // Intentar obtener perfil del aplicante primero
      const profile = await ApplicantProfileModel.findOne({ userId });
      
      let fullName, email, phone, dni, birthDate, address, experience, education, skills, motivation, cvFile;
      
      if (profile && profile.isComplete && profile.cvFile) {
        // Usar datos del perfil guardado (aplicación con un solo clic)
        fullName = profile.fullName;
        email = profile.email;
        phone = profile.phone;
        dni = profile.dni;
        birthDate = profile.birthDate;
        address = profile.address;
        experience = profile.experience;
        education = profile.education;
        skills = profile.skills;
        motivation = profile.motivation;
        cvFile = profile.cvFile;
      } else {
        // Usar datos del formulario (aplicación tradicional)
        const {
          fullName: formFullName,
          email: formEmail,
          phone: formPhone,
          dni: formDni,
          birthDate: formBirthDate,
          address: formAddress,
          experience: formExperience,
          education: formEducation,
          skills: formSkills,
          motivation: formMotivation,
        } = req.body;

        fullName = formFullName;
        email = formEmail;
        phone = formPhone;
        dni = formDni;
        birthDate = formBirthDate;
        address = formAddress;
        experience = formExperience;
        education = formEducation;
        skills = formSkills ? formSkills.split(",").map((s: string) => s.trim()) : [];
        motivation = formMotivation;
        
        // Verificar que se subió CV en la aplicación tradicional
        if (!req.file) {
          return sendError(res, "Debe subir su CV en formato PDF", 400);
        }
        
        cvFile = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: `/uploads/cvs/${req.file.filename}`,
          size: req.file.size,
          uploadedAt: new Date()
        };
      }

      // Verificar si el usuario es Premium
      const user = await UserModel.findById(userId).select(
        "hasMetroPremium metroPremiumExpiry"
      );
      const isPremium =
        user?.hasMetroPremium &&
        user?.metroPremiumExpiry &&
        user.metroPremiumExpiry > new Date();

      // Verificar límites diarios para aplicaciones
      const dailyLimit = await checkDailyLimit(
        userId,
        "job_application",
        FREE_USER_DAILY_LIMITS.job_application,
        isPremium
      );

      if (!dailyLimit.canUse) {
        return sendError(
          res,
          "Límite diario de aplicaciones alcanzado",
          429,
          "DAILY_LIMIT_REACHED",
          {
            currentUsage: dailyLimit.currentUsage,
            limit: dailyLimit.limit,
            feature: "job_application",
            upgradeUrl: "/subscription",
          }
        );
      }

      // Verificar que el trabajo existe y está activo
      const job = await JobModel.findOne({
        _id: jobId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      if (!job) {
        return sendError(res, "Trabajo no encontrado o expirado", 404);
      }

      // Verificar si ya aplicó
      const existingApplication = await JobApplicationModel.findOne({
        jobId,
        userId,
      });

      if (existingApplication) {
        return sendError(res, "Ya has aplicado a este trabajo", 400);
      }

      // Crear aplicación
      const application = new JobApplicationModel({
        jobId,
        userId,
        applicantInfo: {
          fullName,
          email,
          phone,
          dni,
          birthDate,
          address,
          experience,
          education,
          skills,
          motivation,
        },
        cvFile: {
          filename: cvFile.filename,
          originalName: cvFile.originalName,
          path: cvFile.path,
          size: cvFile.size,
          uploadedAt: cvFile.uploadedAt
        },
      });

      await application.save();

      // Incrementar contador de aplicantes en el trabajo
      await JobModel.findByIdAndUpdate(jobId, {
        $inc: { applicantsCount: 1 },
      });

      // Registrar uso de aplicación
      await incrementUsage(userId, "job_application", isPremium, {
        jobId,
        jobTitle: job.title,
        company: job.company,
      });

      // Enviar notificación de confirmación
      await NotificationHelpers.jobApplication(
        userId,
        "pending",
        job.title,
        job.company
      );

      const usedProfile = profile && profile.isComplete && profile.cvFile;
      
      return sendCreated(res, {
        message: usedProfile ? "Aplicación enviada exitosamente con un solo clic" : "Aplicación enviada exitosamente",
        applicationId: application._id,
        usedProfile: usedProfile
      });
    } catch (error) {
      console.error("Error applying to job:", error);
      return sendError(res, "Error al aplicar al trabajo", 500);
    }
  }

  // Obtener aplicaciones del usuario
  static async getUserApplications(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 10, status } = req.query;

      const filters: any = { userId };
      if (status) filters.status = status;

      const applications = await JobApplicationModel.find(filters)
        .populate(
          "jobId",
          "title company location workType salary category isActive"
        )
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await JobApplicationModel.countDocuments(filters);

      return sendOk(res, {
        applications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error getting user applications:", error);
      return sendError(res, "Error al obtener aplicaciones", 500);
    }
  }

  // Obtener aplicaciones para un trabajo (Admin)
  static async getJobApplications(req: AuthenticatedRequest, res: Response) {
    try {
      const { jobId } = req.params;
      const { page = 1, limit = 10, status } = req.query;

      const filters: any = { jobId };
      if (status) filters.status = status;

      const applications = await JobApplicationModel.find(filters)
        .populate("userId", "displayName avatarUrl phone email")
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await JobApplicationModel.countDocuments(filters);

      return sendOk(res, {
        applications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error getting job applications:", error);
      return sendError(res, "Error al obtener aplicaciones", 500);
    }
  }

  // Actualizar estado de aplicación (Admin)
  static async updateApplicationStatus(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      const { applicationId } = req.params;
      const {
        status,
        reviewNotes,
        interviewDate,
        interviewLocation,
        interviewNotes,
      } = req.body;
      const reviewedBy = req.user?.id;

      const application = await JobApplicationModel.findById(applicationId);
      if (!application) {
        return sendError(res, "Aplicación no encontrada", 404);
      }

      const updateData: any = {
        status,
        reviewedBy,
        reviewedAt: new Date(),
      };

      if (reviewNotes) updateData.reviewNotes = reviewNotes;
      if (interviewDate) updateData.interviewDate = new Date(interviewDate);
      if (interviewLocation) updateData.interviewLocation = interviewLocation;
      if (interviewNotes) updateData.interviewNotes = interviewNotes;

      await JobApplicationModel.findByIdAndUpdate(applicationId, updateData);

      // Enviar notificación al usuario sobre el cambio de estado
      const job = await JobModel.findById(application.jobId);
      if (job) {
        await NotificationHelpers.jobApplication(
          application.userId.toString(),
          status,
          job.title,
          job.company
        );
      }

      return sendOk(res, { message: "Estado actualizado exitosamente" });
    } catch (error) {
      console.error("Error updating application status:", error);
      return sendError(res, "Error al actualizar estado", 500);
    }
  }

  // Descargar CV (Admin)
  static async downloadCV(req: AuthenticatedRequest, res: Response) {
    try {
      const { applicationId } = req.params;

      const application = await JobApplicationModel.findById(applicationId);
      if (!application) {
        return sendError(res, "Aplicación no encontrada", 404);
      }

      const filePath = path.join(
        __dirname,
        "../../uploads/cvs",
        application.cvFile.filename
      );
      if (!fs.existsSync(filePath)) {
        return sendError(res, "Archivo no encontrado", 404);
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${application.cvFile.originalName}"`
      );

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading CV:", error);
      return sendError(res, "Error al descargar CV", 500);
    }
  }

  // Descargar CV propio (Usuario)
  static async downloadMyCV(req: AuthenticatedRequest, res: Response) {
    try {
      const { applicationId } = req.params;
      const userId = req.user?.id;

      const application = await JobApplicationModel.findById(applicationId);
      if (!application || application.userId.toString() !== userId) {
        return sendError(res, "Aplicación no encontrada", 404);
      }

      const filePath = path.join(
        __dirname,
        "../../uploads/cvs",
        application.cvFile.filename
      );
      if (!fs.existsSync(filePath)) {
        return sendError(res, "Archivo no encontrado", 404);
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${application.cvFile.originalName}"`
      );

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading own CV:", error);
      return sendError(res, "Error al descargar CV", 500);
    }
  }

  static async profileJob(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const jobs = await JobModel.find({ userId });
      return sendOk(res, jobs);
    } catch (error) {
      return sendError(res, "Error al obtener trabajos", 500);
    }
  }

}
