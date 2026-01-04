import mongoose, { Schema, Document } from 'mongoose';

export interface PoliticalCandidateDocument extends Document {
  fullName: string;
  shortName: string;
  politicalParty: mongoose.Types.ObjectId;
  position: 'president' | 'vice_president' | 'congress' | 'mayor' | 'regional_governor' | 'regional_councilor' | 'municipal_councilor';
  photoUrl: string;
  biography: string;
  education: string[];
  workExperience: string[];
  previousPoliticalExperience?: string[];
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    tiktok?: string;
    website?: string;
  };
  proposals: {
    title: string;
    description: string;
    category: 'economy' | 'education' | 'health' | 'security' | 'infrastructure' | 'environment' | 'technology' | 'social' | 'culture' | 'sports';
    priority: number;
  }[];
  personalInfo: {
    birthDate: Date;
    birthPlace: string;
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
    children: number;
    profession: string;
  };
  legalInfo: {
    hasLegalIssues: boolean;
    legalIssues?: string[];
    criminalRecord: boolean;
    criminalRecordDetails?: string;
  };
  economicInfo: {
    patrimony?: number;
    incomeDeclaration?: string;
    businessInterests?: string[];
  };
  campaignInfo: {
    slogan?: string;
    campaignColors: string[];
    logo?: string;
    partyNumber: number;
  };
  statistics: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
  isActive: boolean;
  isVerified: boolean;
  verificationDate?: Date;
  electionYear: number;
  region?: string;
  district?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PoliticalCandidateSchema = new Schema<PoliticalCandidateDocument>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: 'text'
    },
    shortName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    politicalParty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PoliticalParty',
      required: true,
      index: true
    },
    position: {
      type: String,
      enum: ['president', 'vice_president', 'congress', 'mayor', 'regional_governor', 'regional_councilor', 'municipal_councilor'],
      required: true,
      index: true
    },
    photoUrl: {
      type: String,
      required: true,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(v);
        },
        message: 'URL de foto inválida'
      }
    },
    biography: {
      type: String,
      required: true,
      maxlength: 2000
    },
    education: [{
      type: String,
      maxlength: 200
    }],
    workExperience: [{
      type: String,
      maxlength: 200
    }],
    previousPoliticalExperience: [{
      type: String,
      maxlength: 200
    }],
    socialLinks: {
      facebook: String,
      twitter: String,
      instagram: String,
      tiktok: String,
      website: String
    },
    proposals: [{
      title: {
        type: String,
        required: true,
        maxlength: 100
      },
      description: {
        type: String,
        required: true,
        maxlength: 1000
      },
      category: {
        type: String,
        enum: ['economy', 'education', 'health', 'security', 'infrastructure', 'environment', 'technology', 'social', 'culture', 'sports'],
        required: true
      },
      priority: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
      }
    }],
    personalInfo: {
      birthDate: {
        type: Date,
        required: true
      },
      birthPlace: {
        type: String,
        required: true,
        maxlength: 100
      },
      maritalStatus: {
        type: String,
        enum: ['single', 'married', 'divorced', 'widowed'],
        required: true
      },
      children: {
        type: Number,
        min: 0,
        default: 0
      },
      profession: {
        type: String,
        required: true,
        maxlength: 100
      }
    },
    legalInfo: {
      hasLegalIssues: {
        type: Boolean,
        default: false
      },
      legalIssues: [String],
      criminalRecord: {
        type: Boolean,
        default: false
      },
      criminalRecordDetails: String
    },
    economicInfo: {
      patrimony: Number,
      incomeDeclaration: String,
      businessInterests: [String]
    },
    campaignInfo: {
      slogan: String,
      campaignColors: [String],
      logo: String,
      partyNumber: {
        type: Number,
        required: true,
        min: 1
      }
    },
    statistics: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      comments: { type: Number, default: 0 }
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    verificationDate: Date,
    electionYear: {
      type: Number,
      required: true,
      index: true
    },
    region: {
      type: String,
      maxlength: 50,
      index: true
    },
    district: {
      type: String,
      maxlength: 50,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Índices para optimizar búsquedas
PoliticalCandidateSchema.index({ fullName: 'text', biography: 'text' });
PoliticalCandidateSchema.index({ position: 1, electionYear: 1 });
PoliticalCandidateSchema.index({ politicalParty: 1, isActive: 1 });
PoliticalCandidateSchema.index({ 'statistics.views': -1 });
PoliticalCandidateSchema.index({ createdAt: -1 });

export const PoliticalCandidateModel = mongoose.model<PoliticalCandidateDocument>('PoliticalCandidate', PoliticalCandidateSchema);

// Modelo para partidos políticos
export interface PoliticalPartyDocument extends Document {
  name: string;
  shortName: string;
  foundedYear: number;
  ideology: string[];
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  website?: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    tiktok?: string;
  };
  description: string;
  mainProposals: string[];
  leaders: {
    name: string;
    position: string;
    photoUrl?: string;
  }[];
  isActive: boolean;
  registrationNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

const PoliticalPartySchema = new Schema<PoliticalPartyDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
      index: 'text'
    },
    shortName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    foundedYear: {
      type: Number,
      required: true,
      min: 1900,
      max: new Date().getFullYear()
    },
    ideology: [{
      type: String,
      enum: ['left', 'center-left', 'center', 'center-right', 'right', 'populist', 'progressive', 'conservative', 'liberal', 'social-democrat']
    }],
    logoUrl: {
      type: String,
      required: true,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+\.(jpg|jpeg|png|svg|webp)$/i.test(v);
        },
        message: 'URL de logo inválida'
      }
    },
    primaryColor: {
      type: String,
      required: true,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    },
    secondaryColor: {
      type: String,
      required: true,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    },
    website: String,
    socialLinks: {
      facebook: String,
      twitter: String,
      instagram: String,
      tiktok: String
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000
    },
    mainProposals: [{
      type: String,
      maxlength: 500
    }],
    leaders: [{
      name: {
        type: String,
        required: true,
        maxlength: 100
      },
      position: {
        type: String,
        required: true,
        maxlength: 100
      },
      photoUrl: String
    }],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true
    }
  },
  {
    timestamps: true
  }
);

// Índices para partidos políticos
PoliticalPartySchema.index({ name: 'text', description: 'text' });
PoliticalPartySchema.index({ isActive: 1 });

export const PoliticalPartyModel = mongoose.model<PoliticalPartyDocument>('PoliticalParty', PoliticalPartySchema);
