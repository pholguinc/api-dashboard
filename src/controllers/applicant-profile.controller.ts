import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendError, sendOk } from '../utils/response';
import { ApplicantProfileModel } from '../models/applicant-profile.model';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Configuración de multer para CV
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/cvs';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const uploadCV = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF, DOC y DOCX'));
    }
  }
});

export class ApplicantProfileController {
  // Obtener perfil del aplicante
  static async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      
      let profile = await ApplicantProfileModel.findOne({ userId });
      
      if (!profile) {
        // Crear perfil vacío si no existe
        profile = new ApplicantProfileModel({
          userId,
          fullName: '',
          email: '',
          phone: '',
          dni: '',
          birthDate: '',
          address: '',
          experience: '',
          education: '',
          skills: [],
          motivation: '',
          isComplete: false
        });
        
        await profile.save();
      }
      
      return sendOk(res, { profile });
    } catch (error) {
      console.error('Error in getProfile:', error);
      return sendError(res, 'Error obteniendo perfil de aplicante', 500);
    }
  }

  // Actualizar perfil del aplicante
  static async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const updateData = req.body;
      
      // Verificar si ya existe un perfil
      const existingProfile = await ApplicantProfileModel.findOne({ userId });
      
      // Validar email único si se proporciona
      if (updateData.email) {
        const emailExists = await ApplicantProfileModel.findOne({
          email: updateData.email,
          userId: { $ne: userId }
        });
        
        if (emailExists) {
          return sendError(res, 'Este email ya está registrado en otro perfil', 400, 'EMAIL_TAKEN');
        }
      }
      
      // Validar DNI único si se proporciona
      if (updateData.dni) {
        const dniExists = await ApplicantProfileModel.findOne({
          dni: updateData.dni,
          userId: { $ne: userId }
        });
        
        if (dniExists) {
          return sendError(res, 'Este DNI ya está registrado en otro perfil', 400, 'DNI_TAKEN');
        }
      }
      
      let profile;
      let message;
      
      if (existingProfile) {
        // Actualizar perfil existente
        profile = await ApplicantProfileModel.findOneAndUpdate(
          { userId },
          { 
            ...updateData,
            lastUpdated: new Date()
          },
          { 
            new: true,
            runValidators: true 
          }
        );
        message = 'Perfil actualizado exitosamente';
      } else {
        // Crear nuevo perfil
        profile = new ApplicantProfileModel({
          userId,
          ...updateData,
          isComplete: false,
          lastUpdated: new Date()
        });
        await profile.save();
        message = 'Perfil creado exitosamente';
      }
      
      // Verificar si el perfil está completo
      const requiredFields = [
        'fullName', 'email', 'phone', 'dni', 'birthDate', 'address',
        'experience', 'education', 'skills', 'motivation'
      ];
      
      const isComplete = requiredFields.every(field => {
        const value = profile[field as keyof typeof profile];
        return value && (Array.isArray(value) ? value.length > 0 : value);
      });
      
      profile.isComplete = isComplete;
      await profile.save();
      
      return sendOk(res, { 
        profile, 
        message,
        isComplete: isComplete,
        wasCreated: !existingProfile
      });
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return sendError(res, 'Error actualizando perfil de aplicante', 500);
    }
  }

  // Subir CV
  static async uploadCV(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!req.file) {
        return sendError(res, 'No se proporcionó archivo CV', 400, 'NO_FILE');
      }
      
      const profile = await ApplicantProfileModel.findOne({ userId });
      if (!profile) {
        return sendError(res, 'Perfil de aplicante no encontrado', 404, 'PROFILE_NOT_FOUND');
      }
      
      // Eliminar CV anterior si existe
      if (profile.cvFile?.path && fs.existsSync(profile.cvFile.path)) {
        fs.unlinkSync(profile.cvFile.path);
      }
      
      // Actualizar información del CV
      profile.cvFile = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        uploadedAt: new Date()
      };
      
      await profile.save();
      
      return sendOk(res, { 
        message: 'CV subido exitosamente',
        cvFile: profile.cvFile
      });
    } catch (error) {
      console.error('Error in uploadCV:', error);
      return sendError(res, 'Error subiendo CV', 500);
    }
  }

  // Eliminar CV
  static async deleteCV(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      
      const profile = await ApplicantProfileModel.findOne({ userId });
      if (!profile) {
        return sendError(res, 'Perfil de aplicante no encontrado', 404, 'PROFILE_NOT_FOUND');
      }
      
      if (!profile.cvFile) {
        return sendError(res, 'No hay CV para eliminar', 400, 'NO_CV');
      }
      
      // Eliminar archivo del sistema
      if (fs.existsSync(profile.cvFile.path)) {
        fs.unlinkSync(profile.cvFile.path);
      }
      
      // Eliminar referencia del perfil
      profile.cvFile = undefined;
      await profile.save();
      
      return sendOk(res, { message: 'CV eliminado exitosamente' });
    } catch (error) {
      console.error('Error in deleteCV:', error);
      return sendError(res, 'Error eliminando CV', 500);
    }
  }
}

// Exportar multer para usar en las rutas
export { uploadCV };
