import { Request, Response } from "express";
import {
  sendOk,
  sendError,
  sendCreated,
  sendNoContent,
} from "../../utils/response";
import {
  MetroSessionModel,
  SessionAttendanceModel,
} from "../../models/metro-session.model";

export async function listSessions(_req: Request, res: Response) {
  try {
    const sessions = await (MetroSessionModel as any)
      .find({})
      .sort({ scheduledDate: -1 })
      .lean();
    const mapped = sessions.map((s: any) => ({
      id: s._id,
      title: s.title,
      description: s.description,
      status: s.status,
      startsAt: s.scheduledDate,
      endsAt: s.endDate, // ✅ Ahora existe en el modelo
      artist: s.artist?.name || "Artista Desconocido",
      genre: s.genre,
      location: s.location?.stationName || "",
      duration: s.duration || 60,
      maxAttendees: s.ticketing?.maxCapacity || 100,
      currentAttendees: s.audience?.actualAttendees || 0,
      imageUrl: s.media?.imageUrl || s.artist?.imageUrl || "", // Priorizar media.imageUrl
      audioUrl: s.media?.audioUrl || "", // ✅ Ahora existe en el modelo
      isLive: s.status === "live",
      isFeatured: s.isFeatured || false, // ✅ Ahora existe en el modelo
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      // Campos adicionales del modelo real
      streamUrl: s.streamingInfo?.streamUrl || "",
      recordingUrl: s.streamingInfo?.recordingUrl || "",
      socialLinks: s.artist?.socialLinks || {},
      audience: s.audience || {
        onlineViewers: 0,
        actualAttendees: 0,
        expectedAttendees: 0,
        maxViewers: 0,
      },
      engagement: s.engagement || {
        likes: 0,
        shares: 0,
        comments: 0,
        donations: 0,
        donationAmount: 0,
      },
      ticketing: s.ticketing || {
        isFree: true,
        ticketPrice: 0,
        maxCapacity: 100,
        soldTickets: 0,
      },
      tags: s.tags || [],
      setlist: s.setlist || [],
      ageRestriction: s.ageRestriction || 0,
      language: s.language || "es",
      isPublic: s.isPublic !== false,
    }));
    return sendOk(res, mapped);
  } catch (error) {
    console.error("Error listing sessions:", error);
    return sendError(res, "Error al obtener sesiones", 500);
  }
}
export async function createSession(req: Request, res: Response) {
  try {
    const payload = req.body;

    const doc = await (MetroSessionModel as any).create({
      title: payload.title,
      description: payload.description,
      genre: payload.genre || "Fusión",
      scheduledDate: payload.startsAt ? new Date(payload.startsAt) : new Date(),
      endDate: payload.endsAt ? new Date(payload.endsAt) : null,
      artist: {
        name: payload.artist || "Artista Desconocido",
        bio: payload.artistBio || "",
        imageUrl: "",
        socialLinks: {},
        isVerified: false
      },
      media: {
        imageUrl: payload.imageUrl || "",
        audioUrl: payload.audioUrl || "",
        thumbnailUrl: payload.imageUrl || ""
      },
      duration: payload.duration || 60,
      location: {
        stationName: payload.location || "Estación Central",
        line: "1",
      },
      status: payload.status || "scheduled",
      isFeatured: payload.isFeatured || false,
      audience: {
        expectedAttendees: payload.maxAttendees || 100,
        actualAttendees: 0,
        onlineViewers: 0,
        maxViewers: 0,
      },
      ticketing: {
        isFree: true,
        ticketPrice: 0,
        maxCapacity: payload.maxAttendees || 100,
        soldTickets: 0,
      },
      engagement: {
        likes: 0,
        shares: 0,
        comments: 0,
        donations: 0,
        donationAmount: 0,
      },
      streamingInfo: {
        streamUrl: "",
        streamKey: "",
        isLiveStreamed: true,
        recordingUrl: "",
      },
      tags: [],
      ageRestriction: 0,
      language: "es",
      isPublic: true,
    });

    return sendCreated(res, { id: (doc as any)._id, success: true });
  } catch (error) {
    console.error("Error creating session:", error);
    return sendError(res, "Error al crear sesión", 500);
  }
}
export async function updateSession(req: Request, res: Response) {
  try {
    const payload = req.body;
    
    console.log('Updating session:', req.params.id, 'with payload:', payload);
    
    // Primero obtener el documento existente
    const existingSession = await (MetroSessionModel as any).findById(req.params.id);
    if (!existingSession) return sendError(res, "Sesión no encontrada", 404);
    
    console.log('Existing session structure:', JSON.stringify(existingSession, null, 2));
    
    const update: any = {};
    
    // Campos básicos que existen en el modelo
    if (payload.title) update.title = payload.title;
    if (payload.description) update.description = payload.description;
    if (payload.genre) update.genre = payload.genre;
    if (payload.status) update.status = payload.status;
    if (payload.startsAt) update.scheduledDate = new Date(payload.startsAt);
    if (payload.endsAt) update.endDate = new Date(payload.endsAt);
    if (payload.duration) update.duration = payload.duration;
    if (payload.isFeatured !== undefined) update.isFeatured = payload.isFeatured;
    
    // Ubicación - usar $set con estructura completa
    if (payload.location) {
      update.location = {
        stationName: payload.location,
        line: existingSession.location?.line || '1',
        platform: existingSession.location?.platform || '',
        coordinates: existingSession.location?.coordinates || {}
      };
    }
    
    // Artista - usar $set con estructura completa
    if (payload.artist) {
      update.artist = {
        name: payload.artist,
        bio: existingSession.artist?.bio || '',
        imageUrl: existingSession.artist?.imageUrl || '',
        socialLinks: existingSession.artist?.socialLinks || {},
        isVerified: existingSession.artist?.isVerified || false
      };
    }
    
    // Media - usar $set con estructura completa
    if (payload.imageUrl || payload.audioUrl) {
      update.media = {
        imageUrl: payload.imageUrl || existingSession.media?.imageUrl || '',
        audioUrl: payload.audioUrl || existingSession.media?.audioUrl || '',
        thumbnailUrl: payload.imageUrl || existingSession.media?.thumbnailUrl || ''
      };
    }
    
    // Ticketing - usar $set con estructura completa
    if (payload.maxAttendees) {
      update.ticketing = {
        ...existingSession.ticketing,
        maxCapacity: payload.maxAttendees
      };
      update.audience = {
        ...existingSession.audience,
        expectedAttendees: payload.maxAttendees
      };
    }
    
    console.log('Final update object:', JSON.stringify(update, null, 2));
    
    const updated = await (MetroSessionModel as any)
      .findByIdAndUpdate(req.params.id, update, { new: true })
      .lean();

    if (!updated) return sendError(res, "Sesión no encontrada", 404);

    console.log('✅ Session updated successfully');
    return sendOk(res, { id: updated._id, success: true });
  } catch (error) {
    console.error("❌ Error updating session:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return sendError(res, `Error al actualizar sesión: ${error.message}`, 500);
  }
}
export async function deleteSession(req: Request, res: Response) {
  try {
    await (MetroSessionModel as any).findByIdAndDelete(req.params.id);
    return sendNoContent(res);
  } catch {
    return sendError(res, "Error", 500);
  }
}
export async function getStats(_req: Request, res: Response) {
  try {
    const [total, live] = await Promise.all([
      MetroSessionModel.countDocuments(),
      MetroSessionModel.countDocuments({ status: "live" }),
    ]);
    const agg = await MetroSessionModel.aggregate([
      { $group: { _id: null, avg: { $avg: "$audience.onlineViewers" } } },
    ]);
    return sendOk(res, {
      total,
      live,
      avgViewers: Math.round(agg[0]?.avg || 0),
    });
  } catch {
    return sendError(res, "Error", 500);
  }
}
export async function getLive(_req: Request, res: Response) {
  try {
    const live = await (MetroSessionModel as any)
      .find({ status: "live" })
      .sort({ "audience.onlineViewers": -1 })
      .lean();
    const mapped = live.map((l: any) => ({
      id: l._id,
      title: l.title,
      startedAt: l.updatedAt,
      viewers: l.audience?.onlineViewers || 0,
    }));
    return sendOk(res, mapped);
  } catch {
    return sendError(res, "Error", 500);
  }
}
