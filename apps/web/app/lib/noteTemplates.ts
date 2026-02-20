export interface NoteTemplate {
  id: string
  label: string
  description: string
  icon: string
  content: string
}

export const BUILTIN_TEMPLATES: NoteTemplate[] = [
  {
    id: 'daily-standup',
    label: 'Daily Standup',
    description: 'What I did, doing, and blockers',
    icon: 'lucide:sun',
    content: `<h3>Daily Standup</h3><h4>✅ Yesterday</h4><ul><li><p></p></li></ul><h4>🔨 Today</h4><ul><li><p></p></li></ul><h4>🚧 Blockers</h4><ul><li><p></p></li></ul>`,
  },
  {
    id: 'meeting-notes',
    label: 'Meeting Notes',
    description: 'Attendees, agenda, and action items',
    icon: 'lucide:users',
    content: `<h3>Meeting Notes</h3><p><strong>Date:</strong> </p><p><strong>Attendees:</strong> </p><h4>Agenda</h4><ul><li><p></p></li></ul><h4>Notes</h4><p></p><h4>Action Items</h4><ul><li><p></p></li></ul>`,
  },
  {
    id: 'one-on-one',
    label: '1:1 Notes',
    description: 'Topics, feedback, and follow-ups',
    icon: 'lucide:user-check',
    content: `<h3>1:1 Notes</h3><p><strong>With:</strong> </p><p><strong>Date:</strong> </p><h4>Topics</h4><ul><li><p></p></li></ul><h4>Feedback</h4><p></p><h4>Follow-ups</h4><ul><li><p></p></li></ul>`,
  },
  {
    id: 'weekly-review',
    label: 'Weekly Review',
    description: 'Wins, challenges, and goals',
    icon: 'lucide:calendar-check',
    content: `<h3>Weekly Review</h3><h4>🏆 Wins</h4><ul><li><p></p></li></ul><h4>😤 Challenges</h4><ul><li><p></p></li></ul><h4>🎯 Goals for Next Week</h4><ul><li><p></p></li></ul><h4>📝 Notes</h4><p></p>`,
  },
  {
    id: 'email-draft',
    label: 'Email Draft',
    description: 'Subject, to, and body',
    icon: 'lucide:mail',
    content: `<h3>Email Draft</h3><p><strong>To:</strong> </p><p><strong>Subject:</strong> </p><p><strong>Body:</strong></p><p></p><p>Hi ,</p><p></p><p>Best,<br></p>`,
  },
  {
    id: 'bug-report',
    label: 'Bug Report',
    description: 'Steps to repro, expected vs actual',
    icon: 'lucide:bug',
    content: `<h3>Bug Report</h3><p><strong>Summary:</strong> </p><h4>Steps to Reproduce</h4><ol><li><p></p></li></ol><h4>Expected Behavior</h4><p></p><h4>Actual Behavior</h4><p></p><p><strong>Environment:</strong> </p><p><strong>Severity:</strong> </p>`,
  },
  {
    id: 'feature-spec',
    label: 'Feature Spec',
    description: 'Problem, goals, requirements',
    icon: 'lucide:file-code',
    content: `<h3>Feature Spec</h3><p><strong>Status:</strong> Draft</p><h4>Problem</h4><p></p><h4>Goals</h4><ul><li><p></p></li></ul><h4>Non-Goals</h4><ul><li><p></p></li></ul><h4>Requirements</h4><ul><li><p></p></li></ul><h4>Open Questions</h4><ul><li><p></p></li></ul>`,
  },
  {
    id: 'pros-cons',
    label: 'Pros & Cons',
    description: 'Weigh options side by side',
    icon: 'lucide:scale',
    content: `<h3>Pros &amp; Cons</h3><p><strong>Decision:</strong> </p><h4>✅ Pros</h4><ul><li><p></p></li></ul><h4>❌ Cons</h4><ul><li><p></p></li></ul><h4>Conclusion</h4><p></p>`,
  },
]
