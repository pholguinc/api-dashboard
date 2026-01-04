import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Request, Response } from "express";
import { sendError, sendOk } from "../utils/response";
import { UserModel } from "../models/user.model";
import { checkVerification, sendVerification } from "../services/twilio";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import fetch from "node-fetch";

// Método para generar JWT token
function generateToken(user: any): string {
  return jwt.sign({ id: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: "7d",
  });
}

// Método para aplicar código de referido
async function applyReferralCode(
  userId: string,
  referralCode: string,
  userName: string
) {
  const referrer = await UserModel.findOne({
    referralCode: referralCode.trim(),
    _id: { $ne: userId },
  });

  if (!referrer) return null;

  // Verificar que el usuario no haya usado ya un código
  const currentUser = await UserModel.findById(userId);
  if (currentUser?.referredBy) {
    return null; // Ya tiene un referidor
  }

  const {
    PointsManagerService,
  } = require("../services/points-manager.service");
  const { updateStreak } = require("../models/streak.model");

  await Promise.all([
    // Actualizar el usuario actual con su referidor
    UserModel.findByIdAndUpdate(userId, { referredBy: referrer._id }),
    // Incrementar contador del referidor
    UserModel.findByIdAndUpdate(referrer._id, { $inc: { referralsCount: 1 } }),
    // Otorgar puntos al referidor (100 puntos)
    PointsManagerService.awardPoints(
      referrer._id.toString(),
      "referrals",
      100,
      `Referido exitoso: ${userName}`,
      { referredUserId: userId, referredUserName: userName }
    ),
    // Otorgar puntos al nuevo usuario (50 puntos de bienvenida)
    PointsManagerService.awardPoints(
      userId,
      "referrals",
      50,
      `Bienvenida por referido de ${referrer.displayName}`,
      {
        referrerUserId: referrer._id.toString(),
        referrerUserName: referrer.displayName,
      }
    ),
    // Completar misión de referido para el referidor
    updateStreak(referrer._id.toString(), "referral"),
  ]);

  return referrer._id;
}

export async function requestOtp(req: Request, res: Response) {
  try {
    const { phone } = req.body;

    const user_exists = await UserModel.findOne({ phone });
    if (user_exists) {
      return sendError(
        res,
        "El número de teléfono ya está registrado",
        400,
        "PHONE_ALREADY_REGISTERED"
      );
    }

    await sendVerification(phone);

    return sendOk(res, {
      status: "sent",
      message: "Código OTP enviado exitosamente",
    });
  } catch (error) {
    console.error("Error in requestOtp:", error);
    return sendError(res, "Error al enviar OTP", 500, "OTP_SEND_ERROR");
  }
}

export async function verifyOtp(req: Request, res: Response) {
  try {
    const { phone, code } = req.body;

    const approved = await checkVerification(phone, code);
    if (!approved) {
      return sendError(
        res,
        "Código OTP inválido o expirado",
        400,
        "OTP_INVALID"
      );
    }

    return sendOk(res, {
      message: "OTP verificado. Procede a configurar tu PIN",
    });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    return sendError(res, "Error al verificar OTP", 500, "OTP_VERIFY_ERROR");
  }
}

export async function setPin(req: Request, res: Response) {
  try {
    const { phone, pin } = req.body;

    // Buscar o crear usuario
    let user = await UserModel.findOne({ phone });
    if (!user) {
      user = new UserModel({
        phone,
        displayName: "Usuario",
        role: "user",
        pointsSmart: 0,
        isProfileComplete: false,
      });
    }

    // Configurar PIN y guardar
    user.pinHash = await bcrypt.hash(pin, env.security.bcryptRounds);
    await user.save();

    const token = generateToken(user);

    return sendOk(
      res,
      {
        status: "success",
        message: "PIN configurado exitosamente",
        token,
        user: {
          id: user._id,
          displayName: user.displayName,
          role: user.role,
          pointsSmart: user.pointsSmart,
          avatarUrl: user.avatarUrl,
          isProfileComplete: user.isProfileComplete,
          metroUsername: user.metroUsername,
          fullName: user.fullName,
          dni: user.dni,
          birthDate: user.birthDate,
          email: user.email,
        },
      },
      201,
      "PIN configurado exitosamente"
    );
  } catch (error) {
    console.error("Error in setPin:", error);
    return sendError(res, "Error al configurar PIN", 500, "PIN_SETUP_ERROR");
  }
}

export async function loginPin(req: Request, res: Response) {
  try {
    const { phone, pin } = req.body;

    const user = await UserModel.findOne({ phone });

    if (!user) {
      return sendError(
        res,
        "Usuario no registrado",
        401,
      );
    }

    const pinValid = await bcrypt.compare(pin, user.pinHash);
    if (!pinValid) {
      return sendError(
        res,
        "Credenciales inválidas",
        401,
        "INVALID_CREDENTIALS"
      );
    }

    const token = generateToken(user);

    return sendOk(res, {
      token,
      user: {
        id: user._id,
        displayName: user.displayName,
        role: user.role,
        pointsSmart: user.pointsSmart,
        avatarUrl: user.avatarUrl,
        isProfileComplete: user.isProfileComplete,
        metroUsername: user.metroUsername,
        fullName: user.fullName,
        dni: user.dni,
        birthDate: user.birthDate,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error in loginPin:", error);
    return sendError(res, "Error al iniciar sesión", 500, "LOGIN_ERROR");
  }
}

export async function completeProfile(req: Request, res: Response) {
  try {
    const { metroUsername, fullName, dni, birthDate, email, referralCode } =
      req.body;
    const userId = (req as any).user.id;

    const updateData: any = {
      metroUsername,
      fullName,
      dni,
      birthDate,
      email,
      isProfileComplete: true,
      displayName: fullName || metroUsername,
    };

    // Aplicar código de referido si existe
    if (referralCode?.trim()) {
      const referrerId = await applyReferralCode(
        userId,
        referralCode,
        fullName || metroUsername
      );
      // La función applyReferralCode ya actualiza el campo referredBy
      // No necesitamos agregarlo manualmente aquí
    }

    const user = await UserModel.findByIdAndUpdate(userId, updateData, {
      new: true,
    });
    if (!user)
      return sendError(res, "Usuario no encontrado", 404, "USER_NOT_FOUND");

    return sendOk(res, { message: "Perfil completado exitosamente" });
  } catch (error) {
    console.error("Error in completeProfile:", error);
    return sendError(
      res,
      "Error al completar el perfil",
      500,
      "PROFILE_COMPLETE_ERROR"
    );
  }
}

export async function googleSignIn(req: Request, res: Response) {
  try {
    const { idToken } = req.body as { idToken: string };
    const resp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );
    if (!resp.ok) {
      return sendError(
        res,
        "Token de Google inválido",
        401,
        "GOOGLE_TOKEN_INVALID"
      );
    }
    const data = (await resp.json()) as any;
    const audience = data.aud as string | undefined;
    if (
      !audience ||
      (env.google?.clientId && audience !== env.google.clientId)
    ) {
      return sendError(
        res,
        "Audiencia de token inválida",
        401,
        "GOOGLE_AUDIENCE_INVALID"
      );
    }
    const googleId = data.sub as string;
    const email = data.email as string | undefined;
    const emailVerified =
      data.email_verified === "true" || data.email_verified === true;
    const name = (data.name as string | undefined) ?? "Usuario";
    const picture = data.picture as string | undefined;

    let user = await UserModel.findOne({
      $or: [
        { "oauth.provider": "google", "oauth.providerId": googleId },
        email ? { email } : { _id: null },
      ],
    });
    if (!user) {
      user = new UserModel({
        email,
        displayName: name,
        avatarUrl: picture,
        role: "user",
        pointsSmart: 0,
        isProfileComplete: false,
        oauth: { provider: "google", providerId: googleId, emailVerified },
      } as any);
      await user.save();
    } else {
      // Update basic fields if empty
      if (!user.email && email) user.email = email;
      if (!user.avatarUrl && picture) user.avatarUrl = picture;
      if (!user.displayName && name) user.displayName = name;
      (user as any).oauth = {
        provider: "google",
        providerId: googleId,
        emailVerified,
      };
      await user.save();
    }

    const token = generateToken(user);

    return sendOk(res, {
      token,
      user: {
        id: user._id,
        displayName: user.displayName,
        role: user.role,
        pointsSmart: user.pointsSmart,
        avatarUrl: user.avatarUrl,
        isProfileComplete: user.isProfileComplete,
        metroUsername: user.metroUsername,
        fullName: user.fullName,
        dni: user.dni,
        birthDate: user.birthDate,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error in googleSignIn:", error);
    return sendError(
      res,
      "Error al iniciar sesión con Google",
      500,
      "GOOGLE_SIGNIN_ERROR"
    );
  }
}
