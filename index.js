const express = require('express');
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieparser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())
app.use(cookieparser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2yyywnk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        // databases
        const foodCollection = client.db('foodDB').collection('food')
        const requestCollection = client.db('foodDB').collection('request')
        // auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false,
                })
                .send({ success: true });
        })
        app.post('/logout', (req, res) => {
            const user = req.body
            console.log('loging out', user);
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })

        //direct web operation

        //request operation
        app.post('/requests' , async(req , res)=>{
            const request = req.body
            console.log(request);
            const result  = await requestCollection.insertOne(request)
            res.send(result)
        })
        app.get('/requests', async (req, res) => {
            const cursor = requestCollection.find()
            const result = await cursor.toArray();
            res.send(result)
        })
        // Food operation 
        app.get('/featuredFoods', async (req, res) => {
            try {
                const result = await foodCollection.find().sort({ Quantity: -1 }).limit(6).toArray();
                res.json(result);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Server error' });
            }
        });
        app.get('/sortedFoods', async (req, res) => {
            try {
                const sortedFoods = await foodCollection.find().sort({ Expired_Date: -1 }).toArray();
                res.json(sortedFoods);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Server error' });
            }
        });
        app.get('/foods', async (req, res) => {
            const cursor = foodCollection.find()
            const result = await cursor.toArray();
            res.send(result)
        })
        app.post('/foods', async (req, res) => {
            const newFood = req.body
            console.log(newFood);
            const result = await foodCollection.insertOne(newFood)
            res.send(result)
        })
        app.get('/foods/:name', async (req, res) => {
            const name = req.params.name;
            const query = { Food_name: name };
            try {
                const cursor = await foodCollection.find(query);
                const result = await cursor.toArray();
                if (result.length === 0) {
                    return res.status(404).send("No foods found");
                }
                res.send(result);
            } catch (error) {
                console.error("Error fetching foods by name:", error);
                res.status(500).send("Internal server error");
            }
        });



        app.put('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedFood = req.body
            const Food = {
                $set: {
                    Additional_Notes: updatedFood.Additional_Notes,
                    Quantity: updatedFood.Quantity,
                    Expired_Date: updatedFood.Expired_Date,
                    Pickup_Location: updatedFood.Pickup_Location,
                    Food_Status: updatedFood.Food_Status,
                    Food_name: updatedFood.Food_name,
                }
            }
            const result = await foodCollection.updateOne(filter, Food);
            res.send(result);
        });
        app.delete('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await foodCollection.deleteOne(query);
            res.send(result)
        });
        app.get('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await foodCollection.findOne(query);
            res.send(result)
        });

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('food server is running')
})

app.listen(port, () => {
    console.log(`food server is running on ${port}`);
})