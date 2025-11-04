// set-admin.js
// npm i firebase-admin
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const keyPath = path.join(__dirname, 'serviceAccountKey.json');
if(!fs.existsSync(keyPath)){
  console.error('serviceAccountKey.json niet gevonden. Download van Firebase Console en zet naast dit script.');
  process.exit(1);
}

const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = process.argv[2]; // usage: node set-admin.js <UID>
if(!uid){ console.error('Geef een UID als argument.'); process.exit(1); }

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`Admin claim toegevoegd aan ${uid}`);
    process.exit(0);
  }).catch(err => {
    console.error('Fout:', err);
    process.exit(1);
  });
