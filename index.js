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

const db = client.db("studyMateDB");
const partnersCollection = db.collection("studyPartners");
const partnerRequestsCollection = db.collection("partnerRequests");

// check for duplicate email
const checkDuplicateEmail = async (req, res, next) => {
  const { email } = req.body

  try {
    const existingPartner = await partnersCollection.findOne({ email });

    if (existingPartner) {
      return res.status(409).json({ message: "Email already exists" });
    }

    next();
  } catch (err) {
    res.status(500).json({ message: "Error checking email", error: err });
  }
};

// check for duplicate partner request
const checkDuplicatePartnerRequest = async (req, res, next) => {
  const { senderEmail, receiverId } = req.body;

  try {
    const db = client.db("studyMateDB");
    const partnerRequestsCollection = db.collection("partnerRequests");
    const existingRequest = await partnerRequestsCollection.findOne({
      senderEmail,
      receiverId,
      status: { $in: ["pending", "accepted"] }
    })

    if (existingRequest) {
      return res.status(409)
        .json({ message: "Duplicate request: A partner request already exists." });
    }

    next();
  } catch (err) {
    console.error("Error checking duplicate request:", err);
    res.status(500).json({ message: "Error checking duplicate request", error: err });
  }
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
  }
  catch {

  }
  finally {

  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("StudyMate server is running");
});

app.post('/study-partners', checkDuplicateEmail, async (req, res) => {
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
    const partners = await partnersCollection.find().toArray();
    res.status(200).send(partners);
  } catch (err) {
    res.status(500).json({ message: "Error fetching study partners", error: err });
  }
});

app.get('/study-partners/find/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const partner = await partnersCollection.findOne({ _id: new ObjectId(id) });
    res.status(200).send(partner);
  } catch (err) {
    res.status(500).json({ message: "Error fetching study partner", error: err });
  }
});


app.get('/study-partners/check/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const existingPartner = await partnersCollection.findOne({ email });
    existingPartner ? res.send(existingPartner) : res.send(false)
  } catch (err) {
    res.status(500).json({ message: "Error fetching study partners", error: err });
  }
});

//Top 3 Partner Profiles
app.get('/study-partners/top', async (req, res) => {
  try {
    const topPartners = await partnersCollection
      .find({})
      .sort({ rating: -1 })
      .limit(3)
      .toArray();

    res.send(topPartners);
  } catch (err) {
    res.status(500).json({ message: "Error fetching top partners", error: err });
  }
});


app.post('/partner-requests', checkDuplicatePartnerRequest, async (req, res) => {
  const { senderEmail, receiverId, message } = req.body;
  try {
    const receiver = await partnersCollection.findOne({ _id: new ObjectId(receiverId) });
    await partnersCollection.updateOne(
      { _id: new ObjectId(receiverId) },
      { $inc: { partnerCount: 1 } }
    );
    const partnerRequest = {
      senderEmail,
      receiverId,
      message,
      status: 'pending',
      createdAt: new Date()
    };
    const result = await partnerRequestsCollection.insertOne(partnerRequest);
    res.status(201).json({
      message: "Partner request sent successfully",
      requestId: result.insertedId,
    });

  } catch (err) {
    res.status(500).json({ message: "Error sending partner request", error: err });
  }
});

app.delete('/partner-requests/:requestId', async (req, res) => {
  const { requestId } = req.params;

  try {

    const objectId = new ObjectId(requestId);
    const result = await partnerRequestsCollection.deleteOne({ _id: objectId });

    res.status(200).json({ message: "Partner request deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting partner request", error: err });
  }
});

app.get('/partner-requests/sent/:senderEmail', async (req, res) => {
  const { senderEmail } = req.params;

  try {
    const requests = await partnerRequestsCollection.find({ senderEmail }).toArray();
    res.status(200).send(requests);
  } catch (err) {
    res.status(500).json({ message: "Error fetching partner requests", error: err });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});