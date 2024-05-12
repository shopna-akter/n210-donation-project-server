const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

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
        const foodCollection = client.db('foodDB').collection('food')
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
        app.put('/foods/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const option = { upsert: true }
            const updatedTour = req.body
            const tour = {
                $set: {
                    short_description: updatedTour.short_description,
                    totalVisitorsPerYear: updatedTour.totalVisitorsPerYear,
                    tourists_spot_name: updatedTour.tourists_spot_name,
                    country_Name: updatedTour.country_Name,
                    location: updatedTour.location,
                    seasonality: updatedTour.seasonality,
                    average_cost: updatedTour.average_cost,
                    travel_time: updatedTour.travel_time,
                }
            }
            const result = await foodCollection.updateOne(filter, tour, option);
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