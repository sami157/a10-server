const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const mongodbUri = process.env.MONGODB_URI

const PORT = process.env.PORT || 3000;
const app = express();
const uri = mongodbUri

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
  } finally {
    console.log("MongoDB connected")
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("StudyMate server is running");
});

app.post('/study-partners', async (req, res) => {
  const studyPartner = req.body;

  try {
    const db = client.db('studyMateDB');
    const partnersCollection = db.collection("studyPartners");
    const result = await partnersCollection.insertOne(studyPartner);

    res.status(201).json({
      message: "Study partner profile created successfully",
      partnerId: result.insertedId
    });
  } catch (err) {
    res.status(500).json({ message: "Error creating study partner profile", error: err });
  }
});


app.get('/study-partners', async (req, res) => {
  try {
    const db = client.db("studyMateDB");
    const partnersCollection = db.collection("studyPartners");

    const partners = await partnersCollection.find().toArray();

    res.status(200).send(partners);
  } catch (err) {
    res.status(500).json({ message: "Error fetching study partners", error: err });
  }
});

app.post('/partner-requests', async (req, res) => {
  const { senderEmail, receiverId } = req.body; // Sender's email and receiver's ObjectId

  if (!senderEmail || !receiverId) {
    return res.status(400).json({ message: "Sender email and receiver ID are required" });
  }

  try {
    const db = client.db("studyMateDB");
    const partnersCollection = db.collection("studyPartners");

    const receiver = await partnersCollection.findOne({ _id: new ObjectId(receiverId) });

    await partnersCollection.updateOne(
      { _id: new ObjectId(receiverId) },
      { $inc: { partnerCount: 1 } }
    );

    const partnerRequest = {
      senderEmail,
      receiverProfile: {
        name: receiver.name,
        email: receiver.email,
        subject: receiver.subject,
        studyMode: receiver.studyMode,
        availabilityTime: receiver.availabilityTime,
        location: receiver.location,
        experienceLevel: receiver.experienceLevel
      },
      status: 'pending', // Set initial status to 'pending'
      createdAt: new Date()
    };

    const partnerRequestsCollection = db.collection("partnerRequests");
    const result = await partnerRequestsCollection.insertOne(partnerRequest);
    res.status(201).json({
      message: "Partner request sent successfully",
      requestId: result.insertedId
    });

  } catch (err) {
    console.log("Error sending partner request:", err);
    res.status(500).json({ message: "Error sending partner request", error: err });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});