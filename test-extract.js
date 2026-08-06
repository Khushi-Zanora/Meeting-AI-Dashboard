import 'dotenv/config';
import { extractTasks } from './src/services/extractTasksService.js';

const sampleTranscript = `
John said he'll send the quarterly report to the team by this Friday.
Sarah needs to review the budget proposal — high priority, no deadline mentioned.
We agreed someone should follow up with the vendor next week, but didn't assign it.
`;

const tasks = await extractTasks(sampleTranscript);
console.log('Extracted tasks:', JSON.stringify(tasks, null, 2));