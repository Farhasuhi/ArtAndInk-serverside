const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_KEY)

const port = process.env.PORT || 5000;



// middleware
app.use(express.json())

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

const corsConfig = {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
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

    const classesCollection = client.db('ArtsandInk').collection('classes');

    const instructorsCollection = client.db('ArtsandInk').collection('instructors');

    const selectClassCollection = client.db('ArtsandInk').collection('selectclass');

    const usersCollection = client.db('ArtsandInk').collection('users');

    const paymentCollection = client.db('ArtsandInk').collection('payment');

    const studentCollection = client.db('ArtsandInk').collection('student');

    // jwt
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

      res.send({ token })
    })


    // admin verify
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }




    // Popular Classes Api

    app.get('/popularclasses', async (req, res) => {
      const limit = 6;
      const result = await classesCollection.find().sort({ 'available_seats': -1 }).limit(limit).toArray();
      res.send(result)
    })

    //Popular Instructors Api

    app.get('/popularinstructors', async (req, res) => {
      const limit = 6;
      const result = await instructorsCollection.find().sort({ 'number_of_classes_taken': -1 }).limit(limit).toArray();
      res.send(result)
    })

    // All Classes Api
    app.get('/allclasses', async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await classesCollection.find(query).toArray();
      res.send(result)
    })
    app.get('/allclasses/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const result = await classesCollection.findOne(filter);
      res.send(result);
    })

    app.put('/allclasses/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: {
          available_seats: -1,
        }
      };
      const updatetotal={
        enrolled:1
      }
      const result = await classesCollection.updateOne(filter, updateDoc);
  
      const totalresult=await studentCollection.insertOne(updatetotal)
      res.send({result,totalresult});
    })

    app.patch('/allclasses/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updated= req.body;
      const updateDoc = {
        $set: {
          status: updated.status,
          feedback:updated?.feedback
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc)
      res.send(result)

    })

    app.get('/total',async(req,res)=>{
      const result=await studentCollection.find().toArray()
      res.send(result)
    })

    // post all classes
    app.post('/allclasses', async (req, res) => {
      const classes = req.body;
      const result = await classesCollection.insertOne(classes);
      res.send(result);
    })

    // All instructors Api
    app.get('/allinstructors', async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result)
    })

    // students add their favt class
    app.post('/selectclasses', async (req, res) => {
      const item = req.body;
      const result = await selectClassCollection.insertOne(item);
      res.send(result)
    })

    // students get their fav list going through login
    app.get('/selectclasses', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }
      const query = { email: email };
      const result = await selectClassCollection.find(query).toArray();
      res.send(result);

    })

    app.get('/selectclasses/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await selectClassCollection.findOne(filter);
      res.send(result);

    })
  

    app.delete('/selectclasses/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result=await selectClassCollection.deleteOne(filter)
      res.send(result)
    })



    // User information added on this api by sign up
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // updating setting role in user(As a Admin)
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // updating setting role in user(As a instructor)
    app.patch('/users/instructor/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })

    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' }
      res.send(result);
    })
    // Instructor classes update api
    app.put('/instructorclasses/:id', async (req, res) => {
      const id = req.params.id;
      const updatedClass = req.body;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          price: parseFloat(updatedClass.price),
          class_name: updatedClass.class_name,
          image: updatedClass.image,
          available_seats: parseFloat(updatedClass.available_seats),
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc)
      res.send(result);
    })




    // Get all users in server
    app.get('/allusers', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    // app.get('/allusers',async (req, res) => {
    //   const result = await usersCollection.find().toArray();
    //   res.send(result);
    // });

    // payment

    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { singleClassPrice } = req.body;
      const amount = parseInt(singleClassPrice * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    app.post('/payments', verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);
      const classId = req.body.classId;
      const query = { _id: new ObjectId(classId) }
      const deleteResult = await selectClassCollection.deleteOne(query);
      res.send({ insertResult, deleteResult });
    })
    app.get('/payments',verifyJWT,async(req,res)=>{
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result=await paymentCollection.find(query).sort({date:-1}).toArray()
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

