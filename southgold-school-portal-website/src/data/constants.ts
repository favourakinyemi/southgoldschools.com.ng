import { Subject } from '../types';

export const INITIAL_SUBJECTS: Subject[] = [];

export const INITIAL_CLASSES: string[] = [];

export const INITIAL_ARMS = ['A'];

export const FAQ_DATA = [
  { q: 'How do I generate result transcripts?', a: 'Parents can view and click the "Print/Download PDF Report" on their child\'s academic results screen.' },
  { q: 'What is the maximum marks for Tests and Exams?', a: 'Continuous Assessment Tests are 20 marks, Assignments are 20 marks, and Terminal Examinations are 60 marks, yielding a total score out of 100.' },
  { q: 'How can a teacher request result approvals?', a: 'Upon uploading scores, they are automatically sent to the Admin queue for review and publishing approval.' },
  { q: 'How are admission numbers generated?', a: 'Admission numbers are automatically generated when a student profile is created using the format ADM/[CurrentSessionYear]/[IncrementalID].' }
];
