import 'dotenv/config'; //loads .env file automatically
import app from './app.js'; 
import './config/db.js'; // importing this runs the table-creation code once at startup. your tables are guaranteed to exist the moment the server starts.

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});