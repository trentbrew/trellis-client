/**
 * TQL Seed Data
 *
 * Server-side copy of personal seed items for first boot.
 * Mirrors the client-side personalSeedData.ts with relative dates.
 */

const today = new Date()
const fmt = (d: Date) => d.toISOString().split('T')[0]!
const daysFromNow = (n: number) => {
  const d = new Date(today)
  d.setDate(d.getDate() + n)
  return fmt(d)
}

export interface SeedCalendarItem {
  id: string
  [key: string]: any
}

export function getPersonalSeedItems(): SeedCalendarItem[] {
  return [
    // Tasks
    {
      id: 'task-1',
      type: 'task',
      title: 'Finish quarterly review slides',
      description: 'Prepare the slide deck for Q1 review with stakeholders.',
      startDate: daysFromNow(-2),
      allDay: true,
      priority: 'high',
      urgency: 'urgent',
      category: 'work',
      tags: ['presentation', 'quarterly'],
      owner: 'you',
      taskStatus: 'in-progress',
    },
    {
      id: 'task-2',
      type: 'task',
      title: 'Call dentist to confirm appointment',
      description: 'Confirm the cleaning scheduled for next week.',
      startDate: daysFromNow(0),
      allDay: true,
      priority: 'medium',
      urgency: 'urgent',
      category: 'health',
      tags: ['appointment'],
      owner: 'you',
      taskStatus: 'pending',
    },
    {
      id: 'task-3',
      type: 'task',
      title: 'Submit expense report',
      description: 'January expenses — receipts already uploaded.',
      startDate: daysFromNow(1),
      allDay: true,
      priority: 'high',
      urgency: 'urgent',
      category: 'finance',
      tags: ['expenses'],
      owner: 'you',
      taskStatus: 'pending',
    },
    {
      id: 'task-4',
      type: 'task',
      title: 'Research new project management tools',
      startDate: daysFromNow(3),
      allDay: true,
      priority: 'low',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['research'],
      owner: 'you',
      taskStatus: 'pending',
    },
    {
      id: 'task-5',
      type: 'task',
      title: 'Plan weekend hiking trip',
      startDate: daysFromNow(5),
      allDay: true,
      priority: 'low',
      urgency: 'not-urgent',
      category: 'travel',
      tags: ['hiking', 'weekend'],
      owner: 'you',
      taskStatus: 'pending',
    },

    // Events
    {
      id: 'event-1',
      type: 'event',
      title: 'Team standup',
      description: 'Daily 15-min sync with the engineering team.',
      startDate: daysFromNow(0),
      allDay: false,
      startTime: '09:00',
      endTime: '09:15',
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'meeting',
      tags: ['standup', 'team'],
      owner: 'you',
      eventType: 'meeting',
      location: 'Zoom',
    },
    {
      id: 'event-2',
      type: 'event',
      title: 'Design review',
      description: 'Review new dashboard mockups with the design team.',
      startDate: daysFromNow(1),
      allDay: false,
      startTime: '14:00',
      endTime: '15:00',
      priority: 'high',
      urgency: 'not-urgent',
      category: 'review',
      tags: ['design', 'dashboard'],
      owner: 'you',
      eventType: 'meeting',
    },
    {
      id: 'event-3',
      type: 'event',
      title: 'Lunch with Alex',
      startDate: daysFromNow(2),
      allDay: false,
      startTime: '12:00',
      endTime: '13:00',
      priority: 'low',
      urgency: 'not-urgent',
      category: 'personal',
      tags: ['social'],
      owner: 'you',
      eventType: 'social',
      location: 'Café Luna',
    },

    // Payments
    {
      id: 'payment-1',
      type: 'payment',
      title: 'Rent — February',
      startDate: daysFromNow(3),
      allDay: true,
      priority: 'critical',
      urgency: 'urgent',
      category: 'finance',
      tags: ['rent', 'monthly'],
      owner: 'you',
      amount: 2200,
      currency: 'USD',
      payee: 'Landlord',
      paymentStatus: 'pending',
      recurring: true,
    },
    {
      id: 'payment-2',
      type: 'payment',
      title: 'AWS bill',
      startDate: daysFromNow(5),
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['infrastructure'],
      owner: 'you',
      amount: 147.5,
      currency: 'USD',
      payee: 'Amazon Web Services',
      paymentStatus: 'pending',
      recurring: true,
    },

    // Notes
    {
      id: 'note-1',
      type: 'note',
      title: 'Architecture decision: graph-first data model',
      content: 'All entities are nodes in one unified graph. Every page is a projection scoped by entity type.',
      startDate: daysFromNow(-1),
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['architecture', 'tql'],
      owner: 'you',
      pinned: true,
    },
    {
      id: 'note-2',
      type: 'note',
      title: 'Book recommendations from Sarah',
      content: '1. Designing Data-Intensive Applications\n2. The Art of Doing Science and Engineering\n3. A Philosophy of Software Design',
      startDate: daysFromNow(-3),
      allDay: true,
      priority: 'low',
      urgency: 'not-urgent',
      category: 'personal',
      tags: ['books', 'reading'],
      owner: 'you',
      pinned: false,
    },
    {
      id: 'note-3',
      type: 'note',
      title: 'Meeting notes: Q1 retro',
      content: 'Key takeaway: we need better async communication. Action items: set up weekly written updates.',
      startDate: daysFromNow(-5),
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'meeting',
      tags: ['retro', 'team'],
      owner: 'you',
      pinned: false,
    },
  ]
}
