import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { sendError, sendOk } from '../../utils/response';
import { StreamDonationModel, MetroLiveStreamModel } from '../../models/metro-live.model';
import { UserModel } from '../../models/user.model';
import { PointsTrackingModel } from '../../models/points-tracking.model';
import mongoose from 'mongoose';

export class DonationsAdminController {
  // Obtener resumen de donaciones
  static async getDonationsOverview(req: AuthenticatedRequest, res: Response) {
    try {
      const { period = '30d' } = req.query;
      
      // Calcular fecha de inicio según el período
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Estadísticas generales
      const [
        totalDonations,
        totalAmount,
        uniqueDonors,
        topStreamers,
        topDonors,
        dailyStats,
        recentDonations
      ] = await Promise.all([
        // Total de donaciones en el período
        StreamDonationModel.countDocuments({
          createdAt: { $gte: startDate }
        }),

        // Monto total donado
        StreamDonationModel.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),

        // Donantes únicos
        StreamDonationModel.distinct('donorId', {
          createdAt: { $gte: startDate }
        }),

        // Top streamers por donaciones recibidas
        StreamDonationModel.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { 
            $group: { 
              _id: '$streamerId', 
              totalAmount: { $sum: '$amount' },
              donationsCount: { $sum: 1 }
            } 
          },
          { $sort: { totalAmount: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'streamer'
            }
          },
          { $unwind: '$streamer' },
          {
            $project: {
              streamerId: '$_id',
              streamerName: '$streamer.displayName',
              streamerAvatar: '$streamer.avatarUrl',
              totalAmount: 1,
              donationsCount: 1
            }
          }
        ]),

        // Top donantes
        StreamDonationModel.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { 
            $group: { 
              _id: '$donorId', 
              totalAmount: { $sum: '$amount' },
              donationsCount: { $sum: 1 }
            } 
          },
          { $sort: { totalAmount: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'donor'
            }
          },
          { $unwind: '$donor' },
          {
            $project: {
              donorId: '$_id',
              donorName: '$donor.displayName',
              donorAvatar: '$donor.avatarUrl',
              totalAmount: 1,
              donationsCount: 1
            }
          }
        ]),

        // Estadísticas diarias
        StreamDonationModel.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
              },
              amount: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]),

        // Donaciones recientes
        StreamDonationModel.find({
          createdAt: { $gte: startDate }
        })
          .populate('donorId', 'displayName avatarUrl')
          .populate('streamerId', 'displayName avatarUrl')
          .populate('streamId', 'title')
          .sort({ createdAt: -1 })
          .limit(20)
      ]);

      // Calcular comisiones (10% de las donaciones)
      const totalAmountValue = totalAmount[0]?.total || 0;
      const platformCommission = Math.floor(totalAmountValue * 0.1);
      const streamersEarnings = totalAmountValue - platformCommission;

      return sendOk(res, {
        overview: {
          totalDonations,
          totalAmount: totalAmountValue,
          uniqueDonors: uniqueDonors.length,
          platformCommission,
          streamersEarnings,
          averageDonation: totalDonations > 0 ? Math.round(totalAmountValue / totalDonations) : 0
        },
        topStreamers,
        topDonors,
        dailyStats: dailyStats.map(stat => ({
          date: `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}-${String(stat._id.day).padStart(2, '0')}`,
          amount: stat.amount,
          count: stat.count
        })),
        recentDonations: recentDonations.map(donation => ({
          id: donation._id,
          amount: donation.amount,
          message: donation.message,
          createdAt: donation.createdAt,
          donor: {
            id: (donation.donorId as any)?._id,
            name: (donation.donorId as any)?.displayName,
            avatar: (donation.donorId as any)?.avatarUrl
          },
          streamer: {
            id: (donation.streamerId as any)?._id,
            name: (donation.streamerId as any)?.displayName,
            avatar: (donation.streamerId as any)?.avatarUrl
          },
          stream: {
            id: (donation.streamId as any)?._id,
            title: (donation.streamId as any)?.title
          }
        }))
      });

    } catch (error) {
      console.error('Error in getDonationsOverview:', error);
      return sendError(res, 'Error obteniendo estadísticas de donaciones', 500);
    }
  }

  // Obtener donaciones con filtros y paginación
  static async getDonations(req: AuthenticatedRequest, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        streamerId, 
        donorId, 
        minAmount, 
        maxAmount,
        startDate,
        endDate 
      } = req.query;

      // Construir filtros
      const filters: any = {};
      
      if (streamerId) filters.streamerId = new mongoose.Types.ObjectId(streamerId as string);
      if (donorId) filters.donorId = new mongoose.Types.ObjectId(donorId as string);
      if (minAmount) filters.amount = { $gte: Number(minAmount) };
      if (maxAmount) filters.amount = { ...filters.amount, $lte: Number(maxAmount) };
      
      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) filters.createdAt.$gte = new Date(startDate as string);
        if (endDate) filters.createdAt.$lte = new Date(endDate as string);
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [donations, total] = await Promise.all([
        StreamDonationModel.find(filters)
          .populate('donorId', 'displayName avatarUrl email phone')
          .populate('streamerId', 'displayName avatarUrl')
          .populate('streamId', 'title category')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        
        StreamDonationModel.countDocuments(filters)
      ]);

      return sendOk(res, {
        donations: donations.map(donation => ({
          id: donation._id,
          amount: donation.amount,
          message: donation.message,
          isAnonymous: donation.isAnonymous,
          createdAt: donation.createdAt,
          donor: donation.donorId ? {
            id: (donation.donorId as any)?._id,
            name: (donation.donorId as any)?.displayName,
            avatar: (donation.donorId as any)?.avatarUrl,
            email: (donation.donorId as any)?.email,
            phone: (donation.donorId as any)?.phone
          } : null,
          streamer: {
            id: (donation.streamerId as any)?._id,
            name: (donation.streamerId as any)?.displayName,
            avatar: (donation.streamerId as any)?.avatarUrl
          },
          stream: {
            id: (donation.streamId as any)?._id,
            title: (donation.streamId as any)?.title,
            category: (donation.streamId as any)?.category
          }
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('Error in getDonations:', error);
      return sendError(res, 'Error obteniendo donaciones', 500);
    }
  }

  // Obtener analytics de streamers
  static async getStreamersAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const { period = '30d' } = req.query;
      
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Estadísticas de streamers
      const streamersStats = await UserModel.aggregate([
        { $match: { role: 'metro_streamer' } },
        {
          $lookup: {
            from: 'metrolivesstreams',
            localField: '_id',
            foreignField: 'streamerId',
            as: 'streams'
          }
        },
        {
          $lookup: {
            from: 'streamdonations',
            let: { streamerId: '$_id' },
            pipeline: [
              { 
                $match: { 
                  $expr: { $eq: ['$streamerId', '$$streamerId'] },
                  createdAt: { $gte: startDate }
                }
              }
            ],
            as: 'donations'
          }
        },
        {
          $addFields: {
            totalStreams: { $size: '$streams' },
            activeStreams: {
              $size: {
                $filter: {
                  input: '$streams',
                  cond: { $eq: ['$$this.status', 'live'] }
                }
              }
            },
            totalDonations: { $sum: '$donations.amount' },
            donationsCount: { $size: '$donations' },
            avgDonation: {
              $cond: {
                if: { $gt: [{ $size: '$donations' }, 0] },
                then: { $divide: [{ $sum: '$donations.amount' }, { $size: '$donations' }] },
                else: 0
              }
            }
          }
        },
        {
          $project: {
            id: '$_id',
            name: '$displayName',
            avatar: '$avatarUrl',
            email: '$email',
            isActive: '$isActive',
            createdAt: '$createdAt',
            totalStreams: 1,
            activeStreams: 1,
            totalDonations: 1,
            donationsCount: 1,
            avgDonation: { $round: ['$avgDonation', 2] },
            streamerProfile: '$streamerProfile'
          }
        },
        { $sort: { totalDonations: -1 } }
      ]);

      // Estadísticas generales de streamers
      const totalStreamers = await UserModel.countDocuments({ role: 'metro_streamer' });
      const activeStreamers = await UserModel.countDocuments({ 
        role: 'metro_streamer', 
        isActive: true 
      });
      const liveStreamers = await MetroLiveStreamModel.countDocuments({ status: 'live' });

      return sendOk(res, {
        overview: {
          totalStreamers,
          activeStreamers,
          liveStreamers,
          inactiveStreamers: totalStreamers - activeStreamers
        },
        streamers: streamersStats
      });

    } catch (error) {
      console.error('Error in getStreamersAnalytics:', error);
      return sendError(res, 'Error obteniendo analytics de streamers', 500);
    }
  }

  // Obtener configuración de comisiones
  static async getCommissionConfig(req: AuthenticatedRequest, res: Response) {
    try {
      // Por ahora retornamos configuración hardcodeada
      // En el futuro se puede guardar en BD
      return sendOk(res, {
        streamerPercentage: 90,
        platformPercentage: 10,
        minDonation: 10,
        maxDonation: 1000,
        lastUpdated: new Date(),
        updatedBy: 'system'
      });
    } catch (error) {
      return sendError(res, 'Error obteniendo configuración', 500);
    }
  }

  // Actualizar configuración de comisiones
  static async updateCommissionConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const { streamerPercentage, platformPercentage, minDonation, maxDonation } = req.body;
      
      // Validaciones
      if (streamerPercentage + platformPercentage !== 100) {
        return sendError(res, 'Los porcentajes deben sumar 100%', 400);
      }
      
      if (minDonation >= maxDonation) {
        return sendError(res, 'El mínimo debe ser menor al máximo', 400);
      }

      // Por ahora solo retornamos la configuración actualizada
      // En el futuro se guardará en BD
      return sendOk(res, {
        streamerPercentage,
        platformPercentage,
        minDonation,
        maxDonation,
        lastUpdated: new Date(),
        updatedBy: req.user?.id
      });
      
    } catch (error) {
      return sendError(res, 'Error actualizando configuración', 500);
    }
  }

  // Exportar reporte de donaciones
  static async exportDonationsReport(req: AuthenticatedRequest, res: Response) {
    try {
      const { format = 'json', period = '30d' } = req.query;
      
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const donations = await StreamDonationModel.find({
        createdAt: { $gte: startDate }
      })
        .populate('donorId', 'displayName email phone')
        .populate('streamerId', 'displayName email')
        .populate('streamId', 'title category')
        .sort({ createdAt: -1 });

      const reportData = donations.map(donation => ({
        id: donation._id,
        fecha: donation.createdAt.toISOString(),
        monto: donation.amount,
        mensaje: donation.message,
        donante: (donation.donorId as any)?.displayName || 'Anónimo',
        donante_email: (donation.donorId as any)?.email || '',
        donante_telefono: (donation.donorId as any)?.phone || '',
        streamer: (donation.streamerId as any)?.displayName,
        streamer_email: (donation.streamerId as any)?.email,
        stream_titulo: (donation.streamId as any)?.title,
        stream_categoria: (donation.streamId as any)?.category,
        comision_plataforma: Math.floor(donation.amount * 0.1),
        ganancia_streamer: Math.floor(donation.amount * 0.9)
      }));

      if (format === 'csv') {
        // Generar CSV
        const csv = [
          Object.keys(reportData[0]).join(','),
          ...reportData.map(row => Object.values(row).join(','))
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="donaciones_${period}.csv"`);
        return res.send(csv);
      }

      return sendOk(res, {
        period,
        generatedAt: new Date(),
        totalRecords: reportData.length,
        totalAmount: reportData.reduce((sum, item) => sum + item.monto, 0),
        data: reportData
      });

    } catch (error) {
      console.error('Error in exportDonationsReport:', error);
      return sendError(res, 'Error exportando reporte', 500);
    }
  }
}
