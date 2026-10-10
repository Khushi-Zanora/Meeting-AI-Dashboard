import 'dotenv/config';
import app from './app.js';
import './config/db.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, (error) => {
  if (error) {
    console.error('Could not start server on port ' + PORT + ': ' + error.message);
    process.exit(1);
  }
  console.log('Server running on http://localhost:' + PORT);
});
