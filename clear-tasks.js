import db from './src/config/db.js';

// Deletes ALL tasks and meetings — full reset
db.exec('DELETE FROM tasks');
db.exec('DELETE FROM meetings');

// Resets the auto-increment counters so new tasks start from id 1 again
db.exec("DELETE FROM sqlite_sequence WHERE name='tasks'");
db.exec("DELETE FROM sqlite_sequence WHERE name='meetings'");

console.log('All tasks and meetings cleared.');