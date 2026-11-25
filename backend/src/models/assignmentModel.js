/**
 * Assignment Data Schema (Specification for SQL / MongoDB / ORM)
 */
export const AssignmentSchema = {
  id: { type: 'String', primaryKey: true },
  title: { type: 'String', required: true, maxLength: 160 },
  subject_id: { type: 'String', required: true, ref: 'Subject' },
  due_date: { type: 'Date', required: true },
  status: { type: 'String', enum: ['not_started', 'in_progress', 'done'], default: 'not_started' },
  notes: { type: 'String', default: '' },
  description: { type: 'String', default: '' },
  coursera_url: { type: 'String', default: '' },
  resource_url: { type: 'String', default: '' },
  created_at: { type: 'Date', default: 'CURRENT_TIMESTAMP' }
};
