/**
 * Shared mock data for Applicability Tool pages
 * Aligned with FirestoreApp and ApplicabilityTool schemas
 */

// ============================================================================
// PROGRAMS / CATEGORIES
// ============================================================================

export interface ProgramCategory {
  id: string
  name: string
  branch: string
  icon: string
  image?: string
  color: string
  bgColor: string
}

export const programs: ProgramCategory[] = [
  {
    id: 'air',
    name: 'Air Quality',
    branch: 'environmental',
    icon: 'lucide:wind',
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
  },
  {
    id: 'water',
    name: 'Water',
    branch: 'environmental',
    icon: 'lucide:droplets',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'waste',
    name: 'Waste Management',
    branch: 'environmental',
    icon: 'lucide:trash-2',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'emergency',
    name: 'Emergency Planning',
    branch: 'environmental',
    icon: 'lucide:alert-triangle',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    id: 'reporting',
    name: 'Reporting',
    branch: 'environmental',
    icon: 'lucide:file-text',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'safety',
    name: 'Safety',
    branch: 'safety',
    icon: 'lucide:hard-hat',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
]

export function getProgramById(id: string): ProgramCategory | undefined {
  return programs.find((p) => p.id === id)
}

// ============================================================================
// FACILITIES
// ============================================================================

export interface Facility {
  id: string
  name: string
  city: string
  state: string
  group: string
  type: string
  employees: number
  lastAudit: string
  coLocatedFacilityIds: string[]
}

export const facilities: Facility[] = [
  {
    id: 'facility_texas_steel',
    name: 'Texas Steel Mill',
    city: 'Houston',
    state: 'TX',
    group: 'Steel Mills',
    type: 'Integrated Steel Mill',
    employees: 1250,
    lastAudit: '2024-10-15',
    coLocatedFacilityIds: [],
  },
  {
    id: 'facility_indiana_bar',
    name: 'Indiana Bar Mill',
    city: 'Gary',
    state: 'IN',
    group: 'Steel Mills',
    type: 'Bar Mill',
    employees: 890,
    lastAudit: '2024-09-20',
    coLocatedFacilityIds: [],
  },
  {
    id: 'facility_arkansas_sheet',
    name: 'Arkansas Sheet Mill',
    city: 'Blytheville',
    state: 'AR',
    group: 'Steel Mills',
    type: 'Sheet Mill',
    employees: 650,
    lastAudit: '2024-11-05',
    coLocatedFacilityIds: [],
  },
  {
    id: 'facility_utah_plate',
    name: 'Utah Plate Mill',
    city: 'Plymouth',
    state: 'UT',
    group: 'Steel Mills',
    type: 'Plate Mill',
    employees: 480,
    lastAudit: '2024-08-30',
    coLocatedFacilityIds: [],
  },
  {
    id: 'facility_carolina_rebar',
    name: 'Carolina Rebar',
    city: 'Darlington',
    state: 'SC',
    group: 'Rebar',
    type: 'Rebar Mill',
    employees: 320,
    lastAudit: '2024-07-15',
    coLocatedFacilityIds: [],
  },
]

// ============================================================================
// QUESTIONNAIRES / TEMPLATES
// ============================================================================

export type TemplateStatus = 'published' | 'draft' | 'review'

export interface QuestionnaireTemplate {
  id: string
  name: string
  description: string
  branch: string
  program: string
  year: number
  status: TemplateStatus
  facilitiesCount: number
  questionsCount: number
}

export const questionnaires: QuestionnaireTemplate[] = [
  {
    id: 'questionnaire_env_app_tool',
    name: 'Environmental Applicability Tool',
    description: 'Comprehensive environmental regulatory applicability determination',
    branch: 'environmental',
    program: 'air',
    year: 2024,
    status: 'published',
    facilitiesCount: 45,
    questionsCount: 156,
  },
  {
    id: 'questionnaire_cems_coms',
    name: 'CEMS and COMS',
    description: 'Continuous Emission Monitoring Systems requirements',
    branch: 'environmental',
    program: 'air',
    year: 2024,
    status: 'published',
    facilitiesCount: 12,
    questionsCount: 45,
  },
  {
    id: 'questionnaire_dust_hazard',
    name: 'Dust Hazard Analysis',
    description: 'Combustible dust hazard analysis requirements',
    branch: 'safety',
    program: 'safety',
    year: 2024,
    status: 'published',
    facilitiesCount: 8,
    questionsCount: 35,
  },
]

// ============================================================================
// RESPONSE STATUS
// ============================================================================

export type ResponseStatus = '' | 'Not Applicable' | 'Applicable' | 'Not Determined' | 'Co-Location Applicable'
export type Progress = 'Incomplete' | 'Complete'

export interface ResponseStatusRecord {
  id: string
  facilityId: string
  questionnaireId: string
  status: ResponseStatus
  progress: Progress
  completedQuestions: number
  totalQuestions: number
  assignee: string | null
  lastUpdated: string
  program: string
  standard: string
}

export const responseStatuses: ResponseStatusRecord[] = [
  {
    id: 'rs_1',
    facilityId: 'facility_texas_steel',
    questionnaireId: 'questionnaire_env_app_tool',
    status: 'Applicable',
    progress: 'Complete',
    completedQuestions: 3,
    totalQuestions: 3,
    assignee: 'Sarah Chen',
    lastUpdated: '2024-12-05',
    program: 'air',
    standard: 'NESHAP Subpart ZZZZ—Stationary RICE',
  },
  {
    id: 'rs_2',
    facilityId: 'facility_texas_steel',
    questionnaireId: 'questionnaire_env_app_tool',
    status: 'Not Applicable',
    progress: 'Complete',
    completedQuestions: 2,
    totalQuestions: 2,
    assignee: 'Sarah Chen',
    lastUpdated: '2024-11-28',
    program: 'air',
    standard: 'NSPS Subpart IIII—Stationary CI Engines',
  },
  {
    id: 'rs_3',
    facilityId: 'facility_texas_steel',
    questionnaireId: 'questionnaire_env_app_tool',
    status: 'Applicable',
    progress: 'Complete',
    completedQuestions: 2,
    totalQuestions: 2,
    assignee: 'Sarah Chen',
    lastUpdated: '2024-12-01',
    program: 'reporting',
    standard: 'Regulatory Reporting',
  },
  {
    id: 'rs_4',
    facilityId: 'facility_indiana_bar',
    questionnaireId: 'questionnaire_env_app_tool',
    status: 'Not Applicable',
    progress: 'Complete',
    completedQuestions: 2,
    totalQuestions: 2,
    assignee: 'Mike Johnson',
    lastUpdated: '2024-11-20',
    program: 'air',
    standard: 'NESHAP Subpart ZZZZ—Stationary RICE',
  },
  {
    id: 'rs_5',
    facilityId: 'facility_indiana_bar',
    questionnaireId: 'questionnaire_env_app_tool',
    status: '',
    progress: 'Incomplete',
    completedQuestions: 2,
    totalQuestions: 5,
    assignee: 'Mike Johnson',
    lastUpdated: '2024-12-08',
    program: 'air',
    standard: 'NSPS Subpart IIII—Stationary CI Engines',
  },
  {
    id: 'rs_6',
    facilityId: 'facility_arkansas_sheet',
    questionnaireId: 'questionnaire_env_app_tool',
    status: 'Applicable',
    progress: 'Complete',
    completedQuestions: 3,
    totalQuestions: 3,
    assignee: 'Emily Davis',
    lastUpdated: '2024-12-08',
    program: 'waste',
    standard: 'Generator Status',
  },
  {
    id: 'rs_7',
    facilityId: 'facility_arkansas_sheet',
    questionnaireId: 'questionnaire_env_app_tool',
    status: 'Applicable',
    progress: 'Incomplete',
    completedQuestions: 3,
    totalQuestions: 5,
    assignee: 'Emily Davis',
    lastUpdated: '2024-11-15',
    program: 'air',
    standard: 'NSPS Subpart IIII—Stationary CI Engines',
  },
  {
    id: 'rs_8',
    facilityId: 'facility_utah_plate',
    questionnaireId: 'questionnaire_env_app_tool',
    status: 'Applicable',
    progress: 'Complete',
    completedQuestions: 4,
    totalQuestions: 4,
    assignee: 'Alex Park',
    lastUpdated: '2024-12-01',
    program: 'water',
    standard: '316 Intake Permits',
  },
  {
    id: 'rs_9',
    facilityId: 'facility_utah_plate',
    questionnaireId: 'questionnaire_env_app_tool',
    status: '',
    progress: 'Incomplete',
    completedQuestions: 0,
    totalQuestions: 22,
    assignee: null,
    lastUpdated: '2024-11-01',
    program: 'emergency',
    standard: 'Spill Prevention Control and Countermeasure',
  },
  {
    id: 'rs_10',
    facilityId: 'facility_carolina_rebar',
    questionnaireId: 'questionnaire_env_app_tool',
    status: 'Applicable',
    progress: 'Complete',
    completedQuestions: 3,
    totalQuestions: 3,
    assignee: 'Sarah Chen',
    lastUpdated: '2024-12-01',
    program: 'air',
    standard: 'Operating Air Permit',
  },
]

// ============================================================================
// TEAM MEMBERS
// ============================================================================

export interface TeamMember {
  id: string
  name: string
  initials: string
  email: string
  role: string
}

export const teamMembers: TeamMember[] = [
  {
    id: 'user_1',
    name: 'Sarah Chen',
    initials: 'SC',
    email: 'sarah.chen@company.com',
    role: 'Environmental Manager',
  },
  {
    id: 'user_2',
    name: 'Mike Johnson',
    initials: 'MJ',
    email: 'mike.johnson@company.com',
    role: 'Compliance Specialist',
  },
  {
    id: 'user_3',
    name: 'Emily Davis',
    initials: 'ED',
    email: 'emily.davis@company.com',
    role: 'Environmental Engineer',
  },
  {
    id: 'user_4',
    name: 'Alex Park',
    initials: 'AP',
    email: 'alex.park@company.com',
    role: 'Safety Coordinator',
  },
]

export function getTeamMemberByName(name: string): TeamMember | undefined {
  return teamMembers.find((m) => m.name === name)
}

// ============================================================================
// ACTIVITY LOG
// ============================================================================

export type ActivityType =
  | 'determination_completed'
  | 'determination_started'
  | 'question_answered'
  | 'status_changed'
  | 'template_updated'

export interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  description: string
  user: string
  timestamp: string
  facilityId?: string
  questionnaireId?: string
}

export const activityLog: ActivityItem[] = [
  {
    id: 'act_1',
    type: 'determination_completed',
    title: 'NESHAP Subpart ZZZZ completed',
    description: 'Determination marked as Applicable',
    user: 'Sarah Chen',
    timestamp: '2024-12-05T14:30:00Z',
    facilityId: 'facility_texas_steel',
  },
  {
    id: 'act_2',
    type: 'determination_started',
    title: 'NSPS Subpart IIII started',
    description: 'New determination initiated',
    user: 'Mike Johnson',
    timestamp: '2024-12-08T09:15:00Z',
    facilityId: 'facility_indiana_bar',
  },
  {
    id: 'act_3',
    type: 'question_answered',
    title: 'Question answered',
    description: 'Responded to hazardous waste generation question',
    user: 'Emily Davis',
    timestamp: '2024-12-08T09:00:00Z',
    facilityId: 'facility_arkansas_sheet',
  },
  {
    id: 'act_4',
    type: 'status_changed',
    title: 'Status updated',
    description: 'Changed from In Progress to Complete',
    user: 'Alex Park',
    timestamp: '2024-12-01T11:30:00Z',
    facilityId: 'facility_utah_plate',
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(dateString)
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export function getDashboardStats() {
  const totalDeterminations = responseStatuses.length
  const completedDeterminations = responseStatuses.filter((rs) => rs.progress === 'Complete').length
  const pendingReviews = responseStatuses.filter((rs) => rs.progress === 'Incomplete').length
  const activeDeterminations = responseStatuses.filter(
    (rs) => rs.progress === 'Incomplete' && rs.completedQuestions > 0,
  ).length
  const applicableCount = responseStatuses.filter((rs) => rs.status === 'Applicable').length
  const activeTemplates = questionnaires.filter((q) => q.status === 'published').length
  const totalFacilities = facilities.length

  return {
    totalDeterminations,
    completedDeterminations,
    pendingReviews,
    activeDeterminations,
    applicableCount,
    activeTemplates,
    totalFacilities,
    complianceStatus: 'Compliant',
    complianceStatusMessage: 'All compliance requirements are up to date.',
    complianceIssues: [] as Array<{ id: number; message: string; date: string }>,
  }
}
