const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 5000;

// middleware
app.use(express.json())
const corsConfig = {
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}
app.use(cors(corsConfig));



const uri = `mongodb+srv://${process.env.DATA_USER}:${process.env.DATA_PASS}@cluster0.cohvr8z.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect((err) => {
        if (err) {
            console.error(err);
            return;
        }
    })

    const classesCollection=client.db('ArtsandInk').collection('classes');
    const instructorsCollection=client.db('ArtsandInk').collection('instructors')

    // Popular Classes Api

    app.get('/popularclasses',async(req,res)=>{
    const limit=6;
      const result=await classesCollection.find().sort({'available_seats':-1}).limit(limit).toArray();
      res.send(result)
    })

    //Popular Instructors Api

    app.get('/popularinstructors',async(req,res)=>{
        const limit=6;
        const result=await instructorsCollection.find().sort({'number_of_classes_taken':-1}).limit(limit).toArray();
      res.send(result)
    })

    // All Classes Api
    app.get('/allclasses',async(req,res)=>{
      const result=await classesCollection.find().toArray();
      res.send(result)
    })

    // All instructors Api
    app.get('/allinstructors',async(req,res)=>{
      const result=await instructorsCollection.find().toArray();
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Arts&Ink server is running')
})
app.listen(port, (req, res) => {
    console.log(`Arts&Ink server is running on:${port}`)
})

