const express = require('express');
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieparser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

app.use(cors({
    origin: ["http://localhost:5173",
        "https://assignment-p11.web.app",
        "https://assignment-p11.firebaseapp.com"],
    credentials: true
}))
app.use(express.json())
app.use(cookieparser())

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2yyywnk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-3gbmzmz-shard-00-00.2yyywnk.mongodb.net:27017,ac-3gbmzmz-shard-00-01.2yyywnk.mongodb.net:27017,ac-3gbmzmz-shard-00-02.2yyywnk.mongodb.net:27017/?ssl=true&replicaSet=atlas-tlfdmm-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0`
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const logger = (req, res, next) => {
    console.log('log: info', req.method, req.url);
    next()
}
const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized access' })
        }
        req.user = decoded
        next()
    })
    // next()
}
const cookieOption = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    secure: process.env.NODE_ENV === "production" ? true : false
}
async function run() {
    try {
        // await client.connect();
        // databases
        const foodCollection = client.db('foodDB').collection('food')
        const requestCollection = client.db('foodDB').collection('request')
        // auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res
                .cookie('token', token, cookieOption)
                .send({ success: true });
        })
        app.post('/logout', (req, res) => {
            const user = req.body
            res.clearCookie('token', { ...cookieOption , maxAge: 0 })
            .send({ success: true })
        })

        //direct web operation
        //request operation
        app.post('/requests', async (req, res) => {
            const request = req.body
            const result = await requestCollection.insertOne(request)
            res.send(result)
        })
        app.get('/requests', logger, verifyToken, async (req, res) => {
            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            let query = {};
            if (req.query?.email) {
                query = { User_Email: req.query.email }
            }
            const result = await requestCollection.find(query).toArray()
            res.send(result)
        });
        // Food operation
        app.get('/availableFoods', async (req, res) => {
            const result = await foodCollection.find({ Food_Status: 'available' }).toArray();
            res.send(result)
        })
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
            const result = await foodCollection.insertOne(newFood)
            res.send(result)
        })
        app.get('/foods/:name', async (req, res) => {
            const name = req.params.name;
            const query = { Food_name: { $regex: new RegExp(name, "i") } };
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
                    Food_Status: updatedFood.Food_Status,
                    Pickup_Location: updatedFood.Pickup_Location,
                    Food_Image: updatedFood.Food_Image,
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
        app.get('/food/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id) };
            const result = await foodCollection.findOne(query);
            res.send(result)
        });
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('food server is running')
})

app.listen(port, () => {
    console.log(`food server is running on ${port}`);
})