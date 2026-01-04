import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { PoliticalCandidateModel, PoliticalPartyModel } from '../models/political-candidate.model';
import { sendOk, sendError, sendCreated } from '../utils/response';

export class VotoSeguroController {
  
  // Obtener todos los partidos políticos
  static async getPoliticalParties(req: Request, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search, 
        active = 'true' 
      } = req.query;

      const filters: any = {};
      
      if (active === 'true') {
        filters.isActive = true;
      }

      if (search) {
        filters.$text = { $search: search as string };
      }

      const parties = await PoliticalPartyModel
        .find(filters)
        .sort({ name: 1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .select('-__v')
        .lean();

      const total = await PoliticalPartyModel.countDocuments(filters);

      return sendOk(res, {
        parties,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('Error getting political parties:', error);
      return sendError(res, 'Error obteniendo partidos políticos', 500);
    }
  }

  // Obtener detalles de un partido político
  static async getPoliticalPartyDetails(req: Request, res: Response) {
    try {
      const { partyId } = req.params;

      const party = await PoliticalPartyModel.findById(partyId);
      
      if (!party) {
        return sendError(res, 'Partido político no encontrado', 404);
      }

      // Obtener candidatos del partido
      const candidates = await PoliticalCandidateModel
        .find({ 
          politicalParty: partyId, 
          isActive: true 
        })
        .select('fullName shortName position photoUrl electionYear statistics')
        .sort({ position: 1, 'statistics.views': -1 });

      return sendOk(res, {
        party,
        candidates
      });

    } catch (error) {
      console.error('Error getting party details:', error);
      return sendError(res, 'Error obteniendo detalles del partido', 500);
    }
  }

  // Obtener candidatos políticos
  static async getCandidates(req: Request, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search, 
        position, 
        party,
        electionYear = new Date().getFullYear(),
        region,
        district,
        sortBy = 'views' 
      } = req.query;

      const filters: any = { 
        isActive: true,
        electionYear: Number(electionYear)
      };

      if (search) {
        filters.$text = { $search: search as string };
      }

      if (position) {
        filters.position = position;
      }

      if (party && party !== 'undefined' && party !== 'null') {
        filters.politicalParty = party;
      }

      if (region) {
        filters.region = region;
      }

      if (district) {
        filters.district = district;
      }

      // Configurar ordenamiento
      let sortOption: any = {};
      switch (sortBy) {
        case 'views':
          sortOption = { 'statistics.views': -1 };
          break;
        case 'likes':
          sortOption = { 'statistics.likes': -1 };
          break;
        case 'name':
          sortOption = { fullName: 1 };
          break;
        case 'recent':
          sortOption = { createdAt: -1 };
          break;
        default:
          sortOption = { 'statistics.views': -1 };
      }

      const candidates = await PoliticalCandidateModel
        .find(filters)
        .populate('politicalParty', 'name shortName logoUrl primaryColor secondaryColor')
        .sort(sortOption)
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .select('-__v -legalInfo -economicInfo')
        .lean();

      const total = await PoliticalCandidateModel.countDocuments(filters);

      return sendOk(res, {
        candidates,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('Error getting candidates:', error);
      return sendError(res, 'Error obteniendo candidatos', 500);
    }
  }

  // Obtener detalles de un candidato
  static async getCandidateDetails(req: Request, res: Response) {
    try {
      const { candidateId } = req.params;

      const candidate = await PoliticalCandidateModel
        .findById(candidateId)
        .populate('politicalParty', 'name shortName logoUrl primaryColor secondaryColor description mainProposals')
        .select('-__v');

      if (!candidate) {
        return sendError(res, 'Candidato no encontrado', 404);
      }

      // Incrementar contador de vistas
      await PoliticalCandidateModel.findByIdAndUpdate(candidateId, {
        $inc: { 'statistics.views': 1 }
      });

      return sendOk(res, { candidate });

    } catch (error) {
      console.error('Error getting candidate details:', error);
      return sendError(res, 'Error obteniendo detalles del candidato', 500);
    }
  }

  // Dar like a un candidato
  static async likeCandidateProposal(req: AuthenticatedRequest, res: Response) {
    try {
      const { candidateId } = req.params;
      const { proposalIndex } = req.body;

      const candidate = await PoliticalCandidateModel.findById(candidateId);
      
      if (!candidate) {
        return sendError(res, 'Candidato no encontrado', 404);
      }

      if (proposalIndex !== undefined && (proposalIndex < 0 || proposalIndex >= candidate.proposals.length)) {
        return sendError(res, 'Propuesta no encontrada', 404);
      }

      // Incrementar likes del candidato
      await PoliticalCandidateModel.findByIdAndUpdate(candidateId, {
        $inc: { 'statistics.likes': 1 }
      });

      return sendOk(res, { 
        message: 'Like registrado',
        newLikesCount: candidate.statistics.likes + 1
      });

    } catch (error) {
      console.error('Error liking candidate proposal:', error);
      return sendError(res, 'Error registrando like', 500);
    }
  }

  // Compartir candidato
  static async shareCandidate(req: AuthenticatedRequest, res: Response) {
    try {
      const { candidateId } = req.params;
      const { platform } = req.body;

      const candidate = await PoliticalCandidateModel.findById(candidateId);
      
      if (!candidate) {
        return sendError(res, 'Candidato no encontrado', 404);
      }

      // Incrementar contador de compartidos
      await PoliticalCandidateModel.findByIdAndUpdate(candidateId, {
        $inc: { 'statistics.shares': 1 }
      });

      return sendOk(res, { 
        message: 'Compartido registrado',
        shareUrl: `https://telemetro.pe/voto-seguro/candidato/${candidateId}`,
        newSharesCount: candidate.statistics.shares + 1
      });

    } catch (error) {
      console.error('Error sharing candidate:', error);
      return sendError(res, 'Error registrando compartido', 500);
    }
  }

  // Obtener candidatos por posición
  static async getCandidatesByPosition(req: Request, res: Response) {
    try {
      const { position } = req.params;
      const { 
        electionYear = new Date().getFullYear(),
        region,
        limit = 50 
      } = req.query;

      const filters: any = { 
        position,
        isActive: true,
        electionYear: Number(electionYear)
      };

      if (region) {
        filters.region = region;
      }

      const candidates = await PoliticalCandidateModel
        .find(filters)
        .populate('politicalParty', 'name shortName logoUrl primaryColor campaignInfo')
        .sort({ 'statistics.views': -1 })
        .limit(Number(limit))
        .select('fullName shortName photoUrl campaignInfo.slogan proposals statistics politicalParty')
        .lean();

      return sendOk(res, { candidates });

    } catch (error) {
      console.error('Error getting candidates by position:', error);
      return sendError(res, 'Error obteniendo candidatos por posición', 500);
    }
  }

  // Buscar candidatos y partidos
  static async searchPolitical(req: Request, res: Response) {
    try {
      const { 
        query, 
        type = 'all', // 'candidates', 'parties', 'all'
        limit = 20 
      } = req.query;

      if (!query || (query as string).length < 2) {
        return sendError(res, 'La búsqueda debe tener al menos 2 caracteres', 400);
      }

      const searchFilters = {
        $text: { $search: query as string },
        isActive: true
      };

      let results: any = {};

      if (type === 'candidates' || type === 'all') {
        const candidates = await PoliticalCandidateModel
          .find(searchFilters)
          .populate('politicalParty', 'name logoUrl primaryColor')
          .sort({ score: { $meta: 'textScore' } })
          .limit(Number(limit))
          .select('fullName shortName position photoUrl statistics politicalParty')
          .lean();

        results.candidates = candidates;
      }

      if (type === 'parties' || type === 'all') {
        const parties = await PoliticalPartyModel
          .find(searchFilters)
          .sort({ score: { $meta: 'textScore' } })
          .limit(Number(limit))
          .select('name shortName logoUrl primaryColor description')
          .lean();

        results.parties = parties;
      }

      return sendOk(res, results);

    } catch (error) {
      console.error('Error searching political:', error);
      return sendError(res, 'Error en la búsqueda', 500);
    }
  }

  // Obtener estadísticas generales
  static async getVotoSeguroStats(req: Request, res: Response) {
    try {
      const currentYear = new Date().getFullYear();

      const [
        totalCandidates,
        totalParties,
        candidatesByPosition,
        topCandidates,
        topParties,
        recentActivity
      ] = await Promise.all([
        PoliticalCandidateModel.countDocuments({ 
          isActive: true, 
          electionYear: currentYear 
        }),
        PoliticalPartyModel.countDocuments({ isActive: true }),
        PoliticalCandidateModel.aggregate([
          { 
            $match: { 
              isActive: true, 
              electionYear: currentYear 
            } 
          },
          { 
            $group: { 
              _id: '$position', 
              count: { $sum: 1 } 
            } 
          },
          { $sort: { count: -1 } }
        ]),
        PoliticalCandidateModel
          .find({ isActive: true, electionYear: currentYear })
          .populate('politicalParty', 'name logoUrl')
          .sort({ 'statistics.views': -1 })
          .limit(10)
          .select('fullName position statistics politicalParty'),
        PoliticalPartyModel
          .find({ isActive: true })
          .sort({ createdAt: -1 })
          .limit(10)
          .select('name logoUrl primaryColor'),
        PoliticalCandidateModel.aggregate([
          { 
            $match: { 
              createdAt: { 
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
              } 
            } 
          },
          { 
            $group: { 
              _id: { 
                $dateToString: { 
                  format: '%Y-%m-%d', 
                  date: '$createdAt' 
                } 
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ])
      ]);

      return sendOk(res, {
        totalCandidates,
        totalParties,
        candidatesByPosition,
        topCandidates,
        topParties,
        recentActivity,
        electionYear: currentYear
      });

    } catch (error) {
      console.error('Error getting voto seguro stats:', error);
      return sendError(res, 'Error obteniendo estadísticas', 500);
    }
  }

  // MÉTODOS PARA ADMINISTRACIÓN

  // Crear candidato (Admin)
  static async createCandidate(req: AuthenticatedRequest, res: Response) {
    try {
      const candidateData = req.body;

      const candidate = new PoliticalCandidateModel(candidateData);
      await candidate.save();

      return sendCreated(res, {
        message: 'Candidato creado exitosamente',
        candidate: {
          id: candidate._id,
          fullName: candidate.fullName,
          position: candidate.position
        }
      });

    } catch (error) {
      console.error('Error creating candidate:', error);
      return sendError(res, 'Error creando candidato', 500);
    }
  }

  // Crear partido político (Admin)
  static async createPoliticalParty(req: AuthenticatedRequest, res: Response) {
    try {
      const partyData = req.body;

      const party = new PoliticalPartyModel(partyData);
      await party.save();

      return sendCreated(res, {
        message: 'Partido político creado exitosamente',
        party: {
          id: party._id,
          name: party.name,
          shortName: party.shortName
        }
      });

    } catch (error) {
      console.error('Error creating political party:', error);
      return sendError(res, 'Error creando partido político', 500);
    }
  }

  // Actualizar partido (Admin)
  static async updatePoliticalParty(req: AuthenticatedRequest, res: Response) {
    try {
      const { partyId } = req.params as any;
      const update = req.body;
      const party = await PoliticalPartyModel.findByIdAndUpdate(partyId, update, { new: true });
      if (!party) return sendError(res, 'Partido no encontrado', 404);
      return sendOk(res, { message: 'Partido actualizado', party });
    } catch (error) {
      console.error('Error updating political party:', error);
      return sendError(res, 'Error actualizando partido', 500);
    }
  }

  // Eliminar partido (Admin)
  static async deletePoliticalParty(req: AuthenticatedRequest, res: Response) {
    try {
      const { partyId } = req.params as any;
      const party = await PoliticalPartyModel.findByIdAndDelete(partyId);
      if (!party) return sendError(res, 'Partido no encontrado', 404);
      return sendOk(res, { message: 'Partido eliminado' });
    } catch (error) {
      console.error('Error deleting political party:', error);
      return sendError(res, 'Error eliminando partido', 500);
    }
  }

  // Actualizar candidato (Admin)
  static async updateCandidate(req: AuthenticatedRequest, res: Response) {
    try {
      const { candidateId } = req.params as any;
      const update = req.body;
      const cand = await PoliticalCandidateModel.findByIdAndUpdate(candidateId, update, { new: true });
      if (!cand) return sendError(res, 'Candidato no encontrado', 404);
      return sendOk(res, { message: 'Candidato actualizado', candidate: cand });
    } catch (error) {
      console.error('Error updating candidate:', error);
      return sendError(res, 'Error actualizando candidato', 500);
    }
  }

  // Eliminar candidato (Admin)
  static async deleteCandidate(req: AuthenticatedRequest, res: Response) {
    try {
      const { candidateId } = req.params as any;
      const cand = await PoliticalCandidateModel.findByIdAndDelete(candidateId);
      if (!cand) return sendError(res, 'Candidato no encontrado', 404);
      return sendOk(res, { message: 'Candidato eliminado' });
    } catch (error) {
      console.error('Error deleting candidate:', error);
      return sendError(res, 'Error eliminando candidato', 500);
    }
  }

  // Importar CSV de candidatos (Admin)
  static async importCandidatesCsv(req: AuthenticatedRequest, res: Response) {
    try {
      const { csv } = req.body as any; // Texto CSV
      if (!csv || typeof csv !== 'string') return sendError(res, 'CSV requerido', 400);
      const lines = csv.split(/\r?\n/).filter(Boolean);
      const [header, ...rows] = lines;
      const cols = header.split(',').map(c => c.trim());
      const inserted: any[] = [];
      for (const row of rows) {
        const values = row.split(',');
        const rec: any = {};
        cols.forEach((k, i) => { rec[k] = values[i]; });
        // Mapear mínimos requeridos
        if (!rec.fullName || !rec.shortName || !rec.position || !rec.politicalParty) continue;
        rec.electionYear = Number(rec.electionYear || new Date().getFullYear());
        const candidate = new PoliticalCandidateModel(rec);
        await candidate.save();
        inserted.push({ id: candidate._id, fullName: candidate.fullName });
      }
      return sendOk(res, { insertedCount: inserted.length, inserted });
    } catch (error) {
      console.error('Error importing candidates CSV:', error);
      return sendError(res, 'Error importando CSV', 500);
    }
  }

  // Importar CSV de partidos (Admin)
  static async importPartiesCsv(req: AuthenticatedRequest, res: Response) {
    try {
      const { csv } = req.body as any;
      if (!csv || typeof csv !== 'string') return sendError(res, 'CSV requerido', 400);
      const lines = csv.split(/\r?\n/).filter(Boolean);
      const [header, ...rows] = lines;
      const cols = header.split(',').map(c => c.trim());
      const inserted: any[] = [];
      for (const row of rows) {
        const values = row.split(',');
        const rec: any = {};
        cols.forEach((k, i) => { rec[k] = values[i]; });
        if (!rec.name || !rec.shortName || !rec.foundedYear || !rec.registrationNumber) continue;
        rec.foundedYear = Number(rec.foundedYear);
        const party = new PoliticalPartyModel(rec);
        await party.save();
        inserted.push({ id: party._id, name: party.name });
      }
      return sendOk(res, { insertedCount: inserted.length, inserted });
    } catch (error) {
      console.error('Error importing parties CSV:', error);
      return sendError(res, 'Error importando CSV', 500);
    }
  }
}
